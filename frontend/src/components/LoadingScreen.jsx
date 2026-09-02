import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, Database, Cpu, ArrowRight } from 'lucide-react';

export function LoadingScreen({ datasetName = "Financial Documents" }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(15);

  const steps = [
    { label: "Reading bank transactions & invoice files", icon: Database },
    { label: "Checking amounts, dates & seller names", icon: Cpu },
    { label: "Finding price differences & missing bills", icon: ShieldCheck },
    { label: "Calculating 30-day cash plan & bookkeeping adjustments", icon: Sparkles }
  ];

  useEffect(() => {
    // Step and progress timer simulation while API reconciles
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
      setProgress((prev) => {
        if (prev < 90) return prev + Math.floor(Math.random() * 20 + 15);
        return 95;
      });
    }, 650);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 bg-[#212121] flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Loading Card */}
      <div className="relative w-full max-w-lg bg-[#171717] border border-[#2F2F2F] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-8 animate-scale-in">
        
        {/* Animated Central Orbital Rings */}
        <div className="relative flex items-center justify-center mx-auto w-24 h-24">
          {/* Outer Rotating Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/30 animate-spin" style={{ animationDuration: '6s' }} />
          {/* Middle Fast Ring */}
          <div className="absolute inset-2 rounded-full border-2 border-t-emerald-400 border-r-transparent border-b-cyan-400 border-l-transparent animate-spin" style={{ animationDuration: '1.8s' }} />
          {/* Inner Glowing Badge */}
          <div className="relative w-14 h-14 rounded-2xl bg-[#212121] border border-emerald-500/40 flex items-center justify-center p-2 shadow-lg shadow-emerald-950/40 animate-float">
            <img src="/finance_logo.png" alt="Loading" className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#212121] border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            AI Finance Engine Active
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Checking & Matching Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            AI is verifying every transaction, amount, and date across your files.
          </p>
        </div>

        {/* Dynamic Animated Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Processing dataset...
            </span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-[#212121] rounded-full h-2.5 overflow-hidden border border-[#2F2F2F]">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Audit Stages */}
        <div className="bg-[#212121] rounded-2xl border border-[#2F2F2F] p-4 text-left space-y-3">
          {steps.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            const StepIcon = step.icon;

            return (
              <div 
                key={idx} 
                className={`flex items-center gap-3 text-xs transition-all duration-300 ${
                  isDone 
                    ? 'text-emerald-400' 
                    : isCurrent 
                      ? 'text-white font-semibold' 
                      : 'text-slate-500 opacity-60'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' 
                    : isCurrent 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-[#2F2F2F] text-slate-500'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <StepIcon className="w-3 h-3" />
                  )}
                </div>
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
