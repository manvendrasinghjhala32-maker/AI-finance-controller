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
    "Tell the forensic financial story of this batch",
    "Analyze fee leakage and merchant MDR toll drag",
    "Project 30-day operating liquidity & runway",
    "Propose balanced double-entry ERP adjustments"
  ];

  const txQuickPrompts = focusedTx ? [
    `Explain the forensic root cause of the ₹${Math.abs(focusedTx.amount_delta || 0).toLocaleString()} variance for ${focusedTx.transaction_id}`,
    `Show proposed balanced GL journal entry for ${focusedTx.transaction_id}`,
    `Provide CFO strategic remediation playbook for ${focusedTx.vendor || 'Counterparty'}`,
    `What is the working capital impact of ${focusedTx.transaction_id}?`
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
          <div className="fixed inset-0 z-50 w-screen h-screen bg-[#F7F8FA] flex flex-col overflow-hidden animate-fade-in select-none">
            {/* Top Fullscreen Header */}
            <div className="px-5 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] font-bold text-xs">
                  FC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-[#1A1F36] tracking-wide uppercase">
                      Financial Controller Copilot
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ACTIVE SESSION
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                    Autonomous GAAP reconciliation analysis, cash positioning, and journal adjustments
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 transition-colors shadow-xs cursor-pointer"
                  title="Exit Fullscreen Mode"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Exit Fullscreen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    setIsOpen(false);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Focused Transaction Banner (Fullscreen) */}
            {focusedTx && (
              <div className="px-5 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span className="text-[#1D4ED8] font-semibold">Focusing on {focusedTx.transaction_id}</span>
                  <span className="text-gray-700 font-sans">({focusedTx.vendor || focusedTx.invoice_customer || 'Counterparty'})</span>
                  <span className="text-gray-500">• Bank: ₹{(focusedTx.amount || 0).toLocaleString()} • Discrepancy: ₹{Math.abs(focusedTx.amount_delta || 0).toLocaleString()}</span>
                </div>
                {onClearFocus && (
                  <button 
                    onClick={onClearFocus}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline font-sans cursor-pointer"
                  >
                    Clear Focus
                  </button>
                )}
              </div>
            )}

            {/* Quick Suggestion Chips (Fullscreen) */}
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
              <span className="text-gray-500 shrink-0 text-[11px] font-medium">
                Suggested Queries:
              </span>
              {quickPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  disabled={chatLoading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Main Chat Feed Container */}
            <div className="flex-1 bg-[#F7F8FA] overflow-y-auto p-4 sm:p-6">
              <div className="max-w-4xl mx-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="h-[50vh] flex flex-col items-center justify-center text-center p-6 text-gray-500">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center mb-3">
                      <Bot className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1A1F36] uppercase tracking-wide mb-1">Financial Controller Copilot</h3>
                    <p className="text-xs text-gray-500 max-w-md font-sans leading-relaxed">
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
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-[#2563EB] flex-shrink-0 flex items-center justify-center text-xs mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-4xl px-4 py-3 rounded-xl leading-relaxed text-xs sm:text-sm shadow-xs ${
                          msg.role === 'user'
                            ? 'bg-[#0C2340] text-white font-sans'
                            : 'bg-white text-gray-800 border border-gray-200 font-sans'
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
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 text-[#2563EB] flex-shrink-0 flex items-center justify-center text-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs text-gray-500 shadow-xs">
                      <div className="w-3 h-3 border border-blue-200 border-t-[#2563EB] rounded-full animate-spin" />
                      Analyzing ledger data...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom Fullscreen Input Bar */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-gray-200">
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
                  className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-xs text-[#1A1F36] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || chatLoading}
                  className={`px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    !inputPrompt.trim() || chatLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-[#0C2340] hover:bg-[#162E50] text-white shadow-sm cursor-pointer'
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
            <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden w-[92vw] sm:w-[480px] h-[600px] max-h-[85vh]">
              {/* Top Modal Header */}
              <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] font-bold text-xs">
                    FC
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-[#1A1F36] tracking-wide uppercase">
                        Financial Copilot
                      </h3>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-sans block">
                      Creative CFO Strategic Intelligence
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Focused Transaction Banner */}
              {focusedTx && (
                <div className="px-3.5 py-1.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                    <span className="text-[#1D4ED8] font-semibold truncate font-mono">Focus: {focusedTx.transaction_id}</span>
                    <span className="text-gray-500 text-[10px] truncate">({focusedTx.vendor || 'Counterparty'})</span>
                  </div>
                  {onClearFocus && (
                    <button 
                      onClick={onClearFocus}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline font-sans shrink-0 ml-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Quick Suggestion Chips */}
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-1 overflow-x-auto text-[11px] scrollbar-none">
                {quickPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    disabled={chatLoading}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors whitespace-nowrap text-[10px] shadow-xs cursor-pointer font-medium"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 p-3.5 bg-[#F7F8FA] overflow-y-auto space-y-2.5 text-xs">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center mb-2">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#1A1F36] uppercase mb-1">Financial Controller Copilot</h4>
                    <p className="text-[11px] text-gray-500 max-w-xs font-sans">
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
                        <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-[#2563EB] flex-shrink-0 flex items-center justify-center text-[10px] mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[92%] px-3 py-2 rounded-xl leading-relaxed text-xs shadow-xs ${
                          msg.role === 'user'
                            ? 'bg-[#0C2340] text-white font-sans'
                            : 'bg-white text-gray-800 border border-gray-200 font-sans'
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
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-[#2563EB] flex-shrink-0 flex items-center justify-center text-[10px]">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] text-gray-500 shadow-xs">
                      <div className="w-2.5 h-2.5 border border-blue-200 border-t-[#2563EB] rounded-full animate-spin" />
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
                className="p-2.5 bg-white border-t border-gray-200 flex gap-2"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder="Inquire with financial copilot..."
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg text-[#1A1F36] placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || chatLoading}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    !inputPrompt.trim() || chatLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-[#0C2340] hover:bg-[#162E50] text-white shadow-sm cursor-pointer'
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
            className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0C2340] hover:bg-[#162E50] text-white rounded-full shadow-lg hover:shadow-xl transition-all font-sans text-xs font-medium cursor-pointer border border-transparent"
            title={isOpen ? "Close Copilot" : "Open Financial Copilot"}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {isOpen ? 'Close Copilot' : 'Financial Copilot'}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
