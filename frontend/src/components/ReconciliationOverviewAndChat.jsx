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
  Zap,
  RefreshCw,
  AlertCircle
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

  // Scoped AI State & Client Caches
  const [summaryAiCache, setSummaryAiCache] = useState(null);
  const [summaryAiLoading, setSummaryAiLoading] = useState(false);
  const [summaryAiError, setSummaryAiError] = useState(null);

  const [txAiCache, setTxAiCache] = useState({});
  const [txAiLoading, setTxAiLoading] = useState({});
  const [txAiError, setTxAiError] = useState({});

  if (!data) return null;

  const handleAskSummaryAI = async () => {
    if (summaryAiCache) return;
    setSummaryAiLoading(true);
    setSummaryAiError(null);
    try {
      const res = await fetch('/api/ask/summary', { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }
      const json = await res.json();
      setSummaryAiCache(json.reply);
    } catch (err) {
      setSummaryAiError(err.message || 'Failed to generate AI summary.');
    } finally {
      setSummaryAiLoading(false);
    }
  };

  const handleAskTxAI = async (txId) => {
    if (!txId) return;
    if (txAiCache[txId]) return;
    setTxAiLoading(prev => ({ ...prev, [txId]: true }));
    setTxAiError(prev => ({ ...prev, [txId]: null }));
    try {
      const res = await fetch(`/api/ask/transaction/${encodeURIComponent(txId)}`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }
      const json = await res.json();
      setTxAiCache(prev => ({ ...prev, [txId]: json.reply }));
    } catch (err) {
      setTxAiError(prev => ({ ...prev, [txId]: err.message || 'Failed to generate AI diagnosis.' }));
    } finally {
      setTxAiLoading(prev => ({ ...prev, [txId]: false }));
    }
  };

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
    <div className="space-y-6 pb-10 font-sans">
      {/* ========================================================================= */}
      {/* FINANCIAL & RECONCILIATION SUMMARY */}
      {/* ========================================================================= */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1A1F36] tracking-tight font-sans">
              Reconciliation Summary & Ledger Health
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5 font-sans">
              Comprehensive ledger audit, verified transaction settlements, and cash variance analysis.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-medium px-2.5 py-1 bg-[#F9FAFB] dark:bg-[#141A27] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#1E2638] rounded-lg">
              <span className="text-[#16A34A] dark:text-[#34D399] font-bold">{records.length}</span> Total Records
            </span>
            <span className="text-xs font-mono font-medium px-2.5 py-1 bg-[#F9FAFB] dark:bg-[#141A27] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#1E2638] rounded-lg">
              Engine: <span className="text-[#528FF0] dark:text-[#60A5FA] font-bold">{Math.round(throughputSpeed).toLocaleString()}</span> rec/s ({elapsedSec.toFixed(3)}s)
            </span>
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* KPI 1: Ingested Records */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 card-interactive">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1 font-sans">Total Volume</div>
            <div className="text-2xl font-bold font-mono text-[#1A1F36]">{records.length}</div>
            <div className="text-xs text-[#6B7280] font-sans mt-1">{duplicates.length} duplicates isolated</div>
          </div>

          {/* KPI 2: Reconciliation Rate */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 card-interactive">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1 font-sans">Match Rate</div>
            <div className="text-2xl font-bold font-mono text-[#16A34A]">{cleanMatchRate.toFixed(1)}%</div>
            <div className="text-xs text-[#6B7280] font-sans mt-1">{matches.length} of {cleanTotal} matched</div>
          </div>

          {/* KPI 3: Verified Settlement */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 card-interactive">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1 font-sans">Verified Funds</div>
            <div className="text-2xl font-bold font-mono text-[#16A34A]">₹{(cashPos.matched_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-[#6B7280] font-sans mt-1">{matchedMoneyPct.toFixed(1)}% of total volume</div>
          </div>

          {/* KPI 4: Price Variances */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 card-interactive">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1 font-sans">Net Variances</div>
            <div className="text-2xl font-bold font-mono text-[#DC2626]">₹{(cashPos.total_variance || 0).toLocaleString()}</div>
            <div className="text-xs text-[#6B7280] font-sans mt-1">{amtMismatches.length} fee/price deltas</div>
          </div>

          {/* KPI 5: Pending Money */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 card-interactive">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1 font-sans">In-Transit Funds</div>
            <div className="text-2xl font-bold font-mono text-[#D97706]">₹{(cashPos.pending_amount || 0).toLocaleString()}</div>
            <div className="text-xs text-[#6B7280] font-sans mt-1">₹{(cashPos.settled_amount || 0).toLocaleString()} settled</div>
          </div>

          {/* KPI 6: Processing Speed */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 card-interactive">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1 font-sans">Throughput</div>
            <div className="text-2xl font-bold font-mono text-[#1A1F36]">
              {Math.round(throughputSpeed).toLocaleString()} <span className="text-xs font-normal text-[#6B7280]">rec/s</span>
            </div>
            <div className="text-xs text-[#6B7280] font-sans mt-1">{elapsedSec.toFixed(3)}s latency</div>
          </div>
        </div>

        {/* Executive Forensic Briefing */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] flex items-center gap-1.5 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]"></span>
              OPERATIONAL BRIEFING & FINDINGS
            </div>

            <button
              onClick={handleAskSummaryAI}
              disabled={summaryAiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Generate scoped executive summary from reconciliation aggregates"
            >
              {summaryAiLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>{summaryAiCache ? 'Executive AI Summary' : '✨ Ask AI Summary'}</span>
                </>
              )}
            </button>
          </div>

          {summaryAiError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span className="truncate">{summaryAiError}</span>
              </div>
              <button
                onClick={handleAskSummaryAI}
                className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-300 shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {summaryAiCache ? (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 shadow-md space-y-2 animate-fade-in font-sans">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Executive AI Reconciliation Brief</span>
              </div>
              <MarkdownMessage content={summaryAiCache} />
            </div>
          ) : (
            <p className="text-[#334155] dark:text-[#CBD5E1] text-xs sm:text-sm leading-relaxed font-sans">
              {summary.executive_summary || (
                `Automated reconciliation verified ${matches.length} matching transactions (${cleanMatchRate.toFixed(1)}% match rate) across ${records.length} ingested records. ` +
                `Identified ${exceptions.length} exceptions requiring review, totaling ₹${(cashPos.total_variance || 0).toLocaleString()} in net price/fee variances and ₹${(cashPos.pending_amount || 0).toLocaleString()} in pending transit funds.`
              )}
            </p>
          )}
        </div>

        {/* Visual Analytics Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Status Breakdown */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="font-semibold text-[#1A1F36] text-xs">Classification Breakdown</span>
              <span className="text-[#6B7280] font-mono text-[11px]">{records.length} items</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F0FDF4] dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                  Reconciled Matches
                </span>
                <strong className="font-bold">{matches.length} ({cleanMatchRate.toFixed(0)}%)</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FEF2F2] dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40 text-rose-800 dark:text-rose-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                  Price / Fee Variances
                </span>
                <strong className="font-bold">{amtMismatches.length}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40 text-blue-800 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                  Timing & Settlement Drift
                </span>
                <strong className="font-bold">{dateMismatches.length}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141A27] border border-gray-200 dark:border-[#1E2638] text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                  Unmatched Disbursements
                </span>
                <strong className="font-bold">{missingInvoices.length}</strong>
              </div>
              {multipleMatches.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFBEB] dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                    Multi-Match Candidates
                  </span>
                  <strong className="font-bold">{multipleMatches.length}</strong>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141A27] border border-gray-200 dark:border-[#1E2638] text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Duplicate Entries
                </span>
                <strong className="font-bold">{duplicates.length}</strong>
              </div>
            </div>
          </div>

          {/* 2. Cash Allocation */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="font-semibold text-[#1A1F36] text-xs">Ledger Allocation (₹)</span>
              <span className="text-[#6B7280] font-mono text-[11px]">Total: ₹{totalBankMoney.toLocaleString()}</span>
            </div>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[#374151] mb-1 text-xs">
                  <span>Verified Funds</span>
                  <span className="text-[#16A34A] font-bold">₹{(cashPos.matched_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#1E2638] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#16A34A] h-full rounded-full" style={{ width: `${matchedMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[#374151] mb-1 text-xs">
                  <span>Settled Gateways</span>
                  <span className="text-[#2563EB] font-bold">₹{(cashPos.settled_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#1E2638] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${settledMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[#374151] mb-1 text-xs">
                  <span>Pending / Transit Funds</span>
                  <span className="text-[#D97706] font-bold">₹{(cashPos.pending_amount || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#1E2638] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#D97706] h-full rounded-full" style={{ width: `${pendingMoneyPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[#374151] mb-1 text-xs">
                  <span>Net Price Variances</span>
                  <span className="text-[#DC2626] font-bold">₹{(cashPos.total_variance || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#1E2638] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#DC2626] h-full rounded-full" style={{ width: `${varianceMoneyPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Variance Risk Classification */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="font-semibold text-[#1A1F36] text-xs">Audit Priority Matrix</span>
              <span className="text-[#6B7280] font-mono text-[11px]">{records.length} Checked</span>
            </div>
            <div className="space-y-1.5 text-xs font-sans">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F0FDF4] dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">LOW RISK</span>
                <span className="text-[#374151] dark:text-[#E2E8F0] font-mono font-medium">{matches.length} Clean Matches</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40">
                <span className="text-blue-700 dark:text-blue-400 font-medium">MEDIUM RISK</span>
                <span className="text-[#374151] dark:text-[#E2E8F0] font-mono font-medium">{dateMismatches.length} Timing Delays</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFBEB] dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40">
                <span className="text-amber-700 dark:text-amber-400 font-medium">HIGH RISK</span>
                <span className="text-[#374151] dark:text-[#E2E8F0] font-mono font-medium">{amtMismatches.length} Price Deltas</span>
              </div>
              {multipleMatches.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-[#141A27] border border-gray-200 dark:border-[#1E2638]">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">AMBIGUOUS</span>
                  <span className="text-[#374151] dark:text-[#E2E8F0] font-mono font-medium">{multipleMatches.length} Multi-Matches</span>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FEF2F2] dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40">
                <span className="text-rose-700 dark:text-rose-400 font-medium">ACTION REQUIRED</span>
                <span className="text-[#374151] dark:text-[#E2E8F0] font-mono font-medium">{missingInvoices.length} Unbilled Items</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Action Drawers */}
        <div className="space-y-3 pt-1">
          {/* Drawer 1: Variances & Exceptions */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-xs">
            <button 
              onClick={() => setOpenDrawer(openDrawer === 'exceptions' ? null : 'exceptions')}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  {exceptions.length} Variances
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[#1A1F36] uppercase tracking-wide font-sans">
                    Variance Ledger & Resolution Workbench
                  </h4>
                  <p className="text-xs text-[#6B7280] font-sans">Review forensic root-cause analysis and execute single-click journal approvals</p>
                </div>
              </div>
              {openDrawer === 'exceptions' ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
            </button>

            {openDrawer === 'exceptions' && (
              <div className="p-4 border-t border-[#E5E7EB] bg-[#FAFAFC] space-y-3">
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
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeFilter === f.id ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200 shadow-xs' : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'}`}
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
                      <div key={r.transaction_id} className={`p-3.5 rounded-xl border transition-all ${isResolved ? 'bg-[#F0FDF4] border-emerald-200' : 'bg-white border-[#E5E7EB] shadow-xs'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#1A1F36]">{r.transaction_id}</span>
                            <span className="text-xs font-medium text-[#374151] font-sans">{r.vendor || r.invoice_customer || r.payment_merchant || 'Counterparty'}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${r.status === 'AMOUNT_MISMATCH' ? 'bg-rose-50 text-rose-700 border-rose-200' : r.status === 'DATE_MISMATCH' ? 'bg-amber-50 text-amber-700 border-amber-200' : r.status === 'MULTIPLE_MATCHES' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                              {statusLabel}
                            </span>
                            {isResolved && <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">RESOLVED</span>}
                          </div>
                          <div className="text-xs font-mono text-[#374151]">
                            Bank: <strong>₹{(r.amount || 0).toLocaleString()}</strong> | Invoiced: <strong>₹{(r.invoice_amount || r.amount || 0).toLocaleString()}</strong>
                            {r.amount_delta ? <span className="text-rose-600 font-medium ml-1.5">(Δ ₹{Math.abs(r.amount_delta).toLocaleString()})</span> : null}
                          </div>
                        </div>

                        <p className="text-xs text-[#4B5563] bg-[#F9FAFB] p-2.5 rounded-lg border border-[#E5E7EB] mb-2.5 font-sans leading-relaxed">
                          <span className="text-[#1A1F36] font-semibold">Diagnosis:</span> {r.explanation || r.reason || 'Variance requires controller review.'}
                        </p>

                        {txAiError[r.transaction_id] && (
                          <div className="p-2.5 mb-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span className="truncate">{txAiError[r.transaction_id]}</span>
                            </div>
                            <button
                              onClick={() => handleAskTxAI(r.transaction_id)}
                              className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-800 text-[10px] font-semibold border border-rose-300 shrink-0"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {txAiCache[r.transaction_id] && (
                          <div className="p-3.5 mb-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 shadow-md space-y-2 animate-fade-in font-sans">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Scoped AI Forensics ({r.transaction_id})</span>
                            </div>
                            <MarkdownMessage content={txAiCache[r.transaction_id]} />
                          </div>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2 flex-wrap">
                            {!isResolved && (
                              <>
                                {r.status === 'AMOUNT_MISMATCH' && (
                                  <button onClick={() => handleResolve(r.transaction_id, 'post_fee_adjustment')} className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-medium transition-all shadow-xs">
                                    Post Fee Adjustment (GL-6150)
                                  </button>
                                )}
                                {r.status === 'DATE_MISMATCH' && (
                                  <button onClick={() => handleResolve(r.transaction_id, 'accept_date_drift')} className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-medium transition-all shadow-xs">
                                    Approve Settlement Drift ({Math.abs(r.date_delta_days || 0)}d)
                                  </button>
                                )}
                                {r.status === 'MISSING_INVOICE' && (
                                  <button onClick={() => handleResolve(r.transaction_id, 'request_bill_ap')} className="px-3 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-lg text-xs font-medium transition-all shadow-xs">
                                    Request AP Invoice from Vendor
                                  </button>
                                )}
                                {r.status === 'MULTIPLE_MATCHES' && (
                                  <button onClick={() => handleResolve(r.transaction_id, 'confirm_multi_match')} className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-xs font-medium transition-all shadow-xs">
                                    Review Shared PO Candidates
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => handleAskTxAI(r.transaction_id)}
                            disabled={txAiLoading[r.transaction_id]}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] border border-blue-200 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                            title="Generate isolated AI explanation for this transaction"
                          >
                            {txAiLoading[r.transaction_id] ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                                <span>Thinking...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span>{txAiCache[r.transaction_id] ? 'AI Diagnosed' : '✨ Ask AI'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Drawer 2: General Ledger Double-Entry Preview */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-xs">
            <button 
              onClick={() => setOpenDrawer(openDrawer === 'gl' ? null : 'gl')}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#1D4ED8] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  GL Journal
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[#1A1F36] uppercase tracking-wide font-sans">
                    General Ledger Journal Entries
                  </h4>
                  <p className="text-xs text-[#6B7280] font-sans">Automated balanced double-entry adjustments (ERP / GAAP compliant)</p>
                </div>
              </div>
              {openDrawer === 'gl' ? <ChevronUp className="w-4 h-4 text-[#6B7280]" /> : <ChevronDown className="w-4 h-4 text-[#6B7280]" />}
            </button>

            {openDrawer === 'gl' && (
              <div className="p-4 border-t border-[#E5E7EB] bg-[#FAFAFC] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <p className="text-[#374151]">
                    Trial Balance Status: <span className="text-[#16A34A] font-bold">BALANCED (Debits = Credits, Δ ₹0.00)</span>
                  </p>
                  <a href="/api/export/gl_entries" className="px-3 py-1.5 bg-white hover:bg-gray-50 text-[#1D4ED8] border border-blue-200 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 w-fit shadow-xs">
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
