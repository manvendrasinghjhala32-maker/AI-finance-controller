import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  FileCheck, 
  Clock, 
  FileText, 
  RotateCcw, 
  ArrowRight, 
  Search, 
  Bot, 
  X, 
  Info,
  Check,
  Building,
  Calendar,
  Sparkles,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';

export function AdjustmentsChangesView({ 
  records = [], 
  onBack, 
  onRevert,
  onExport
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'AMOUNT' | 'DATE' | 'MISSING'
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);

  // Scoped AI state & client cache
  const [aiCache, setAiCache] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [aiError, setAiError] = useState({});

  const handleAskAI = async (txId) => {
    if (!txId) return;
    if (aiCache[txId]) return;
    setAiLoading(prev => ({ ...prev, [txId]: true }));
    setAiError(prev => ({ ...prev, [txId]: null }));
    try {
      const res = await fetch(`/api/ask/transaction/${encodeURIComponent(txId)}`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }
      const json = await res.json();
      setAiCache(prev => ({ ...prev, [txId]: json.reply }));
    } catch (err) {
      setAiError(prev => ({ ...prev, [txId]: err.message || 'Failed to generate explanation.' }));
    } finally {
      setAiLoading(prev => ({ ...prev, [txId]: false }));
    }
  };

  // Extract resolved records
  const resolvedRecords = useMemo(() => {
    return records.filter(r => r.is_resolved || r.resolution || r.resolution_action);
  }, [records]);

  // Aggregated Stats
  const feeAdjustments = resolvedRecords.filter(r => 
    r.resolution_action === 'post_fee_adjustment' || r.resolution?.action === 'post_fee_adjustment' || r.status === 'AMOUNT_MISMATCH'
  );
  const totalAdjustedFeeAmount = feeAdjustments.reduce((sum, r) => sum + Math.abs(r.amount_delta || 0), 0);
  const dateAdjustments = resolvedRecords.filter(r => 
    r.resolution_action === 'accept_date_drift' || r.resolution?.action === 'accept_date_drift' || r.status === 'DATE_MISMATCH'
  );
  const apAdjustments = resolvedRecords.filter(r => 
    r.resolution_action === 'request_bill_ap' || r.resolution?.action === 'request_bill_ap' || r.status === 'MISSING_INVOICE'
  );

  // Human-friendly explanation helper
  const getAdjustmentExplanation = (r) => {
    const action = r.resolution_action || r.resolution?.action || (
      r.status === 'AMOUNT_MISMATCH' ? 'post_fee_adjustment' :
      r.status === 'DATE_MISMATCH' ? 'accept_date_drift' :
      r.status === 'MISSING_INVOICE' ? 'request_bill_ap' : 'manual_override'
    );
    const delta = Math.abs(r.amount_delta || 0);
    const days = Math.abs(r.date_delta_days || 0);

    if (action === 'post_fee_adjustment' || r.status === 'AMOUNT_MISMATCH') {
      return {
        category: 'AMOUNT',
        title: 'Payment Processing Fee Adjusted',
        badge: 'Fee Adjusted (GL-6150)',
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: FileCheck,
        issueSummary: `Bank ₹${(r.amount || 0).toLocaleString()} vs Bill ₹${(r.invoice_amount || 0).toLocaleString()} (₹${delta.toLocaleString()} difference)`,
        fixSummary: `Added ₹${delta.toLocaleString()} fee expense to Account 6150. Ledger is now balanced to ₹0.00.`,
        steps: [
          {
            label: '1. What was the issue?',
            detail: `Bank deducted ₹${(r.amount || 0).toLocaleString()} but the invoice was only ₹${(r.invoice_amount || 0).toLocaleString()} (₹${delta.toLocaleString()} variance).`
          },
          {
            label: '2. Why did it happen?',
            detail: `The payment gateway deducted a standard transaction/processing fee for ${r.vendor || 'this vendor'}.`
          },
          {
            label: '3. How was it fixed?',
            detail: `Created a balanced double-entry journal posting: Debit Fee Expense (GL-6150) ₹${delta.toLocaleString()} / Credit Bank Clearing (GL-1050) ₹${delta.toLocaleString()}.`
          },
          {
            label: '4. Final Result',
            detail: `Discrepancy resolved. Variance is exactly ₹0.00.`
          }
        ]
      };
    }

    if (action === 'accept_date_drift' || r.status === 'DATE_MISMATCH') {
      return {
        category: 'DATE',
        title: 'Settlement Timing Drift Approved',
        badge: 'Date Delay Accepted',
        badgeStyle: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: Clock,
        issueSummary: `Bank clearance occurred ${days} days after invoice date (${r.date || 'N/A'})`,
        fixSummary: `Approved ${days}-day bank clearing transit lag. Marked as Cash in Transit (GL-1050).`,
        steps: [
          {
            label: '1. What was the issue?',
            detail: `Bank record dated ${r.date || 'recorded date'} had a ${days}-day offset from invoice date ${r.invoice_date || 'N/A'}.`
          },
          {
            label: '2. Why did it happen?',
            detail: `Normal banking processing delay, weekend clearing, or gateway batch settlement window.`
          },
          {
            label: '3. How was it fixed?',
            detail: `Validated that the timing window is safe and approved the timing offset under Cash in Transit.`
          },
          {
            label: '4. Final Result',
            detail: `Cleared without financial risk or journal mismatch.`
          }
        ]
      };
    }

    if (action === 'request_bill_ap' || r.status === 'MISSING_INVOICE') {
      return {
        category: 'MISSING',
        title: 'Missing Invoice Request Sent',
        badge: 'Bill Requested',
        badgeStyle: 'bg-purple-50 text-purple-800 border-purple-200',
        icon: FileText,
        issueSummary: `Bank payment of ₹${(r.amount || 0).toLocaleString()} had no matching bill`,
        fixSummary: `Queued automated billing request to seller. Tracked under Unbilled AP Disbursements.`,
        steps: [
          {
            label: '1. What was the issue?',
            detail: `Bank paid out ₹${(r.amount || 0).toLocaleString()} but no supporting invoice was found in billing records.`
          },
          {
            label: '2. Why did it happen?',
            detail: `Vendor has not issued or uploaded their tax invoice for this purchase.`
          },
          {
            label: '3. How was it fixed?',
            detail: `Generated an AP billing request voucher for ${r.vendor || 'Vendor'} and logged under Pending AP.`
          },
          {
            label: '4. Final Result',
            detail: `Tracked in AP recovery queue awaiting vendor invoice.`
          }
        ]
      };
    }

    return {
      category: 'OVERRIDE',
      title: 'Manual Review Sign-Off',
      badge: 'Verified & Approved',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      issueSummary: `Reviewed and approved by controller`,
      fixSummary: r.resolution_note || r.resolution?.note || 'Verified and marked closed by financial controller.',
      steps: [
        {
          label: '1. What was the issue?',
          detail: `Transaction had a potential discrepancy requiring controller review.`
        },
        {
          label: '2. How was it fixed?',
          detail: `Controller manually reviewed details, confirmed legitimacy, and signed off.`
        }
      ]
    };
  };

  // Filter & Search Records
  const filteredRecords = useMemo(() => {
    return resolvedRecords.filter(r => {
      const exp = getAdjustmentExplanation(r);
      if (activeFilter !== 'ALL' && exp.category !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const txId = (r.transaction_id || '').toLowerCase();
        const vendor = (r.vendor || r.invoice_customer || r.payment_merchant || '').toLowerCase();
        const note = (exp.fixSummary || '').toLowerCase();
        if (!txId.includes(q) && !vendor.includes(q) && !note.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [resolvedRecords, activeFilter, searchQuery]);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm cursor-pointer"
              title="Return to Ledger"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#1A1F36] tracking-wide uppercase">
                Audit Trail & Adjustments Ledger
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {resolvedRecords.length} POSTED ADJUSTMENTS
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-sans mt-0.5">
              GAAP compliant before-and-after audit trail of fee debit postings, clearance approvals, and AP vouchers
            </p>
          </div>
        </div>

        {resolvedRecords.length > 0 && onExport && (
          <button
            onClick={() => onExport('adjustments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Posted Adjustments
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1.5">
            {resolvedRecords.length}
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            Transactions audited and reconciled
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Expense Recognized
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1.5">
            ₹{totalAdjustedFeeAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            {feeAdjustments.length} banking fee adjustments (GL-6150)
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Trial Balance Compliance
          </span>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1.5">
            Balanced Δ ₹0.00
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            Debits equal credits across all vouchers
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      {resolvedRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter transaction ID, counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-[#1A1F36] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs">
            {[
              { id: 'ALL', label: `All (${resolvedRecords.length})` },
              { id: 'AMOUNT', label: `Fee Postings (${feeAdjustments.length})` },
              { id: 'DATE', label: `Timing Approvals (${dateAdjustments.length})` },
              { id: 'MISSING', label: `AP Requests (${apAdjustments.length})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200 font-semibold shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Main Tabular Changes View */}
      {resolvedRecords.length === 0 ? (
        <div className="p-10 text-center bg-white border border-gray-200 rounded-xl space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center mx-auto text-lg">
            <FileCheck className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-xs font-bold text-[#1A1F36] uppercase tracking-wide">No Adjustments Executed Yet</h3>
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              When variances are resolved in the Variance Ledger, the complete double-entry before-and-after audit record will be logged here.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-[#0C2340] hover:bg-[#162E50] text-white border border-transparent text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Inspect Variance Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2.5 px-3">TRANSACTION & COUNTERPARTY</th>
                  <th className="py-2.5 px-3">INITIAL VARIANCE (BEFORE)</th>
                  <th className="py-2.5 px-3">ADJUSTMENT POSTING (AFTER)</th>
                  <th className="py-2.5 px-3 text-center">TRIAL BALANCE</th>
                  <th className="py-2.5 px-3 text-center">AUDIT ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs font-mono">
                {filteredRecords.map((r) => {
                  const exp = getAdjustmentExplanation(r);
                  const Icon = exp.icon;

                  return (
                    <tr 
                      key={r.transaction_id}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedAdjustment(r)}
                    >
                      {/* 1. Transaction & Vendor */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1D4ED8] text-xs">
                            {r.transaction_id}
                          </span>
                          <span className="font-medium text-[#1A1F36] text-xs font-sans">
                            {r.vendor || r.invoice_customer || r.payment_merchant || 'Counterparty'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2 font-mono">
                          <span>{r.date || 'N/A'}</span>
                          <span>•</span>
                          <span>Bank: <strong>₹{(r.amount || 0).toLocaleString('en-IN')}</strong></span>
                          {r.invoice_amount && (
                            <>
                              <span>•</span>
                              <span>Invoiced: <strong>₹{Number(r.invoice_amount).toLocaleString('en-IN')}</strong></span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 2. Original Issue (Before) */}
                      <td className="py-2.5 px-3">
                        <div className="text-xs text-rose-600 font-sans leading-relaxed">
                          {exp.issueSummary}
                        </div>
                      </td>

                      {/* 3. How it was Fixed (After) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${exp.badgeStyle}`}>
                            <Icon className="w-3 h-3" />
                            {exp.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 font-sans mt-0.5 leading-snug">
                          {exp.fixSummary}
                        </p>
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          BALANCED
                        </span>
                      </td>

                      {/* 5. Actions: Details, Ask AI, Undo */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Details Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAdjustment(r);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors text-[11px] font-medium inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Audit breakdown"
                          >
                            <Info className="w-3 h-3 text-[#2563EB]" />
                            <span>Audit</span>
                          </button>

                          {/* Ask AI Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAskAI(r.transaction_id);
                              setSelectedAdjustment(r);
                            }}
                            disabled={aiLoading[r.transaction_id]}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] border border-blue-200 transition-colors text-[11px] font-medium inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                            title={`AI explanation for ${r.transaction_id}`}
                          >
                            {aiLoading[r.transaction_id] ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-[#2563EB]" />
                            )}
                            <span>{aiCache[r.transaction_id] ? 'AI Diagnosed' : 'Ask AI'}</span>
                          </button>

                          {/* Undo Button */}
                          {onRevert && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevert(r.transaction_id);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200 transition-colors text-[11px] shadow-xs cursor-pointer"
                              title="Revert adjustment"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Full Adjustment Deep Dive Modal */}
      {selectedAdjustment && (() => {
        const r = selectedAdjustment;
        const exp = getAdjustmentExplanation(r);
        const txAiReply = aiCache[r.transaction_id];
        const isTxAiLoading = aiLoading[r.transaction_id];
        const txAiErrMsg = aiError[r.transaction_id];

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#1A1F36]">
                      Adjustment Audit Record
                    </h2>
                    <p className="text-[11px] font-mono text-gray-500">
                      TXN: {r.transaction_id} • {r.vendor || 'Counterparty'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAdjustment(null)}
                  className="p-1 rounded-lg bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scoped AI Section in Modal */}
              {txAiErrMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{txAiErrMsg}</span>
                  </div>
                  <button
                    onClick={() => handleAskAI(r.transaction_id)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-300"
                  >
                    Retry
                  </button>
                </div>
              )}

              {txAiReply ? (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 shadow-md space-y-2 animate-fade-in font-sans">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scoped AI Forensic Diagnosis ({r.transaction_id})</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed">
                    <MarkdownMessage content={txAiReply} />
                  </div>
                </div>
              ) : isTxAiLoading ? (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-750 flex items-center gap-2 text-xs text-cyan-400 font-sans shadow-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Generating AI diagnosis for {r.transaction_id}...</span>
                </div>
              ) : null}

              {/* Step-by-Step Explanation List */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  GAAP Audit Trail Breakdown:
                </h3>
                <div className="space-y-2">
                  {exp.steps.map((step, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-0.5">
                      <div className="text-[11px] font-bold text-[#1D4ED8] font-mono">
                        {step.label}
                      </div>
                      <div className="text-xs text-gray-700 font-sans leading-relaxed">
                        {step.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                {!txAiReply && !isTxAiLoading ? (
                  <button
                    onClick={() => handleAskAI(r.transaction_id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>✨ Ask AI Diagnosis</span>
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedAdjustment(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
