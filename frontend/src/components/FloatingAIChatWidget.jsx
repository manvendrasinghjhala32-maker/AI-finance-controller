import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, MessageSquare, Maximize2, Minimize2, HelpCircle } from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';

export function FloatingAIChatWidget({ 
  chatMessages = [], 
  onSendMessage, 
  chatLoading = false,
  isOpen: externalIsOpen,
  onOpenChange,
  focusedTx = null,
  onClearFocus
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const chatEndRef = useRef(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val) => {
    if (onOpenChange) onOpenChange(val);
    else setInternalIsOpen(val);
  };

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, isOpen, isExpanded]);

  const handleSend = (text) => {
    const promptToSend = text || inputPrompt;
    if (!promptToSend.trim() || chatLoading) return;
    onSendMessage(promptToSend);
    setInputPrompt('');
  };

  const defaultQuickPrompts = [
    "Explain the biggest price differences",
    "Which sellers are missing receipts or bills?",
    "Summarize money coming in and going out for next 30 days",
    "Show accounting adjustments for payment fees"
  ];

  const txQuickPrompts = focusedTx ? [
    `Explain the ₹${Math.abs(focusedTx.amount_delta || 0).toLocaleString()} difference for ${focusedTx.transaction_id}`,
    `Show the accounting journal entry for ${focusedTx.transaction_id}`,
    `Why was this adjustment applied to ${focusedTx.vendor || 'Customer'}?`,
    `Are any further actions or vendor follow-ups needed for ${focusedTx.transaction_id}?`
  ] : defaultQuickPrompts;

  const quickPrompts = focusedTx ? txQuickPrompts : defaultQuickPrompts;

  return (
    <>
      {/* 1. Fullscreen Mode or Corner Popup Modal */}
      {isOpen && (
        isExpanded ? (
          /* ========================================================================= */
          /* FULLSCREEN IMMERSIVE AI CHAT INTERFACE */
          /* ========================================================================= */
          <div className="fixed inset-0 z-50 w-screen h-screen bg-[#171717] flex flex-col overflow-hidden animate-fade-in select-none">
            {/* Top Fullscreen Header */}
            <div className="px-6 py-4 bg-[#171717] border-b border-[#2F2F2F] flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <img src="/finance_logo.png" alt="AI Assistant" className="w-9 h-9 rounded-xl object-contain shadow-md" />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-white tracking-wide">
                      AI Finance Assistant
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      FULLSCREEN ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Ask questions in plain English and get simple, clear answers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono text-slate-300 hover:text-white bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-[#3A3A3A] transition"
                  title="Exit Fullscreen Mode"
                >
                  <Minimize2 className="w-4 h-4 text-emerald-400" />
                  <span>Exit Fullscreen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setIsOpen(false);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#2F2F2F] transition"
                  title="Close AI Assistant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Focused Transaction Banner (Fullscreen) */}
            {focusedTx && (
              <div className="px-6 py-2.5 bg-[#212121] border-b border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400 font-bold">🎯 Focusing on: {focusedTx.transaction_id}</span>
                  <span className="text-slate-300 font-semibold">({focusedTx.vendor || focusedTx.invoice_customer || 'Customer'})</span>
                  <span className="text-slate-400">• Bank: ₹{(focusedTx.amount || 0).toLocaleString()} • Discrepancy: ₹{Math.abs(focusedTx.amount_delta || 0).toLocaleString()}</span>
                </div>
                {onClearFocus && (
                  <button 
                    onClick={onClearFocus}
                    className="text-[11px] text-slate-400 hover:text-rose-400 underline font-mono"
                  >
                    Clear Focus (Chat Globally)
                  </button>
                )}
              </div>
            )}

            {/* Quick Suggestion Chips (Fullscreen) */}
            <div className="px-6 py-2.5 bg-[#171717] border-b border-[#2F2F2F] flex items-center gap-2 overflow-x-auto text-xs font-mono scrollbar-none">
              <span className="text-slate-400 shrink-0 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Suggested Questions:
              </span>
              {quickPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={chatLoading}
                  className="px-3 py-1 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 hover:text-white border border-[#3A3A3A] hover:border-emerald-500/40 transition whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Main Chat Feed Container (Centered max-w-5xl) */}
            <div className="flex-1 bg-[#212121] overflow-y-auto p-4 sm:p-8">
              <div className="max-w-5xl mx-auto space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-[55vh] flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <div className="w-16 h-16 rounded-3xl bg-[#2F2F2F] text-emerald-400 flex items-center justify-center mb-4 text-3xl border border-emerald-500/30 shadow-lg">
                      💬
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Ask Anything About Your Records</h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                      Ask about specific transactions (e.g. TX0004), price differences, missing bills, or accounting adjustments.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1 shadow-md">
                          🤖
                        </div>
                      )}
                      <div
                        className={`max-w-3xl px-5 py-4 rounded-2xl leading-relaxed text-xs sm:text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#2F2F2F] text-emerald-300 border border-emerald-500/40 font-medium rounded-tr-none shadow-md font-mono'
                            : 'bg-[#171717] text-slate-100 border border-[#2F2F2F] shadow-lg rounded-tl-none font-sans'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownMessage content={msg.content} />
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="flex gap-3.5 justify-start items-center">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center text-xs">
                      🤖
                    </div>
                    <div className="bg-[#171717] border border-[#2F2F2F] px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2.5 text-xs text-slate-300 font-medium font-mono">
                      <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      Analyzing records with AI...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom Fullscreen Input Bar */}
            <div className="p-4 sm:p-6 bg-[#171717] border-t border-[#2F2F2F]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="max-w-5xl mx-auto flex gap-3"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Ask the AI assistant anything (e.g., why does TX0004 have a price difference?)..."
                  disabled={chatLoading}
                  className="flex-1 px-4 py-3 bg-[#2F2F2F] border border-[#3A3A3A] rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || chatLoading}
                  className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                    !inputPrompt.trim() || chatLoading
                      ? 'bg-[#2F2F2F] text-slate-500 cursor-not-allowed border border-[#3A3A3A]'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CORNER POPUP MODAL */
          /* ========================================================================= */
          <div className="fixed bottom-20 right-6 z-50 select-none animate-scale-in">
            <div className="bg-[#171717] border border-[#2F2F2F] shadow-2xl rounded-2xl flex flex-col overflow-hidden w-[92vw] sm:w-[480px] h-[600px] max-h-[85vh]">
              {/* Top Modal Header */}
              <div className="p-4 bg-[#171717] border-b border-[#2F2F2F] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src="/finance_logo.png" alt="AI Assistant" className="w-8 h-8 rounded-lg object-contain shadow-md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-wide leading-none">
                        AI Finance Assistant
                      </h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                      Smart AI Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2F2F2F] transition flex items-center gap-1"
                    title="Expand to Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#2F2F2F] transition"
                    title="Close Chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Focused Transaction Banner (Popup) */}
              {focusedTx && (
                <div className="px-4 py-2 bg-[#212121] border-b border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                    <span className="text-emerald-400 font-bold truncate">🎯 {focusedTx.transaction_id}</span>
                    <span className="text-slate-400 text-[11px] truncate">({focusedTx.vendor || focusedTx.invoice_customer || 'Customer'})</span>
                  </div>
                  {onClearFocus && (
                    <button 
                      onClick={onClearFocus}
                      className="text-[10px] text-slate-400 hover:text-rose-400 underline font-mono shrink-0 ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Quick Suggestion Chips */}
              <div className="px-4 py-2 bg-[#171717] border-b border-[#2F2F2F] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
                <span className="text-slate-400 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </span>
                {quickPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    disabled={chatLoading}
                    className="px-2.5 py-1 rounded-md bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 hover:text-white border border-[#3A3A3A] hover:border-emerald-500/40 transition whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 p-4 bg-[#212121] overflow-y-auto space-y-3.5 text-xs">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-[#2F2F2F] text-emerald-400 flex items-center justify-center mb-3 text-xl border border-emerald-500/30">
                      💬
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">Ask Anything About Your Records</h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Ask about specific transactions (e.g. TX0004), price differences, missing bills, or accounting adjustments.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                          🤖
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs sm:text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#2F2F2F] text-emerald-300 border border-emerald-500/40 font-medium rounded-tr-none'
                            : 'bg-[#171717] text-slate-100 border border-[#2F2F2F] shadow-md rounded-tl-none'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <MarkdownMessage content={msg.content} />
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="flex gap-2.5 justify-start items-center">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex-shrink-0 flex items-center justify-center text-xs">
                      🤖
                    </div>
                    <div className="bg-[#171717] border border-[#2F2F2F] px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      Analyzing records with AI...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-[#171717] border-t border-[#2F2F2F] flex gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Ask the AI assistant anything..."
                  disabled={chatLoading}
                  className="flex-1 px-3.5 py-2 text-xs bg-[#2F2F2F] border border-[#3A3A3A] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || chatLoading}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                    !inputPrompt.trim() || chatLoading
                      ? 'bg-[#2F2F2F] text-slate-500 cursor-not-allowed border border-[#3A3A3A]'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )
      )}

      {/* 2. Floating Action Button in the Bottom-Right Corner */}
      {!isExpanded && (
        <div className="fixed bottom-6 right-6 z-50 select-none">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#171717] hover:bg-[#252525] text-white rounded-full border border-emerald-500/40 hover:border-emerald-400 shadow-2xl shadow-black/80 transition-all duration-300 hover:scale-105 active:scale-95 btn-interactive animate-float hover:shadow-emerald-950/40"
            title={isOpen ? "Close AI Chat" : "Open AI Assistant"}
          >
            <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-110">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </span>
            <span className="text-xs font-bold tracking-wide pr-1">
              {isOpen ? 'Close AI Chat' : 'Ask AI Assistant'}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
