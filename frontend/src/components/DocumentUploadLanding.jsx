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
    <div className="min-h-screen bg-[#212121] text-slate-100 flex flex-col items-center justify-center p-6 lg:p-12">
      {/* Header Title */}
      <div className="text-center max-w-3xl mb-10 animate-fade-in flex flex-col items-center">
        <img src="/finance_logo.png" alt="Finance Controller" className="w-16 h-16 rounded-2xl mb-4 object-contain shadow-2xl animate-float" />
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171717] border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          Smart Money & Invoice Matcher
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
          Upload Your Financial Documents
        </h1>
        <p className="text-base lg:text-lg text-slate-400 leading-relaxed">
          Upload your bank and invoice files to automatically check matching payments, find differences or missing bills, and get clear answers with AI.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="w-full max-w-4xl bg-[#171717] rounded-2xl border border-[#2F2F2F] shadow-2xl p-8 lg:p-10 animate-scale-in">
        {displayError && (
          <div className="mb-6 p-4 rounded-xl bg-[#2F2F2F] border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bank Statement Upload */}
            <div className={`border-2 border-dashed rounded-xl p-6 transition-all duration-300 hover:scale-[1.015] text-center flex flex-col items-center justify-center ${bankFile ? 'border-emerald-500 bg-[#2F2F2F] shadow-lg shadow-emerald-950/20' : 'border-[#383838] hover:border-emerald-500/70 bg-[#212121] hover:bg-[#252525]'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${bankFile ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-[#2F2F2F] text-slate-400'}`}>
                {bankFile ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <label className="font-semibold text-slate-200 text-sm mb-1 block">
                1. Bank Statement (.csv) <span className="text-rose-400">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-4">Your bank transactions with dates, amounts & details</p>

              {bankFile ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300 bg-[#171717] px-3 py-1.5 rounded-lg border border-emerald-500/40 animate-scale-in">
                  <span className="truncate max-w-[200px] font-mono">{bankFile.name}</span>
                  <button type="button" onClick={() => setBankFile(null)} className="text-emerald-400 hover:text-rose-400 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-4 py-2 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-emerald-500/50 text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 btn-interactive">
                  Browse Bank CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setBankFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* Invoices Ledger Upload */}
            <div className={`border-2 border-dashed rounded-xl p-6 transition-all duration-300 hover:scale-[1.015] text-center flex flex-col items-center justify-center ${invoicesFile ? 'border-emerald-500 bg-[#2F2F2F] shadow-lg shadow-emerald-950/20' : 'border-[#383838] hover:border-emerald-500/70 bg-[#212121] hover:bg-[#252525]'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 ${invoicesFile ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-[#2F2F2F] text-slate-400'}`}>
                {invoicesFile ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <label className="font-semibold text-slate-200 text-sm mb-1 block">
                2. Invoices & Bills (.csv) <span className="text-rose-400">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-4">Your list of sales, invoices, customers & bills</p>

              {invoicesFile ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-300 bg-[#171717] px-3 py-1.5 rounded-lg border border-emerald-500/40 animate-scale-in">
                  <span className="truncate max-w-[200px] font-mono">{invoicesFile.name}</span>
                  <button type="button" onClick={() => setInvoicesFile(null)} className="text-emerald-400 hover:text-rose-400 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-4 py-2 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-emerald-500/50 text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 btn-interactive">
                  Browse Invoices CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setInvoicesFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* Gateway Settlements (Optional) */}
            <div className={`border-2 border-dashed rounded-xl p-5 transition-all duration-300 hover:scale-[1.015] text-center flex flex-col items-center justify-center ${paymentsFile ? 'border-cyan-500 bg-[#2F2F2F] shadow-lg shadow-cyan-950/20' : 'border-[#383838] hover:border-cyan-500/70 bg-[#212121] hover:bg-[#252525]'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${paymentsFile ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : 'bg-[#2F2F2F] text-slate-400'}`}>
                {paymentsFile ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <label className="font-semibold text-slate-200 text-xs mb-0.5 block">
                3. Gateway Settlements (.csv) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-3">Online payment settlement status & fee breakdown</p>

              {paymentsFile ? (
                <div className="flex items-center gap-2 text-xs font-medium text-cyan-300 bg-[#171717] px-3 py-1.5 rounded-lg border border-cyan-500/40 animate-scale-in">
                  <span className="truncate max-w-[200px] font-mono">{paymentsFile.name}</span>
                  <button type="button" onClick={() => setPaymentsFile(null)} className="text-cyan-400 hover:text-rose-400 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3.5 py-1.5 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-cyan-500/50 text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 btn-interactive">
                  Browse Gateway CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setPaymentsFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* Ground Truth Benchmark Key (Optional) */}
            <div className={`border-2 border-dashed rounded-xl p-5 transition-all duration-300 hover:scale-[1.015] text-center flex flex-col items-center justify-center ${gtFile ? 'border-purple-500 bg-[#2F2F2F] shadow-lg shadow-purple-950/20' : 'border-[#383838] hover:border-purple-500/70 bg-[#212121] hover:bg-[#252525]'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${gtFile ? 'bg-purple-950 text-purple-400 border border-purple-500/30' : 'bg-[#2F2F2F] text-slate-400'}`}>
                {gtFile ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <label className="font-semibold text-slate-200 text-xs mb-0.5 block">
                🎯 4. Ground Truth / Benchmark Key (.csv) <span className="text-purple-400 font-normal">(Optional)</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-3">Measures empirical accuracy vs expected labels live on UI</p>

              {gtFile ? (
                <div className="flex items-center gap-2 text-xs font-medium text-purple-300 bg-[#171717] px-3 py-1.5 rounded-lg border border-purple-500/40 animate-scale-in">
                  <span className="truncate max-w-[200px] font-mono">{gtFile.name}</span>
                  <button type="button" onClick={() => setGtFile(null)} className="text-purple-400 hover:text-rose-400 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3.5 py-1.5 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-[#3A3A3A] hover:border-purple-500/50 text-purple-200 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 btn-interactive">
                  Browse Benchmark CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setGtFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>
          </div>

          {/* Advanced Tolerances Accordion */}
          <div className="border border-[#2F2F2F] rounded-xl overflow-hidden bg-[#212121]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-5 py-3.5 bg-[#2F2F2F] hover:bg-[#3A3A3A] flex items-center justify-between text-xs font-semibold text-slate-200 transition"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                Matching Tolerances & Thresholds (Optional)
              </span>
              <span className="text-slate-400">{showAdvanced ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {showAdvanced && (
              <div className="p-6 bg-[#171717] space-y-6 border-t border-[#2F2F2F]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Allowed Price Difference</span>
                      <span className="text-emerald-400 font-bold font-mono">₹{amountTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="25"
                      value={amountTolerance}
                      onChange={(e) => setAmountTolerance(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Allowed Date Delay</span>
                      <span className="text-emerald-400 font-bold font-mono">{dateTolerance} Days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      step="1"
                      value={dateTolerance}
                      onChange={(e) => setDateTolerance(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Allowed Date Delay</span>
                      <span className="text-emerald-400 font-bold font-mono">{dateTolerance} Days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      step="1"
                      value={dateTolerance}
                      onChange={(e) => setDateTolerance(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Name Match Sensitivity</span>
                      <span className="text-emerald-400 font-bold font-mono">{fuzzyThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={fuzzyThreshold}
                      onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="submit"
              disabled={loading || !bankFile || !invoicesFile}
              className={`w-full sm:flex-1 py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 ${loading || !bankFile || !invoicesFile ? 'bg-[#2F2F2F] text-slate-500 cursor-not-allowed border border-[#3A3A3A]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Checking and Matching Records...</span>
                </>
              ) : (
                <>
                  <span>🚀 Check & Match Records</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onDemoLoad}
              disabled={loading}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl border border-[#2F2F2F] hover:border-[#3A3A3A] bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-200 font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Load Example Demo (160 Records)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Footer Info / Supported Schemas */}
      <div className="mt-10 max-w-3xl w-full grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div className="p-4 rounded-xl bg-[#171717] border border-[#2F2F2F] shadow-sm text-xs text-slate-400">
          <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Supported Bank Columns
          </div>
          <code className="text-emerald-300 font-mono text-[11px]">transaction_id, date, description, amount, reference</code>
          <p className="mt-1 text-slate-400 text-[11px]">Also understands: <code>TxnID</code>, <code>Details</code>, <code>Amount</code>, <code>UTR</code></p>
        </div>
        <div className="p-4 rounded-xl bg-[#171717] border border-[#2F2F2F] shadow-sm text-xs text-slate-400">
          <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Supported Invoice Columns
          </div>
          <code className="text-emerald-300 font-mono text-[11px]">invoice_id, date, customer, amount, invoice_reference</code>
          <p className="mt-1 text-slate-400 text-[11px]">Also understands: <code>Bill No</code>, <code>Client</code>, <code>Total</code>, <code>Ref No</code></p>
        </div>
      </div>
    </div>
  );
}
