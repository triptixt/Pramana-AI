'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/context';
import { Drawer } from '../ui/Drawer';
import { api } from '../../lib/api';
import {
  Sparkles,
  Send,
  Bot,
  User,
  BookOpen,
  Shield,
  FileText,
  AlertCircle,
  RotateCcw,
  Zap,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: Array<{
    page?: number;
    section?: string;
    text: string;
    relevance?: number;
  }>;
  relatedControls?: string[];
  modelName?: string;
  runId?: number;
}

export const AIChatDrawer: React.FC = () => {
  const { isAIChatOpen, setIsAIChatOpen, aiChatEvidenceId, setAIChatEvidenceId, evidenceList, showToast } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your Pramana Compliance Assistant powered by Ollama. You can ask me questions about your uploaded evidence, framework mappings, control requirements (SOC 2, ISO 27001, NIST CSF), or audit gaps. How can I assist your compliance team today?',
      timestamp: 'Just now',
      modelName: 'qwen2.5:7b',
    },
  ]);

  const selectedEvidence = aiChatEvidenceId
    ? evidenceList.find((e) => {
        const numId = parseInt(e.id.replace(/^[a-z]+-/, ''), 10);
        return numId === aiChatEvidenceId;
      })
    : null;

  const handleClose = () => {
    setIsAIChatOpen(false);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await api.ai.chat(textToSend.trim(), aiChatEvidenceId || undefined);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.answer || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.citations || [],
        relatedControls: response.related_controls || [],
        modelName: response.model_name || 'qwen2.5:7b',
        runId: response.run_id,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      showToast('AI Request Failed', err.message || 'Unable to reach local Ollama AI model.', 'error');
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `Error contacting local AI engine: ${err.message}. Please verify the FastAPI backend and Ollama are active.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Chat history cleared. What compliance question can I investigate for you?',
        timestamp: 'Just now',
        modelName: 'qwen2.5:7b',
      },
    ]);
  };

  const suggestedQuestions = [
    'Does our access control policy mandate multi-factor authentication (MFA)?',
    'Evaluate evidence coverage for SOC 2 CC6.1 Logical Access.',
    'What evidence is missing for ISO 27001 Annex A.8.1 (User Endpoint Devices)?',
    'Summarize current encryption in transit and at rest safeguards.',
  ];

  return (
    <Drawer
      isOpen={isAIChatOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <span className="font-bold text-slate-900">Pramana AI Assistant</span>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5" /> Ollama Local RAG
          </span>
        </div>
      }
      subtitle={
        selectedEvidence
          ? `Focusing on evidence: ${selectedEvidence.name}`
          : 'Query across all uploaded organizational evidence & frameworks'
      }
      width="lg"
      footer={
        <div className="w-full space-y-2">
          {/* Active Scope Pill */}
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-medium text-slate-600">Scope:</span>
              {selectedEvidence ? (
                <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-[11px] font-medium">
                  <FileText className="w-3 h-3 text-indigo-500" />
                  {selectedEvidence.name}
                  <button
                    onClick={() => setAIChatEvidenceId(null)}
                    className="ml-1 text-slate-400 hover:text-slate-700 font-bold"
                    title="Remove document filter"
                  >
                    ×
                  </button>
                </span>
              ) : (
                <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  All Organization Evidence
                </span>
              )}
            </div>

            <button
              onClick={handleResetChat}
              className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>

          {/* Input Box */}
          <div className="relative flex items-center">
            <textarea
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about compliance policies, evidence gaps, controls..."
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50/70 p-3 pr-12 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isLoading}
              className="absolute right-2.5 bottom-2.5 p-2 rounded-lg bg-indigo-600 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-indigo-700 transition-colors shadow-sm"
              title="Send query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Suggested Queries */}
        {messages.length <= 2 && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Suggested Prompts:
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="text-left p-2 rounded-lg bg-white border border-slate-200/90 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 transition-all font-medium"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    {msg.sender === 'user' ? 'You' : 'Pramana AI Engine'}
                  </span>
                  <span className={`text-[9px] ${
                    msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>

                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/80 space-y-1.5">
                    <p className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-600" /> Cited Evidence Excerpts:
                    </p>
                    <div className="space-y-1">
                      {msg.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-2 rounded-lg bg-white border border-indigo-100 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center gap-1.5 text-indigo-700 font-mono text-[9px] font-bold">
                            {cite.page && <span>Page {cite.page}</span>}
                            {cite.section && <span>• Section {cite.section}</span>}
                            {cite.relevance && <span>• Relevance: {Math.round(cite.relevance * 100)}%</span>}
                          </div>
                          <p className="text-slate-700 italic">"{cite.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Controls */}
                {msg.relatedControls && msg.relatedControls.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Shield className="w-3 h-3 text-slate-400" /> Related Framework Controls:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {msg.relatedControls.map((ctrl, ctrlIdx) => (
                        <span
                          key={ctrlIdx}
                          className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          {ctrl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Model Metadata footer */}
                {msg.modelName && msg.sender === 'assistant' && (
                  <div className="mt-2 text-[9px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Model: {msg.modelName}</span>
                    {msg.runId && <span>Run #{msg.runId}</span>}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-none p-3.5 text-xs text-slate-600 flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <span className="font-medium text-slate-500">Querying vector embeddings & analyzing compliance with Ollama...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
