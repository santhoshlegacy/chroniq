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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#181615]/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#181615]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(45,41,38,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[rgba(45,41,38,0.12)] bg-[#FAF7F2] flex-shrink-0 flex items-center justify-center p-1 shadow-xs">
              <ChroniqLogo className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#181615] tracking-tight font-serif">
                Install Chroniq Suite
              </h2>
              <p className="text-xs text-[#7A746E] font-mono">
                Native Progressive Web Application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A746E] hover:text-[#181615] transition cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* Status Message if already installed */}
          {isStandalone ? (
            <div className="p-3.5 rounded-xl bg-[#FEDAA3]/40 border border-[#745A2E]/25 text-[#745A2E] text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-[#745A2E]">verified</span>
              <span>Chroniq is currently installed and operating as a standalone application!</span>
            </div>
          ) : (
            <>
              {/* Value Proposition */}
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[rgba(45,41,38,0.08)] space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="material-symbols-outlined text-base text-[#745A2E] flex-shrink-0 mt-0.5">
                    fullscreen
                  </span>
                  <div>
                    <span className="font-semibold text-[#181615]">Full-Screen Productivity</span>
                    <p className="text-[11px] text-[#7A746E] mt-0.5">
                      Runs directly from your Home Screen or Desktop without browser address bars.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <span className="material-symbols-outlined text-base text-[#745A2E] flex-shrink-0 mt-0.5">
                    offline_bolt
                  </span>
                  <div>
                    <span className="font-semibold text-[#181615]">Zero App Store Overhead</span>
                    <p className="text-[11px] text-[#7A746E] mt-0.5">
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
                    className="btn-primary w-full py-2.5 px-4 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>{isInstalling ? 'Opening Installer...' : 'Install Chroniq App'}</span>
                  </button>
                  <p className="text-[11px] text-center text-[#7A746E]">
                    Browser will prompt you to confirm adding Chroniq to your device.
                  </p>
                </div>
              ) : (
                /* Fallback Instructions */
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-semibold text-[#181615] flex items-center gap-1.5">
                    {isAndroid ? (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#745A2E]">smartphone</span>
                        <span>How to Install in Chrome for Android</span>
                      </>
                    ) : isIos ? (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#745A2E]">ios_share</span>
                        <span>How to Install in Safari for iOS</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm text-[#745A2E]">desktop_windows</span>
                        <span>How to Install in Chrome / Edge</span>
                      </>
                    )}
                  </h4>

                  {isIos ? (
                    <ol className="space-y-2 text-xs text-[#7A746E] list-decimal list-inside bg-[#FAF7F2] p-3.5 rounded-xl border border-[rgba(45,41,38,0.08)]">
                      <li>
                        Tap the <strong className="text-[#181615]">Share</strong> button in Safari’s bottom toolbar.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-[#181615]">Add to Home Screen</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-[#181615]">Add</strong> in the top right corner.
                      </li>
                    </ol>
                  ) : (
                    <ol className="space-y-2 text-xs text-[#7A746E] list-decimal list-inside bg-[#FAF7F2] p-3.5 rounded-xl border border-[rgba(45,41,38,0.08)]">
                      <li>
                        Open the browser menu by tapping the <strong className="text-[#181615]">three dots (⋮)</strong>.
                      </li>
                      <li>
                        Select <strong className="text-[#181615]">"Install app"</strong> or <strong className="text-[#181615]">"Add to Home screen"</strong>.
                      </li>
                      <li>
                        Confirm <strong className="text-[#181615]">Install</strong>. Chroniq will appear on your device.
                      </li>
                    </ol>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[11px] text-[#7A746E] font-mono">
          <span>Horological Series IX</span>
          <button
            onClick={onClose}
            className="hover:text-[#181615] transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
