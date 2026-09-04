import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Database, Cpu } from 'lucide-react';

export function LoadingScreen({ datasetName = "Financial Documents" }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(15);

  const steps = [
    { label: "Parsing bank statements, invoices, and gateway settlements", icon: Database },
    { label: "Executing fuzzy counterparty and invoice ID cross-referencing", icon: Cpu },
    { label: "Auditing fee variances, settlement drift, and unmatched disbursements", icon: ShieldCheck },
    { label: "Synthesizing 30-day liquidity forecast and balanced GL adjustments", icon: CheckCircle2 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
      setProgress((prev) => {
        if (prev < 90) return prev + Math.floor(Math.random() * 20 + 15);
        return 95;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0D14] flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      {/* Main Loading Card */}
      <div className="relative w-full max-w-md bg-[#111622] border border-[#1E2638] rounded-xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-scale-in">
        
        {/* Animated Central Orbital Rings */}
        <div className="relative flex items-center justify-center mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-spin" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-1.5 rounded-full border border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1s' }} />
          <div className="relative w-9 h-9 rounded bg-[#141A27] border border-[#1E2638] flex items-center justify-center text-xs font-mono font-bold text-emerald-400">
            FC
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#141A27] border border-[#1E2638] text-emerald-400 text-[10px] font-mono uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AUTONOMOUS RECONCILIATION
          </div>
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
            Reconciling Ledger Data
          </h2>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto font-sans leading-relaxed">
            Executing deterministic matching algorithms and forensic discrepancy analysis.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400 text-[11px]">
              Reconciliation Pipeline...
            </span>
            <span className="text-emerald-400 font-bold text-[11px]">{progress}%</span>
          </div>
          <div className="w-full bg-[#141A27] rounded-full h-1.5 overflow-hidden border border-[#1E2638]">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Audit Stages */}
        <div className="bg-[#0E131E] rounded-lg border border-[#1E2638] p-3 text-left space-y-2">
          {steps.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            const StepIcon = step.icon;

            return (
              <div 
                key={idx} 
                className={`flex items-center gap-2.5 text-xs transition-colors ${
                  isDone 
                    ? 'text-emerald-400' 
                    : isCurrent 
                      ? 'text-white font-medium' 
                      : 'text-slate-500'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : isCurrent 
                      ? 'bg-[#1E2638] text-emerald-400 border border-emerald-500/40' 
                      : 'bg-[#141A27] text-slate-600 border border-[#1E2638]'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <StepIcon className="w-2.5 h-2.5" />
                  )}
                </div>
                <span className="truncate text-[11px] font-sans">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
