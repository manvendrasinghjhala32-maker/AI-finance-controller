import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Database, Settings2, ShieldCheck, Sparkles, Sun, Moon } from 'lucide-react';

export function DocumentUploadLanding({ onUploadSuccess, onDemoLoad, loading, globalError, theme = 'light', onToggleTheme }) {
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
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1F36] flex flex-col items-center justify-center p-6 lg:p-12 font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Top Bar Theme Toggle */}
      {onToggleTheme && (
        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 z-10">
          <button
            type="button"
            onClick={onToggleTheme}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-[#374151] hover:text-[#1A1F36] text-xs font-medium flex items-center gap-1.5 border border-[#D1D5DB] transition-all shadow-xs cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-sans">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#6B7280]" />
                <span className="font-sans">Dark</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Header Title */}
      <div className="text-center max-w-2xl mb-8 animate-fade-in flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-[#0C2340] flex items-center justify-center text-white font-mono font-bold text-sm mb-4 shadow-sm">
          FC
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-[#1D4ED8] text-[11px] font-mono font-medium tracking-wide mb-3 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
          AUTONOMOUS RECONCILIATION ENGINE
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#1A1F36] tracking-tight mb-2 font-sans">
          Financial Document Ingestion
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed font-sans max-w-lg">
          Upload bank statements and general ledger invoice files to initiate automated transaction matching, variance forensics, and cash position forecasting.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="w-full max-w-3xl bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 lg:p-8 animate-scale-in">
        {displayError && (
          <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-fade-in font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Bank Statement Upload */}
            <div className={`border border-dashed rounded-xl p-5 transition-all text-center flex flex-col items-center justify-center ${bankFile ? 'border-blue-400 bg-[#EFF6FF]' : 'border-[#D1D5DB] hover:border-[#9CA3AF] bg-[#FAFAFC]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${bankFile ? 'bg-blue-100 text-[#1D4ED8]' : 'bg-gray-100 text-[#6B7280]'}`}>
                {bankFile ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <FileText className="w-4 h-4" />}
              </div>
              <label className="font-semibold text-[#1A1F36] text-xs mb-0.5 block font-mono">
                1. Bank Statement (.csv) <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-[#6B7280] mb-3">Dates, debit/credit transactions, and amounts</p>

              {bankFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-[#1D4ED8] bg-white px-2.5 py-1 rounded border border-blue-200 shadow-xs">
                  <span className="truncate max-w-[190px]">{bankFile.name}</span>
                  <button type="button" onClick={() => setBankFile(null)} className="text-gray-400 hover:text-rose-600 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-[#1A1F36] rounded-lg text-xs font-medium transition-colors shadow-xs">
                  Select File
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setBankFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* 2. Invoices Ledger Upload */}
            <div className={`border border-dashed rounded-xl p-5 transition-all text-center flex flex-col items-center justify-center ${invoicesFile ? 'border-blue-400 bg-[#EFF6FF]' : 'border-[#D1D5DB] hover:border-[#9CA3AF] bg-[#FAFAFC]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 transition-colors ${invoicesFile ? 'bg-blue-100 text-[#1D4ED8]' : 'bg-gray-100 text-[#6B7280]'}`}>
                {invoicesFile ? <CheckCircle2 className="w-4 h-4 text-[#16A34A]" /> : <FileText className="w-4 h-4" />}
              </div>
              <label className="font-semibold text-[#1A1F36] text-xs mb-0.5 block font-mono">
                2. Invoices & Bills (.csv) <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-[#6B7280] mb-3">Invoiced sales, vendor bills, and terms</p>

              {invoicesFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-[#1D4ED8] bg-white px-2.5 py-1 rounded border border-blue-200 shadow-xs">
                  <span className="truncate max-w-[190px]">{invoicesFile.name}</span>
                  <button type="button" onClick={() => setInvoicesFile(null)} className="text-gray-400 hover:text-rose-600 font-bold ml-1 transition-colors">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-[#1A1F36] rounded-lg text-xs font-medium transition-colors shadow-xs">
                  Select File
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setInvoicesFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* 3. Gateway Settlements (Optional) */}
            <div className={`border border-dashed rounded-xl p-4 transition-all text-center flex flex-col items-center justify-center ${paymentsFile ? 'border-blue-400 bg-[#EFF6FF]' : 'border-[#D1D5DB] hover:border-[#9CA3AF] bg-[#FAFAFC]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${paymentsFile ? 'bg-blue-100 text-[#1D4ED8]' : 'bg-gray-100 text-[#6B7280]'}`}>
                {paymentsFile ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> : <FileText className="w-3.5 h-3.5 text-[#6B7280]" />}
              </div>
              <label className="font-semibold text-[#1A1F36] text-xs mb-0.5 block font-mono">
                3. Gateway Settlements <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <p className="text-[10px] text-[#6B7280] mb-2.5">Stripe/Razorpay processing fee & payout breakdown</p>

              {paymentsFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-[#1D4ED8] bg-white px-2.5 py-1 rounded border border-blue-200 shadow-xs">
                  <span className="truncate max-w-[190px]">{paymentsFile.name}</span>
                  <button type="button" onClick={() => setPaymentsFile(null)} className="text-gray-400 hover:text-rose-600 font-bold ml-1">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-[#1A1F36] rounded-lg text-[11px] font-medium transition-colors shadow-xs">
                  Select CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setPaymentsFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>

            {/* 4. Ground Truth Benchmark Key (Optional) */}
            <div className={`border border-dashed rounded-xl p-4 transition-all text-center flex flex-col items-center justify-center ${gtFile ? 'border-purple-400 bg-purple-50' : 'border-[#D1D5DB] hover:border-[#9CA3AF] bg-[#FAFAFC]'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${gtFile ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-[#6B7280]'}`}>
                {gtFile ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#6B7280]" />}
              </div>
              <label className="font-semibold text-[#1A1F36] text-xs mb-0.5 block font-mono">
                4. Validation Benchmark <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <p className="text-[10px] text-[#6B7280] mb-2.5">Ground-truth labels for auditing model accuracy</p>

              {gtFile ? (
                <div className="flex items-center gap-2 text-xs font-mono text-purple-700 bg-white px-2.5 py-1 rounded border border-purple-200 shadow-xs">
                  <span className="truncate max-w-[190px]">{gtFile.name}</span>
                  <button type="button" onClick={() => setGtFile(null)} className="text-gray-400 hover:text-rose-600 font-bold ml-1">✕</button>
                </div>
              ) : (
                <label className="cursor-pointer px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-[#1A1F36] rounded-lg text-[11px] font-medium transition-colors shadow-xs">
                  Select CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => setGtFile(e.target.files[0] || null)} />
                </label>
              )}
            </div>
          </div>

          {/* Advanced Tolerances Accordion */}
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-2.5 bg-[#F9FAFB] hover:bg-gray-100 flex items-center justify-between text-xs font-medium text-[#374151] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-[#6B7280]" />
                Matching Tolerances & Confidence Parameters
              </span>
              <span className="text-[11px] font-mono text-[#6B7280]">{showAdvanced ? 'Hide' : 'Configure'}</span>
            </button>

            {showAdvanced && (
              <div className="p-4 bg-white space-y-4 border-t border-[#E5E7EB]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs text-[#374151] mb-1">
                      <span>Price Tolerance</span>
                      <span className="text-[#1D4ED8] font-mono font-semibold">₹{amountTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="25"
                      value={amountTolerance}
                      onChange={(e) => setAmountTolerance(Number(e.target.value))}
                      className="w-full accent-[#528FF0] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-[#374151] mb-1">
                      <span>Date Drift Window</span>
                      <span className="text-[#1D4ED8] font-mono font-semibold">{dateTolerance} Days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      step="1"
                      value={dateTolerance}
                      onChange={(e) => setDateTolerance(Number(e.target.value))}
                      className="w-full accent-[#528FF0] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-[#374151] mb-1">
                      <span>Entity Match Threshold</span>
                      <span className="text-[#1D4ED8] font-mono font-semibold">{fuzzyThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={fuzzyThreshold}
                      onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                      className="w-full accent-[#528FF0] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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
              className={`w-full sm:flex-1 py-2.5 px-4 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 ${loading || !bankFile || !invoicesFile ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-[#0C2340] hover:bg-[#162E50] text-white shadow-sm'}`}
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
              className="w-full sm:w-auto py-2.5 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 bg-white text-[#1A1F36] font-medium text-xs transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Database className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Load Benchmark Dataset (160 Records)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Footer Specifications */}
      <div className="mt-8 max-w-3xl w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#6B7280] shadow-xs">
          <div className="font-medium text-[#1A1F36] mb-1 flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Bank Statement Columns
          </div>
          <code className="text-[#374151] font-mono text-[11px] block">transaction_id, date, description, amount, reference</code>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#6B7280] shadow-xs">
          <div className="font-medium text-[#1A1F36] mb-1 flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Invoice Ledger Columns
          </div>
          <code className="text-[#374151] font-mono text-[11px] block">invoice_id, date, customer, amount, invoice_reference</code>
        </div>
      </div>
    </div>
  );
}
