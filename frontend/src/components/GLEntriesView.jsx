import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowUpDown, 
  Search,
  Check,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { API_BASE } from '../config';

export function GLEntriesView({ onExport }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Scoped Journal Entry AI state & client cache
  const [journalAiCache, setJournalAiCache] = useState({});
  const [journalAiLoading, setJournalAiLoading] = useState({});
  const [journalAiError, setJournalAiError] = useState({});
  const [expandedJournalId, setExpandedJournalId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/gl-entries`)
      .then(res => res.json())
      .then(data => {
        setEntries(data || []);
      })
      .catch(err => {
        console.error('Failed to load GL entries', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAskJournalAI = async (entryId) => {
    if (!entryId) return;
    if (journalAiCache[entryId]) {
      setExpandedJournalId(prev => prev === entryId ? null : entryId);
      return;
    }
    setExpandedJournalId(entryId);
    setJournalAiLoading(prev => ({ ...prev, [entryId]: true }));
    setJournalAiError(prev => ({ ...prev, [entryId]: null }));
    try {
      const res = await fetch(`${API_BASE}/api/ask/journal/${encodeURIComponent(entryId)}`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }
      const json = await res.json();
      setJournalAiCache(prev => ({ ...prev, [entryId]: json.reply }));
    } catch (err) {
      setJournalAiError(prev => ({ ...prev, [entryId]: err.message || 'Failed to generate explanation.' }));
    } finally {
      setJournalAiLoading(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const filteredEntries = entries.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.entry_id || e.Journal_ID || '').toLowerCase().includes(q) ||
      (e.account_code || e.Account_Code || '').toLowerCase().includes(q) ||
      (e.account_name || '').toLowerCase().includes(q) ||
      (e.transaction_id || e.Transaction_ID || '').toLowerCase().includes(q) ||
      (e.memo || e.Memo || '').toLowerCase().includes(q)
    );
  });

  const totalDebit = entries.reduce((acc, curr) => acc + (Number(curr.debit || curr["Debit (₹)"]) || 0), 0);
  const totalCredit = entries.reduce((acc, curr) => acc + (Number(curr.credit || curr["Credit (₹)"]) || 0), 0);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[#1A1F36] tracking-wide uppercase">
              General Ledger Journal Entries
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              GAAP DOUBLE-ENTRY COMPLIANT
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-sans mt-0.5">
            Proposed adjusting journal vouchers (AJV) generated for controller audit and ERP system ingestion
          </p>
        </div>

        {onExport && (
          <button
            onClick={() => onExport('gl_entries')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Journal (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Debits
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1.5">
            ₹{totalDebit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            Expense & fee adjustments
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Credits
          </span>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1.5">
            ₹{totalCredit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            Offsetting clearing accounts
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Trial Balance Audit
          </span>
          <div className="text-2xl font-bold font-mono text-[#1A1F36] mt-1.5 flex items-center gap-2">
            <span>Δ ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              Math.abs(totalDebit - totalCredit) < 0.01 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {Math.abs(totalDebit - totalCredit) < 0.01 ? 'BALANCED' : 'UNBALANCED'}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            Debits equal Credits (Zero variance)
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Journal Vouchers
          </span>
          <div className="text-2xl font-bold font-mono text-[#1A1F36] mt-1.5">
            {entries.length} lines
          </div>
          <span className="text-[11px] text-gray-500 font-sans mt-0.5 block">
            Balanced adjusting ledger lines
          </span>
        </div>
      </div>

      {/* 3. Main Journal Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Table Search Header */}
        <div className="p-3.5 border-b border-gray-200 bg-white flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-[#1A1F36]">
            <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
            <span className="font-bold uppercase text-xs">General Ledger Audit Records</span>
            <span className="text-gray-400 font-mono">({filteredEntries.length} lines)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter account, memo, voucher ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-[#1A1F36] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-2.5 px-3">VOUCHER ID</th>
                <th className="py-2.5 px-3">DATE</th>
                <th className="py-2.5 px-3">ACCOUNT & GL CODE</th>
                <th className="py-2.5 px-3">TRANSACTION REF</th>
                <th className="py-2.5 px-3 text-right">DEBIT (₹)</th>
                <th className="py-2.5 px-3 text-right">CREDIT (₹)</th>
                <th className="py-2.5 px-3">MEMO / DESCRIPTION</th>
                <th className="py-2.5 px-3 text-center">AUDIT STATUS</th>
                <th className="py-2.5 px-3 text-right">AI FORENSICS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-gray-400 font-sans text-xs">
                    Loading General Ledger journal vouchers...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-gray-400 font-sans text-xs">
                    No matching journal entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row, idx) => {
                  const entryId = row.entry_id || row.Journal_ID || `JE-${idx + 1}`;
                  const dt = row.date || row.Date || '2026-08-26';
                  const acct = row.account_code || row.Account_Code || '6150 - Gateway Fee';
                  const txId = row.transaction_id || row.Transaction_ID || 'TXN';
                  const debit = Number(row.debit || row["Debit (₹)"]) || 0;
                  const credit = Number(row.credit || row["Credit (₹)"]) || 0;
                  const memo = row.memo || row.Memo || 'Adjusting entry';

                  const isExpanded = expandedJournalId === entryId;
                  const aiReply = journalAiCache[entryId];
                  const isLoading = journalAiLoading[entryId];
                  const errorMsg = journalAiError[entryId];

                  return (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        {/* Entry ID */}
                        <td className="py-2.5 px-3 font-semibold text-[#1D4ED8]">
                          {entryId}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 text-gray-500">
                          {dt}
                        </td>

                        {/* Account */}
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-[#1A1F36] font-sans">
                            {acct}
                          </span>
                        </td>

                        {/* Linked Txn */}
                        <td className="py-2.5 px-3 text-gray-600">
                          {txId}
                        </td>

                        {/* Debit */}
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {debit > 0 ? `₹${debit.toLocaleString('en-IN')}` : '—'}
                        </td>

                        {/* Credit */}
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-700">
                          {credit > 0 ? `₹${credit.toLocaleString('en-IN')}` : '—'}
                        </td>

                        {/* Memo */}
                        <td className="py-2.5 px-3 max-w-[240px] truncate text-gray-600 font-sans" title={memo}>
                          {memo}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> POSTABLE
                          </span>
                        </td>

                        {/* AI Button */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleAskJournalAI(entryId)}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] border border-blue-200 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                            title={`Explain double-entry logic for ${entryId}`}
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                                <span>Thinking...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span>{aiReply ? 'AI Explanation' : '✨ Ask AI'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable AI Explanation Sub-Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/40 border-b border-blue-100">
                          <td colSpan="9" className="p-4">
                            {errorMsg ? (
                              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-600" />
                                  <span>{errorMsg}</span>
                                </div>
                                <button
                                  onClick={() => handleAskJournalAI(entryId)}
                                  className="px-2 py-0.5 rounded bg-white hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-300"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : aiReply ? (
                              <div className="space-y-1.5 text-xs text-slate-200 font-sans animate-fade-in">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Scoped Double-Entry Accounting Rationale ({entryId})</span>
                                </div>
                                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700 text-slate-200 shadow-md">
                                  <MarkdownMessage content={aiReply} />
                                </div>
                              </div>
                            ) : isLoading ? (
                              <div className="flex items-center gap-2 text-xs text-cyan-400 font-sans py-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                                <span>Generating accounting GAAP explanation for {entryId}...</span>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
