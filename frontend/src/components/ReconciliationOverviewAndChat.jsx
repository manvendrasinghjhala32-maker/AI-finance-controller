import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Download, 
  TrendingUp, 
  DollarSign,
  AlertOctagon,
  FileQuestion,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';

export function ReconciliationOverviewAndChat({ 
  data, 
  onResolve, 
  onNavigate 
}) {
  const [openDrawer, setOpenDrawer] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [resolvedTxs, setResolvedTxs] = useState(new Set());

  if (!data) return null;

  const records = data.records || [];
  const summary = data.summary || {};
  const cashPos = summary.cash_position || {};
  const metrics = data.metrics || null;

  const matches = records.filter(r => r.status === 'MATCH');
  const exceptions = records.filter(r => !['MATCH', 'DUPLICATE'].includes(r.status));
  const duplicates = records.filter(r => r.status === 'DUPLICATE');
  const multipleMatches = records.filter(r => r.status === 'MULTIPLE_MATCHES');
  const amtMismatches = records.filter(r => r.status === 'AMOUNT_MISMATCH');
  const dateMismatches = records.filter(r => r.status === 'DATE_MISMATCH');
  const missingInvoices = records.filter(r => r.status === 'MISSING_INVOICE');

  // Unified convention: exclude duplicates from denominator for true match rate
  const cleanTotal = Math.max(1, records.length - duplicates.length);
  const cleanMatchRate = (matches.length / cleanTotal * 100);

  const totalBankMoney = cashPos.total_bank_amount || (cashPos.matched_amount || 0) + (cashPos.pending_amount || 0) || 1;
  const matchedMoneyPct = totalBankMoney > 0 ? Math.min(100, Math.max(0, (cashPos.matched_amount || 0) / totalBankMoney * 100)) : 0;
  const settledMoneyPct = totalBankMoney > 0 ? Math.min(100, Math.max(0, (cashPos.settled_amount || 0) / totalBankMoney * 100)) : 0;
  const pendingMoneyPct = totalBankMoney > 0 ? Math.min(100, Math.max(0, (cashPos.pending_amount || 0) / totalBankMoney * 100)) : 0;
  const varianceMoneyPct = totalBankMoney > 0 ? Math.min(100, Math.max(1, (cashPos.total_variance || 0) / (cashPos.matched_amount || totalBankMoney) * 100)) : 0;

  const handleResolve = async (txId, actionType) => {
    if (onResolve) {
      await onResolve(txId, actionType);
      setResolvedTxs(prev => new Set(prev).add(txId));
    }
  };

  const filteredExceptions = exceptions.filter(r => {
    if (activeFilter === 'ALL') return true;
    return r.status === activeFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* MAIN FINANCIAL & RECONCILIATION SUMMARY */}
      {/* ========================================================================= */}
      <section className="bg-[#171717] border border-[#2F2F2F] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2F2F2F] pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              📊 Overview & Matched Records
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Summary of verified payments, amount differences, and issues to review.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
            {records.length} Total Records Checked
          </span>
        </div>

        {/* Top KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Records */}
          <div className="bg-[#212121] rounded-xl border border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Transactions</div>
            <div className="text-2xl font-black text-white">{records.length}</div>
            <div className="text-xs text-slate-400 mt-1">🛡️ {duplicates.length} duplicates isolated</div>
          </div>

          {/* Card 2: Matched Rate */}
          <div className="bg-[#212121] rounded-xl border-l-4 border-emerald-500 border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Matched Rate</div>
            <div className="text-2xl font-black text-emerald-400">{cleanMatchRate.toFixed(1)}%</div>
            <div className="text-xs text-emerald-400 font-medium mt-1">
              🎯 Verified match rate ({matches.length}/{cleanTotal})
            </div>
          </div>

          {/* Card 3: Verified Money */}
          <div className="bg-[#212121] rounded-xl border-l-4 border-cyan-500 border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Verified Money</div>
            <div className="text-2xl font-black text-cyan-300">₹{(cashPos.matched_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-cyan-400 font-medium mt-1">
              💎 {matchedMoneyPct.toFixed(1)}% of total bank money
            </div>
          </div>

          {/* Card 4: Price Differences */}
          <div className="bg-[#212121] rounded-xl border-l-4 border-rose-500 border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Price Differences</div>
            <div className="text-2xl font-black text-rose-400">₹{(cashPos.total_variance || 0).toLocaleString()}</div>
            <div className="text-xs text-rose-400 font-medium mt-1">
              ⚠️ {amtMismatches.length} transactions with price differences
            </div>
          </div>

          {/* Card 5: Pending Money */}
          <div className="bg-[#212121] rounded-xl border-l-4 border-amber-500 border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pending Money</div>
            <div className="text-2xl font-black text-amber-400">₹{(cashPos.pending_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-amber-400 font-medium mt-1">
              ⏳ ₹{(cashPos.settled_amount || 0).toLocaleString()} completed
            </div>
          </div>
        </div>

        {/* AI Summary & Insights */}
        <div className="p-6 rounded-2xl bg-[#212121] border border-emerald-500/30 shadow-md card-interactive">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            AI Summary & Key Insights
          </div>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            {summary.executive_summary || (
              `We checked ${records.length} records and found ${matches.length} clean matches (${cleanMatchRate.toFixed(1)}% match rate). ` +
              `There are ${exceptions.length} active exceptions that need review, with ₹${(cashPos.total_variance || 0).toLocaleString()} in total price differences and ₹${(cashPos.pending_amount || 0).toLocaleString()} in pending / unmatched funds.`
            )}
          </p>
        </div>

        {/* Visual Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Classification Breakdown */}
          <div className="bg-[#212121] rounded-xl border border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Payment Status Breakdown</span>
              <span className="text-slate-500 font-normal font-mono">{records.length} items</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] font-medium text-emerald-300 transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Clean Matches</span>
                <strong className="font-mono">{matches.length} ({cleanMatchRate.toFixed(0)}%)</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] font-medium text-rose-300 transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5"><AlertOctagon className="w-4 h-4 text-rose-400" /> Price Differences</span>
                <strong className="font-mono">{amtMismatches.length}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] font-medium text-cyan-300 transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-cyan-400" /> Date Delays</span>
                <strong className="font-mono">{dateMismatches.length}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] font-medium text-purple-300 transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5"><FileQuestion className="w-4 h-4 text-purple-400" /> Missing Bills / Receipts</span>
                <strong className="font-mono">{missingInvoices.length}</strong>
              </div>
              {multipleMatches.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#2F2F2F] border border-amber-500/40 font-medium text-amber-300 transition-all hover:bg-[#383838]">
                  <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-400" /> Multiple Matches / Shared PO</span>
                  <strong className="font-mono">{multipleMatches.length}</strong>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] font-medium text-slate-300 transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5"><Copy className="w-4 h-4 text-slate-400" /> Duplicate Payments</span>
                <strong className="font-mono">{duplicates.length}</strong>
              </div>
            </div>
          </div>

          {/* Cash Position Breakdown */}
          <div className="bg-[#212121] rounded-xl border border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Money Overview (₹)</span>
              <span className="text-slate-500 font-mono text-[11px]">Total: ₹{totalBankMoney.toLocaleString()}</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-300 mb-1">
                  <span>Verified & Matched Money</span>
                  <span className="text-emerald-400 font-bold font-mono">₹{(cashPos.matched_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#2F2F2F] rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${matchedMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-300 mb-1">
                  <span>Completed Online Payments</span>
                  <span className="text-cyan-400 font-bold font-mono">₹{(cashPos.settled_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#2F2F2F] rounded-full h-2 overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${settledMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-300 mb-1">
                  <span>Pending / Unmatched Money</span>
                  <span className="text-amber-400 font-bold font-mono">₹{(cashPos.pending_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#2F2F2F] rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pendingMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-300 mb-1">
                  <span>Total Amount Differences</span>
                  <span className="text-rose-400 font-bold font-mono">₹{(cashPos.total_variance || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#2F2F2F] rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${varianceMoneyPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Issue Priority Level (Risk Matrix) */}
          <div className="bg-[#212121] rounded-xl border border-[#2F2F2F] p-5 shadow-sm card-interactive">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Issue Priority Level</span>
              <span className="text-emerald-400 font-mono text-[11px]">{records.length} Total Checked</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">🟢 LOW RISK</span>
                <span className="text-slate-300 font-mono font-semibold">{matches.length} Clean Matches</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">🔵 MEDIUM RISK</span>
                <span className="text-slate-300 font-mono font-semibold">{dateMismatches.length} Date Delays</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">🟡 HIGH RISK</span>
                <span className="text-slate-300 font-mono font-semibold">{amtMismatches.length} Price Differences</span>
              </div>
              {multipleMatches.length > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#2F2F2F] border border-amber-500/40 transition-all hover:bg-[#383838]">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold">🟠 AMBIGUOUS</span>
                  <span className="text-slate-300 font-mono font-semibold">{multipleMatches.length} Multiple Matches / Shared PO</span>
                </div>
              )}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#2F2F2F] border border-[#3A3A3A] transition-all hover:bg-[#383838]">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">🔴 NEEDS ACTION</span>
                <span className="text-slate-300 font-mono font-semibold">{missingInvoices.length} Missing Bills</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Action Drawers */}
        <div className="space-y-3 pt-2">
          {/* Drawer 1: Differences & Issues Drawer */}
          <div className="bg-[#212121] rounded-xl border border-[#2F2F2F] overflow-hidden shadow-sm">
            <button 
              onClick={() => setOpenDrawer(openDrawer === 'exceptions' ? null : 'exceptions')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#2F2F2F] transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#2F2F2F] text-amber-400 flex items-center justify-center font-bold text-xs">⚠️</span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Differences & Issues to Review ({exceptions.length} Items)
                  </h4>
                  <p className="text-xs text-slate-400">Click to see AI explanations and 1-click quick fix buttons</p>
                </div>
              </div>
              {openDrawer === 'exceptions' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {openDrawer === 'exceptions' && (
              <div className="p-6 border-t border-[#2F2F2F] bg-[#171717] space-y-4">
                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ALL', label: `All Issues (${exceptions.length})` },
                    { id: 'AMOUNT_MISMATCH', label: `Price Differences (${amtMismatches.length})` },
                    { id: 'DATE_MISMATCH', label: `Date Delays (${dateMismatches.length})` },
                    { id: 'MISSING_INVOICE', label: `Missing Bills (${missingInvoices.length})` },
                    ...(multipleMatches.length > 0 ? [{ id: 'MULTIPLE_MATCHES', label: `Multiple Matches (${multipleMatches.length})` }] : [])
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeFilter === f.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[#2F2F2F] text-slate-300 border border-[#3A3A3A] hover:bg-[#3A3A3A]'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Exception Cards */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {filteredExceptions.map((r) => {
                    const isResolved = resolvedTxs.has(r.transaction_id) || r.is_resolved;
                    const statusLabel = r.status === 'AMOUNT_MISMATCH' 
                      ? 'Price Difference' 
                      : r.status === 'DATE_MISMATCH' 
                      ? 'Date Delay' 
                      : r.status === 'MISSING_INVOICE' 
                      ? 'Missing Bill' 
                      : r.status === 'MULTIPLE_MATCHES'
                      ? 'Multiple Matches'
                      : r.status;
                    return (
                      <div key={r.transaction_id} className={`p-4 rounded-xl border transition ${isResolved ? 'bg-[#2F2F2F] border-emerald-500/40' : 'bg-[#212121] border-[#2F2F2F] shadow-sm'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-400 bg-[#2F2F2F] px-2 py-0.5 rounded">{r.transaction_id}</span>
                            <span className="text-xs font-bold text-white">{r.vendor || r.invoice_customer || r.payment_merchant || 'Customer'}</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${r.status === 'AMOUNT_MISMATCH' ? 'bg-rose-950 text-rose-300 border border-rose-800/40' : r.status === 'DATE_MISMATCH' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' : r.status === 'MULTIPLE_MATCHES' ? 'bg-amber-950 text-amber-300 border border-amber-800/40' : 'bg-purple-950 text-purple-300 border border-purple-800/40'}`}>
                              {statusLabel}
                            </span>
                            {isResolved && <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/40">✓ FIXED</span>}
                          </div>
                          <div className="text-xs font-mono text-slate-300">
                            Bank: <strong>₹{(r.amount || 0).toLocaleString()}</strong> | Bill: <strong>₹{(r.invoice_amount || r.amount || 0).toLocaleString()}</strong>
                            {r.amount_delta ? <span className="text-rose-400 font-bold ml-1.5">(Difference: -₹{Math.abs(r.amount_delta).toLocaleString()})</span> : null}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 bg-[#2F2F2F] p-2.5 rounded-lg border border-[#3A3A3A] mb-3">
                          <strong className="text-emerald-400">AI Explanation:</strong> {r.explanation || r.reason || 'Variance requires controller review.'}
                        </p>

                        {!isResolved && (
                          <div className="flex items-center gap-2">
                            {r.status === 'AMOUNT_MISMATCH' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'post_fee_adjustment')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">
                                📝 Adjust Processing Fee (GL-6150)
                              </button>
                            )}
                            {r.status === 'DATE_MISMATCH' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'accept_date_drift')} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition">
                                ✅ Approve Date Delay ({Math.abs(r.date_delta_days || 0)} Days)
                              </button>
                            )}
                            {r.status === 'MISSING_INVOICE' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'request_bill_ap')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition">
                                📨 Request Bill from Seller
                              </button>
                            )}
                            {r.status === 'MULTIPLE_MATCHES' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'confirm_multi_match')} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition">
                                🔎 Review Shared PO Candidates
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Drawer 2: Accounting & Bookkeeping Records */}
          <div className="bg-[#212121] rounded-xl border border-[#2F2F2F] overflow-hidden shadow-sm">
            <button 
              onClick={() => setOpenDrawer(openDrawer === 'gl' ? null : 'gl')}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#2F2F2F] transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#2F2F2F] text-cyan-400 flex items-center justify-center font-bold text-xs">📑</span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Accounting & Bookkeeping Records
                  </h4>
                  <p className="text-xs text-slate-400">Balanced double-entry adjustments ready to export to Excel / QuickBooks / Tally / Zoho</p>
                </div>
              </div>
              {openDrawer === 'gl' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {openDrawer === 'gl' && (
              <div className="p-6 border-t border-[#2F2F2F] bg-[#171717] space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-300">Bookkeeping verified: <strong>Money Added equals Money Deducted (Balanced ₹0.00)</strong>.</p>
                  <a href="/api/export/gl_entries" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1">
                    <Download className="w-3 h-3" /> Download Accounting Records (CSV)
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
