'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, AlertTriangle, CheckCircle, Scale, MessageSquare, Download, Copy, RefreshCw } from 'lucide-react';
import { marked } from 'marked';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [compareFile, setCompareFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [compareSummary, setCompareSummary] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'compare'>('summary');
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [query, setQuery] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCompare = false) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (isCompare) {
      setCompareFile(uploadedFile);
      setActiveTab('compare');
      setIsComparing(true);
      setCompareSummary('');

      const formData = new FormData();
      formData.append('file', uploadedFile);
      if (sessionId) formData.append('sessionId', sessionId);

      try {
        const streamRes = await fetch('/api/compare', {
          method: 'POST',
          body: formData,
        });

        if (!streamRes.body) throw new Error('No stream returned');
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let text = '';

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value);
          text += chunkValue;
          setCompareSummary(text);
        }
      } catch (err: any) {
        alert(err.message || 'Comparison failed');
      } finally {
        setIsComparing(false);
      }
      return;
    }

    setFile(uploadedFile);
    setIsAnalyzing(true);
    setSummary('');
    setChatHistory([]);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDocType(data.type);
      setSessionId(data.sessionId);

      // Now fetch summary stream
      const streamRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId, mode: 'summary' })
      });

      if (!streamRes.body) throw new Error('No stream returned');
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        text += chunkValue;
        setSummary(text);
      }
    } catch (err: any) {
      alert(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !sessionId) return;
    
    const userMessage = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }, { role: 'assistant', text: '' }]);
    setIsChatting(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mode: 'chat', query: userMessage })
      });

      if (!res.body) throw new Error('No stream returned');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        text += chunkValue;
        
        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].text = text;
          return newHistory;
        });
      }
    } catch (err: any) {
      alert(err.message || 'Chat failed');
    } finally {
      setIsChatting(false);
    }
  };

  const getMarkdownHtml = (md: string) => {
    return { __html: marked(md) };
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-indigo-500/30">
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 sticky top-0 z-50 backdrop-blur-md">
        <AlertTriangle className="w-4 h-4" />
        This is general information, not legal advice. Always consult a licensed attorney.
      </div>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-4 ring-1 ring-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <Scale className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">
            Priya's Legal Assistant
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
            Upload your lease, NDA, or employment contract to translate legalese into plain English and spot hidden risks before you sign.
          </p>
        </header>

        {!file && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all rounded-3xl p-16 text-center cursor-pointer group"
          >
            <input type="file" ref={fileInputRef} onChange={e => handleUpload(e)} className="hidden" accept=".pdf,.docx,.txt" />
            <UploadCloud className="w-12 h-12 text-neutral-500 group-hover:text-indigo-400 mx-auto mb-4 transition-colors" />
            <h3 className="text-xl font-medium mb-2">Upload your document</h3>
            <p className="text-neutral-500">PDF, DOCX, or TXT up to 8MB</p>
          </div>
        )}

        {file && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="font-medium text-neutral-400 mb-4 text-sm uppercase tracking-wider">Document Details</h3>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium truncate" title={file.name}>{file.name}</p>
                    <p className="text-sm text-neutral-500">
                      {docType ? (
                        <span className="capitalize px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs">
                          {docType}
                        </span>
                      ) : (
                        'Analyzing...'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setActiveTab('summary')}
                  className={`px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'summary' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-neutral-900 text-neutral-400'}`}
                >
                  Summary & Risks
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'chat' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-neutral-900 text-neutral-400'}`}
                >
                  Ask Questions
                </button>
                <button 
                  onClick={() => setActiveTab('compare')}
                  className={`px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'compare' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'hover:bg-neutral-900 text-neutral-400'}`}
                >
                  Compare Versions
                </button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 min-h-[600px] flex flex-col">
                
                {activeTab === 'summary' && (
                  <div className="space-y-6 flex-1">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CheckCircle className="text-green-400 w-6 h-6" /> 
                        Analysis Results
                      </h2>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 transition-colors" title="Copy to clipboard" onClick={() => navigator.clipboard.writeText(summary)}>
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {isAnalyzing && !summary ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-neutral-400">Reading legalese and extracting key clauses...</p>
                      </div>
                    ) : (
                      <div 
                        className="prose prose-invert prose-indigo max-w-none prose-headings:font-semibold prose-a:text-indigo-400"
                        dangerouslySetInnerHTML={getMarkdownHtml(summary)}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full flex-1">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pb-4">
                      {chatHistory.length === 0 ? (
                        <div className="text-center text-neutral-500 mt-20">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Ask anything about the document.</p>
                          <p className="text-sm mt-2">Example: "Can the landlord keep my deposit if I leave early?"</p>
                        </div>
                      ) : (
                        chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-200 border border-neutral-700'}`}>
                              <div className="prose prose-invert prose-sm" dangerouslySetInnerHTML={getMarkdownHtml(msg.text || (isChatting && i === chatHistory.length -1 ? '...' : ''))} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <form onSubmit={handleChat} className="relative mt-auto">
                      <input 
                        type="text" 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Ask a question..." 
                        disabled={isChatting}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                      />
                      <button 
                        type="submit" 
                        disabled={isChatting || !query.trim()}
                        className="absolute right-2 top-2 p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-5 h-5 ${isChatting ? 'animate-spin' : 'hidden'}`} />
                        <svg className={`w-5 h-5 ${isChatting ? 'hidden' : 'block'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'compare' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Scale className="text-indigo-400 w-6 h-6" /> 
                      Compare Documents
                    </h2>
                    <p className="text-neutral-400">Upload a second document of the same type to see what changed.</p>
                    
                    {!compareFile ? (
                      <div 
                        onClick={() => compareInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all rounded-3xl p-12 text-center cursor-pointer group"
                      >
                        <input type="file" ref={compareInputRef} onChange={e => handleUpload(e, true)} className="hidden" accept=".pdf,.docx,.txt" />
                        <FileText className="w-10 h-10 text-neutral-500 group-hover:text-indigo-400 mx-auto mb-4 transition-colors" />
                        <h3 className="text-lg font-medium mb-1">Upload Version 2</h3>
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 h-full">
                        {isComparing && !compareSummary ? (
                          <div className="text-center p-12 border border-neutral-800 rounded-2xl">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                            <p>Generating structured diff and AI explanation...</p>
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-indigo max-w-none" dangerouslySetInnerHTML={getMarkdownHtml(compareSummary)} />
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
