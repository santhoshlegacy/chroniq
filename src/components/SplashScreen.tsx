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
    // Organic micro-stepping of horological calibration
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
      className={`fixed inset-0 z-[100] flex flex-col justify-between items-center bg-[#121315] text-[#E3E2E5] px-4 py-8 overflow-y-auto selection:bg-[#D4AF37]/30 transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Golden Ray Backlight (Architectural Lighting) */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#DAC58F]/20 blur-3xl pointer-events-none opacity-60" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#56481E]/30 blur-3xl pointer-events-none opacity-40" />

      {/* Top Brand Origin Statement */}
      <header className="w-full flex flex-col items-center pt-2 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B1C1E] border border-[#DAC58F]/15 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DAC58F] animate-pulse" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#DAC58F]">
            A True Synk Product
          </p>
        </div>
        <div className="mt-2">
          <span className="text-[10px] uppercase tracking-widest text-[#99907C]">
            Horological Series IX • Folio Edition
          </span>
        </div>
      </header>

      {/* Central Emblem & Horological Calibration Dial */}
      <section className="w-full flex flex-col items-center my-6 relative z-10 max-w-sm">
        {/* Concentric Calibration Rings */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer Precision Dial Ring with Subtle Pulsing Halo */}
          <div className="absolute inset-0 rounded-full bg-[#292A2C]/30 flex items-center justify-center">
            {/* Radial tick markers via SVG */}
            <svg
              className="w-full h-full text-[#DAC58F]/30 animate-spin-slow"
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
          <div className="absolute inset-4 rounded-full bg-[#1B1C1E] shadow-inner flex items-center justify-center">
            <svg
              className="w-full h-full text-[#DAC58F]/40 animate-spin-reverse-slow"
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
              {/* 4 Cardinal Quadrant Pips */}
              <circle cx="80" cy="6" fill="currentColor" r="2" />
              <circle cx="154" cy="80" fill="currentColor" r="2" />
              <circle cx="80" cy="154" fill="currentColor" r="2" />
              <circle cx="6" cy="80" fill="currentColor" r="2" />
            </svg>
          </div>

          {/* Core Radiant Aura */}
          <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-[#FEDAA3]/20 via-[#1F2022] to-[#56481E]/40 blur-md opacity-80" />

          {/* Emblem Artwork Container */}
          <div className="relative w-36 h-36 rounded-full bg-[#0D0E10] border border-[#DAC58F]/25 shadow-2xl flex items-center justify-center p-3 z-20 group">
            <ChroniqLogo className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-700 ease-out group-hover:scale-105" />
            {/* Center Horizon Bead */}
            <div className="absolute -bottom-1 w-2.5 h-2.5 rounded-full bg-[#DAC58F] shadow-[0_0_8px_#DAC58F] ring-2 ring-[#0D0E10]" />
          </div>
        </div>

        {/* Brand Typography Header */}
        <div className="mt-5 flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl font-serif text-[#F2CA50] tracking-tight">
            Chroniq
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#DAC58F] mt-1">
            The Architecture of Time &amp; Precision Productivity
          </p>
        </div>

        {/* Editorial Architectural Quotation */}
        <div className="mt-4 max-w-xs text-center px-2">
          <p className="font-serif italic text-sm text-[#D0C5AF]/80 leading-relaxed">
            “Time is the rarest luxury; master its cadence.”
          </p>
        </div>
      </section>

      {/* Interactive Biometric Key & Calibration Module */}
      <section className="w-full flex flex-col items-center z-10 max-w-sm mt-1">
        {/* Calibration Status Strip & Progress Line */}
        <div className="w-full bg-[#1B1C1E] border border-[#DAC58F]/15 rounded-xl p-3.5 shadow-md mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSynchronized ? 'bg-[#DAC58F]' : 'bg-[#F2CA50] animate-ping'}`} />
              <span className="text-[11px] font-medium uppercase tracking-widest text-[#E3E2E5]">
                {isSynchronized ? 'Harmonic Cadence Synchronized' : 'Calibrating Celestial Cadence...'}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#DAC58F] tabular-nums">
              {progress.toFixed(1)}%
            </span>
          </div>

          {/* Precision Fluid Spring Loading Bar */}
          <div className="w-full h-1 bg-[#292A2C] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F2CA50] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5 text-[10px]">
            <span className="uppercase tracking-wider text-[#99907C]">
              Geneva Atomic Meridian
            </span>
            <span className="uppercase tracking-wider text-[#DAC58F] font-semibold">
              {isSynchronized ? 'Synchronized' : 'Locking Phase'}
            </span>
          </div>
        </div>

        {/* Biometric Authentication Touch Area */}
        <button
          aria-label="Touch ID / Face ID Authentication - Enter Executive Suite"
          onClick={handleEnterSuite}
          type="button"
          className="w-full group bg-gradient-to-r from-[#1B1C1E] to-[#24262A] border border-[#DAC58F]/25 hover:border-[#DAC58F]/50 active:scale-[0.98] text-white rounded-xl p-3.5 flex items-center justify-between shadow-xl transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {/* Biometric Pip */}
            <div className="w-10 h-10 rounded-lg bg-[#DAC58F]/15 border border-[#DAC58F]/30 flex items-center justify-center text-[#F2CA50] transition-colors group-hover:bg-[#DAC58F]/25">
              <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:scale-110">
                {isUnlocked ? 'lock_open' : 'fingerprint'}
              </span>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <span>Enter Executive Suite</span>
                <span className="material-symbols-outlined text-xs text-[#DAC58F]">
                  verified_user
                </span>
              </div>
              <div className="text-[10px] text-[#DAC58F] tracking-wider uppercase font-medium">
                {isUnlocked ? 'Signature Verified' : 'Touch ID / Face ID Authenticated'}
              </div>
            </div>
          </div>

          {/* Forward Arrow Signifier */}
          <div className="w-7 h-7 rounded-full bg-[#DAC58F]/10 flex items-center justify-center text-[#DAC58F] group-hover:translate-x-1 transition-transform">
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </div>
        </button>

        {/* Quick Skip Anchor */}
        <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#99907C]">
          <button
            onClick={onEnter}
            type="button"
            className="hover:text-[#DAC58F] transition-colors cursor-pointer"
          >
            Direct Ingress
          </button>
          <span>•</span>
          <span className="text-[#99907C]/70">Calibre 4130</span>
        </div>
      </section>

      {/* Editorial Footnote */}
      <footer className="mt-4 text-center z-10">
        <p className="text-[10px] tracking-widest uppercase text-[#99907C]/70">
          Archival Edition • Chroniq OS 4.1.0 • Private Suite
        </p>
      </footer>
    </div>
  )
}

