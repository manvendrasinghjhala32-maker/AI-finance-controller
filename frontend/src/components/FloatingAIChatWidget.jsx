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
    "Summarize material price variances across counterparties",
    "Identify unbilled disbursements requiring AP follow-up",
    "Project 30-day operating liquidity and cash runway",
    "Review proposed double-entry fee adjustments"
  ];

  const txQuickPrompts = focusedTx ? [
    `Explain the ₹${Math.abs(focusedTx.amount_delta || 0).toLocaleString()} variance for ${focusedTx.transaction_id}`,
    `Show proposed GL journal entry for ${focusedTx.transaction_id}`,
    `Provide root-cause forensic analysis for ${focusedTx.vendor || 'Counterparty'}`,
    `Are further AP vendor actions required for ${focusedTx.transaction_id}?`
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
          <div className="fixed inset-0 z-50 w-screen h-screen bg-[#0A0D14] flex flex-col overflow-hidden animate-fade-in select-none">
            {/* Top Fullscreen Header */}
            <div className="px-5 py-3.5 bg-[#111622] border-b border-[#1E2638] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[#141A27] border border-[#1E2638] flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                  FC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-white tracking-wide font-mono uppercase">
                      Financial Controller Copilot
                    </h2>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      ACTIVE SESSION
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Autonomous GAAP reconciliation analysis, cash positioning, and journal adjustments
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-slate-300 hover:text-white bg-[#141A27] hover:bg-[#1B2335] border border-[#1E2638] transition-colors"
                  title="Exit Fullscreen Mode"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exit Fullscreen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#141A27] transition-colors"
                  title="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Focused Transaction Banner (Fullscreen) */}
            {focusedTx && (
              <div className="px-5 py-2 bg-[#0E131E] border-b border-[#1E2638] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400 font-semibold">Focusing on {focusedTx.transaction_id}</span>
                  <span className="text-slate-300">({focusedTx.vendor || focusedTx.invoice_customer || 'Counterparty'})</span>
                  <span className="text-slate-400">• Bank: ₹{(focusedTx.amount || 0).toLocaleString()} • Discrepancy: ₹{Math.abs(focusedTx.amount_delta || 0).toLocaleString()}</span>
                </div>
                {onClearFocus && (
                  <button 
                    onClick={onClearFocus}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 underline font-mono"
                  >
                    Clear Focus
                  </button>
                )}
              </div>
            )}

            {/* Quick Suggestion Chips (Fullscreen) */}
            <div className="px-5 py-2 bg-[#111622] border-b border-[#1E2638] flex items-center gap-1.5 overflow-x-auto text-xs font-mono scrollbar-none">
              <span className="text-slate-500 shrink-0 text-[11px]">
                Suggested Queries:
              </span>
              {quickPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={chatLoading}
                  className="px-2.5 py-1 rounded bg-[#141A27] hover:bg-[#1B2335] text-slate-300 hover:text-white border border-[#1E2638] transition-colors whitespace-nowrap text-xs"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Main Chat Feed Container */}
            <div className="flex-1 bg-[#0A0D14] overflow-y-auto p-4 sm:p-6">
              <div className="max-w-4xl mx-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="h-[50vh] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded bg-[#111622] border border-[#1E2638] text-emerald-400 flex items-center justify-center mb-3">
                      <Bot className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide mb-1">Financial Controller Copilot</h3>
                    <p className="text-xs text-slate-400 max-w-md font-sans leading-relaxed">
                      Inquire on cash allocation, root causes of price variances, missing receipts, and automated general ledger adjustments.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded bg-[#141A27] border border-[#1E2638] text-emerald-400 flex-shrink-0 flex items-center justify-center text-xs font-mono mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-2xl px-4 py-3 rounded-lg leading-relaxed text-xs sm:text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#141A27] text-emerald-300 border border-emerald-500/30 font-mono'
                            : 'bg-[#111622] text-slate-200 border border-[#1E2638] font-sans'
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
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-7 h-7 rounded bg-[#141A27] border border-[#1E2638] text-emerald-400 flex-shrink-0 flex items-center justify-center text-xs font-mono">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-[#111622] border border-[#1E2638] px-3.5 py-2.5 rounded-lg flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <div className="w-3 h-3 border border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      Analyzing ledger data...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom Fullscreen Input Bar */}
            <div className="p-3.5 sm:p-4 bg-[#111622] border-t border-[#1E2638]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="max-w-4xl mx-auto flex gap-2.5"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Inquire regarding ledger entries, price variances, or cash flow..."
                  disabled={chatLoading}
                  className="flex-1 px-3.5 py-2 bg-[#141A27] border border-[#1E2638] rounded text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || chatLoading}
                  className={`px-4 py-2 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                    !inputPrompt.trim() || chatLoading
                      ? 'bg-[#141A27] text-slate-500 cursor-not-allowed border border-[#1E2638]'
                      : 'bg-[#1E2638] hover:bg-[#253046] text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CORNER POPUP MODAL */
          /* ========================================================================= */
          <div className="fixed bottom-20 right-6 z-50 select-none animate-scale-in">
            <div className="bg-[#111622] border border-[#1E2638] shadow-2xl rounded-xl flex flex-col overflow-hidden w-[92vw] sm:w-[460px] h-[560px] max-h-[85vh]">
              {/* Top Modal Header */}
              <div className="p-3.5 bg-[#111622] border-b border-[#1E2638] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-[#141A27] border border-[#1E2638] flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                    FC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                        Financial Copilot
                      </h3>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Autonomous Intelligence
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#141A27] transition-colors"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#141A27] transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Focused Transaction Banner */}
              {focusedTx && (
                <div className="px-3.5 py-1.5 bg-[#0E131E] border-b border-[#1E2638] flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-emerald-400 font-semibold truncate">Focus: {focusedTx.transaction_id}</span>
                    <span className="text-slate-400 text-[10px] truncate">({focusedTx.vendor || 'Counterparty'})</span>
                  </div>
                  {onClearFocus && (
                    <button 
                      onClick={onClearFocus}
                      className="text-[10px] text-slate-400 hover:text-emerald-400 underline font-mono shrink-0 ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Quick Suggestion Chips */}
              <div className="px-3 py-1.5 bg-[#111622] border-b border-[#1E2638] flex items-center gap-1 overflow-x-auto text-[11px] font-mono scrollbar-none">
                {quickPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    disabled={chatLoading}
                    className="px-2 py-0.5 rounded bg-[#141A27] hover:bg-[#1B2335] text-slate-300 hover:text-white border border-[#1E2638] transition-colors whitespace-nowrap text-[10px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 p-3.5 bg-[#0A0D14] overflow-y-auto space-y-2.5 text-xs">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <div className="w-10 h-10 rounded bg-[#111622] border border-[#1E2638] text-emerald-400 flex items-center justify-center mb-2">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono mb-1">Financial Controller Copilot</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs font-sans">
                      Inquire regarding transaction variances, unbilled items, or cash flow forecasts.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded bg-[#141A27] border border-[#1E2638] text-emerald-400 flex-shrink-0 flex items-center justify-center text-[10px] font-mono mt-0.5">
                          <Bot className="w-3 h-3" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg leading-relaxed text-xs ${
                          msg.role === 'user'
                            ? 'bg-[#141A27] text-emerald-300 border border-emerald-500/30 font-mono'
                            : 'bg-[#111622] text-slate-200 border border-[#1E2638] font-sans'
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
                  <div className="flex gap-2 justify-start items-center">
                    <div className="w-6 h-6 rounded bg-[#141A27] border border-[#1E2638] text-emerald-400 flex-shrink-0 flex items-center justify-center text-[10px] font-mono">
                      <Bot className="w-3 h-3" />
                    </div>
                    <div className="bg-[#111622] border border-[#1E2638] px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      <div className="w-2.5 h-2.5 border border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      Analyzing ledger data...
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
                className="p-2.5 bg-[#111622] border-t border-[#1E2638] flex gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Inquire with financial copilot..."
                  disabled={chatLoading}
                  className="flex-1 px-3 py-1.5 text-xs bg-[#141A27] border border-[#1E2638] rounded text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || chatLoading}
                  className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1 transition-colors ${
                    !inputPrompt.trim() || chatLoading
                      ? 'bg-[#141A27] text-slate-500 cursor-not-allowed border border-[#1E2638]'
                      : 'bg-[#1E2638] hover:bg-[#253046] text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <Send className="w-3 h-3" />
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
            className="flex items-center gap-2 px-3.5 py-2 bg-[#111622] hover:bg-[#151C2C] text-white rounded-full border border-[#1E2638] hover:border-emerald-500/40 shadow-lg transition-colors font-mono text-xs cursor-pointer"
            title={isOpen ? "Close Copilot" : "Open Financial Copilot"}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-slate-200">
              {isOpen ? 'Close Copilot' : 'Financial Copilot'}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
