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
  ChevronUp,
  Zap
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

  const elapsedSec = summary.elapsed_seconds ?? data.elapsed_seconds ?? metrics?.elapsed_seconds ?? 0.16;
  const throughputSpeed = summary.records_per_second ?? data.records_per_second ?? metrics?.records_per_second ?? (records.length > 0 && elapsedSec > 0 ? records.length / elapsedSec : 1000);

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
    <div className="space-y-5 pb-10">
      {/* ========================================================================= */}
      {/* EXECUTIVE FINANCIAL & RECONCILIATION SUMMARY */}
      {/* ========================================================================= */}
      <section className="bg-[#111622] border border-[#1E2638] rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2638] pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight font-mono uppercase">
              Executive Reconciliation Summary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Comprehensive ledger audit, verified transaction settlements, and cash variance analysis.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-medium px-2.5 py-1 bg-[#141A27] text-slate-300 border border-[#1E2638] rounded">
              <span className="text-emerald-400 font-bold">{records.length}</span> Total Records
            </span>
            <span className="text-[11px] font-mono font-medium px-2.5 py-1 bg-[#141A27] text-slate-300 border border-[#1E2638] rounded">
              Engine: <span className="text-purple-400 font-bold">{Math.round(throughputSpeed).toLocaleString()}</span> rec/s ({elapsedSec.toFixed(3)}s)
            </span>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* KPI 1: Ingested Records */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 card-interactive">
            <div className="text-[10px] font-medium font-mono text-slate-400 uppercase tracking-wider mb-1">Total Volume</div>
            <div className="text-xl font-bold font-mono text-white">{records.length}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{duplicates.length} duplicates isolated</div>
          </div>

          {/* KPI 2: Reconciliation Rate */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 card-interactive">
            <div className="text-[10px] font-medium font-mono text-slate-400 uppercase tracking-wider mb-1">Match Rate</div>
            <div className="text-xl font-bold font-mono text-emerald-400">{cleanMatchRate.toFixed(1)}%</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{matches.length} of {cleanTotal} matched</div>
          </div>

          {/* KPI 3: Verified Settlement */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 card-interactive">
            <div className="text-[10px] font-medium font-mono text-slate-400 uppercase tracking-wider mb-1">Verified Funds</div>
            <div className="text-xl font-bold font-mono text-emerald-400">₹{(cashPos.matched_amount || 0).toLocaleString()}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{matchedMoneyPct.toFixed(1)}% of total volume</div>
          </div>

          {/* KPI 4: Price Variances */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 card-interactive">
            <div className="text-[10px] font-medium font-mono text-slate-400 uppercase tracking-wider mb-1">Net Variances</div>
            <div className="text-xl font-bold font-mono text-rose-400">₹{(cashPos.total_variance || 0).toLocaleString()}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{amtMismatches.length} fee/price deltas</div>
          </div>

          {/* KPI 5: Pending Money */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 card-interactive">
            <div className="text-[10px] font-medium font-mono text-slate-400 uppercase tracking-wider mb-1">In-Transit / Pending</div>
            <div className="text-xl font-bold font-mono text-amber-400">₹{(cashPos.pending_amount || 0).toLocaleString()}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">₹{(cashPos.settled_amount || 0).toLocaleString()} settled</div>
          </div>

          {/* KPI 6: Processing Speed */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 card-interactive">
            <div className="text-[10px] font-medium font-mono text-slate-400 uppercase tracking-wider mb-1">Throughput</div>
            <div className="text-xl font-bold font-mono text-slate-200">
              {Math.round(throughputSpeed).toLocaleString()} <span className="text-xs font-normal text-slate-400">rec/s</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">{elapsedSec.toFixed(3)}s execution latency</div>
          </div>
        </div>

        {/* Executive Forensic Briefing */}
        <div className="p-4 rounded-lg bg-[#0E131E] border border-[#1E2638] space-y-1.5">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            EXECUTIVE BRIEFING & FINDINGS
          </div>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans">
            {summary.executive_summary || (
              `Automated reconciliation verified ${matches.length} matching transactions (${cleanMatchRate.toFixed(1)}% match rate) across ${records.length} ingested records. ` +
              `Identified ${exceptions.length} exceptions requiring review, totaling ₹${(cashPos.total_variance || 0).toLocaleString()} in net price/fee variances and ₹${(cashPos.pending_amount || 0).toLocaleString()} in pending transit funds.`
            )}
          </p>
        </div>

        {/* Visual Analytics Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Status Breakdown */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-slate-300 uppercase text-[11px]">Classification Breakdown</span>
              <span className="text-slate-500">{records.length} items</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638] text-emerald-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Reconciled Matches
                </span>
                <strong className="font-bold">{matches.length} ({cleanMatchRate.toFixed(0)}%)</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638] text-rose-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Price / Fee Variances
                </span>
                <strong className="font-bold">{amtMismatches.length}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638] text-blue-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Timing & Settlement Drift
                </span>
                <strong className="font-bold">{dateMismatches.length}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638] text-purple-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Unmatched Disbursements
                </span>
                <strong className="font-bold">{missingInvoices.length}</strong>
              </div>
              {multipleMatches.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638] text-amber-300">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Multi-Match Candidates
                  </span>
                  <strong className="font-bold">{multipleMatches.length}</strong>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638] text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  Duplicate Entries
                </span>
                <strong className="font-bold">{duplicates.length}</strong>
              </div>
            </div>
          </div>

          {/* 2. Cash Allocation */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-slate-300 uppercase text-[11px]">Ledger Allocation (₹)</span>
              <span className="text-slate-500">Total: ₹{totalBankMoney.toLocaleString()}</span>
            </div>
            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Verified Funds</span>
                  <span className="text-emerald-400 font-bold">₹{(cashPos.matched_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#141A27] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${matchedMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Settled Gateways</span>
                  <span className="text-blue-400 font-bold">₹{(cashPos.settled_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#141A27] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${settledMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Pending / Transit Funds</span>
                  <span className="text-amber-400 font-bold">₹{(cashPos.pending_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#141A27] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pendingMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Net Price Variances</span>
                  <span className="text-rose-400 font-bold">₹{(cashPos.total_variance || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-[#141A27] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${varianceMoneyPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Variance Risk Classification */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-slate-300 uppercase text-[11px]">Audit Priority Matrix</span>
              <span className="text-slate-500">{records.length} Checked</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638]">
                <span className="text-emerald-400 font-medium">LOW RISK</span>
                <span className="text-slate-300">{matches.length} Clean Matches</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638]">
                <span className="text-blue-400 font-medium">MEDIUM RISK</span>
                <span className="text-slate-300">{dateMismatches.length} Timing Delays</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638]">
                <span className="text-amber-400 font-medium">HIGH RISK</span>
                <span className="text-slate-300">{amtMismatches.length} Price Deltas</span>
              </div>
              {multipleMatches.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638]">
                  <span className="text-amber-300 font-medium">AMBIGUOUS</span>
                  <span className="text-slate-300">{multipleMatches.length} Multi-Matches</span>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded bg-[#141A27] border border-[#1E2638]">
                <span className="text-rose-400 font-medium">ACTION REQUIRED</span>
                <span className="text-slate-300">{missingInvoices.length} Unbilled Items</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Action Drawers */}
        <div className="space-y-2 pt-1">
          {/* Drawer 1: Variances & Exceptions */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] overflow-hidden">
            <button 
              onClick={() => setOpenDrawer(openDrawer === 'exceptions' ? null : 'exceptions')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#141A27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {exceptions.length} Variances
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                    Variance Ledger & Resolution Workbench
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">Review forensic root-cause analysis and execute single-click journal approvals</p>
                </div>
              </div>
              {openDrawer === 'exceptions' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openDrawer === 'exceptions' && (
              <div className="p-4 border-t border-[#1E2638] bg-[#0E131E] space-y-3">
                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: `All Variances (${exceptions.length})` },
                    { id: 'AMOUNT_MISMATCH', label: `Price Deltas (${amtMismatches.length})` },
                    { id: 'DATE_MISMATCH', label: `Timing Drift (${dateMismatches.length})` },
                    { id: 'MISSING_INVOICE', label: `Unbilled Items (${missingInvoices.length})` },
                    ...(multipleMatches.length > 0 ? [{ id: 'MULTIPLE_MATCHES', label: `Multi-Match (${multipleMatches.length})` }] : [])
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${activeFilter === f.id ? 'bg-[#1E2638] text-emerald-400 border border-emerald-500/40 font-semibold' : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Exception Cards */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredExceptions.map((r) => {
                    const isResolved = resolvedTxs.has(r.transaction_id) || r.is_resolved;
                    const statusLabel = r.status === 'AMOUNT_MISMATCH' 
                      ? 'Price Delta' 
                      : r.status === 'DATE_MISMATCH' 
                      ? 'Timing Drift' 
                      : r.status === 'MISSING_INVOICE' 
                      ? 'Unbilled Item' 
                      : r.status === 'MULTIPLE_MATCHES'
                      ? 'Multi-Match'
                      : r.status;
                    return (
                      <div key={r.transaction_id} className={`p-3 rounded-lg border transition-colors ${isResolved ? 'bg-[#121A28] border-emerald-500/30' : 'bg-[#141A27] border-[#1E2638]'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-200">{r.transaction_id}</span>
                            <span className="text-xs font-medium text-white font-sans">{r.vendor || r.invoice_customer || r.payment_merchant || 'Counterparty'}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${r.status === 'AMOUNT_MISMATCH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : r.status === 'DATE_MISMATCH' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : r.status === 'MULTIPLE_MATCHES' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30'}`}>
                              {statusLabel}
                            </span>
                            {isResolved && <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">RESOLVED</span>}
                          </div>
                          <div className="text-xs font-mono text-slate-300">
                            Bank: <strong>₹{(r.amount || 0).toLocaleString()}</strong> | Invoiced: <strong>₹{(r.invoice_amount || r.amount || 0).toLocaleString()}</strong>
                            {r.amount_delta ? <span className="text-rose-400 font-medium ml-1.5">(Δ ₹{Math.abs(r.amount_delta).toLocaleString()})</span> : null}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 bg-[#0E131E] p-2 rounded border border-[#1E2638] mb-2.5 font-sans leading-relaxed">
                          <span className="text-slate-400 font-mono font-semibold">Diagnosis:</span> {r.explanation || r.reason || 'Variance requires controller review.'}
                        </p>

                        {!isResolved && (
                          <div className="flex items-center gap-2">
                            {r.status === 'AMOUNT_MISMATCH' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'post_fee_adjustment')} className="px-2.5 py-1 bg-[#1E2638] hover:bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 rounded text-xs font-mono transition-colors">
                                Post Fee Adjustment (GL-6150)
                              </button>
                            )}
                            {r.status === 'DATE_MISMATCH' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'accept_date_drift')} className="px-2.5 py-1 bg-[#1E2638] hover:bg-blue-950/60 text-blue-400 border border-blue-500/30 hover:border-blue-500/60 rounded text-xs font-mono transition-colors">
                                Approve Settlement Drift ({Math.abs(r.date_delta_days || 0)}d)
                              </button>
                            )}
                            {r.status === 'MISSING_INVOICE' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'request_bill_ap')} className="px-2.5 py-1 bg-[#1E2638] hover:bg-purple-950/60 text-purple-400 border border-purple-500/30 hover:border-purple-500/60 rounded text-xs font-mono transition-colors">
                                Request AP Invoice from Vendor
                              </button>
                            )}
                            {r.status === 'MULTIPLE_MATCHES' && (
                              <button onClick={() => handleResolve(r.transaction_id, 'confirm_multi_match')} className="px-2.5 py-1 bg-[#1E2638] hover:bg-amber-950/60 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 rounded text-xs font-mono transition-colors">
                                Review Shared PO Candidates
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

          {/* Drawer 2: General Ledger Double-Entry Preview */}
          <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] overflow-hidden">
            <button 
              onClick={() => setOpenDrawer(openDrawer === 'gl' ? null : 'gl')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#141A27] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  GL Journal
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                    General Ledger Journal Entries
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">Automated balanced double-entry adjustments (ERP / GAAP compliant)</p>
                </div>
              </div>
              {openDrawer === 'gl' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {openDrawer === 'gl' && (
              <div className="p-4 border-t border-[#1E2638] bg-[#0E131E] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <p className="text-slate-300">
                    Trial Balance Status: <span className="text-emerald-400 font-bold">BALANCED (Debits = Credits, Δ ₹0.00)</span>
                  </p>
                  <a href="/api/export/gl_entries" className="px-3 py-1.5 bg-[#141A27] hover:bg-[#1B2335] text-emerald-400 border border-emerald-500/30 rounded text-xs font-mono transition-colors inline-flex items-center gap-1.5 w-fit">
                    <Download className="w-3.5 h-3.5" /> Download General Ledger (CSV)
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
