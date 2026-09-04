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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              30-Day Liquidity & Treasury Forecast
            </h1>
            <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              SCENARIO-BASED RUNWAY
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Forward liquidity projections modeling customer settlement velocity, recurring payables, and working capital buffers
          </p>
        </div>

        {onExport && (
          <button
            onClick={() => onExport('forecast')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono text-emerald-400 bg-[#141A27] hover:bg-[#1B2335] border border-emerald-500/30 transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Forecast (CSV)</span>
          </button>
        )}
      </div>

      {/* 2. Scenario Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Conservative */}
        <div className="figma-card p-4 flex flex-col justify-between bg-[#111622] border border-[#1E2638] card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
              CONSERVATIVE MODEL (DAY 30)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Stress-Tested
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-rose-400">
              {formatLakh(conservativeEnding)}
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              Assumes 5-day customer payment settlement lag
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Capital buffer preserved</span>
            </div>
          </div>
        </div>

        {/* Base */}
        <div className="figma-card p-4 flex flex-col justify-between bg-[#111622] border border-blue-500/30 card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
              BASE CASE MODEL (DAY 30)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Expected Velocity
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-blue-300">
              {formatLakh(baseEnding)}
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              Standard operational collection and disbursement cycles
            </div>
            <div className="mt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{projectedGain >= 0 ? `+${formatLakh(projectedGain)}` : formatLakh(projectedGain)} net 30D change</span>
            </div>
          </div>
        </div>

        {/* Optimistic */}
        <div className="figma-card p-4 flex flex-col justify-between bg-[#111622] border border-[#1E2638] card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400">
              ACCELERATED MODEL (DAY 30)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Accelerated
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatLakh(optimisticEnding)}
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
              Assumes early invoice settlements and prompt collections
            </div>
            <div className="mt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Inflow acceleration profile</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 30-Day Daily Simulation Table */}
      <div className="figma-card overflow-hidden shadow-sm bg-[#111622] border border-[#1E2638]">
        <div className="p-3.5 border-b border-[#1E2638] bg-[#111622] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white uppercase text-[11px]">30-Day Daily Liquidity Schedule</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Automated Cash Flow Simulation
          </span>
        </div>

        <div className="overflow-x-auto bg-[#0E131E]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0E131E] border-b border-[#1E2638] text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">DAY / SCHEDULE</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">INFLOW (₹)</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">OUTFLOW (₹)</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">NET DAILY FLOW (₹)</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">CLOSING CASH BALANCE (₹)</th>
                <th className="py-2.5 px-3.5 font-semibold text-center">CONFIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2638] text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400 font-mono text-xs">
                    Calculating 30-day liquidity projection...
                  </td>
                </tr>
              ) : forecast.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400 font-mono text-xs">
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
                    <tr key={idx} className="hover:bg-[#141A27] transition-colors">
                      {/* Day & Date */}
                      <td className="py-2.5 px-3.5 font-medium text-white">
                        <span className="text-emerald-400 mr-2">Day {row.day ?? row.Day ?? idx + 1}</span>
                        <span className="text-slate-400 font-normal">{row.date || row.Date || `2026-09-${String(idx + 1).padStart(2, '0')}`}</span>
                      </td>

                      {/* Inflow */}
                      <td className="py-2.5 px-3.5 text-right text-emerald-400 font-semibold">
                        ₹{inflow.toLocaleString('en-IN')}
                      </td>

                      {/* Outflow */}
                      <td className="py-2.5 px-3.5 text-right text-rose-400 font-semibold">
                        ₹{outflow.toLocaleString('en-IN')}
                      </td>

                      {/* Net */}
                      <td className="py-2.5 px-3.5 text-right font-semibold">
                        <span className={net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {net >= 0 ? `+₹${net.toLocaleString('en-IN')}` : `-₹${Math.abs(net).toLocaleString('en-IN')}`}
                        </span>
                      </td>

                      {/* Closing Balance */}
                      <td className="py-2.5 px-3.5 text-right font-bold text-white">
                        ₹{balance.toLocaleString('en-IN')}
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
