import React, { useState } from 'react';
import { 
  Bot, 
  CheckCircle, 
  Clock, 
  FileText, 
  Sparkles, 
  FileCheck, 
  Check, 
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { API_BASE } from '../config';

export function AICommandCenter({ 
  selectedTx, 
  activeFilter = 'EXCEPTIONS',
  recentInsights = [], 
  onResolve, 
  onViewChanges,
  onSelectInsight
}) {
  const [resolving, setResolving] = useState(false);
  const [aiCache, setAiCache] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleAction = async (actionType, note) => {
    if (!selectedTx || resolving) return;
    setResolving(true);
    try {
      await onResolve(selectedTx.transaction_id, actionType, note);
    } finally {
      setResolving(false);
    }
  };

  const handleAskAI = async (txId) => {
    if (!txId) return;
    if (aiCache[txId]) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ask/transaction/${encodeURIComponent(txId)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }
      const json = await res.json();
      setAiCache(prev => ({ ...prev, [txId]: json.reply }));
    } catch (err) {
      setAiError(err.message || 'Failed to generate AI explanation.');
    } finally {
      setAiLoading(false);
    }
  };

  const deltaVal = selectedTx?.amount_delta || 0;
  const isResolved = selectedTx?.is_resolved;
  const currentAiReply = selectedTx ? aiCache[selectedTx.transaction_id] : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl flex flex-col h-full overflow-hidden shadow-sm">
      {/* 1. Header */}
      <div className="p-3.5 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-[#1A1F36] tracking-wide uppercase">
                Forensic Variance Inspector
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              {selectedTx ? `TX: ${selectedTx.transaction_id}` : 'Select a record to inspect'}
            </p>
          </div>
        </div>

        {selectedTx && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            selectedTx.status === 'AMOUNT_MISMATCH' 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : selectedTx.status === 'DATE_MISMATCH' 
              ? 'bg-amber-50 text-amber-700 border-amber-200' 
              : selectedTx.status === 'MISSING_INVOICE' 
              ? 'bg-slate-100 text-slate-700 border-slate-200' 
              : selectedTx.status === 'MULTIPLE_MATCHES'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : selectedTx.status === 'MATCH'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-700 border-gray-200'
          }`}>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/50">
        {selectedTx ? (
          <>
            {/* AI Diagnosis Card */}
            <div className="p-3.5 rounded-lg bg-white border border-gray-200 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  Root-Cause Forensics
                </span>
                <div className="flex items-center gap-2">
                  {selectedTx.confidence_score && (
                    <span className="text-[11px] font-mono text-gray-500">
                      {selectedTx.confidence_score}% Confidence
                    </span>
                  )}
                  <button
                    onClick={() => handleAskAI(selectedTx.transaction_id)}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    title="Generate isolated AI forensic diagnosis"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Thinking...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        <span>{currentAiReply ? 'AI Diagnosed' : '✨ Ask AI'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {aiError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span className="truncate">{aiError}</span>
                  </div>
                  <button
                    onClick={() => handleAskAI(selectedTx.transaction_id)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-300 shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {currentAiReply ? (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 shadow-md space-y-2 text-xs animate-fade-in font-sans">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scoped AI Diagnosis ({selectedTx.transaction_id})</span>
                  </div>
                  <MarkdownMessage content={currentAiReply} />
                </div>
              ) : (
                <p className="text-xs text-gray-700 leading-relaxed font-sans">
                  {selectedTx.ai_explanation || selectedTx.explanation || selectedTx.reason || 'Identified variance between reported banking statement and accounting ledger.'}
                </p>
              )}
            </div>

            {/* Comparison Grid (3 Cards) */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* Card 1: Amount Math */}
              <div className="p-2.5 rounded-lg bg-white border border-gray-200 flex flex-col justify-between shadow-sm">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">
                  Price Delta
                </span>
                <div className="my-1 text-xs font-bold font-mono">
                  {deltaVal !== 0 ? (
                    <span className={deltaVal > 0 ? 'text-amber-600' : 'text-rose-600'}>
                      {deltaVal > 0 ? `+₹${deltaVal.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaVal).toLocaleString('en-IN')}`}
                    </span>
                  ) : (
                    <span className="text-emerald-600">₹0.00</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-mono truncate">
                  Bank: ₹{selectedTx.amount?.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Card 2: Date Drift */}
              <div className="p-2.5 rounded-lg bg-white border border-gray-200 flex flex-col justify-between shadow-sm">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">
                  Settlement Lag
                </span>
                <div className="my-1 text-xs font-bold font-mono text-blue-600">
                  {selectedTx.date_delta_days ? `${selectedTx.date_delta_days > 0 ? '+' : ''}${selectedTx.date_delta_days}d` : '0d offset'}
                </div>
                <span className="text-[10px] text-gray-500 font-mono truncate">
                  {selectedTx.date || 'N/A'}
                </span>
              </div>

              {/* Card 3: Entity Similarity */}
              <div className="p-2.5 rounded-lg bg-white border border-gray-200 flex flex-col justify-between shadow-sm">
                <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">
                  Entity Match
                </span>
                <div className="my-1 text-xs font-bold font-mono text-emerald-600">
                  {selectedTx.merchant_match_score != null 
                    ? `${Math.round(selectedTx.merchant_match_score)}%` 
                    : (selectedTx.status === 'MISSING_INVOICE' ? 'No Bill' : '100%')}
                </div>
                <span className="text-[10px] text-gray-500 truncate" title={selectedTx.vendor}>
                  {selectedTx.vendor || 'Exact'}
                </span>
              </div>
            </div>

            {/* 1-Click Action Resolution */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center justify-between">
                <span>Audit Resolution Action</span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {selectedTx?.status === 'AMOUNT_MISMATCH' ? 'Fee Adjustment' : selectedTx?.status === 'DATE_MISMATCH' ? 'Transit Approval' : selectedTx?.status === 'MISSING_INVOICE' ? 'AP Request' : 'Verified'}
                </span>
              </div>

              {isResolved ? (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-800 flex items-center gap-1.5 font-bold text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ADJUSTMENT POSTED & BALANCED
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono font-medium">
                      {selectedTx.resolution?.action || selectedTx.resolution_action || 'RESOLVED'}
                    </span>
                  </div>
                  {onViewChanges && (
                    <button
                      onClick={onViewChanges}
                      className="w-full py-2 px-3 bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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
                      className="w-full p-3 rounded-lg bg-white hover:bg-rose-50/60 border border-rose-200 text-left transition-colors flex items-center gap-3 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1A1F36] group-hover:text-rose-700 transition-colors">Post Processing Fee (GL-6150)</div>
                        <div className="text-[11px] text-gray-500">Adjust ₹{Math.abs(deltaVal) || 150} fee variance to debit expense</div>
                      </div>
                    </button>
                  )}

                  {/* 2. Date Delay / Drift */}
                  {(selectedTx?.status === 'DATE_MISMATCH' || (!selectedTx?.status && activeFilter === 'DATE')) && (
                    <button
                      onClick={() => handleAction('accept_date_drift', 'Approved settlement delay')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-white hover:bg-blue-50/60 border border-blue-200 text-left transition-colors flex items-center gap-3 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1A1F36] group-hover:text-blue-700 transition-colors">Approve Settlement Transit Window</div>
                        <div className="text-[11px] text-gray-500">Accept {Math.abs(selectedTx?.date_delta_days || 0)}-day banking clearance transit delay</div>
                      </div>
                    </button>
                  )}

                  {/* 3. Missing Bill / Unmatched Receipt */}
                  {(selectedTx?.status === 'MISSING_INVOICE' || (!selectedTx?.status && activeFilter === 'MISSING')) && (
                    <button
                      onClick={() => handleAction('request_bill_ap', 'Bill request sent to seller')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-white hover:bg-purple-50/60 border border-purple-200 text-left transition-colors flex items-center gap-3 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1A1F36] group-hover:text-purple-700 transition-colors">Request AP Vendor Invoice</div>
                        <div className="text-[11px] text-gray-500">Queue automated tax bill request to vendor</div>
                      </div>
                    </button>
                  )}

                  {/* 4. Multiple Matches / Shared PO */}
                  {(selectedTx?.status === 'MULTIPLE_MATCHES' || (!selectedTx?.status && activeFilter === 'MULTIPLE')) && (
                    <button
                      onClick={() => handleAction('confirm_multi_match', 'Reviewed and resolved shared PO candidate')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-white hover:bg-amber-50/60 border border-amber-200 text-left transition-colors flex items-center gap-3 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1A1F36] group-hover:text-amber-700 transition-colors">Confirm Shared PO Allocation</div>
                        <div className="text-[11px] text-gray-500">Map transaction to PO reference {selectedTx?.reference || ''}</div>
                      </div>
                    </button>
                  )}

                  {/* 5. Duplicate Transaction */}
                  {(selectedTx?.status === 'DUPLICATE' || (!selectedTx?.status && activeFilter === 'DUPLICATE')) && (
                    <button
                      onClick={() => handleAction('manual_override', 'Duplicate transaction marked and verified')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-left transition-colors flex items-center gap-3 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1A1F36] group-hover:text-gray-900 transition-colors">Isolate Duplicate Entry</div>
                        <div className="text-[11px] text-gray-500">Confirm duplicate and exclude from active ledger</div>
                      </div>
                    </button>
                  )}

                  {/* 6. Clean Match / General Approval */}
                  {selectedTx?.status === 'MATCH' && (
                    <button
                      onClick={() => handleAction('manual_override', 'Transaction reviewed and approved')}
                      disabled={resolving}
                      className="w-full p-3 rounded-lg bg-white hover:bg-emerald-50/60 border border-emerald-200 text-left transition-colors flex items-center gap-3 shadow-sm group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#1A1F36] group-hover:text-emerald-800 transition-colors">Mark Transaction Verified</div>
                        <div className="text-[11px] text-gray-500">Approve reconciliation and close entry</div>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 mx-auto mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-gray-600">No Record Selected</p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
              Select a transaction from the exception ledger to view root-cause diagnostics and post 1-click accounting adjustments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
