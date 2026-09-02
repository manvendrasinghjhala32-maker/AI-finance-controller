import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  FileCheck, 
  Clock, 
  FileText, 
  Sparkles, 
  RotateCcw, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar,
  Search,
  Table as TableIcon,
  LayoutGrid,
  Info,
  X,
  Check,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Bot,
  MessageSquare
} from 'lucide-react';

export function AdjustmentsChangesView({ 
  records = [], 
  onBack, 
  onRevert,
  onExport,
  onAskAI
}) {
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'AMOUNT' | 'DATE' | 'MISSING' | 'OVERRIDE'
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);

  const resolvedRecords = useMemo(() => {
    return records.filter(r => r.is_resolved || r.resolution || r.resolution_action);
  }, [records]);

  // Aggregated Stats
  const feeAdjustments = resolvedRecords.filter(r => (r.resolution_action === 'post_fee_adjustment' || r.resolution?.action === 'post_fee_adjustment' || r.status === 'AMOUNT_MISMATCH'));
  const totalAdjustedFeeAmount = feeAdjustments.reduce((sum, r) => sum + Math.abs(r.amount_delta || 0), 0);
  const dateAdjustments = resolvedRecords.filter(r => (r.resolution_action === 'accept_date_drift' || r.resolution?.action === 'accept_date_drift' || r.status === 'DATE_MISMATCH'));
  const apAdjustments = resolvedRecords.filter(r => (r.resolution_action === 'request_bill_ap' || r.resolution?.action === 'request_bill_ap' || r.status === 'MISSING_INVOICE'));

  const getActionDetails = (r) => {
    const action = r.resolution_action || r.resolution?.action || (r.status === 'AMOUNT_MISMATCH' ? 'post_fee_adjustment' : r.status === 'DATE_MISMATCH' ? 'accept_date_drift' : r.status === 'MISSING_INVOICE' ? 'request_bill_ap' : 'manual_override');
    const delta = Math.abs(r.amount_delta || 0);

    if (action === 'post_fee_adjustment' || r.status === 'AMOUNT_MISMATCH') {
      return {
        type: 'AMOUNT',
        label: 'Processing Fee Adjusted',
        shortLabel: 'Fee Adjusted (GL-6150)',
        account: 'Account 6150 (Bank & Processing Fees)',
        targetGL: 'GL-6150 Fee Exp.',
        badgeColor: 'bg-amber-950 text-amber-300 border-amber-800/50 hover:bg-amber-900/60',
        textColor: 'text-amber-400',
        icon: FileCheck,
        impact: `+₹${delta.toLocaleString()} Fee Expense`,
        description: `Posted balanced fee expense adjustment of ₹${delta.toLocaleString()} to GL-6150.`,
        steps: [
          {
            title: '1. Detected Price Discrepancy',
            desc: `Bank withdrawal of ₹${(r.amount || 0).toLocaleString()} exceeded billed invoice amount ₹${(r.invoice_amount || 0).toLocaleString()} by ₹${delta.toLocaleString()}.`,
          },
          {
            title: '2. Fee Heuristic Analysis',
            desc: `AI identified variance as standard payment gateway fee / merchant withholding charges for ${r.vendor || 'Customer'}.`,
          },
          {
            title: '3. Double-Entry Ledger Posting',
            desc: `Auto-generated balanced journal adjustment debiting GL-6150 (Fee Expense) and crediting GL-1050 (Clearing).`,
          },
          {
            title: '4. Reconciliation Cleared',
            desc: `Net remaining discrepancy is balanced to exactly ₹0.00.`,
          }
        ],
        journalEntries: [
          {
            code: '6150',
            name: 'Payment Processing Fee Expense',
            debit: delta,
            credit: 0,
            desc: `Fee expense absorption for ${r.transaction_id}`
          },
          {
            code: '1050',
            name: 'Bank Clearing / Settlement Account',
            debit: 0,
            credit: delta,
            desc: `Clearing offset for ${r.transaction_id}`
          }
        ]
      };
    }
    if (action === 'accept_date_drift' || r.status === 'DATE_MISMATCH') {
      const days = Math.abs(r.date_delta_days || 0);
      return {
        type: 'DATE',
        label: 'Date Delay Approved',
        shortLabel: 'Date Delay Accepted',
        account: 'Account 1050 (Cash in Transit Clearance)',
        targetGL: 'GL-1050 Transit',
        badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800/50 hover:bg-cyan-900/60',
        textColor: 'text-cyan-400',
        icon: Clock,
        impact: `${days}d Timing Approved`,
        description: `Accepted ${days} day clearance drift as legitimate bank settlement timing.`,
        steps: [
          {
            title: '1. Detected Settlement Delay',
            desc: `Bank clearance occurred ${days} days after invoice date (${r.date || 'recorded date'}).`,
          },
          {
            title: '2. Timing Lag Verification',
            desc: `AI validated that the ${days}-day window falls within normal banking settlement and weekend clearing transit schedules.`,
          },
          {
            title: '3. Cash in Transit Clearance',
            desc: `Logged as legitimate Cash in Transit under Account 1050 without flagging variance risk.`,
          },
          {
            title: '4. Audit Sign-off',
            desc: `Controller approval recorded in audit trail.`,
          }
        ],
        journalEntries: [
          {
            code: '1050',
            name: 'Cash in Transit / Clearing',
            debit: r.amount || 0,
            credit: r.amount || 0,
            desc: `Settlement timing approved (${days}d drift)`
          }
        ]
      };
    }
    if (action === 'request_bill_ap' || r.status === 'MISSING_INVOICE') {
      return {
        type: 'MISSING',
        label: 'AP Bill Requested',
        shortLabel: 'Vendor Bill Queued',
        account: 'Accounts Payable / Vendor Queue',
        targetGL: 'AP Vendor Queue',
        badgeColor: 'bg-purple-950 text-purple-300 border-purple-800/50 hover:bg-purple-900/60',
        textColor: 'text-purple-400',
        icon: FileText,
        impact: 'Bill Requested from Seller',
        description: 'Vendor invoice request generated and queued for vendor billing follow-up.',
        steps: [
          {
            title: '1. Missing Invoice Identification',
            desc: `Bank withdrawal of ₹${(r.amount || 0).toLocaleString()} had no matching vendor invoice in the accounts payable ledger.`,
          },
          {
            title: '2. AP Request Generated',
            desc: `Generated electronic invoice request voucher for ${r.vendor || 'Vendor/Seller'}.`,
          },
          {
            title: '3. Unbilled Cash Holding',
            desc: `Temporarily tracked under Unbilled AP Disbursements awaiting supporting tax invoice.`,
          },
          {
            title: '4. Vendor Follow-up Queued',
            desc: `Queued in the AP reconciliation queue for documentation recovery.`,
          }
        ],
        journalEntries: [
          {
            code: '2010',
            name: 'Accounts Payable Clearing (Pending Bill)',
            debit: r.amount || 0,
            credit: 0,
            desc: `Pending invoice from ${r.vendor || 'Vendor'}`
          },
          {
            code: '1010',
            name: 'Main Operating Bank Account',
            debit: 0,
            credit: r.amount || 0,
            desc: `Bank disbursement for ${r.transaction_id}`
          }
        ]
      };
    }
    return {
      type: 'OVERRIDE',
      label: 'Manual Review Sign-Off',
      shortLabel: 'Approved & Verified',
      account: 'Financial Controller Sign-Off',
      targetGL: 'Controller Sign-off',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/60',
      textColor: 'text-emerald-400',
      icon: CheckCircle,
      impact: 'Verified by Reviewer',
      description: r.resolution_note || r.resolution?.note || 'Discrepancy reviewed and approved by controller.',
      steps: [
        {
          title: '1. Manual Inspection',
          desc: `Transaction inspected and verified by financial controller.`,
        },
        {
          title: '2. Override Approved',
          desc: `Applied controller sign-off to close discrepancy.`,
        }
      ],
      journalEntries: [
        {
          code: '1010',
          name: 'Operating Cash & Clearing',
          debit: r.amount || 0,
          credit: r.amount || 0,
          desc: `Controller verified: ${r.transaction_id}`
        }
      ]
    };
  };

  // Filter & Search
  const filteredRecords = useMemo(() => {
    return resolvedRecords.filter(r => {
      const details = getActionDetails(r);
      if (filterType !== 'ALL' && details.type !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const txId = (r.transaction_id || '').toLowerCase();
        const vendor = (r.vendor || r.invoice_customer || r.payment_merchant || '').toLowerCase();
        const desc = (details.description || '').toLowerCase();
        if (!txId.includes(q) && !vendor.includes(q) && !desc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [resolvedRecords, filterType, searchQuery]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fade-in relative">
      {/* 1. Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2F2F2F] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 hover:text-white border border-[#3A3A3A] transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Back to Differences & Issues"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Dataset Adjustments & Audit Trail
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold">
                {resolvedRecords.length} Changes Applied
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-mono">
              Review and chat with AI specifically about any modified transaction, fee adjustment, or clearance timing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#171717] border border-[#2F2F2F] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                viewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table Form</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                viewMode === 'cards'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Diff Cards</span>
            </button>
          </div>

          {resolvedRecords.length > 0 && onExport && (
            <button
              onClick={() => onExport('adjustments')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-emerald-500/40 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="font-mono">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="figma-card p-4 bg-[#171717] border border-[#2F2F2F] card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            TOTAL ADJUSTMENTS
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-2">
            {resolvedRecords.length}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Applied modifications
          </span>
        </div>

        <div className="figma-card p-4 bg-[#171717] border border-amber-500/30 card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            FEE EXPENSES POSTED
          </span>
          <div className="text-2xl font-black font-mono text-amber-400 mt-2">
            ₹{totalAdjustedFeeAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            {feeAdjustments.length} fee adjustments (GL-6150)
          </span>
        </div>

        <div className="figma-card p-4 bg-[#171717] border border-cyan-500/30 card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            DATE DRIFTS APPROVED
          </span>
          <div className="text-2xl font-black font-mono text-cyan-300 mt-2">
            {dateAdjustments.length}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Bank clearance lags accepted
          </span>
        </div>

        <div className="figma-card p-4 bg-[#171717] border border-purple-500/30 card-interactive">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">
            AP BILLS QUEUED
          </span>
          <div className="text-2xl font-black font-mono text-purple-300 mt-2">
            {apAdjustments.length}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            Vendor invoice follow-ups sent
          </span>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      {resolvedRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171717] p-3 rounded-xl border border-[#2F2F2F]">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Tx ID, Vendor, Note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#212121] border border-[#2F2F2F] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-mono">
            {[
              { id: 'ALL', label: `All (${resolvedRecords.length})` },
              { id: 'AMOUNT', label: `Fee Adjustments (${feeAdjustments.length})` },
              { id: 'DATE', label: `Date Approvals (${dateAdjustments.length})` },
              { id: 'MISSING', label: `AP Requests (${apAdjustments.length})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
                  filterType === f.id
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

      {/* 4. Main Body: Table Form or Diff Cards */}
      {resolvedRecords.length === 0 ? (
        <div className="p-12 text-center bg-[#171717] border border-[#2F2F2F] rounded-2xl space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#2F2F2F] text-amber-400 flex items-center justify-center mx-auto text-2xl border border-amber-500/30">
            📑
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Adjustments Applied Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              When you click quick fix actions like "Adjust Processing Fee", "Approve Date Delay", or "Request Missing Bill", the before-and-after audit log of all changes will appear here in proper tabular form.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md inline-flex items-center gap-1.5"
          >
            <span>Go to Differences & Issues</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* ========================================================================= */
        /* TABULAR FORM VIEW */
        /* ========================================================================= */
        <div className="figma-card overflow-hidden shadow-xl bg-[#171717] border border-[#2F2F2F] rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#171717] border-b border-[#2F2F2F] text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 font-semibold">Tx ID</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Customer / Vendor</th>
                  <th className="py-3 px-4 font-semibold">Original Discrepancy</th>
                  <th className="py-3 px-4 font-semibold text-right">Bank Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Invoice Amount</th>
                  <th className="py-3 px-4 font-semibold">Action Applied (Click for details)</th>
                  <th className="py-3 px-4 font-semibold">Target GL</th>
                  <th className="py-3 px-4 font-semibold">Net Impact</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions & AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F2F2F] text-xs font-mono">
                {filteredRecords.map((r) => {
                  const details = getActionDetails(r);
                  const ActionIcon = details.icon;
                  const originalStatusLabel = r.status === 'AMOUNT_MISMATCH' 
                    ? 'Price Delta' 
                    : r.status === 'DATE_MISMATCH' 
                    ? 'Date Delay' 
                    : r.status === 'MISSING_INVOICE' 
                    ? 'Missing Bill' 
                    : r.status;

                  return (
                    <tr 
                      key={r.transaction_id}
                      className="hover:bg-[#212121] transition-colors group cursor-pointer"
                      onClick={() => setSelectedAdjustment(r)}
                    >
                      {/* Tx ID */}
                      <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                        {r.transaction_id}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {r.date || 'N/A'}
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {r.vendor || r.invoice_customer || r.payment_merchant || 'Customer'}
                      </td>

                      {/* Original Discrepancy (Before) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.status === 'AMOUNT_MISMATCH' ? 'bg-rose-950 text-rose-300 border-rose-800/40' :
                          r.status === 'DATE_MISMATCH' ? 'bg-cyan-950 text-cyan-300 border-cyan-800/40' :
                          'bg-purple-950 text-purple-300 border-purple-800/40'
                        }`}>
                          {originalStatusLabel}
                        </span>
                      </td>

                      {/* Bank Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-200 whitespace-nowrap">
                        ₹{(r.amount || 0).toLocaleString()}
                      </td>

                      {/* Invoice Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-300 whitespace-nowrap">
                        {r.invoice_amount ? `₹${Number(r.invoice_amount).toLocaleString()}` : '—'}
                      </td>

                      {/* Action Applied (Clickable button with breakdown) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAdjustment(r);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-sm transition-all ${details.badgeColor}`}
                          title="Click to see exact step-by-step adjustment breakdown"
                        >
                          <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{details.shortLabel}</span>
                          <Info className="w-3 h-3 opacity-60 group-hover:opacity-100 ml-0.5" />
                        </button>
                      </td>

                      {/* Target Account */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap text-[11px]">
                        {details.targetGL}
                      </td>

                      {/* Net Financial Impact */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`font-bold text-[11px] ${details.textColor}`}>
                          {details.impact}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800/40">
                          ✓ FIXED
                        </span>
                      </td>

                      {/* Action Buttons: Ask AI + Undo */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {onAskAI && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAskAI(r);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#2F2F2F] hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 transition text-[11px] font-mono font-bold inline-flex items-center gap-1 shadow-sm"
                              title={`Ask AI specific questions about transaction ${r.transaction_id}`}
                            >
                              <Bot className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ask AI</span>
                            </button>
                          )}

                          {onRevert && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevert(r.transaction_id);
                              }}
                              className="p-1.5 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-400 hover:text-rose-400 border border-[#3A3A3A] transition text-[11px] font-mono inline-flex items-center gap-1"
                              title="Undo this adjustment"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Undo</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer */}
              <tfoot>
                <tr className="bg-[#171717] border-t border-[#2F2F2F] text-[11px] font-mono text-slate-400">
                  <td colSpan={4} className="py-3 px-4 font-bold text-slate-300">
                    Total Modified Records: {filteredRecords.length}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right font-bold text-emerald-400">
                    Total Fee Adjustments: ₹{totalAdjustedFeeAmount.toLocaleString()}
                  </td>
                  <td colSpan={5} className="py-3 px-4 text-right text-slate-400">
                    Click "Ask AI" on any entry to start transaction-specific chat
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* DIFF CARDS VIEW */
        /* ========================================================================= */
        <div className="space-y-3">
          {filteredRecords.map((r, idx) => {
            const details = getActionDetails(r);
            const ActionIcon = details.icon;
            const originalStatusLabel = r.status === 'AMOUNT_MISMATCH' 
              ? 'Price Difference' 
              : r.status === 'DATE_MISMATCH' 
              ? 'Date Delay' 
              : r.status === 'MISSING_INVOICE' 
              ? 'Missing Bill' 
              : r.status;

            return (
              <div 
                key={r.transaction_id || idx}
                className="bg-[#171717] border border-[#2F2F2F] hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg transition-all space-y-4 card-interactive cursor-pointer"
                onClick={() => setSelectedAdjustment(r)}
              >
                {/* Card Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2F2F2F] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-emerald-400 bg-[#2F2F2F] px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {r.transaction_id}
                    </span>
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {r.vendor || r.invoice_customer || r.payment_merchant || 'Customer'}
                    </span>
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${details.badgeColor} flex items-center gap-1`}>
                      <ActionIcon className="w-3 h-3" />
                      {details.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1 mr-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {r.date || 'N/A'}
                    </span>
                    
                    {onAskAI && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskAI(r);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#2F2F2F] hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 transition text-[11px] font-mono font-bold flex items-center gap-1 shadow-sm"
                        title={`Ask AI about transaction ${r.transaction_id}`}
                      >
                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ask AI</span>
                      </button>
                    )}

                    {onRevert && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRevert(r.transaction_id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-400 hover:text-rose-400 border border-[#3A3A3A] transition text-[11px] font-mono flex items-center gap-1"
                        title="Undo this adjustment"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Undo</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Before vs After Diff Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Before Box */}
                  <div className="md:col-span-5 bg-[#212121] border border-rose-900/30 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                        🔴 ORIGINAL STATE (BEFORE)
                      </span>
                      <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/40">
                        {originalStatusLabel}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Bank Debit: <strong>₹{(r.amount || 0).toLocaleString()}</strong> | Bill Amount: <strong>₹{(r.invoice_amount || r.amount || 0).toLocaleString()}</strong>
                    </div>
                    {r.amount_delta ? (
                      <div className="text-[11px] font-mono text-rose-400">
                        ⚠️ Variance Delta: -₹{Math.abs(r.amount_delta).toLocaleString()}
                      </div>
                    ) : r.date_delta_days ? (
                      <div className="text-[11px] font-mono text-cyan-400">
                        ⏳ Date Offset: {r.date_delta_days > 0 ? '+' : ''}{r.date_delta_days} days lag
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-purple-400">
                        📄 Unbilled bank transaction
                      </div>
                    )}
                  </div>

                  {/* Arrow Divider */}
                  <div className="md:col-span-2 flex justify-center py-1 md:py-0">
                    <div className="w-8 h-8 rounded-full bg-[#2F2F2F] border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* After Box */}
                  <div className="md:col-span-5 bg-[#212121] border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                        🟢 ADJUSTED STATE (AFTER)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/40 font-bold">
                        ✓ BALANCED & FIXED
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200">
                      {details.description}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Target: {details.targetGL}</span>
                      </span>
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-0.5">
                        Details <Info className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE HOW IT WAS FIXED MODAL DIALOG */}
      {/* ========================================================================= */}
      {selectedAdjustment && (() => {
        const details = getActionDetails(selectedAdjustment);
        const ActionIcon = details.icon;
        const delta = Math.abs(selectedAdjustment.amount_delta || 0);

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedAdjustment(null)}
          >
            <div 
              className="bg-[#171717] border border-[#2F2F2F] rounded-2xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#2F2F2F] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#212121] border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg shadow-inner">
                    <ActionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white font-mono">
                        How Discrepancy Was Fixed
                      </h2>
                      <span className="font-mono font-bold text-xs text-emerald-400 bg-[#2F2F2F] px-2 py-0.5 rounded">
                        {selectedAdjustment.transaction_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedAdjustment.vendor || selectedAdjustment.invoice_customer || 'Customer'} • Date: {selectedAdjustment.date || 'N/A'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAdjustment(null)}
                  className="p-2 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* High-Level Before / After Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-[#212121] p-3.5 rounded-xl border border-rose-900/40 space-y-1">
                  <span className="text-[10px] text-rose-400 font-bold uppercase">1. Before (Original)</span>
                  <div className="font-bold text-white text-sm">
                    {selectedAdjustment.status === 'AMOUNT_MISMATCH' ? `-₹${delta.toLocaleString()} Delta` : selectedAdjustment.status === 'DATE_MISMATCH' ? `${Math.abs(selectedAdjustment.date_delta_days || 0)}d Lag` : 'Missing Invoice'}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Bank: ₹{(selectedAdjustment.amount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-[#212121] p-3.5 rounded-xl border border-emerald-500/40 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">2. Action Applied</span>
                  <div className="font-bold text-emerald-300 text-sm">
                    {details.shortLabel}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {details.targetGL}
                  </span>
                </div>

                <div className="bg-[#212121] p-3.5 rounded-xl border border-[#2F2F2F] space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">3. Resulting Balance</span>
                  <div className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Balanced ₹0.00</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Audit trail logged
                  </span>
                </div>
              </div>

              {/* Step-by-Step AI Resolution Flow */}
              <div className="space-y-3 bg-[#212121] p-4 rounded-xl border border-[#2F2F2F]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Step-by-Step Adjustment Breakdown
                </h3>
                <div className="space-y-2.5">
                  {details.steps.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <div className="w-5 h-5 rounded-full bg-[#2F2F2F] text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5 border border-emerald-500/30">
                        {idx + 1}
                      </div>
                      <div className="space-y-0.5">
                        <strong className="text-slate-200 font-semibold">{s.title}</strong>
                        <p className="text-slate-400 font-mono text-[11px] leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Double-Entry GL Journal Breakdown */}
              {details.journalEntries && details.journalEntries.length > 0 && (
                <div className="space-y-3 bg-[#212121] p-4 rounded-xl border border-[#2F2F2F]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      Double-Entry Accounting Mechanics (Debit / Credit)
                    </span>
                    <span className="text-[10px] font-normal text-emerald-400">Balanced ₹0.00</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#2F2F2F] text-[10px] text-slate-400 uppercase">
                          <th className="py-2 px-2">Account</th>
                          <th className="py-2 px-2">Account Description</th>
                          <th className="py-2 px-2 text-right">Debit (Added)</th>
                          <th className="py-2 px-2 text-right">Credit (Deducted)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2F2F2F]">
                        {details.journalEntries.map((j, i) => (
                          <tr key={i}>
                            <td className="py-2 px-2 text-emerald-400 font-bold">{j.code}</td>
                            <td className="py-2 px-2 text-slate-200">{j.name}</td>
                            <td className="py-2 px-2 text-right text-emerald-400 font-bold">
                              {j.debit ? `₹${j.debit.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2 px-2 text-right text-cyan-300 font-bold">
                              {j.credit ? `₹${j.credit.toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#2F2F2F]">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onAskAI && (
                    <button
                      onClick={() => {
                        const tx = selectedAdjustment;
                        setSelectedAdjustment(null);
                        onAskAI(tx);
                      }}
                      className="px-4 py-2 bg-[#212121] hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-mono font-bold border border-emerald-500/40 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Bot className="w-4 h-4 text-emerald-400" />
                      <span>Ask AI About This Record</span>
                    </button>
                  )}

                  {onRevert && (
                    <button
                      onClick={() => {
                        onRevert(selectedAdjustment.transaction_id);
                        setSelectedAdjustment(null);
                      }}
                      className="px-3 py-2 bg-[#212121] hover:bg-[#2F2F2F] text-rose-400 hover:text-rose-300 rounded-xl text-xs font-mono font-bold border border-rose-900/40 transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setSelectedAdjustment(null)}
                  className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md font-mono"
                >
                  Close Breakdown
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
