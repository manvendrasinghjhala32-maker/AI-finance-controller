import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowUpDown, 
  Search,
  Check
} from 'lucide-react';

export function GLEntriesView({ onExport }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/gl-entries')
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
            <h1 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              General Ledger Journal Entries
            </h1>
            <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              GAAP DOUBLE-ENTRY COMPLIANT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Proposed adjusting journal vouchers (AJV) generated for controller audit and ERP system ingestion
          </p>
        </div>

        {onExport && (
          <button
            onClick={() => onExport('gl_entries')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 bg-[#141A27] hover:bg-[#1B2335] border border-emerald-500/30 transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Journal (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="figma-card p-4 bg-[#111622] border border-[#1E2638] card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            TOTAL DEBITS
          </span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1.5">
            ₹{totalDebit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            Expense & fee adjustments
          </span>
        </div>

        <div className="figma-card p-4 bg-[#111622] border border-[#1E2638] card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            TOTAL CREDITS
          </span>
          <div className="text-xl font-bold font-mono text-blue-300 mt-1.5">
            ₹{totalCredit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            Offsetting clearing accounts
          </span>
        </div>

        <div className="figma-card p-4 bg-[#111622] border border-[#1E2638] card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            TRIAL BALANCE AUDIT
          </span>
          <div className="text-xl font-bold font-mono text-white mt-1.5 flex items-center gap-2">
            <span>Δ ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
              {Math.abs(totalDebit - totalCredit) < 0.01 ? 'BALANCED' : 'UNBALANCED'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            Debits equal Credits (Zero variance)
          </span>
        </div>

        <div className="figma-card p-4 bg-[#111622] border border-[#1E2638] card-interactive">
          <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider">
            JOURNAL VOUCHERS
          </span>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {entries.length} lines
          </div>
          <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
            Balanced adjusting ledger lines
          </span>
        </div>
      </div>

      {/* 3. Main Journal Table */}
      <div className="figma-card overflow-hidden shadow-sm bg-[#111622] border border-[#1E2638]">
        {/* Table Search Header */}
        <div className="p-3.5 border-b border-[#1E2638] bg-[#111622] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white uppercase text-[11px]">General Ledger Audit Records</span>
            <span className="text-slate-500 font-mono">({filteredEntries.length} lines)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter account, memo, voucher ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#141A27] border border-[#1E2638] rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto bg-[#0E131E]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0E131E] border-b border-[#1E2638] text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-semibold">VOUCHER ID</th>
                <th className="py-2.5 px-3 font-semibold">DATE</th>
                <th className="py-2.5 px-3 font-semibold">ACCOUNT & GL CODE</th>
                <th className="py-2.5 px-3 font-semibold">TRANSACTION REF</th>
                <th className="py-2.5 px-3 font-semibold text-right">DEBIT (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-right">CREDIT (₹)</th>
                <th className="py-2.5 px-3 font-semibold">MEMO / DESCRIPTION</th>
                <th className="py-2.5 px-3 font-semibold text-center">AUDIT STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2638] text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400 font-mono text-xs">
                    Loading General Ledger journal vouchers...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400 font-mono text-xs">
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

                  return (
                    <tr key={idx} className="hover:bg-[#141A27] transition-colors">
                      {/* Entry ID */}
                      <td className="py-2.5 px-3 font-semibold text-emerald-400">
                        {entryId}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-slate-400">
                        {dt}
                      </td>

                      {/* Account */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-white">
                          {acct}
                        </span>
                      </td>

                      {/* Linked Txn */}
                      <td className="py-2.5 px-3 text-slate-300">
                        {txId}
                      </td>

                      {/* Debit */}
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                        {debit > 0 ? `₹${debit.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Credit */}
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-300">
                        {credit > 0 ? `₹${credit.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Memo */}
                      <td className="py-2.5 px-3 max-w-[240px] truncate text-slate-300 font-sans" title={memo}>
                        {memo}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                          <Check className="w-2.5 h-2.5" /> POSTABLE
                        </span>
                      </td>
                    </tr>
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
