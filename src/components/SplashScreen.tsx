import React, { useState, useEffect } from 'react'
import { ChroniqLogo } from './ChroniqLogo'

interface SplashScreenProps {
  onEnter: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [progress, setProgress] = useState(86)
  const [isSynchronized, setIsSynchronized] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsSynchronized(true)
          return 100
        }
        const next = prev + Math.random() * 2.8
        if (next >= 100) {
          setIsSynchronized(true)
          return 100
        }
        return next
      })
    }, 160)

    return () => clearInterval(interval)
  }, [])

  const handleEnterSuite = () => {
    setIsUnlocked(true)
    setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onEnter()
      }, 400)
    }, 450)
  }

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
            A True Synk Product
          </p>
        </div>
        <div className="mt-2">
          <span className="text-[10px] uppercase tracking-widest text-[#7A746E]">
            Horological Series IX • Folio Edition
          </span>
        </div>
      </header>

      {/* Central Emblem & Horological Calibration Dial */}
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
          <div className="relative w-36 h-36 rounded-full bg-[#FFFFFF] border border-[rgba(45,41,38,0.1)] shadow-xl flex items-center justify-center p-3 z-20 group">
            <ChroniqLogo className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-700 ease-out group-hover:scale-105" />
            {/* Center Horizon Bead */}
            <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-[#745A2E] shadow-sm ring-2 ring-[#FFFFFF]" />
          </div>
        </div>

        {/* Brand Typography Header */}
        <div className="mt-6 flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl font-serif text-[#181615] tracking-tight">
            Chroniq
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#745A2E] mt-1">
            The Architecture of Time &amp; Precision Productivity
          </p>
        </div>

        {/* Editorial Architectural Quotation */}
        <div className="mt-4 max-w-xs text-center px-2">
          <p className="font-serif italic text-sm text-[#4D4541] leading-relaxed">
            “Time is the rarest luxury; master its cadence.”
          </p>
        </div>
      </section>

      {/* Interactive Biometric Key & Calibration Module */}
      <section className="w-full flex flex-col items-center z-10 max-w-sm mt-1">
        {/* Calibration Status Strip & Progress Line */}
        <div className="w-full bg-[#F4EFEB] border border-[rgba(45,41,38,0.08)] rounded-xl p-3.5 shadow-sm mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSynchronized ? 'bg-[#745A2E]' : 'bg-[#C2A26F] animate-ping'}`} />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#181615]">
                {isSynchronized ? 'Harmonic Cadence Synchronized' : 'Calibrating Celestial Cadence...'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#745A2E] tabular-nums">
              {progress.toFixed(1)}%
            </span>
          </div>

          {/* Precision Fluid Spring Loading Bar */}
          <div className="w-full h-1 bg-[#EFECE3] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#745A2E] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[10px]">
            <span className="uppercase tracking-wider text-[#7A746E]">
              Geneva Atomic Meridian
            </span>
            <span className="uppercase tracking-wider text-[#745A2E] font-semibold">
              {isSynchronized ? 'Synchronized' : 'Locking Phase'}
            </span>
          </div>
        </div>

        {/* Biometric Authentication Button */}
        <button
          aria-label="Touch ID / Face ID Authentication - Enter Executive Suite"
          onClick={handleEnterSuite}
          type="button"
          className="w-full group bg-[#181615] text-[#FAF7F2] active:scale-[0.98] rounded-xl p-3.5 flex items-center justify-between shadow-lg transition-all duration-300 hover:bg-[#2D2926] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(250,247,242,0.12)] flex items-center justify-center text-[#FEDAA3] transition-colors group-hover:bg-[rgba(250,247,242,0.18)]">
              <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">
                {isUnlocked ? 'lock_open' : 'fingerprint'}
              </span>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[#FAF7F2] flex items-center gap-1.5">
                <span>Enter Executive Suite</span>
                <span className="material-symbols-outlined text-xs text-[#FEDAA3]">
                  verified_user
                </span>
              </div>
              <div className="text-[10px] text-[rgba(250,247,242,0.7)] tracking-wider uppercase font-medium">
                {isUnlocked ? 'Signature Verified' : 'Touch ID / Face ID Authenticated'}
              </div>
            </div>
          </div>

          <div className="w-7 h-7 rounded-full bg-[rgba(250,247,242,0.1)] flex items-center justify-center text-[#FEDAA3] group-hover:translate-x-1 transition-transform">
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </div>
        </button>

        {/* Quick Ingress */}
        <div className="mt-3.5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#7A746E]">
          <button
            onClick={onEnter}
            type="button"
            className="hover:text-[#181615] transition-colors cursor-pointer font-medium"
          >
            Direct Ingress
          </button>
          <span>•</span>
          <span>Calibre 4130</span>
        </div>
      </section>

      {/* Editorial Footnote */}
      <footer className="mt-4 text-center z-10">
        <p className="text-[10px] tracking-widest uppercase text-[#7A746E]/70 font-mono">
          Archival Edition • Chroniq OS 4.1.0 • Private Suite
        </p>
      </footer>
    </div>
  )
}
