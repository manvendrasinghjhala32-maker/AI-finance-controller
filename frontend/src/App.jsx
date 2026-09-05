import React, { useState, useEffect } from 'react';
import { DocumentUploadLanding } from './components/DocumentUploadLanding';
import { ReconciliationOverviewAndChat } from './components/ReconciliationOverviewAndChat';
import { ExceptionLedger } from './components/ExceptionLedger';
import { AICommandCenter } from './components/AICommandCenter';
import { ForecastView } from './components/ForecastView';
import { GLEntriesView } from './components/GLEntriesView';
import { AdjustmentsChangesView } from './components/AdjustmentsChangesView';
import { BenchmarkEvaluationView } from './components/BenchmarkEvaluationView';
import { LoadingScreen } from './components/LoadingScreen';
import { API_BASE } from './config';

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
  Layers,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [activeDatasetLabel, setActiveDatasetLabel] = useState(() => {
    return localStorage.getItem('afc_dataset_label') || '';
  });

  // Dark / Light Mode Theme state with persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('afc_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('afc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Navigation: 'overview' (default) | 'ledger' | 'benchmark' | 'forecast' | 'gl' | 'changes'
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('afc_active_tab');
    return ['overview', 'ledger', 'benchmark', 'forecast', 'gl', 'changes'].includes(saved) ? saved : 'overview';
  });

  // Selected Transaction for Exception Ledger Inspector
  const [selectedTxId, setSelectedTxId] = useState(() => {
    return localStorage.getItem('afc_selected_tx') || null;
  });
  const [activeLedgerFilter, setActiveLedgerFilter] = useState(() => {
    return localStorage.getItem('afc_ledger_filter') || 'EXCEPTIONS';
  });

  // 1. Restore previous session on initial page load / refresh
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE}/api/session`);
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
        }
      } catch (err) {
        console.warn('Could not restore previous session:', err);
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }
    checkSession();
    return () => { isMounted = false; };
  }, []);

  // 2. Sync UI states to localStorage (persistent across browser tab closes & restarts)
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

  // When files are uploaded from Landing
  const handleUploadSuccess = async (formData, tolerances) => {
    setLoading(true);
    setGlobalError(null);
    try {
      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
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
      const res = await fetch(`${API_BASE}/api/load-demo`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to load demo dataset');
      const json = await res.json();
      // Smooth loading transition pause
      await new Promise(r => setTimeout(r, 600));

      setData(json);
      setActiveDatasetLabel('Benchmark Dataset (160 Multi-Source Records)');
      setActiveTab('overview');

      if (json.records && json.records.length > 0) {
        const firstExc = json.records.find(r => !['MATCH', 'DUPLICATE'].includes(r.status));
        if (firstExc) setSelectedTxId(firstExc.transaction_id);
      }
    } catch (err) {
      setGlobalError(err.message || 'Failed to load demo dataset.');
    } finally {
      setLoading(false);
    }
  };

  // Reset to Upload Landing
  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('afc_active_tab');
    localStorage.removeItem('afc_selected_tx');
    localStorage.removeItem('afc_ledger_filter');
    localStorage.removeItem('afc_dataset_label');
    setData(null);
    setActiveDatasetLabel('');
    setGlobalError(null);
    setActiveTab('overview');
  };

  // Handle Exception One-Click Resolution
  const handleResolveTransaction = async (txId, actionType, note = '') => {
    try {
      const res = await fetch(`${API_BASE}/api/resolve`, {
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
      const res = await fetch(`${API_BASE}/api/unresolve`, {
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

  // Export CSV helper
  const handleExport = (reportType) => {
    window.location.href = `${API_BASE}/api/export/${reportType}`;
  };

  // 1. Loading State: Show animated loading screen between upload & main page or while restoring active session
  if (loading || (checkingSession && (localStorage.getItem('afc_dataset_label') || activeDatasetLabel))) {
    return <LoadingScreen datasetName={activeDatasetLabel || localStorage.getItem('afc_dataset_label') || 'Financial Session'} />;
  }

  // 2. Initial State: If session check completed and no active session data, show Upload Landing
  if (!data || !data.records || data.records.length === 0) {
    return (
      <DocumentUploadLanding
        onUploadSuccess={handleUploadSuccess}
        onDemoLoad={handleDemoLoad}
        loading={loading}
        globalError={globalError}
        theme={theme}
        onToggleTheme={toggleTheme}
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
    { id: 'forecast', label: 'Cash Forecast', icon: TrendingUp },
    { id: 'gl', label: 'Accounting Records', icon: FileSpreadsheet },
    { id: 'changes', label: 'Audit & Changes', icon: History, badge: resolvedCount > 0 ? resolvedCount : undefined },
  ];

  const pageHeaders = {
    overview: {
      title: 'Reconciliation Overview',
      subtitle: 'Real-time ledger matching, variance forensics, and resolution health',
    },
    ledger: {
      title: 'Differences & Issues Ledger',
      subtitle: 'Operational queue of price variances, timing drift, and unbilled disbursements',
    },
    benchmark: {
      title: 'Benchmark & Accuracy',
      subtitle: 'Independent empirical validation against ground-truth dataset',
    },
    forecast: {
      title: '30-Day Cash Forecast',
      subtitle: 'Scenario-based cash position modeling and daily settlement schedule',
    },
    gl: {
      title: 'Accounting Records (GL)',
      subtitle: 'Double-entry journal vouchers with automated trial balance audit',
    },
    changes: {
      title: 'Audit Trail & Applied Changes',
      subtitle: 'Reversible before-and-after resolution ledger with compliance trace',
    },
  };

  const currentPage = pageHeaders[activeTab] || pageHeaders.overview;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1A1F36] flex font-sans selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between shrink-0 z-30 min-h-screen sticky top-0 h-screen select-none transition-colors duration-200">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0C2340] flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs">
                FC
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs font-bold text-[#1A1F36] tracking-tight uppercase font-mono truncate">
                    Finance Controller
                  </h1>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                  <span className="text-[11px] text-[#6B7280] font-sans">Autonomous Core</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider font-mono">
              FINANCIAL OPERATIONS
            </div>

            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold border border-blue-100 shadow-xs'
                        : 'text-[#4B5563] hover:text-[#1A1F36] hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                          isActive
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-[#1D4ED8] dark:text-blue-300'
                            : item.id === 'ledger'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                              : 'bg-gray-100 dark:bg-[#1E2638] text-[#4B5563] dark:text-[#CBD5E1]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Engine Card & Theme Switcher */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#FAFAFC] space-y-2.5 transition-colors duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 space-y-2 shadow-xs transition-colors duration-200">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#6B7280] font-sans">Engine Status</span>
              <span className="inline-flex items-center gap-1 text-[#16A34A] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                ACTIVE
              </span>
            </div>

            {(summary.records_per_second || data.records_per_second) && (
              <div className="text-[11px] font-mono text-[#1A1F36] pt-1 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[#6B7280] font-sans">Throughput</span>
                <span className="font-semibold text-[#0C2340]">
                  {Math.round(summary.records_per_second || data.records_per_second).toLocaleString()} rec/s
                </span>
              </div>
            )}

            <div className="text-[10px] text-[#6B7280] truncate font-mono pt-0.5">
              {activeDatasetLabel || '160 Benchmark Records'}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content & Top Header Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] px-8 py-3.5 flex items-center justify-between shadow-xs select-none transition-colors duration-200">
          <div>
            <h2 className="text-sm font-bold text-[#1A1F36] tracking-tight font-sans">
              {currentPage.title}
            </h2>
            <p className="text-xs text-[#6B7280] font-sans mt-0.5">
              {currentPage.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
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

            <button
              onClick={() => handleExport('reconciliation')}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-[#374151] hover:text-[#1A1F36] text-xs font-medium flex items-center gap-1.5 border border-[#D1D5DB] transition-all shadow-xs cursor-pointer"
              title="Download Full Reconciliation Report"
            >
              <Download className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-lg bg-[#0C2340] hover:bg-[#162E50] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Ingest new financial documents"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ingest New Data</span>
            </button>
          </div>
        </header>

        {/* Main Tab Content */}
        <main key={activeTab} className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto animate-fade-in">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <ReconciliationOverviewAndChat
              data={data}
              onResolve={handleResolveTransaction}
              onNavigate={(tab) => setActiveTab(tab)}
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
            />
          )}
        </main>
      </div>
    </div>
  );
}
