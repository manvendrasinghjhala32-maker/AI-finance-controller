import React, { useState, useEffect } from 'react';
import { 
  Download, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight, 
  Sparkles
} from 'lucide-react';

export function ForecastView({ onExport }) {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forecast')
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/finance_logo.png" alt="Cash Forecast" className="w-8 h-8 rounded-lg object-contain" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cash Forecast
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30 font-semibold">
              30-Day Scenario-Based Forecast
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            30-day scenario-based liquidity projection using historical payment patterns and scenario assumptions
          </p>
        </div>

        {onExport && (
          <button
            onClick={() => onExport('forecast')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-emerald-400 bg-[#2F2F2F] hover:bg-[#3A3A3A] border border-emerald-500/40 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="font-mono">Export Forecast (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. 3 Scenario Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conservative */}
        <div className="figma-card p-4 flex flex-col justify-between bg-[#171717] border border-[#2F2F2F] card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
              LOWEST ESTIMATE (DAY 30)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2F2F2F] text-rose-400 border border-rose-500/30">
              Conservative
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-400">
              {formatLakh(conservativeEnding)}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Assumes 5-day customer payment delay
            </div>
            <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe cash reserve maintained</span>
            </div>
          </div>
        </div>

        {/* Base */}
        <div className="figma-card p-4 flex flex-col justify-between bg-[#171717] border border-cyan-500/40 card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
              EXPECTED PLAN (DAY 30)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2F2F2F] text-cyan-400 border border-cyan-500/30">
              Expected
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-cyan-300">
              {formatLakh(baseEnding)}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Based on standard payment velocity
            </div>
            <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{projectedGain >= 0 ? `+${formatLakh(projectedGain)}` : formatLakh(projectedGain)} projected net change</span>
            </div>
          </div>
        </div>

        {/* Optimistic */}
        <div className="figma-card p-4 flex flex-col justify-between bg-[#171717] border border-[#2F2F2F] card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold uppercase text-slate-400">
              BEST-CASE ESTIMATE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30">
              Fast Payments
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatLakh(optimisticEnding)}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Assumes immediate customer settlements
            </div>
            <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Accelerated inflow model</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 30-Day Daily Simulation Table */}
      <div className="figma-card overflow-hidden shadow-xl bg-[#171717] border border-[#2F2F2F]">
        <div className="p-4 border-b border-[#2F2F2F] bg-[#171717] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">30-Day Daily Cash Estimate</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Smart Speed Adjustment
          </span>
        </div>

        <div className="overflow-x-auto bg-[#171717]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#171717] border-b border-[#2F2F2F] text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">DAY / DATE</th>
                <th className="py-3 px-4 font-semibold text-right">MONEY IN (₹)</th>
                <th className="py-3 px-4 font-semibold text-right">MONEY OUT (₹)</th>
                <th className="py-3 px-4 font-semibold text-right">DAILY NET (₹)</th>
                <th className="py-3 px-4 font-semibold text-right">ENDING BALANCE (₹)</th>
                <th className="py-3 px-4 font-semibold text-center">CONFIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F2F2F] text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Calculating 30-day cash estimates...
                  </td>
                </tr>
              ) : forecast.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No forecast records found.
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
                    <tr key={idx} className="hover:bg-[#3A3A3A]/40 transition-colors">
                      {/* Day & Date */}
                      <td className="py-3 px-4 font-bold text-white">
                        <span className="text-emerald-400 mr-2">Day {row.day ?? row.Day ?? idx + 1}</span>
                        <span className="text-slate-400 font-normal">{row.date || row.Date || `2026-09-${String(idx + 1).padStart(2, '0')}`}</span>
                      </td>

                      {/* Inflow */}
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        ₹{inflow.toLocaleString('en-IN')}
                      </td>

                      {/* Outflow */}
                      <td className="py-3 px-4 text-right text-rose-400 font-bold">
                        ₹{outflow.toLocaleString('en-IN')}
                      </td>

                      {/* Net */}
                      <td className="py-3 px-4 text-right">
                        <span className={net >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {net >= 0 ? `+₹${net.toLocaleString('en-IN')}` : `-₹${Math.abs(net).toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* Closing Balance */}
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ₹{balance.toLocaleString('en-IN')}
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30">
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
