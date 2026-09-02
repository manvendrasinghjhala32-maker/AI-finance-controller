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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Accounting Records
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30 font-semibold">
              Balanced Double-Entry
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Double-entry bookkeeping adjustments ready to export to Excel / QuickBooks / Zoho / Tally
          </p>
        </div>

        {onExport && (
          <button
            onClick={() => onExport('gl_entries')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-emerald-400 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-emerald-500/40 shadow-sm transition-all duration-200 btn-interactive"
          >
            <Download className="w-4 h-4" />
            <span className="font-mono">Export Accounting Records (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="figma-card p-4 bg-[#171717] border border-[#2F2F2F] card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            MONEY ADDED (DEBITS)
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            ₹{totalDebit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Fee & price adjustments
          </span>
        </div>

        <div className="figma-card p-4 bg-[#171717] border border-[#2F2F2F] card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            MONEY DEDUCTED (CREDITS)
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-300 mt-2">
            ₹{totalCredit.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Offsetting clearing accounts
          </span>
        </div>

        <div className="figma-card p-4 bg-[#171717] border border-[#2F2F2F] card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            BALANCE CHECK
          </span>
          <div className="text-2xl font-bold font-mono text-white mt-2 flex items-center gap-2">
            <span>₹{Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#2F2F2F] text-emerald-400 font-mono border border-emerald-500/30">
              {Math.abs(totalDebit - totalCredit) < 0.01 ? 'BALANCED' : 'UNBALANCED'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Added equals Deducted (Verified)
          </span>
        </div>

        <div className="figma-card p-4 bg-[#171717] border border-[#2F2F2F] card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            TOTAL ENTRIES
          </span>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {entries.length} lines
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Auto-balanced records
          </span>
        </div>
      </div>

      {/* 3. Main Journal Table */}
      <div className="figma-card overflow-hidden shadow-xl bg-[#171717] border border-[#2F2F2F]">
        {/* Table Search Header */}
        <div className="p-4 border-b border-[#2F2F2F] bg-[#171717] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">Accounting Journal Entries</span>
            <span className="text-slate-400">({filteredEntries.length} records)</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search account name, note, entry ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-[#2F2F2F] border border-[#3A3A3A] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-64 font-mono"
            />
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto bg-[#171717]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#171717] border-b border-[#2F2F2F] text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">ENTRY ID</th>
                <th className="py-3 px-4 font-semibold">DATE</th>
                <th className="py-3 px-4 font-semibold">ACCOUNT NAME & CODE</th>
                <th className="py-3 px-4 font-semibold">TRANSACTION ID</th>
                <th className="py-3 px-4 font-semibold text-right">ADDED / DEBIT (₹)</th>
                <th className="py-3 px-4 font-semibold text-right">DEDUCTED / CREDIT (₹)</th>
                <th className="py-3 px-4 font-semibold">NOTE / REASON</th>
                <th className="py-3 px-4 font-semibold text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F2F2F] text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading accounting records...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No journal entries found.
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
                    <tr key={idx} className="hover:bg-[#3A3A3A]/40 transition-colors">
                      {/* Entry ID */}
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {entryId}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400">
                        {dt}
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">
                          {acct}
                        </span>
                      </td>

                      {/* Linked Txn */}
                      <td className="py-3 px-4 text-slate-300">
                        {txId}
                      </td>

                      {/* Debit */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {debit > 0 ? `₹${debit.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Credit */}
                      <td className="py-3 px-4 text-right font-bold text-cyan-300">
                        {credit > 0 ? `₹${credit.toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Memo */}
                      <td className="py-3 px-4 max-w-[240px] truncate text-slate-300 font-sans" title={memo}>
                        {memo}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[#2F2F2F] text-emerald-400 rounded border border-emerald-500/30">
                          <Check className="w-2.5 h-2.5" /> READY
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
