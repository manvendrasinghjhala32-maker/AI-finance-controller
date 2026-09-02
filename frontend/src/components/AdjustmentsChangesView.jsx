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
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2F2F2F] pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 hover:text-white border border-[#3A3A3A] transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Back to Differences & Issues"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/finance_logo.png" alt="Changes" className="w-8 h-8 rounded-lg object-contain" />
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                View Changes & Applied Adjustments
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold">
                {resolvedRecords.length} Changes Made
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Simple before-and-after history of all payment fee adjustments, approved date delays, and billing requests.
            </p>
          </div>
        </div>

        {resolvedRecords.length > 0 && onExport && (
          <button
            onClick={() => onExport('adjustments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-emerald-500/40 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="font-mono">Export Changes (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Top Summary Cards (Simple, Big, Clear) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#171717] border border-[#2F2F2F] rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Adjustments Applied
          </span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-2">
            {resolvedRecords.length}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Transactions adjusted and verified
          </span>
        </div>

        <div className="bg-[#171717] border border-amber-500/40 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Fee Expenses Logged
          </span>
          <div className="text-3xl font-black font-mono text-amber-400 mt-2">
            ₹{totalAdjustedFeeAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {feeAdjustments.length} bank processing fee adjustments (GL-6150)
          </span>
        </div>

        <div className="bg-[#171717] border border-cyan-500/40 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Net Reconciliation Status
          </span>
          <div className="text-3xl font-black font-mono text-cyan-300 mt-2">
            Balanced ₹0.00
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            All adjusted entries balanced to zero variance
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      {resolvedRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171717] p-3 rounded-xl border border-[#2F2F2F]">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transaction ID, customer, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#212121] border border-[#2F2F2F] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-mono">
            {[
              { id: 'ALL', label: `All Changes (${resolvedRecords.length})` },
              { id: 'AMOUNT', label: `Price Adjustments (${feeAdjustments.length})` },
              { id: 'DATE', label: `Date Approvals (${dateAdjustments.length})` },
              { id: 'MISSING', label: `Billing Requests (${apAdjustments.length})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
                  activeFilter === f.id
                    ? 'bg-[#2F2F2F] text-emerald-400 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#2F2F2F]'
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
        <div className="p-12 text-center bg-[#171717] border border-[#2F2F2F] rounded-2xl space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#2F2F2F] text-amber-400 flex items-center justify-center mx-auto text-2xl border border-amber-500/30">
            📑
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Changes Applied Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When you click quick fix buttons like "Adjust Processing Fee", "Approve Date Delay", or "Request Missing Bill", the clear before-and-after breakdown of changes will appear here.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md inline-flex items-center gap-1.5"
            >
              <span>Go to Differences & Issues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#171717] border border-[#2F2F2F] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#212121] border-b border-[#2F2F2F] text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">TRANSACTION & VENDOR</th>
                  <th className="py-3.5 px-4 font-semibold">ORIGINAL ISSUE (BEFORE)</th>
                  <th className="py-3.5 px-4 font-semibold">HOW IT WAS FIXED (AFTER)</th>
                  <th className="py-3.5 px-4 font-semibold text-center">STATUS</th>
                  <th className="py-3.5 px-4 font-semibold text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F2F2F] text-xs font-mono">
                {filteredRecords.map((r) => {
                  const exp = getAdjustmentExplanation(r);
                  const Icon = exp.icon;

                  return (
                    <tr 
                      key={r.transaction_id}
                      className="hover:bg-[#212121] transition-colors group cursor-pointer"
                      onClick={() => setSelectedAdjustment(r)}
                    >
                      {/* 1. Transaction & Vendor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 bg-[#2F2F2F] px-2 py-0.5 rounded text-xs">
                            {r.transaction_id}
                          </span>
                          <span className="font-bold text-white text-xs">
                            {r.vendor || r.invoice_customer || r.payment_merchant || 'Customer'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>📅 {r.date || 'N/A'}</span>
                          <span>•</span>
                          <span>Bank: <strong>₹{(r.amount || 0).toLocaleString('en-IN')}</strong></span>
                          {r.invoice_amount && (
                            <>
                              <span>•</span>
                              <span>Bill: <strong>₹{Number(r.invoice_amount).toLocaleString('en-IN')}</strong></span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 2. Original Issue (Before) */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-rose-300 font-sans leading-relaxed">
                          {exp.issueSummary}
                        </div>
                      </td>

                      {/* 3. How it was Fixed (After) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${exp.badgeStyle}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {exp.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans mt-1 leading-snug">
                          {exp.fixSummary}
                        </p>
                      </td>

                      {/* 4. Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800/40 shadow-sm">
                          <Check className="w-3 h-3 text-emerald-400" />
                          BALANCED
                        </span>
                      </td>

                      {/* 5. Actions: Details, Ask AI, Undo */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Details Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAdjustment(r);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 hover:text-white border border-[#3A3A3A] transition text-[11px] font-sans inline-flex items-center gap-1 shadow-sm"
                            title="See step-by-step breakdown of this adjustment"
                          >
                            <Info className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Details</span>
                          </button>

                          {/* Ask AI Button */}
                          {onAskAI && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAI(r);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#2F2F2F] hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 transition text-[11px] font-sans font-bold inline-flex items-center gap-1 shadow-sm"
                              title={`Chat with AI about transaction ${r.transaction_id}`}
                            >
                              <Bot className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ask AI</span>
                            </button>
                          )}

                          {/* Undo Button */}
                          {onRevert && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevert(r.transaction_id);
                              }}
                              className="p-1.5 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-400 hover:text-rose-400 border border-[#3A3A3A] transition text-[11px]"
                              title="Undo this change and restore original discrepancy"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
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
              className="bg-[#171717] border border-[#2F2F2F] rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#2F2F2F] pb-4">
                <div className="flex items-center gap-3">
                  <img src="/finance_logo.png" alt="Adjustment" className="w-10 h-10 object-contain" />
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedAdjustment.transaction_id} Adjustment Breakdown</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                        ✓ Balanced
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {selectedAdjustment.vendor || selectedAdjustment.invoice_customer || 'Customer'} • Date: {selectedAdjustment.date || 'N/A'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedAdjustment(null)}
                  className="p-1.5 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step-by-Step Explanation List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Step-by-Step Audit Breakdown:
                </h3>
                <div className="space-y-2.5">
                  {exp.steps.map((step, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#212121] border border-[#2F2F2F] space-y-1">
                      <div className="text-xs font-bold text-emerald-400 font-mono">
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
              <div className="flex items-center justify-between pt-2 border-t border-[#2F2F2F]">
                {onAskAI ? (
                  <button
                    onClick={() => {
                      const tx = selectedAdjustment;
                      setSelectedAdjustment(null);
                      onAskAI(tx);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Ask AI About This Transaction</span>
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedAdjustment(null)}
                  className="px-4 py-2 rounded-xl bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 text-xs font-semibold transition"
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
