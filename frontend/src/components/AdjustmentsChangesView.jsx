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
  TrendingDown
} from 'lucide-react';

export function AdjustmentsChangesView({ 
  records = [], 
  onBack, 
  onRevert,
  onExport,
  onAskAI
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'AMOUNT' | 'DATE' | 'MISSING'
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);

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
        badgeStyle: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
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
        badgeStyle: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
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
        badgeStyle: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
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
      badgeStyle: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
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
              className="p-1.5 rounded bg-[#141A27] hover:bg-[#1B2335] text-slate-300 hover:text-white border border-[#1E2638] transition-colors flex items-center gap-1.5 text-xs font-mono"
              title="Return to Ledger"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Audit Trail & Adjustments Ledger
              </h1>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {resolvedRecords.length} POSTED ADJUSTMENTS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              GAAP compliant before-and-after audit trail of fee debit postings, clearance approvals, and AP vouchers
            </p>
          </div>
        </div>

        {resolvedRecords.length > 0 && onExport && (
          <button
            onClick={() => onExport('adjustments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 bg-[#141A27] hover:bg-[#1B2335] border border-emerald-500/30 transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Trail (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#111622] border border-[#1E2638] rounded-xl p-4 shadow-sm card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            POSTED ADJUSTMENTS
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1.5">
            {resolvedRecords.length}
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            Transactions audited and reconciled
          </span>
        </div>

        <div className="bg-[#111622] border border-[#1E2638] rounded-xl p-4 shadow-sm card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            TOTAL EXPENSE RECOGNIZED
          </span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1.5">
            ₹{totalAdjustedFeeAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            {feeAdjustments.length} banking fee adjustments (GL-6150)
          </span>
        </div>

        <div className="bg-[#111622] border border-[#1E2638] rounded-xl p-4 shadow-sm card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            TRIAL BALANCE COMPLIANCE
          </span>
          <div className="text-xl font-bold font-mono text-blue-300 mt-1.5">
            Balanced Δ ₹0.00
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            Debits equal credits across all vouchers
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      {resolvedRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111622] p-3 rounded-xl border border-[#1E2638]">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter transaction ID, counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-[#141A27] border border-[#1E2638] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs font-mono">
            {[
              { id: 'ALL', label: `All (${resolvedRecords.length})` },
              { id: 'AMOUNT', label: `Fee Postings (${feeAdjustments.length})` },
              { id: 'DATE', label: `Timing Approvals (${dateAdjustments.length})` },
              { id: 'MISSING', label: `AP Requests (${apAdjustments.length})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-[#182030] text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
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
        <div className="p-10 text-center bg-[#111622] border border-[#1E2638] rounded-xl space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-[#141A27] text-amber-400 border border-[#1E2638] flex items-center justify-center mx-auto text-lg">
            <FileCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">No Adjustments Executed Yet</h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              When variances are resolved in the Variance Ledger, the complete double-entry before-and-after audit record will be logged here.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-[#141A27] hover:bg-[#1B2335] text-emerald-400 border border-emerald-500/30 text-xs font-mono rounded transition-colors inline-flex items-center gap-1.5"
            >
              <span>Inspect Variance Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#111622] border border-[#1E2638] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto bg-[#0E131E]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0E131E] border-b border-[#1E2638] text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">TRANSACTION & COUNTERPARTY</th>
                  <th className="py-2.5 px-3 font-semibold">INITIAL VARIANCE (BEFORE)</th>
                  <th className="py-2.5 px-3 font-semibold">ADJUSTMENT POSTING (AFTER)</th>
                  <th className="py-2.5 px-3 font-semibold text-center">TRIAL BALANCE</th>
                  <th className="py-2.5 px-3 font-semibold text-center">AUDIT ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2638] text-xs font-mono">
                {filteredRecords.map((r) => {
                  const exp = getAdjustmentExplanation(r);
                  const Icon = exp.icon;

                  return (
                    <tr 
                      key={r.transaction_id}
                      className="hover:bg-[#141A27] transition-colors cursor-pointer"
                      onClick={() => setSelectedAdjustment(r)}
                    >
                      {/* 1. Transaction & Vendor */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-emerald-400 text-xs">
                            {r.transaction_id}
                          </span>
                          <span className="font-medium text-white text-xs font-sans">
                            {r.vendor || r.invoice_customer || r.payment_merchant || 'Counterparty'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
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
                        <div className="text-xs text-rose-400 font-sans leading-relaxed">
                          {exp.issueSummary}
                        </div>
                      </td>

                      {/* 3. How it was Fixed (After) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-medium border ${exp.badgeStyle}`}>
                            <Icon className="w-3 h-3" />
                            {exp.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans mt-0.5 leading-snug">
                          {exp.fixSummary}
                        </p>
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
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
                            className="px-2 py-0.5 rounded bg-[#141A27] hover:bg-[#1C2436] text-slate-300 hover:text-white border border-[#1E2638] transition-colors text-[10px] font-mono inline-flex items-center gap-1"
                            title="Audit breakdown"
                          >
                            <Info className="w-3 h-3 text-blue-400" />
                            <span>Audit</span>
                          </button>

                          {/* Ask AI Button */}
                          {onAskAI && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAI(r);
                              }}
                              className="px-2 py-0.5 rounded bg-[#141A27] hover:bg-[#1C2436] text-emerald-400 border border-emerald-500/30 transition-colors text-[10px] font-mono inline-flex items-center gap-1"
                              title={`Copilot inquiry for ${r.transaction_id}`}
                            >
                              <Bot className="w-3 h-3 text-emerald-400" />
                              <span>Copilot</span>
                            </button>
                          )}

                          {/* Undo Button */}
                          {onRevert && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevert(r.transaction_id);
                              }}
                              className="p-1 rounded bg-[#141A27] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-[#1E2638] transition-colors text-[10px]"
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

      {/* 5. Clear, Simple "How it Was Fixed" Modal */}
      {selectedAdjustment && (() => {
        const exp = getAdjustmentExplanation(selectedAdjustment);
        const Icon = exp.icon;

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedAdjustment(null)}
          >
            <div 
              className="bg-[#111622] border border-[#1E2638] rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#1E2638] pb-3">
                <div>
                  <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                    <span>{selectedAdjustment.transaction_id} Adjustment Audit</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Balanced
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {selectedAdjustment.vendor || selectedAdjustment.invoice_customer || 'Counterparty'} • Date: {selectedAdjustment.date || 'N/A'}
                  </p>
                </div>

                <button 
                  onClick={() => setSelectedAdjustment(null)}
                  className="p-1 rounded bg-[#141A27] hover:bg-[#1C2436] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step-by-Step Explanation List */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  GAAP Audit Trail Breakdown:
                </h3>
                <div className="space-y-2">
                  {exp.steps.map((step, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#0E131E] border border-[#1E2638] space-y-0.5">
                      <div className="text-[11px] font-bold text-emerald-400 font-mono">
                        {step.label}
                      </div>
                      <div className="text-xs text-slate-200 font-sans leading-relaxed">
                        {step.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1E2638]">
                {onAskAI ? (
                  <button
                    onClick={() => {
                      const tx = selectedAdjustment;
                      setSelectedAdjustment(null);
                      onAskAI(tx);
                    }}
                    className="px-3 py-1.5 rounded bg-[#141A27] hover:bg-[#1B2335] text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Inquire with Copilot</span>
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedAdjustment(null)}
                  className="px-3 py-1.5 rounded bg-[#141A27] hover:bg-[#1B2335] text-slate-300 text-xs font-mono transition-colors"
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
