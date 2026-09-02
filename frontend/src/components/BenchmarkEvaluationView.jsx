import React, { useState, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Upload, 
  FileText, 
  Sparkles, 
  Download, 
  ArrowUpRight,
  TrendingUp,
  Layers,
  Clock,
  DollarSign,
  FileQuestion,
  RefreshCw,
  Info,
  HelpCircle,
  X,
  Bot
} from 'lucide-react';

export function BenchmarkEvaluationView({ data, onUploadSuccess, onAskAI }) {
  const [localData, setLocalData] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'CORRECT' | 'INCORRECT'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);

  const currentData = localData || data;
  const metrics = currentData?.metrics || null;
  const records = currentData?.records || [];

  // Handle direct ground truth file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('ground_truth_file', file);

    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/upload/ground_truth', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to upload ground truth file.');
      }

      const updatedData = await res.json();
      setLocalData(updatedData);
      if (onUploadSuccess) {
        onUploadSuccess(updatedData);
      }
    } catch (err) {
      console.error('Ground truth upload error:', err);
      setUploadError(err.message || 'Error processing ground truth benchmark file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Reconciled records with ground-truth comparison
  const auditRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    
    return records
      .filter(r => r.status !== 'DUPLICATE')
      .map(r => {
        const incorrectInfo = metrics?.incorrect_predictions?.find(inc => inc.transaction_id === r.transaction_id);
        const isIncorrect = !!incorrectInfo;
        
        const expectedStatus = incorrectInfo?.expected_status || r.status;
        const expectedInvId = incorrectInfo?.expected_invoice_id !== undefined ? incorrectInfo.expected_invoice_id : (r.invoice_id || '');
        const isCorrect = !isIncorrect;

        return {
          ...r,
          isCorrect,
          expectedStatus,
          expectedInvId,
          failureDetails: incorrectInfo || null,
        };
      });
  }, [records, metrics]);

  // Filtered audit records
  const filteredAuditRecords = useMemo(() => {
    return auditRecords.filter(item => {
      // Correctness Filter
      if (filterMode === 'CORRECT' && !item.isCorrect) return false;
      if (filterMode === 'INCORRECT' && item.isCorrect) return false;

      // Category Filter
      if (categoryFilter !== 'ALL' && item.expectedStatus !== categoryFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const txId = (item.transaction_id || '').toLowerCase();
        const vendor = (item.vendor || '').toLowerCase();
        const ref = (item.reference || '').toLowerCase();
        const inv = (item.invoice_id || '').toLowerCase();
        if (!txId.includes(q) && !vendor.includes(q) && !ref.includes(q) && !inv.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [auditRecords, filterMode, categoryFilter, searchQuery]);

  const totalAudited = metrics?.total || auditRecords.length;
  const classificationCorrect = metrics?.classification_correct ?? metrics?.correct ?? auditRecords.filter(r => r.isCorrect).length;
  const classificationAccuracy = metrics?.classification_accuracy ?? metrics?.accuracy ?? (totalAudited > 0 ? (classificationCorrect / totalAudited * 100) : 100);
  const classificationFailures = metrics?.classification_failures ?? (totalAudited - classificationCorrect);

  const totalCorrect = classificationCorrect;
  const errorCount = classificationFailures;
  const overallAccuracy = classificationAccuracy;

  const invoiceCorrectCount = metrics?.invoice_correct ?? totalAudited;
  const invoiceAccuracy = metrics?.invoice_accuracy ?? (totalAudited > 0 ? (invoiceCorrectCount / totalAudited * 100) : 100);
  const invoiceFailures = metrics?.invoice_failures ?? (totalAudited - invoiceCorrectCount);

  const incorrectPredictions = metrics?.incorrect_predictions || [];
  const systemicIssues = metrics?.systemic_issues || [];
  const ingestionWarnings = currentData?.summary?.ingestion_warnings || [];

  // Hidden File Input for uploading ground truth CSV
  const renderFileInput = () => (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileUpload}
      accept=".csv,.tsv,.txt"
      className="hidden"
    />
  );

  // --------------------------------------------------------------------------
  // Case 1: No Ground Truth Uploaded -> Show requested empty state
  // --------------------------------------------------------------------------
  if (!metrics) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-fade-in">
        {renderFileInput()}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/finance_logo.png" alt="Benchmark" className="w-8 h-8 rounded-lg object-contain" />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Ground-Truth Benchmark & Accuracy
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Empirically measures precision, recall, and category classification accuracy against verified benchmark keys.
            </p>
          </div>
        </div>

        {/* Empty State Banner */}
        <div className="bg-[#171717] border-2 border-dashed border-[#3A3A3A] hover:border-emerald-500/50 rounded-2xl p-10 sm:p-14 text-center space-y-6 shadow-xl transition-all">
          <div className="w-16 h-16 rounded-2xl bg-[#212121] border border-[#2F2F2F] flex items-center justify-center p-2.5 mx-auto shadow-inner">
            <img src="/finance_logo.png" alt="Benchmark" className="w-12 h-12 object-contain" />
          </div>

          <div className="space-y-2.5 max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Please upload a ground truth file to test
            </h2>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              To measure the empirical accuracy, invoice linking precision, and per-category verification rates of the reconciliation engine, please upload a <code className="text-emerald-400 font-mono bg-[#212121] px-1.5 py-0.5 rounded border border-[#2F2F2F]">ground_truth.csv</code> file.
            </p>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs font-mono max-w-md mx-auto">
              ⚠️ {uploadError}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all cursor-pointer btn-interactive font-mono disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Processing Benchmark Key...' : 'Upload Ground Truth CSV (.csv)'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Expected columns: <code className="text-slate-400">transaction_id</code>, <code className="text-slate-400">expected_status</code>, <code className="text-slate-400">expected_invoice_id</code>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Case 2: Ground Truth Uploaded but Does NOT Match Dataset (Failure Explanation)
  // --------------------------------------------------------------------------
  if (metrics.matches_dataset === false) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-12 animate-fade-in">
        {renderFileInput()}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/finance_logo.png" alt="Benchmark" className="w-8 h-8 rounded-lg object-contain" />
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Ground-Truth Benchmark & Accuracy
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-950/50 text-rose-400 border border-rose-800/40 font-semibold">
                Dataset Mismatch
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Empirically measures precision, recall, and category classification accuracy against verified benchmark keys.
            </p>
          </div>
        </div>

        {/* Detailed Mismatch & Failure Explanation Card */}
        <div className="bg-[#171717] border-2 border-rose-500/50 rounded-2xl p-8 sm:p-10 space-y-6 shadow-2xl transition-all">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-3xl mx-auto shadow-inner text-rose-400 animate-pulse">
              ⚠️
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              The ground truth doesn't match
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mx-auto font-sans leading-relaxed">
              The benchmark evaluation could not execute because the uploaded ground truth file is incompatible with the currently loaded bank statement dataset.
            </p>
          </div>

          {/* Failure Root-Cause Diagnosis Box */}
          <div className="bg-[#212121] border border-rose-900/40 rounded-xl p-5 space-y-4 max-w-2xl mx-auto">
            <div className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Benchmark Failure Explanation & Diagnostics:</span>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex items-start gap-2 bg-[#171717] p-3 rounded-lg border border-[#2F2F2F]">
                <span className="font-bold text-rose-300 min-w-[130px] font-mono">Failure Reason:</span>
                <span className="text-slate-300">{metrics.error || "Zero matching transaction IDs detected between ground truth and bank dataset."}</span>
              </div>

              <div className="flex items-start gap-2 bg-[#171717] p-3 rounded-lg border border-[#2F2F2F]">
                <span className="font-bold text-cyan-300 min-w-[130px] font-mono">Overlap Evidence:</span>
                <span className="text-slate-300 font-mono">Found {metrics.overlap_count ?? 0} matching transaction IDs out of {metrics.total_dataset_records ?? records.length} total dataset records.</span>
              </div>

              <div className="flex items-start gap-2 bg-[#171717] p-3 rounded-lg border border-[#2F2F2F]">
                <span className="font-bold text-amber-300 min-w-[130px] font-mono">Expected Schema:</span>
                <span className="text-slate-300 font-mono">File must contain <code className="text-amber-300">transaction_id</code>, <code className="text-amber-300">expected_status</code>, and optionally <code className="text-amber-300">expected_invoice_id</code>.</span>
              </div>

              <div className="flex items-start gap-2 bg-[#171717] p-3 rounded-lg border border-[#2F2F2F]">
                <span className="font-bold text-emerald-300 min-w-[130px] font-mono">Recommended Fix:</span>
                <span className="text-slate-300">Upload the corresponding <code className="text-emerald-300 font-mono">ground_truth.csv</code> created for this specific bank statement dataset.</span>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs font-mono max-w-md mx-auto text-center">
              ⚠️ {uploadError}
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all cursor-pointer btn-interactive font-mono disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Processing Benchmark Key...' : 'Upload Correct Ground Truth CSV (.csv)'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Case 3: Ground Truth Uploaded & Verified -> Full Empirical Evaluation Suite
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fade-in">
      {renderFileInput()}

      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/finance_logo.png" alt="Benchmark" className="w-8 h-8 rounded-lg object-contain" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Ground-Truth Benchmark & Accuracy
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30 font-semibold">
              Empirical Verification
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Measures empirical reconciliation accuracy, invoice ID resolution, and category precision against verified ground truth.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#16251E] text-emerald-400 border border-emerald-500/40 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Verified Ground Truth Key Loaded</span>
          </span>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-200 border border-[#3A3A3A] shadow-sm transition-all cursor-pointer btn-interactive"
            title="Replace or upload another ground truth CSV"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Replace Key</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-rose-300 text-xs font-mono">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Ingestion Warning Banner if any */}
      {ingestionWarnings.length > 0 && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-1.5 text-amber-200 text-xs font-mono">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            <span>Ingestion Warning</span>
          </div>
          {ingestionWarnings.map((w, idx) => (
            <p key={idx}>{w}</p>
          ))}
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Classification Accuracy (Status) */}
        <div className="figma-card p-5 bg-[#171717] border border-emerald-500/40 rounded-xl shadow-xl card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Classification Accuracy (Status)
            </span>
            <span className="w-6 h-6 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-400">
              🎯
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono text-emerald-400">
              {classificationAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">
              {classificationCorrect} of {totalAudited} status classifications correct
            </div>
          </div>
        </div>

        {/* Invoice ID Linkage Accuracy */}
        <div className="figma-card p-5 bg-[#171717] border border-cyan-500/30 rounded-xl shadow-xl card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Invoice ID Linkage Accuracy
            </span>
            <span className="w-6 h-6 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-xs text-cyan-400">
              🔗
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono text-cyan-300">
              {invoiceAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">
              {invoiceCorrectCount} of {totalAudited} invoice IDs correctly linked
            </div>
          </div>
        </div>

        {/* Classification Failures */}
        <div className={`figma-card p-5 bg-[#171717] border ${classificationFailures === 0 ? 'border-emerald-500/30' : 'border-rose-500/50'} rounded-xl shadow-xl card-interactive`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Status Classification Discrepancies
            </span>
            <span className={`w-6 h-6 rounded-lg ${classificationFailures === 0 ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' : 'bg-rose-950/60 text-rose-400 border-rose-500/40'} border flex items-center justify-center text-xs`}>
              {classificationFailures === 0 ? '✓' : '⚠️'}
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-black font-mono ${classificationFailures === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {classificationFailures}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">
              {classificationFailures === 0 ? '0 status classification failures' : `${classificationFailures} status classification failures`}
            </div>
          </div>
        </div>

        {/* Invoice Linkage Failures */}
        <div className={`figma-card p-5 bg-[#171717] border ${invoiceFailures === 0 ? 'border-emerald-500/30' : 'border-amber-500/50'} rounded-xl shadow-xl card-interactive`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Invoice Linkage Discrepancies
            </span>
            <span className={`w-6 h-6 rounded-lg ${invoiceFailures === 0 ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' : 'bg-amber-950/60 text-amber-400 border-amber-500/40'} border flex items-center justify-center text-xs`}>
              {invoiceFailures === 0 ? '✓' : '🔗'}
            </span>
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-black font-mono ${invoiceFailures === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {invoiceFailures}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">
              {invoiceFailures === 0 ? '0 invoice ID discrepancies' : `${invoiceFailures} invoice ID mismatches`}
            </div>
          </div>
        </div>
      </div>

      {/* Systemic Ingestion / Mapping Issue Consolidated Banner */}
      {systemicIssues.length > 0 && (
        <div className="space-y-3">
          {systemicIssues.map((sys, idx) => (
            <div key={idx} className="bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm font-mono uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>{sys.title} ({sys.affected_count} records affected)</span>
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                {sys.description}
              </p>
              <div className="p-3 bg-[#171717] border border-amber-800/40 rounded-xl text-xs text-amber-200 font-mono">
                💡 <strong>Systemic Root-Cause Fix:</strong> {sys.suggested_fix}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Dedicated Failure Explanation Section */}
      {incorrectPredictions.length > 0 && (
        <div className="bg-[#171717] border-2 border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-scale-in">
          <div className="flex items-center justify-between border-b border-[#2F2F2F] pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Benchmark Discrepancy Explanations & Engine Diagnostics ({incorrectPredictions.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-rose-300 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800/50">
              Action Required to Achieve 100%
            </span>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            The following discrepancies occurred where the reconciliation engine's output differed from the verified ground truth key. Explanations reflect the actual decision reasons reported by the matching engine:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {incorrectPredictions.map((inc, idx) => (
              <div 
                key={inc.transaction_id || idx}
                className="bg-[#212121] border border-rose-900/40 rounded-xl p-4 space-y-3 shadow-md"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#2F2F2F] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-400 bg-[#171717] px-2 py-0.5 rounded border border-[#2F2F2F]">
                      {inc.transaction_id}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[160px]">
                      {inc.vendor || 'Counterparty'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50 font-semibold">
                    {inc.failure_type || 'Discrepancy'}
                  </span>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-[#171717] rounded-lg border border-[#2F2F2F] space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase">Engine Predicted:</span>
                    <span className="font-bold text-rose-300 block">{inc.status}</span>
                    <span className="text-[11px] text-slate-400 block truncate">Inv: {inc.invoice_id || 'None'}</span>
                  </div>
                  <div className="p-2 bg-[#171717] rounded-lg border border-[#2F2F2F] space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase">Ground Truth:</span>
                    <span className="font-bold text-emerald-400 block">{inc.expected_status}</span>
                    <span className="text-[11px] text-slate-400 block truncate">Inv: {inc.expected_invoice_id || 'None'}</span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-300 font-mono flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-rose-400" />
                    <span>Engine Decision Reason:</span>
                  </span>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {inc.explanation || inc.engine_reason || "Reconciler output differs from the benchmark key."}
                  </p>
                </div>

                {/* Actionable Advice */}
                {inc.suggested_fix && (
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 font-sans">
                    💡 <strong>Suggested Fix:</strong> {inc.suggested_fix}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Category Breakdown Grid */}
      {metrics?.categories && (
        <div className="bg-[#171717] border border-[#2F2F2F] rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#2F2F2F] pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Per-Category Verification Breakdown
            </span>
            <span className="text-xs text-emerald-400 font-mono font-semibold">
              100% Pass Threshold Target
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
            {Object.entries(metrics.categories).map(([cat, m]) => {
              const label = cat === 'MATCH' ? 'Clean Matches' : cat === 'AMOUNT_MISMATCH' ? 'Price Differences' : cat === 'DATE_MISMATCH' ? 'Date Delays' : cat === 'MISSING_INVOICE' ? 'Missing Bills' : cat === 'MULTIPLE_MATCHES' ? 'Multiple Matches' : cat;
              const isPerfect = m.accuracy >= 100;
              return (
                <div key={cat} className="bg-[#212121] border border-[#2F2F2F] rounded-xl p-3.5 flex flex-col justify-between card-interactive">
                  <span className="text-[11px] font-bold text-slate-300 font-mono truncate" title={label}>
                    {label}
                  </span>
                  <div className="my-2">
                    <div className={`text-2xl font-black font-mono ${isPerfect ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {m.accuracy.toFixed(0)}%
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {m.correct} of {m.total} verified
                    </div>
                  </div>
                  <div className="w-full bg-[#2F2F2F] rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${isPerfect ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${m.accuracy}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Record-by-Record Audit Table */}
      <div className="bg-[#171717] border border-[#2F2F2F] rounded-xl overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#2F2F2F] bg-[#171717] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Audit Ledger Records ({filteredAuditRecords.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-[#212121] p-1 rounded-lg border border-[#2F2F2F] text-xs font-mono">
              {[
                { id: 'ALL', label: `All (${auditRecords.length})` },
                { id: 'CORRECT', label: `Passed (${totalCorrect})` },
                ...(errorCount > 0 ? [{ id: 'INCORRECT', label: `Failed Discrepancies (${errorCount})` }] : [])
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id)}
                  className={`px-3 py-1 rounded-md transition font-semibold ${filterMode === f.id ? 'bg-[#2F2F2F] text-emerald-400 shadow-sm border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Tx ID, vendor, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#212121] border border-[#2F2F2F] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#212121] border-b border-[#2F2F2F] text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">TRANSACTION ID</th>
                <th className="py-3 px-4 font-semibold">VENDOR / COUNTERPARTY</th>
                <th className="py-3 px-4 font-semibold text-right">BANK AMOUNT (₹)</th>
                <th className="py-3 px-4 font-semibold text-center">PREDICTED CLASSIFICATION</th>
                <th className="py-3 px-4 font-semibold text-center">GROUND TRUTH EXPECTED</th>
                <th className="py-3 px-4 font-semibold text-center">INVOICE ID (ACTUAL / EXPECTED)</th>
                <th className="py-3 px-4 font-semibold text-center">VERIFICATION RESULT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F2F2F] text-xs font-mono">
              {filteredAuditRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-mono">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredAuditRecords.map((r) => {
                  return (
                    <tr 
                      key={r.transaction_id} 
                      className={`hover:bg-[#212121] transition-colors ${!r.isCorrect ? 'bg-rose-950/20' : ''}`}
                    >
                      {/* Tx ID */}
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {r.transaction_id}
                      </td>

                      {/* Vendor */}
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {r.vendor || r.invoice_customer || 'N/A'}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ₹{(r.amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Predicted Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'MATCH' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : r.status === 'AMOUNT_MISMATCH' ? 'bg-rose-950 text-rose-300 border border-rose-800/40' : r.status === 'DATE_MISMATCH' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' : r.status === 'MULTIPLE_MATCHES' ? 'bg-amber-950 text-amber-300 border border-amber-800/40' : 'bg-purple-950 text-purple-300 border border-purple-800/40'}`}>
                          {r.status}
                        </span>
                      </td>

                      {/* Expected Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#2F2F2F] text-slate-300 border border-[#3A3A3A]">
                          {r.expectedStatus}
                        </span>
                      </td>

                      {/* Invoice Actual vs Expected */}
                      <td className="py-3 px-4 text-center text-slate-300">
                        <span className="text-emerald-400 font-bold">{r.invoice_id || 'None'}</span>
                        {r.expectedInvId && r.expectedInvId !== r.invoice_id && (
                          <span className="text-rose-400 ml-1">/ {r.expectedInvId}</span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3 px-4 text-center">
                        {r.isCorrect ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            VERIFIED MATCH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span>MISMATCH</span>
                          </span>
                        )}
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
