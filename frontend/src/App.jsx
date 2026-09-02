import React, { useState, useEffect } from 'react';
import { DocumentUploadLanding } from './components/DocumentUploadLanding';
import { ReconciliationOverviewAndChat } from './components/ReconciliationOverviewAndChat';
import { ExceptionLedger } from './components/ExceptionLedger';
import { AICommandCenter } from './components/AICommandCenter';
import { ForecastView } from './components/ForecastView';
import { GLEntriesView } from './components/GLEntriesView';
import { AdjustmentsChangesView } from './components/AdjustmentsChangesView';
import { BenchmarkEvaluationView } from './components/BenchmarkEvaluationView';
import { FloatingAIChatWidget } from './components/FloatingAIChatWidget';
import { LoadingScreen } from './components/LoadingScreen';

import { 
  LayoutGrid, 
  AlertTriangle, 
  FileSpreadsheet, 
  TrendingUp, 
  MessageSquare, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Zap, 
  CheckCircle2,
  Eye,
  History,
  ShieldCheck,
  Layers
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [activeDatasetLabel, setActiveDatasetLabel] = useState('');
  
  // Navigation: 'overview' (default) | 'ledger' | 'benchmark' | 'forecast' | 'gl' | 'copilot'
  const [activeTab, setActiveTab] = useState('overview');

  // Selected Transaction for Exception Ledger Inspector
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [activeLedgerFilter, setActiveLedgerFilter] = useState('EXCEPTIONS');

  // AI Chat Messages
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [focusedTxForChat, setFocusedTxForChat] = useState(null);

  // 1. Restore previous session on initial page load / refresh
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch('/api/session');
        if (!res.ok) return;
        const json = await res.json();
        if (json.has_active_session && json.data && isMounted) {
          setData(json.data);
          
          const savedLabel = localStorage.getItem('afc_dataset_label') || json.dataset_label || 'Uploaded Custom Dataset';
          setActiveDatasetLabel(savedLabel);

          const savedTab = localStorage.getItem('afc_active_tab');
          if (savedTab && ['overview', 'ledger', 'benchmark', 'forecast', 'gl', 'changes'].includes(savedTab)) {
            setActiveTab(savedTab);
          }

          const savedFilter = localStorage.getItem('afc_ledger_filter');
          if (savedFilter) {
            setActiveLedgerFilter(savedFilter);
          }

          const savedTx = localStorage.getItem('afc_selected_tx');
          if (savedTx && json.data.records?.some(r => r.transaction_id === savedTx)) {
            setSelectedTxId(savedTx);
          } else if (json.data.records && json.data.records.length > 0) {
            const firstExc = json.data.records.find(r => !['MATCH', 'DUPLICATE'].includes(r.status));
            if (firstExc) setSelectedTxId(firstExc.transaction_id);
          }

          const savedChat = localStorage.getItem('afc_chat_messages');
          if (savedChat) {
            try {
              const parsed = JSON.parse(savedChat);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChatMessages(parsed);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Could not restore previous session:', err);
      }
    }
    checkSession();
    return () => { isMounted = false; };
  }, []);

  // 2. Sync UI states to localStorage
  useEffect(() => {
    if (activeTab) localStorage.setItem('afc_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeLedgerFilter) localStorage.setItem('afc_ledger_filter', activeLedgerFilter);
  }, [activeLedgerFilter]);

  useEffect(() => {
    if (selectedTxId) localStorage.setItem('afc_selected_tx', selectedTxId);
  }, [selectedTxId]);

  useEffect(() => {
    if (activeDatasetLabel) localStorage.setItem('afc_dataset_label', activeDatasetLabel);
  }, [activeDatasetLabel]);

  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      localStorage.setItem('afc_chat_messages', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  // When files are uploaded from Landing
  const handleUploadSuccess = async (formData, tolerances) => {
    setLoading(true);
    setGlobalError(null);
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Upload failed');
      }

      const json = await uploadRes.json();
      // Smooth loading transition pause
      await new Promise(r => setTimeout(r, 900));

      setData(json);

      const bankFile = formData.get('bank_file');
      const invFile = formData.get('invoices_file');
      const label = bankFile && invFile ? `${bankFile.name} & ${invFile.name}` : 'Uploaded Custom Dataset';
      setActiveDatasetLabel(label);
      setActiveTab('overview');

      // Select first exception if available
      if (json.records && json.records.length > 0) {
        const firstExc = json.records.find(r => !['MATCH', 'DUPLICATE'].includes(r.status));
        if (firstExc) setSelectedTxId(firstExc.transaction_id);
      }

      const totalRecs = json.summary?.total_records || json.records?.length || 0;
      const matched = json.summary?.matched_count || json.records?.filter(r => r.status === 'MATCH').length || 0;
      const exceptions = json.records?.filter(r => !['MATCH', 'DUPLICATE'].includes(r.status)).length || 0;

      setChatMessages([
        {
          role: 'assistant',
          content: `👋 Hello! I have analyzed your uploaded dataset (${label}).\n\n` +
            `• 📊 **${totalRecs} Total Transactions Processed**\n` +
            `• ✅ **${matched} Clean Matches Reconciled**\n` +
            `• ⚠️ **${exceptions} Discrepancies Requiring Review**\n\n` +
            `You can ask any question about the data below, or navigate between the Exception Ledger, Cash Forecast, and GL Journal tabs above.`
        }
      ]);
    } catch (err) {
      setGlobalError(err.message || 'Failed to upload and reconcile files.');
    } finally {
      setLoading(false);
    }
  };

  // When demo dataset is chosen
  const handleDemoLoad = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch('/api/load-demo', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to load demo dataset');
      const json = await res.json();
      // Smooth loading transition pause
      await new Promise(r => setTimeout(r, 900));

      setData(json);
      setActiveDatasetLabel('Demo Challenge Dataset (160 Messy Rows)');
      setActiveTab('overview');

      if (json.records && json.records.length > 0) {
        const firstExc = json.records.find(r => !['MATCH', 'DUPLICATE'].includes(r.status));
        if (firstExc) setSelectedTxId(firstExc.transaction_id);
      }

      const totalRecs = json.summary?.total_records || json.records?.length || 0;
      const matched = json.summary?.matched_count || json.records?.filter(r => r.status === 'MATCH').length || 0;
      const exceptions = json.records?.filter(r => !['MATCH', 'DUPLICATE'].includes(r.status)).length || 0;
      const matchedMoney = json.summary?.cash_position?.matched_amount || 0;

      setChatMessages([
        {
          role: 'assistant',
          content: `👋 Welcome! Loaded the Demo Dataset (${totalRecs} records).\n\n` +
            `• 📊 **${totalRecs} Ingested Transactions** (${json.summary?.duplicate_count || 0} duplicates isolated)\n` +
            `• ✅ **${matched} Verified Matches** (₹${matchedMoney.toLocaleString()} Reconciled)\n` +
            `• ⚠️ **${exceptions} Active Exceptions** requiring review\n\n` +
            `Feel free to ask questions below, or click any tab above to inspect exceptions, cash runway, or bookkeeping records!`
        }
      ]);
    } catch (err) {
      setGlobalError(err.message || 'Failed to load demo dataset.');
    } finally {
      setLoading(false);
    }
  };

  // Reset to Upload Landing
  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('afc_active_tab');
    localStorage.removeItem('afc_selected_tx');
    localStorage.removeItem('afc_ledger_filter');
    localStorage.removeItem('afc_dataset_label');
    localStorage.removeItem('afc_chat_messages');
    setData(null);
    setActiveDatasetLabel('');
    setChatMessages([]);
    setGlobalError(null);
    setActiveTab('overview');
  };

  // Send Chat Message to Gemini Copilot
  const handleSendMessage = async (userPrompt) => {
    setChatMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userPrompt }),
      });

      if (!res.ok) throw new Error('Chat engine response error');
      const json = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: json.reply }]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error reaching AI engine: ${err.message}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle Exception One-Click Resolution
  const handleResolveTransaction = async (txId, actionType, note = '') => {
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: txId,
          action: actionType,
          note: note || `Resolved with action: ${actionType}`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        // Refresh local record state
        setData(prev => {
          if (!prev || !prev.records) return prev;
          const updated = prev.records.map(r => 
            r.transaction_id === txId 
              ? { 
                  ...r, 
                  is_resolved: true, 
                  resolution_action: actionType,
                  resolution_note: note,
                  resolution: json.resolution || { action: actionType, note, resolved_at: new Date().toISOString() } 
                } 
              : r
          );
          return { ...prev, records: updated };
        });
      }
    } catch (e) {
      console.error('Failed to resolve transaction', e);
    }
  };

  // Revert / Undo transaction resolution
  const handleUnresolveTransaction = async (txId) => {
    try {
      const res = await fetch('/api/unresolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: txId }),
      });
      if (res.ok) {
        setData(prev => {
          if (!prev || !prev.records) return prev;
          const updated = prev.records.map(r => 
            r.transaction_id === txId 
              ? { ...r, is_resolved: false, resolution_action: null, resolution: null, resolution_note: null } 
              : r
          );
          return { ...prev, records: updated };
        });
      }
    } catch (e) {
      console.error('Failed to undo transaction resolution', e);
    }
  };

  // Open AI Chat focused on a specific transaction
  const handleAskAIAboutTx = (tx) => {
    if (!tx) return;
    setFocusedTxForChat(tx);
    setChatWidgetOpen(true);

    const txId = tx.transaction_id;
    const vendor = tx.vendor || tx.invoice_customer || tx.payment_merchant || 'Customer';
    const amount = tx.amount || 0;
    const invAmount = tx.invoice_amount || amount;
    const delta = tx.amount_delta || 0;
    const date = tx.date || 'N/A';
    const originalStatus = tx.status === 'AMOUNT_MISMATCH' ? 'Price Difference' : tx.status === 'DATE_MISMATCH' ? 'Settlement Date Delay' : tx.status === 'MISSING_INVOICE' ? 'Missing Invoice' : tx.status;
    const action = tx.resolution_action || tx.resolution?.action || (tx.status === 'AMOUNT_MISMATCH' ? 'Processing Fee Adjusted (GL-6150)' : tx.status === 'DATE_MISMATCH' ? 'Date Delay Approved (GL-1050)' : 'AP Vendor Invoice Requested');

    const promptText = `Explain the financial details, root cause, and adjustment applied for transaction ${txId} (${vendor}). Bank amount: ₹${amount.toLocaleString()}, Invoice amount: ₹${invAmount.toLocaleString()}, Variance: ₹${Math.abs(delta).toLocaleString()}, Original issue: ${originalStatus}, Adjustment: ${action}.`;
    
    handleSendMessage(promptText);
  };

  // Export CSV helper
  const handleExport = (reportType) => {
    window.location.href = `/api/export/${reportType}`;
  };

  // 1. Loading State: Show full animated loading screen between upload & main page
  if (loading) {
    return <LoadingScreen datasetName={activeDatasetLabel} />;
  }

  // 2. Initial State: If no data loaded yet, show Upload Landing
  if (!data || !data.records || data.records.length === 0) {
    return (
      <DocumentUploadLanding
        onUploadSuccess={handleUploadSuccess}
        onDemoLoad={handleDemoLoad}
        loading={loading}
        globalError={globalError}
      />
    );
  }

  // Selected Transaction for Issues List
  const selectedTx = data.records.find(r => r.transaction_id === selectedTxId) || data.records[0];
  const summary = data.summary || {};
  const exceptionsCount = data.records.filter(r => !['MATCH', 'DUPLICATE'].includes(r.status)).length;
  const resolvedCount = data.records.filter(r => r.is_resolved || r.resolution || r.resolution_action).length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'ledger', label: 'Differences & Issues', icon: AlertTriangle, badge: exceptionsCount },
    { id: 'benchmark', label: 'Benchmark & Accuracy', icon: ShieldCheck, badge: data?.metrics ? `${data.metrics.accuracy.toFixed(0)}%` : undefined },
    { id: 'forecast', label: 'Cash Forecast (30 Days)', icon: TrendingUp },
    { id: 'gl', label: 'Accounting Records', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-[#212121] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#171717] border-b border-[#2F2F2F] px-6 py-3 shadow-lg select-none">
        <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Brand & Dataset Badge */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-2.5">
              <img src="/finance_logo.png" alt="Finance Controller" className="w-8 h-8 rounded-lg object-contain" />
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide leading-none">
                  Finance Controlling Assistant
                </h1>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  📂 {activeDatasetLabel || 'Uploaded Records'}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-[#2F2F2F] px-2.5 py-1 rounded-full border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Smart AI Active
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2F2F2F] text-white border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#3A3A3A]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${isActive ? 'bg-[#3A3A3A] text-emerald-300' : 'bg-[#2F2F2F] text-rose-300 border border-rose-800/40'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Dedicated View Changes Tab Button */}
            {resolvedCount > 0 && (
              <button
                onClick={() => setActiveTab('changes')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${
                  activeTab === 'changes'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40'
                    : 'bg-[#2F2F2F] text-emerald-400 border-emerald-500/40 hover:bg-[#3A3A3A] hover:text-emerald-300'
                }`}
                title="View audit trail of all applied modifications"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Changes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800/40 font-bold">
                  {resolvedCount}
                </span>
              </button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
            <button
              onClick={() => handleExport('reconciliation')}
              className="px-3 py-1.5 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-[#3A3A3A] transition-all duration-200 btn-interactive"
              title="Download Full Reconciliation CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-[#2F2F2F] hover:bg-[#3A3A3A] text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/40 transition-all duration-200 btn-interactive shadow-sm hover:shadow-emerald-950/30"
              title="Upload new bank and invoice documents"
            >
              <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
              <span>Upload New Docs</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Content with Smooth Fade-In Animation */}
      <main key={activeTab} className="flex-1 p-6 max-w-[1700px] w-full mx-auto animate-fade-in">
        {/* TAB 1: OVERVIEW & CHAT */}
        {activeTab === 'overview' && (
          <ReconciliationOverviewAndChat
            data={data}
            onReset={handleReset}
            onResolveTransaction={handleResolveTransaction}
            onSendMessage={handleSendMessage}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            activeDatasetLabel={activeDatasetLabel}
          />
        )}

        {/* TAB 2: EXCEPTION LEDGER & ROOT-CAUSE INSPECTOR */}
        {activeTab === 'ledger' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-[calc(100vh-140px)] min-h-[700px]">
            <div className="xl:col-span-8 h-full">
              <ExceptionLedger
                records={data.records}
                selectedTxId={selectedTx?.transaction_id}
                onSelectTransaction={(tx) => setSelectedTxId(tx.transaction_id)}
                activeFilter={activeLedgerFilter}
                setActiveFilter={setActiveLedgerFilter}
                onExport={handleExport}
              />
            </div>
            <div className="xl:col-span-4 h-full">
              <AICommandCenter
                selectedTx={selectedTx}
                activeFilter={activeLedgerFilter}
                recentInsights={data.recent_insights || []}
                onResolve={handleResolveTransaction}
                onViewChanges={() => setActiveTab('changes')}
                onSelectInsight={(txId) => setSelectedTxId(txId)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: BENCHMARK ACCURACY & GROUND TRUTH AUDIT */}
        {activeTab === 'benchmark' && (
          <BenchmarkEvaluationView 
            data={data} 
            onUploadSuccess={(updatedData) => setData(updatedData)} 
            onAskAI={handleAskAIAboutTx}
          />
        )}

        {/* TAB 4: CASH FORECAST (30-DAY RUNWAY) */}
        {activeTab === 'forecast' && (
          <ForecastView onExport={handleExport} />
        )}

        {/* TAB 5: GENERAL LEDGER (GL) JOURNAL ADJUSTMENTS */}
        {activeTab === 'gl' && (
          <GLEntriesView onExport={handleExport} />
        )}

        {/* TAB 6: DATASET ADJUSTMENTS & AUDIT TRAIL */}
        {activeTab === 'changes' && (
          <AdjustmentsChangesView
            records={data.records}
            onBack={() => setActiveTab('ledger')}
            onRevert={handleUnresolveTransaction}
            onExport={handleExport}
            onAskAI={handleAskAIAboutTx}
          />
        )}
      </main>

      {/* Floating Corner AI Chat Widget */}
      <FloatingAIChatWidget
        chatMessages={chatMessages}
        onSendMessage={handleSendMessage}
        chatLoading={chatLoading}
        isOpen={chatWidgetOpen}
        onOpenChange={setChatWidgetOpen}
        focusedTx={focusedTxForChat}
        onClearFocus={() => setFocusedTxForChat(null)}
      />
    </div>
  );
}
