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
    <div className="figma-card flex flex-col h-full overflow-hidden shadow-sm bg-[#111622] border border-[#1E2638]">
      {/* 1. Header */}
      <div className="p-3.5 border-b border-[#1E2638] bg-[#111622] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#141A27] border border-[#1E2638] flex items-center justify-center text-emerald-400 font-mono text-xs">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white tracking-wide font-mono uppercase">
                FORENSIC VARIANCE INSPECTOR
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {selectedTx ? `TX: ${selectedTx.transaction_id}` : 'Select a record to inspect'}
            </p>
          </div>
        </div>

        {selectedTx && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#141A27] text-slate-300 border border-[#1E2638]">
            {selectedTx.status === 'AMOUNT_MISMATCH' 
              ? 'PRICE VARIANCE' 
              : selectedTx.status === 'DATE_MISMATCH' 
              ? 'TIMING DRIFT' 
              : selectedTx.status === 'MISSING_INVOICE' 
              ? 'UNBILLED' 
              : selectedTx.status === 'MULTIPLE_MATCHES'
              ? 'MULTI-MATCH'
              : selectedTx.status}
          </span>
        )}
      </div>

      {/* 2. Body / Inspector Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0E131E]">
        {selectedTx ? (
          <>
            {/* AI Diagnosis Card */}
            <div className="p-3 rounded-lg bg-[#111622] border border-[#1E2638] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  ROOT-CAUSE FORENSICS
                </span>
                {selectedTx.confidence_score && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {selectedTx.confidence_score}% Confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {selectedTx.ai_explanation || selectedTx.explanation || selectedTx.reason || 'Identified variance between reported banking statement and accounting ledger.'}
              </p>
            </div>

            {/* Comparison Grid (3 Cards) */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {/* Card 1: Amount Math */}
              <div className="p-2.5 rounded bg-[#111622] border border-[#1E2638] flex flex-col justify-between">
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                  PRICE DELTA
                </span>
                <div className="my-1 text-xs font-bold text-white">
                  {deltaVal !== 0 ? (
                    <span className={deltaVal > 0 ? 'text-amber-400' : 'text-rose-400'}>
                      {deltaVal > 0 ? `+₹${deltaVal.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaVal).toLocaleString('en-IN')}`}
                    </span>
                  ) : (
                    <span className="text-emerald-400">₹0.00</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 truncate">
                  Bank: ₹{selectedTx.amount?.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Card 2: Date Drift */}
              <div className="p-2.5 rounded bg-[#111622] border border-[#1E2638] flex flex-col justify-between">
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                  SETTLEMENT LAG
                </span>
                <div className="my-1 text-xs font-bold text-blue-400">
                  {selectedTx.date_delta_days ? `${selectedTx.date_delta_days > 0 ? '+' : ''}${selectedTx.date_delta_days}d` : '0d offset'}
                </div>
                <span className="text-[10px] text-slate-400 truncate">
                  {selectedTx.date || 'N/A'}
                </span>
              </div>

              {/* Card 3: Entity Similarity */}
              <div className="p-2.5 rounded bg-[#111622] border border-[#1E2638] flex flex-col justify-between">
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                  ENTITY MATCH
                </span>
                <div className="my-1 text-xs font-bold text-emerald-400">
                  {selectedTx.merchant_match_score != null 
                    ? `${Math.round(selectedTx.merchant_match_score)}%` 
                    : (selectedTx.status === 'MISSING_INVOICE' ? 'No Bill' : '100%')}
                </div>
                <span className="text-[10px] text-slate-400 truncate" title={selectedTx.vendor}>
                  {selectedTx.vendor || 'Exact'}
                </span>
              </div>
            </div>

            {/* 1-Click Action Resolution */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>AUDIT RESOLUTION ACTION</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedTx?.status === 'AMOUNT_MISMATCH' ? 'Fee Adjustment' : selectedTx?.status === 'DATE_MISMATCH' ? 'Transit Approval' : selectedTx?.status === 'MISSING_INVOICE' ? 'AP Request' : 'Verified'}
                </span>
              </div>

              {isResolved ? (
                <div className="p-3 rounded-lg bg-[#111622] border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      ADJUSTMENT POSTED & BALANCED
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedTx.resolution?.action || selectedTx.resolution_action || 'RESOLVED'}
                    </span>
                  </div>
                  {onViewChanges && (
                    <button
                      onClick={onViewChanges}
                      className="w-full py-1.5 px-2.5 bg-[#141A27] hover:bg-[#1C2436] text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Audit Trail & Compliance Log →</span>
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
                      className="w-full p-2.5 rounded bg-[#111622] hover:bg-[#161E2E] border border-rose-500/30 hover:border-rose-500/50 text-left transition-colors flex items-center gap-2.5 shadow-sm"
                    >
                      <FileCheck className="w-4 h-4 shrink-0 text-rose-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Post Processing Fee (GL-6150)</div>
                        <div className="text-[11px] text-slate-400 font-sans">Adjust ₹{Math.abs(deltaVal) || 150} fee variance to debit expense</div>
                      </div>
                    </button>
                  )}

                  {/* 2. Date Delay / Drift */}
                  {(selectedTx?.status === 'DATE_MISMATCH' || (!selectedTx?.status && activeFilter === 'DATE')) && (
                    <button
                      onClick={() => handleAction('accept_date_drift', 'Approved settlement delay')}
                      disabled={resolving}
                      className="w-full p-2.5 rounded bg-[#111622] hover:bg-[#161E2E] border border-blue-500/30 hover:border-blue-500/50 text-left transition-colors flex items-center gap-2.5 shadow-sm"
                    >
                      <Clock className="w-4 h-4 shrink-0 text-blue-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Approve Settlement Transit Window</div>
                        <div className="text-[11px] text-slate-400 font-sans">Accept {Math.abs(selectedTx?.date_delta_days || 0)}-day banking clearance transit delay</div>
                      </div>
                    </button>
                  )}

                  {/* 3. Missing Bill / Unmatched Receipt */}
                  {(selectedTx?.status === 'MISSING_INVOICE' || (!selectedTx?.status && activeFilter === 'MISSING')) && (
                    <button
                      onClick={() => handleAction('request_bill_ap', 'Bill request sent to seller')}
                      disabled={resolving}
                      className="w-full p-2.5 rounded bg-[#111622] hover:bg-[#161E2E] border border-purple-500/30 hover:border-purple-500/50 text-left transition-colors flex items-center gap-2.5 shadow-sm"
                    >
                      <FileText className="w-4 h-4 shrink-0 text-purple-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Request AP Vendor Invoice</div>
                        <div className="text-[11px] text-slate-400 font-sans">Queue automated tax bill request to vendor</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Multiple Matches / Shared PO */}
                  {(selectedTx?.status === 'MULTIPLE_MATCHES' || (!selectedTx?.status && activeFilter === 'MULTIPLE')) && (
                    <button
                      onClick={() => handleAction('confirm_multi_match', 'Reviewed and resolved shared PO candidate')}
                      disabled={resolving}
                      className="w-full p-2.5 rounded bg-[#111622] hover:bg-[#161E2E] border border-amber-500/30 hover:border-amber-500/50 text-left transition-colors flex items-center gap-2.5 shadow-sm"
                    >
                      <FileCheck className="w-4 h-4 shrink-0 text-amber-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Confirm Shared PO Allocation</div>
                        <div className="text-[11px] text-slate-400 font-sans">Map transaction to PO reference {selectedTx?.reference || ''}</div>
                      </div>
                    </button>
                  )}

                  {/* 5. Duplicate Transaction */}
                  {(selectedTx?.status === 'DUPLICATE' || (!selectedTx?.status && activeFilter === 'DUPLICATE')) && (
                    <button
                      onClick={() => handleAction('manual_override', 'Duplicate transaction marked and verified')}
                      disabled={resolving}
                      className="w-full p-2.5 rounded bg-[#111622] hover:bg-[#161E2E] border border-slate-500/30 text-left transition-colors flex items-center gap-2.5 shadow-sm"
                    >
                      <Check className="w-4 h-4 shrink-0 text-slate-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Isolate Duplicate Entry</div>
                        <div className="text-[11px] text-slate-400 font-sans">Confirm duplicate and exclude from active ledger</div>
                      </div>
                    </button>
                  )}

                  {/* 6. Clean Match / General Approval */}
                  {selectedTx?.status === 'MATCH' && (
                    <button
                      onClick={() => handleAction('manual_override', 'Transaction reviewed and approved')}
                      disabled={resolving}
                      className="w-full p-2.5 rounded bg-[#111622] hover:bg-[#161E2E] border border-emerald-500/30 text-left transition-colors flex items-center gap-2.5 shadow-sm"
                    >
                      <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-xs text-slate-200">Mark Transaction Verified</div>
                        <div className="text-[11px] text-slate-400 font-sans">Approve reconciliation and close entry</div>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            Select a row from the ledger to inspect transaction forensic details.
          </div>
        )}
      </div>
    </div>
  );
}
