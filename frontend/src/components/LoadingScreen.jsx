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
    <div className="fixed inset-0 z-50 bg-[#F7F8FA] flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      {/* Main Loading Card */}
      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6 animate-scale-in">
        
        {/* Animated Central Orbital Rings */}
        <div className="relative flex items-center justify-center mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-blue-100 animate-spin" style={{ animationDuration: '4s' }} />
          <div className="absolute inset-1 rounded-full border-2 border-t-[#2563EB] border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1s' }} />
          <div className="relative w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-[#2563EB]">
            FC
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#1D4ED8] text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Autonomous Reconciliation
          </div>
          <h2 className="text-base font-bold text-[#1A1F36] tracking-wide">
            Reconciling Ledger Data
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto font-sans leading-relaxed">
            Executing deterministic matching algorithms and forensic discrepancy analysis.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 text-[11px] font-medium">
              Reconciliation Pipeline...
            </span>
            <span className="text-[#2563EB] font-bold text-[11px] font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
            <div 
              className="h-full bg-[#2563EB] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Audit Stages */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3.5 text-left space-y-2.5">
          {steps.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            const StepIcon = step.icon;

            return (
              <div 
                key={idx} 
                className={`flex items-center gap-2.5 text-xs transition-colors ${
                  isDone 
                    ? 'text-emerald-700 font-medium' 
                    : isCurrent 
                      ? 'text-[#1A1F36] font-semibold' 
                      : 'text-gray-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : isCurrent 
                      ? 'bg-blue-50 text-[#2563EB] border border-blue-200' 
                      : 'bg-white text-gray-300 border border-gray-200'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
