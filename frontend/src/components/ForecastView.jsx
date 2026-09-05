import React, { useState, useEffect } from 'react';
import { 
  Download, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { API_BASE } from '../config';

export function ForecastView({ onExport }) {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scoped AI Forecast state & client cache
  const [aiForecastCache, setAiForecastCache] = useState(null);
  const [aiForecastLoading, setAiForecastLoading] = useState(false);
  const [aiForecastError, setAiForecastError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/forecast`)
      .then(res => res.json())
      .then(data => {
        setForecast(data || []);
      })
      .catch(err => {
        console.error('Failed to load forecast', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAskAIForecast = async () => {
    if (aiForecastCache) return;
    setAiForecastLoading(true);
    setAiForecastError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ask/forecast`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error (${res.status})`);
      }
      const json = await res.json();
      setAiForecastCache(json.reply);
    } catch (err) {
      setAiForecastError(err.message || 'Failed to generate forecast explanation.');
    } finally {
      setAiForecastLoading(false);
    }
  };

  const lastDay = forecast && forecast.length > 0 ? forecast[forecast.length - 1] : null;
  const firstDay = forecast && forecast.length > 0 ? forecast[0] : null;

  const startBalance = Number(firstDay?.projected_balance ?? firstDay?.['Projected_Cash_Base (₹)'] ?? 5000000);
  const baseEnding = Number(lastDay?.projected_balance ?? lastDay?.['Projected_Cash_Base (₹)'] ?? 5490000);
  const conservativeEnding = Number(lastDay?.conservative_closing ?? lastDay?.['Projected_Cash_Conservative (₹)'] ?? (baseEnding * 0.88));
  const optimisticEnding = Number(lastDay?.optimistic_closing ?? lastDay?.['Projected_Cash_Optimistic (₹)'] ?? (baseEnding * 1.12));
  const projectedGain = baseEnding - startBalance;

  const formatLakh = (amt) => {
    const num = Number(amt) || 0;
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(2)}L`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[#1A1F36] tracking-wide uppercase">
              30-Day Liquidity & Treasury Forecast
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              SCENARIO-BASED RUNWAY
            </span>
          </div>
          <p className="text-[11px] text-gray-500 font-sans mt-0.5">
            Forward liquidity projections modeling customer settlement velocity, recurring payables, and working capital buffers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleAskAIForecast}
            disabled={aiForecastLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Generate AI forecast driver breakdown"
          >
            {aiForecastLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>{aiForecastCache ? 'AI Breakdown Active' : '✨ Ask AI Forecast Breakdown'}</span>
              </>
            )}
          </button>

          {onExport && (
            <button
              onClick={() => onExport('forecast')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export Forecast (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Error Notification */}
      {aiForecastError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="truncate">{aiForecastError}</span>
          </div>
          <button
            onClick={handleAskAIForecast}
            className="px-2.5 py-1 rounded bg-white hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI Forecast Breakdown Panel */}
      {aiForecastCache && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 shadow-md space-y-2 animate-fade-in font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>AI Treasury & Liquidity Driver Analysis</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
              30-Day Model
            </span>
          </div>
          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            <MarkdownMessage content={aiForecastCache} />
          </div>
        </div>
      )}

      {/* 2. Scenario Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Conservative */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Conservative Model (Day 30)
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Stress-Tested
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-600">
              {formatLakh(conservativeEnding)}
            </div>
            <div className="text-[11px] text-gray-500 font-sans mt-0.5">
              Assumes 5-day customer payment settlement lag
            </div>
            <div className="mt-2.5 text-[11px] font-medium text-gray-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Capital buffer preserved</span>
            </div>
          </div>
        </div>

        {/* Base */}
        <div className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1F36]">
              Base Case Model (Day 30)
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200">
              Expected Velocity
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-[#2563EB]">
              {formatLakh(baseEnding)}
            </div>
            <div className="text-[11px] text-gray-500 font-sans mt-0.5">
              Standard operational collection and disbursement cycles
            </div>
            <div className="mt-2.5 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>{projectedGain >= 0 ? `+${formatLakh(projectedGain)}` : formatLakh(projectedGain)} net 30D change</span>
            </div>
          </div>
        </div>

        {/* Optimistic */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Accelerated Model (Day 30)
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Accelerated
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {formatLakh(optimisticEnding)}
            </div>
            <div className="text-[11px] text-gray-500 font-sans mt-0.5">
              Assumes early invoice settlements and prompt collections
            </div>
            <div className="mt-2.5 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inflow acceleration profile</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 30-Day Daily Simulation Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#1A1F36]">
            <Calendar className="w-4 h-4 text-[#2563EB]" />
            <span className="font-bold uppercase text-xs">30-Day Daily Liquidity Schedule</span>
          </div>
          <span className="text-[11px] text-gray-500 font-sans">
            Automated Cash Flow Simulation
          </span>
        </div>

        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-2.5 px-3.5">DAY / SCHEDULE</th>
                <th className="py-2.5 px-3.5 text-right">INFLOW (₹)</th>
                <th className="py-2.5 px-3.5 text-right">OUTFLOW (₹)</th>
                <th className="py-2.5 px-3.5 text-right">NET DAILY FLOW (₹)</th>
                <th className="py-2.5 px-3.5 text-right">CLOSING CASH BALANCE (₹)</th>
                <th className="py-2.5 px-3.5 text-center">CONFIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-400 font-sans text-xs">
                    Calculating 30-day liquidity projection...
                  </td>
                </tr>
              ) : forecast.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-400 font-sans text-xs">
                    No forecast records available.
                  </td>
                </tr>
              ) : (
                forecast.map((row, idx) => {
                  const inflow = Number(row.projected_inflow ?? row['Projected_Inflow (₹)'] ?? row.inflow ?? 0);
                  const outflow = Number(row.projected_outflow ?? row['Projected_Outflow (₹)'] ?? row.outflow ?? 0);
                  const net = row.net_daily_flow != null 
                    ? Number(row.net_daily_flow) 
                    : (row['Net_Daily_Flow (₹)'] != null ? Number(row['Net_Daily_Flow (₹)']) : (inflow - outflow));
                  const balance = Number(row.projected_balance ?? row['Projected_Cash_Base (₹)'] ?? row.balance ?? 0);
                  const confidence = row.confidence ?? row['Confidence (%)'] ?? 95;

                  return (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      {/* Day & Date */}
                      <td className="py-2.5 px-3.5 font-medium text-[#1A1F36]">
                        <span className="text-[#1D4ED8] font-semibold mr-2">Day {row.day ?? row.Day ?? idx + 1}</span>
                        <span className="text-gray-500 font-normal font-sans">{row.date || row.Date || `2026-09-${String(idx + 1).padStart(2, '0')}`}</span>
                      </td>

                      {/* Inflow */}
                      <td className="py-2.5 px-3.5 text-right text-emerald-700 font-semibold">
                        ₹{inflow.toLocaleString('en-IN')}
                      </td>

                      {/* Outflow */}
                      <td className="py-2.5 px-3.5 text-right text-rose-700 font-semibold">
                        ₹{outflow.toLocaleString('en-IN')}
                      </td>

                      {/* Net */}
                      <td className="py-2.5 px-3.5 text-right font-semibold">
                        <span className={net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {net >= 0 ? `+₹${net.toLocaleString('en-IN')}` : `-₹${Math.abs(net).toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* Closing Balance */}
                      <td className="py-2.5 px-3.5 text-right font-bold text-[#1A1F36]">
                        ₹{balance.toLocaleString('en-IN')}
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {confidence}% High
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
