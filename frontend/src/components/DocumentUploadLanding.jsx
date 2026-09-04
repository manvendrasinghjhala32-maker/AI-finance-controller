import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Database, Settings2, ShieldCheck, Sparkles } from 'lucide-react';

export function DocumentUploadLanding({ onUploadSuccess, onDemoLoad, loading, globalError }) {
  const [bankFile, setBankFile] = useState(null);
  const [invoicesFile, setInvoicesFile] = useState(null);
  const [paymentsFile, setPaymentsFile] = useState(null);
  const [gtFile, setGtFile] = useState(null);

  const [amountTolerance, setAmountTolerance] = useState(0);
  const [dateTolerance, setDateTolerance] = useState(0);
  const [fuzzyThreshold, setFuzzyThreshold] = useState(60);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const displayError = uploadError || globalError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bankFile || !invoicesFile) {
      setUploadError('Please select both a Bank Statement CSV and a Bills/Invoices CSV file.');
      return;
    }
    setUploadError(null);

    const formData = new FormData();
    formData.append('bank_file', bankFile);
    formData.append('invoices_file', invoicesFile);
    if (paymentsFile) formData.append('payments_file', paymentsFile);
    if (gtFile) formData.append('ground_truth_file', gtFile);

    onUploadSuccess(formData, {
      amount_tolerance: amountTolerance,
      date_tolerance: dateTolerance,
      fuzzy_threshold: fuzzyThreshold,
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col items-center justify-center p-6 lg:p-12">
      {/* Header Title */}
      <div className="text-center max-w-2xl mb-8 animate-fade-in flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-[#141A27] border border-[#263147] flex items-center justify-center text-emerald-400 font-mono font-bold text-sm mb-4 shadow-sm">
          FC
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111622] border border-[#1E2638] text-slate-300 text-[11px] font-mono font-medium tracking-wide mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          AUTONOMOUS RECONCILIATION ENGINE
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2 font-sans">
          Financial Document Ingestion
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans max-w-lg">
          Upload bank statements and general ledger invoice files to initiate automated transaction matching, variance forensics, and cash position forecasting.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="w-full max-w-3xl bg-[#111622] rounded-xl border border-[#1E2638] shadow-xl p-6 lg:p-8 animate-scale-in">
        {displayError && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Bank Statement Upload */}
            <div className={`border border-dashed rounded-lg p-5 transition-all text-center flex flex-col items-center justify-center ${bankFile ? 'border-emerald-500/60 bg-[#141D2B]' : 'border-[#222C3E] hover:border-[#35435E] bg-[#0E131E]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${bankFile ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-[#161D2B] text-slate-400'}`}>
                {bankFile ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <label className="font-semibold text-slate-200 text-xs mb-0.5 block font-mono">
                1. Bank Statement (.csv) <span className="text-rose-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-3">Dates, debit/credit transactions, and amounts</p>

              {bankFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-[#0E131E] px-2.5 py-1 rounded border border-emerald-500/30">
                  <span className="truncate max-w-[190px]">{bankFile.name}</span>
                  <button type="button" onClick={() => setBankFile(null)} className="text-slate-400 hover:text-rose-400 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3.5 py-1.5 bg-[#161D2B] hover:bg-[#1E2638] border border-[#222C3E] hover:border-[#35435E] text-slate-200 rounded text-xs font-medium transition-colors">
                  Select File
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setBankFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* 2. Invoices Ledger Upload */}
            <div className={`border border-dashed rounded-lg p-5 transition-all text-center flex flex-col items-center justify-center ${invoicesFile ? 'border-emerald-500/60 bg-[#141D2B]' : 'border-[#222C3E] hover:border-[#35435E] bg-[#0E131E]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${invoicesFile ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-[#161D2B] text-slate-400'}`}>
                {invoicesFile ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <label className="font-semibold text-slate-200 text-xs mb-0.5 block font-mono">
                2. Invoices & Bills (.csv) <span className="text-rose-400">*</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-3">Invoiced sales, vendor bills, and terms</p>

              {invoicesFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-[#0E131E] px-2.5 py-1 rounded border border-emerald-500/30">
                  <span className="truncate max-w-[190px]">{invoicesFile.name}</span>
                  <button type="button" onClick={() => setInvoicesFile(null)} className="text-slate-400 hover:text-rose-400 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3.5 py-1.5 bg-[#161D2B] hover:bg-[#1E2638] border border-[#222C3E] hover:border-[#35435E] text-slate-200 rounded text-xs font-medium transition-colors">
                  Select File
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setInvoicesFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* 3. Gateway Settlements (Optional) */}
            <div className={`border border-dashed rounded-lg p-4 transition-all text-center flex flex-col items-center justify-center ${paymentsFile ? 'border-blue-500/60 bg-[#121A2A]' : 'border-[#222C3E] hover:border-[#35435E] bg-[#0E131E]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${paymentsFile ? 'bg-blue-950/80 text-blue-400 border border-blue-500/30' : 'bg-[#161D2B] text-slate-400'}`}>
                {paymentsFile ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <label className="font-semibold text-slate-200 text-xs mb-0.5 block font-mono">
                3. Gateway Settlements <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <p className="text-[10px] text-slate-400 mb-2.5">Stripe/Razorpay processing fee & payout breakdown</p>

              {paymentsFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-blue-300 bg-[#0E131E] px-2.5 py-1 rounded border border-blue-500/30">
                  <span className="truncate max-w-[190px]">{paymentsFile.name}</span>
                  <button type="button" onClick={() => setPaymentsFile(null)} className="text-slate-400 hover:text-rose-400 font-bold ml-1">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3 py-1 bg-[#161D2B] hover:bg-[#1E2638] border border-[#222C3E] text-slate-300 rounded text-[11px] font-medium transition-colors">
                  Select CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setPaymentsFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* 4. Ground Truth Benchmark Key (Optional) */}
            <div className={`border border-dashed rounded-lg p-4 transition-all text-center flex flex-col items-center justify-center ${gtFile ? 'border-purple-500/60 bg-[#161426]' : 'border-[#222C3E] hover:border-[#35435E] bg-[#0E131E]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${gtFile ? 'bg-purple-950/80 text-purple-400 border border-purple-500/30' : 'bg-[#161D2B] text-slate-400'}`}>
                {gtFile ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <label className="font-semibold text-slate-200 text-xs mb-0.5 block font-mono">
                4. Validation Benchmark <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <p className="text-[10px] text-slate-400 mb-2.5">Ground-truth labels for auditing model accuracy</p>

              {gtFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-purple-300 bg-[#0E131E] px-2.5 py-1 rounded border border-purple-500/30">
                  <span className="truncate max-w-[190px]">{gtFile.name}</span>
                  <button type="button" onClick={() => setGtFile(null)} className="text-slate-400 hover:text-rose-400 font-bold ml-1">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3 py-1 bg-[#161D2B] hover:bg-[#1E2638] border border-[#222C3E] text-slate-300 rounded text-[11px] font-medium transition-colors">
                  Select CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setGtFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>
          </div>

          {/* Advanced Tolerances Accordion */}
          <div className="border border-[#1E2638] rounded-lg overflow-hidden bg-[#0E131E]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-2.5 bg-[#141A27] hover:bg-[#182030] flex items-center justify-between text-xs font-medium text-slate-300 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                Matching Tolerances & Confidence Parameters
              </span>
              <span className="text-[11px] font-mono text-slate-400">{showAdvanced ? 'Hide' : 'Configure'}</span>
            </button>

            {showAdvanced && (
              <div className="p-4 bg-[#0E131E] space-y-4 border-t border-[#1E2638]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Price Tolerance</span>
                      <span className="text-emerald-400 font-mono font-semibold">₹{amountTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="25"
                      value={amountTolerance}
                      onChange={(e) => setAmountTolerance(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Date Drift Window</span>
                      <span className="text-emerald-400 font-mono font-semibold">{dateTolerance} Days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      step="1"
                      value={dateTolerance}
                      onChange={(e) => setDateTolerance(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Entity Match Threshold</span>
                      <span className="text-emerald-400 font-mono font-semibold">{fuzzyThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={fuzzyThreshold}
                      onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-[#1E2638] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={loading || !bankFile || !invoicesFile}
              className={`w-full sm:flex-1 py-2.5 px-4 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2 ${loading || !bankFile || !invoicesFile ? 'bg-[#141A27] text-slate-500 cursor-not-allowed border border-[#1E2638]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'}`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-mono">Processing Datasets...</span>
                </>
              ) : (
                <>
                  <span>Execute Financial Reconciliation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onDemoLoad}
              disabled={loading}
              className="w-full sm:w-auto py-2.5 px-4 rounded-lg border border-[#1E2638] hover:border-[#2E3952] bg-[#141A27] hover:bg-[#1A2234] text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span>Load Benchmark Dataset (160 Records)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Footer Specifications */}
      <div className="mt-8 max-w-3xl w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <div className="p-3.5 rounded-lg bg-[#111622] border border-[#1E2638] text-xs text-slate-400">
          <div className="font-medium text-slate-300 mb-1 flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Bank Statement Columns
          </div>
          <code className="text-slate-300 font-mono text-[11px] block">transaction_id, date, description, amount, reference</code>
        </div>
        <div className="p-3.5 rounded-lg bg-[#111622] border border-[#1E2638] text-xs text-slate-400">
          <div className="font-medium text-slate-300 mb-1 flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Invoice Ledger Columns
          </div>
          <code className="text-slate-300 font-mono text-[11px] block">invoice_id, date, customer, amount, invoice_reference</code>
        </div>
      </div>
    </div>
  );
}
