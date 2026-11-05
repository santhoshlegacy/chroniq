import React, { useState, useEffect } from 'react'
import { ChroniqLogo } from './ChroniqLogo'

interface InstallModalProps {
  isOpen: boolean
  onClose: () => void
  deferredPrompt?: any
  onInstallPwa?: () => Promise<void>
  isStandalone?: boolean
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallPwa,
  isStandalone = false,
}) => {
  const [isInstalling, setIsInstalling] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    setIsIos(/iphone|ipad|ipod/.test(ua))
    setIsAndroid(/android/.test(ua))
  }, [])

  if (!isOpen) return null

  const handleInstallClick = async () => {
    if (onInstallPwa && deferredPrompt) {
      setIsInstalling(true)
      try {
        await onInstallPwa()
        onClose()
      } finally {
        setIsInstalling(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0D0E10]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1B1C1E] border border-[#DAC58F]/20 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#E3E2E5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#DAC58F]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#DAC58F]/30 bg-[#0D0E10] flex-shrink-0 flex items-center justify-center p-1 shadow-md">
              <ChroniqLogo className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight font-serif">
                Install Chroniq Suite
              </h2>
              <p className="text-xs text-[#99907C] font-mono">
                Native Progressive Web Application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#99907C] hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* Status Message if already installed */}
          {isStandalone ? (
            <div className="p-3.5 rounded-xl bg-[#56481E]/40 border border-[#DAC58F]/30 text-[#DAC58F] text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-[#F2CA50]">verified</span>
              <span>Chroniq is currently installed and operating as a standalone application!</span>
            </div>
          ) : (
            <>
              {/* Value Proposition */}
              <div className="p-3.5 rounded-xl bg-[#121315] border border-[#DAC58F]/10 space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="material-symbols-outlined text-base text-[#F2CA50] flex-shrink-0 mt-0.5">
                    fullscreen
                  </span>
                  <div>
                    <span className="font-semibold text-white">Full-Screen Productivity</span>
                    <p className="text-[11px] text-[#99907C] mt-0.5">
                      Runs directly from your Home Screen or Desktop without browser address bars.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <span className="material-symbols-outlined text-base text-[#F2CA50] flex-shrink-0 mt-0.5">
                    offline_bolt
                  </span>
                  <div>
                    <span className="font-semibold text-white">Zero App Store Overhead</span>
                    <p className="text-[11px] text-[#99907C] mt-0.5">
                      Installs cleanly in seconds through modern web standards. Always synchronized.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1-Tap Native Install Button */}
              {deferredPrompt ? (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F2CA50] text-[#141211] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md hover:opacity-90 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>{isInstalling ? 'Opening Installer...' : 'Install Chroniq App'}</span>
                  </button>
                  <p className="text-[11px] text-center text-[#99907C]">
                    Browser will prompt you to confirm adding Chroniq to your device.
                  </p>
                </div>
              ) : (
                /* Fallback Instructions */
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {isAndroid ? (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#F2CA50]">smartphone</span>
                        <span>How to Install in Chrome for Android</span>
                      </>
                    ) : isIos ? (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#F2CA50]">ios_share</span>
                        <span>How to Install in Safari for iOS</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#F2CA50]">desktop_windows</span>
                        <span>How to Install in Chrome / Edge</span>
                      </>
                    )}
                  </h4>

                  {isIos ? (
                    <ol className="space-y-2 text-xs text-[#99907C] list-decimal list-inside bg-[#121315] p-3.5 rounded-xl border border-[#DAC58F]/10">
                      <li>
                        Tap the <strong className="text-white">Share</strong> button in Safari’s bottom toolbar.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-white">Add</strong> in the top right corner.
                      </li>
                    </ol>
                  ) : (
                    <ol className="space-y-2 text-xs text-[#99907C] list-decimal list-inside bg-[#121315] p-3.5 rounded-xl border border-[#DAC58F]/10">
                      <li>
                        Open the browser menu by tapping the <strong className="text-white">three dots (⋮)</strong>.
                      </li>
                      <li>
                        Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                      </li>
                      <li>
                        Confirm <strong className="text-white">Install</strong>. Chroniq will appear on your device.
                      </li>
                    </ol>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#DAC58F]/10 flex items-center justify-between text-[11px] text-[#99907C] font-mono">
          <span>Horological Series IX</span>
          <button
            onClick={onClose}
            className="hover:text-[#DAC58F] transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
