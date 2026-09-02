import React, { useState } from 'react';
import { 
  Bot, 
  CheckCircle, 
  Clock, 
  FileText, 
  Sparkles, 
  FileCheck, 
  Check, 
  Eye 
} from 'lucide-react';

export function AICommandCenter({ 
  selectedTx, 
  activeFilter = 'EXCEPTIONS',
  recentInsights = [], 
  onResolve, 
  onViewChanges,
  onSelectInsight
}) {
  const [resolving, setResolving] = useState(false);

  const handleAction = async (actionType, note) => {
    if (!selectedTx || resolving) return;
    setResolving(true);
    try {
      await onResolve(selectedTx.transaction_id, actionType, note);
    } finally {
      setResolving(false);
    }
  };

  const deltaVal = selectedTx?.amount_delta || 0;
  const isResolved = selectedTx?.is_resolved;

  return (
    <div className="figma-card flex flex-col h-full overflow-hidden shadow-xl bg-[#171717] border border-[#2F2F2F]">
      {/* 1. Header */}
      <div className="p-4 border-b border-[#2F2F2F] bg-[#171717] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2F2F2F] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide font-mono">
                AI ISSUE INSPECTOR
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {selectedTx ? `Transaction ${selectedTx.transaction_id}` : 'Select a record to inspect'}
            </p>
          </div>
        </div>

        {selectedTx && (
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30">
            {selectedTx.status === 'AMOUNT_MISMATCH' 
              ? 'PRICE DELTA' 
              : selectedTx.status === 'DATE_MISMATCH' 
              ? 'DATE DELAY' 
              : selectedTx.status === 'MISSING_INVOICE' 
              ? 'MISSING BILL' 
              : selectedTx.status === 'MULTIPLE_MATCHES'
              ? 'MULTI CANDIDATES'
              : selectedTx.status}
          </span>
        )}
      </div>

      {/* 2. Body / Inspector Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#171717]">
        {selectedTx ? (
          <>
            {/* AI Diagnosis Card */}
            <div className="p-3.5 rounded-xl bg-[#212121] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  AI EXPLANATION
                </span>
                {selectedTx.confidence_score && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    {selectedTx.confidence_score}% Confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {selectedTx.ai_explanation || selectedTx.explanation || selectedTx.reason || 'A price or date difference was found between the bank and invoices.'}
              </p>
            </div>

            {/* Comparison Grid (3 Cards) */}
            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              {/* Card 1: Amount Math */}
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2F2F2F] flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  PRICE DIFFERENCE
                </span>
                <div className="my-1 text-sm font-bold text-white">
                  {deltaVal !== 0 ? (
                    <span className={deltaVal > 0 ? 'text-amber-400' : 'text-rose-400'}>
                      {deltaVal > 0 ? `+₹${deltaVal.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaVal).toLocaleString('en-IN')}`}
                    </span>
                  ) : (
                    <span className="text-emerald-400">₹0.00</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  Bank: ₹{selectedTx.amount?.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Card 2: Date Drift */}
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2F2F2F] flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  DATE DELAY
                </span>
                <div className="my-1 text-sm font-bold text-cyan-400">
                  {selectedTx.date_delta_days ? `${selectedTx.date_delta_days > 0 ? '+' : ''}${selectedTx.date_delta_days}d` : '0d offset'}
                </div>
                <span className="text-[10px] text-slate-400 truncate">
                  {selectedTx.date || 'N/A'}
                </span>
              </div>

              {/* Card 3: Entity Similarity */}
              <div className="p-3 rounded-lg bg-[#212121] border border-[#2F2F2F] flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  NAME MATCH
                </span>
                <div className="my-1 text-sm font-bold text-emerald-400">
                  {selectedTx.merchant_match_score != null 
                    ? `${Math.round(selectedTx.merchant_match_score)}%` 
                    : (selectedTx.status === 'MISSING_INVOICE' ? 'No Bill' : '100%')}
                </div>
                <span className="text-[10px] text-slate-400 truncate" title={selectedTx.vendor}>
                  {selectedTx.vendor || 'Exact'}
                </span>
              </div>
            </div>

            {/* 1-Click Action Button (Only the single action in use) */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>QUICK FIX ACTION</span>
                <span className="text-[10px] text-emerald-400 font-mono font-normal">
                  {selectedTx?.status === 'AMOUNT_MISMATCH' ? 'Price Adjustment' : selectedTx?.status === 'DATE_MISMATCH' ? 'Timing Approval' : selectedTx?.status === 'MISSING_INVOICE' ? 'AP Vendor Request' : selectedTx?.status === 'DUPLICATE' ? 'Duplicate Check' : 'Verified'}
                </span>
              </div>

              {isResolved ? (
                <div className="p-3 rounded-lg bg-[#212121] border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ADJUSTMENT APPLIED & FIXED
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedTx.resolution?.action || selectedTx.resolution_action || 'RESOLVED'}
                    </span>
                  </div>
                  {onViewChanges && (
                    <button
                      onClick={onViewChanges}
                      className="w-full py-2 px-3 bg-[#2F2F2F] hover:bg-[#3A3A3A] text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Changes & Audit Log →</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* 1. Price Difference / Fee Delta */}
                  {(selectedTx?.status === 'AMOUNT_MISMATCH' || (!selectedTx?.status && activeFilter === 'AMOUNT')) && (
                    <button
                      onClick={() => handleAction('post_fee_adjustment', 'Payment fee adjusted to GL-6150')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-amber-500/40 text-amber-300 text-left transition-colors flex items-center gap-3 shadow-sm card-interactive"
                    >
                      <FileCheck className="w-5 h-5 shrink-0 text-amber-400" />
                      <div>
                        <div className="font-bold text-sm">Adjust Processing Fee</div>
                        <div className="text-xs text-slate-400 font-sans">Fix ₹{Math.abs(deltaVal) || 150} fee difference (GL-6150)</div>
                      </div>
                    </button>
                  )}

                  {/* 2. Date Delay / Drift */}
                  {(selectedTx?.status === 'DATE_MISMATCH' || (!selectedTx?.status && activeFilter === 'DATE')) && (
                    <button
                      onClick={() => handleAction('accept_date_drift', 'Approved settlement delay')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-cyan-500/40 text-cyan-300 text-left transition-colors flex items-center gap-3 shadow-sm card-interactive"
                    >
                      <Clock className="w-5 h-5 shrink-0 text-cyan-400" />
                      <div>
                        <div className="font-bold text-sm">Approve Date Delay</div>
                        <div className="text-xs text-slate-400 font-sans">Accept bank processing lag ({Math.abs(selectedTx?.date_delta_days || 0)} days)</div>
                      </div>
                    </button>
                  )}

                  {/* 3. Missing Bill / Unmatched Receipt */}
                  {(selectedTx?.status === 'MISSING_INVOICE' || (!selectedTx?.status && activeFilter === 'MISSING')) && (
                    <button
                      onClick={() => handleAction('request_bill_ap', 'Bill request sent to seller')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-rose-500/40 text-rose-300 text-left transition-colors flex items-center gap-3 shadow-sm card-interactive"
                    >
                      <FileText className="w-5 h-5 shrink-0 text-rose-400" />
                      <div>
                        <div className="font-bold text-sm">Request Missing Bill</div>
                        <div className="text-xs text-slate-400 font-sans">Ask seller/vendor for missing invoice</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Multiple Matches / Shared PO */}
                  {(selectedTx?.status === 'MULTIPLE_MATCHES' || (!selectedTx?.status && activeFilter === 'MULTIPLE')) && (
                    <button
                      onClick={() => handleAction('confirm_multi_match', 'Reviewed and resolved shared PO candidate')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-amber-500/40 text-amber-300 text-left transition-colors flex items-center gap-3 shadow-sm card-interactive"
                    >
                      <FileCheck className="w-5 h-5 shrink-0 text-amber-400" />
                      <div>
                        <div className="font-bold text-sm">Review Shared PO Invoices</div>
                        <div className="text-xs text-slate-400 font-sans">Select matching invoice for PO {selectedTx?.reference || ''}</div>
                      </div>
                    </button>
                  )}

                  {/* 5. Duplicate Transaction */}
                  {(selectedTx?.status === 'DUPLICATE' || (!selectedTx?.status && activeFilter === 'DUPLICATE')) && (
                    <button
                      onClick={() => handleAction('manual_override', 'Duplicate transaction marked and verified')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-purple-500/40 text-purple-300 text-left transition-colors flex items-center gap-3 shadow-sm card-interactive"
                    >
                      <Check className="w-5 h-5 shrink-0 text-purple-400" />
                      <div>
                        <div className="font-bold text-sm">Mark Duplicate Verified</div>
                        <div className="text-xs text-slate-400 font-sans">Confirm and isolate duplicate entry</div>
                      </div>
                    </button>
                  )}

                  {/* 6. Clean Match / General Approval */}
                  {selectedTx?.status === 'MATCH' && (
                    <button
                      onClick={() => handleAction('manual_override', 'Transaction reviewed and approved')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-emerald-500/40 text-emerald-300 text-left transition-colors flex items-center gap-3 shadow-sm card-interactive"
                    >
                      <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                      <div>
                        <div className="font-bold text-sm">Mark as Approved</div>
                        <div className="text-xs text-slate-400 font-sans">Approve and close issue</div>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Select a row from the list to inspect transaction details.
          </div>
        )}
      </div>
    </div>
  );
}
