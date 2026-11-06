import React, { useState, useEffect } from 'react'
import logoUrl from '@/assets/logo.png'

interface SplashScreenProps {
  onEnter: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [progress, setProgress] = useState(0)
  const [isSynchronized, setIsSynchronized] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Fluid calibration progress animation
  useEffect(() => {
    const startTime = performance.now()
    const duration = 2100 // 2.1s smooth calibration progression

    let frameId: number

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const rawProgress = Math.min(100, (elapsed / duration) * 100)
      // Ease-out cubic for luxury smooth deceleration
      const eased = 100 * (1 - Math.pow(1 - rawProgress / 100, 2.5))
      setProgress(Math.min(100, Math.max(0, eased)))

      if (elapsed < duration) {
        frameId = requestAnimationFrame(step)
      } else {
        setProgress(100)
        setIsSynchronized(true)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [])

  // Auto-route navigation when intro animation completes (~2600ms total)
  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
      const completeTimer = setTimeout(() => {
        onEnter()
      }, 450)
      return () => clearTimeout(completeTimer)
    }, 2600)

    return () => clearTimeout(exitTimer)
  }, [onEnter])

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-between items-center bg-[#FAF7F2] text-[#1C1917] px-6 py-10 overflow-y-auto selection:bg-[#C2A26F]/30 transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Warm Backlight */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#FEDAA3]/25 blur-3xl pointer-events-none opacity-50" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#E4C18C]/20 blur-3xl pointer-events-none opacity-40" />

      {/* Top Brand Origin Statement */}
      <header className="w-full flex flex-col items-center pt-2 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#745A2E]" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#745A2E]">
            True Synk
          </p>
        </div>
        <div className="mt-2">
          <span className="text-[10px] uppercase tracking-widest text-[#7A746E]">
            Smart Reminders &amp; Focus
          </span>
        </div>
      </header>

      {/* Central Emblem & Calibration Dial */}
      <section className="w-full flex flex-col items-center my-8 relative z-10 max-w-sm">
        {/* Concentric Calibration Rings */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer Precision Dial Ring */}
          <div className="absolute inset-0 rounded-full bg-[#EFECE3]/50 flex items-center justify-center">
            <svg
              className="w-full h-full text-[#745A2E]/30 animate-spin-slow"
              viewBox="0 0 200 200"
            >
              <circle
                cx="100"
                cy="100"
                fill="none"
                r="94"
                stroke="currentColor"
                strokeDasharray="2 6"
                strokeWidth="1"
              />
              <circle
                cx="100"
                cy="100"
                fill="none"
                opacity="0.6"
                r="86"
                stroke="currentColor"
                strokeDasharray="4 14"
                strokeWidth="0.75"
              />
            </svg>
          </div>

          {/* Mid Recessed Well Ring */}
          <div className="absolute inset-4 rounded-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.06)] shadow-inner flex items-center justify-center">
            <svg
              className="w-full h-full text-[#745A2E]/40 animate-spin-reverse-slow"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                fill="none"
                r="74"
                stroke="currentColor"
                strokeDasharray="1 8"
                strokeWidth="0.75"
              />
              <circle cx="80" cy="6" fill="currentColor" r="2" />
              <circle cx="154" cy="80" fill="currentColor" r="2" />
              <circle cx="80" cy="154" fill="currentColor" r="2" />
              <circle cx="6" cy="80" fill="currentColor" r="2" />
            </svg>
          </div>

          {/* Core Radiant Aura */}
          <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-[#FEDAA3]/30 via-[#F4EFEB] to-[#E4C18C]/30 blur-md opacity-70" />

          {/* Emblem Artwork Container */}
          <div className="relative w-36 h-36 rounded-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] shadow-xl flex items-center justify-center z-20 group">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center p-1">
              <img
                src={logoUrl}
                alt="Chroniq"
                className="w-full h-full object-contain rounded-full filter drop-shadow-sm transition-transform duration-700 ease-out group-hover:scale-105"
                onError={(e) => {
                  const target = e.currentTarget
                  const base = import.meta.env.BASE_URL || './'
                  const fallback = base.endsWith('/') ? `${base}logo.png` : `${base}/logo.png`
                  if (target.src !== fallback && !target.src.endsWith(fallback)) {
                    target.src = fallback
                  } else if (!target.src.endsWith('logo.png')) {
                    target.src = './logo.png'
                  }
                }}
              />
            </div>
            {/* Center Horizon Bead */}
            <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-[#745A2E] shadow-sm ring-2 ring-[#F4EFEB]" />
          </div>
        </div>

        {/* Brand Typography Header */}
        <div className="mt-6 flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl font-serif text-[#181615] tracking-tight">
            Chroniq
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#745A2E] mt-1">
            Smart Reminders &amp; Precision Task Management
          </p>
        </div>

        {/* Editorial Quotation */}
        <div className="mt-4 max-w-xs text-center px-2">
          <p className="font-serif italic text-sm text-[#4D4541] leading-relaxed">
            “Focus on what matters most, every day.”
          </p>
        </div>
      </section>

      {/* Calibration Module & Progress Indicator */}
      <section className="w-full flex flex-col items-center z-10 max-w-sm mt-1">
        {/* Calibration Status Strip & Progress Line */}
        <div className="w-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-xl p-3.5 shadow-sm mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSynchronized ? 'bg-[#745A2E]' : 'bg-[#C2A26F] animate-ping'}`} />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#181615]">
                {isSynchronized ? 'Ready to Focus' : 'Loading Chroniq...'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#745A2E] tabular-nums">
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* Precision Fluid Spring Loading Bar */}
          <div className="w-full h-1 bg-[#EFECE3] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#745A2E] rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[10px]">
            <span className="uppercase tracking-wider text-[#7A746E]">
              Precision Scheduling
            </span>
            <span className="uppercase tracking-wider text-[#745A2E] font-semibold">
              {isSynchronized ? 'Synchronized' : 'Calibrating...'}
            </span>
          </div>
        </div>

        {/* Quick Skip Intro */}
        <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#7A746E]">
          <button
            onClick={onEnter}
            type="button"
            className="hover:text-[#181615] transition-colors cursor-pointer font-medium py-1 px-2"
          >
            Skip Intro
          </button>
          <span>•</span>
          <span>Chroniq</span>
        </div>
      </section>

      {/* Footnote */}
      <footer className="mt-4 text-center z-10">
        <p className="text-[10px] tracking-widest uppercase text-[#7A746E]/70 font-mono">
          Chroniq • Smart Task Management
        </p>
      </footer>
    </div>
  )
}
