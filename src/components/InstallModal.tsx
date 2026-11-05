import React, { useState, useEffect } from 'react'
import { X, Download, CheckCircle2, Sparkles, Smartphone, Monitor, Share, MoreVertical } from 'lucide-react'
import logoImg from '@/assets/logo.png'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0A0E17]/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#121826] border border-white/[0.08] rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#E7ECF4]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/[0.1] bg-[#0A0E17] flex-shrink-0 flex items-center justify-center">
              <img
                src={logoImg}
                alt="Chroniq"
                className="w-full h-full object-cover scale-[2.2] translate-y-[22%]"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Install Chroniq
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Native Progressive Web Application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* Status Message if already installed */}
          {isStandalone ? (
            <div className="p-3.5 rounded-xl bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 text-[#5EEAD4] text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#5EEAD4] flex-shrink-0" />
              <span>Chroniq is currently installed and running as a standalone app!</span>
            </div>
          ) : (
            <>
              {/* Value Proposition */}
              <div className="p-3.5 rounded-xl bg-[#182233] border border-white/[0.06] space-y-2.5">
                <div className="flex items-start space-x-2.5 text-xs">
                  <Sparkles className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Full-Screen Productivity</span>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Runs directly from your Home Screen or Desktop without browser address bars.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 text-xs">
                  <Smartphone className="w-4 h-4 text-[#5EEAD4] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Zero App Store Overhead</span>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Installs cleanly in seconds through Google Chrome. Always up to date with zero APK sideloading.
                    </p>
                  </div>
                </div>
              </div>

              {/* 1-Tap Native Install Button (when beforeinstallprompt is ready) */}
              {deferredPrompt ? (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="btn-primary w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>{isInstalling ? 'Opening Installer...' : 'Install Chroniq App'}</span>
                  </button>
                  <p className="text-[11px] text-center text-[#64748B]">
                    Chrome will prompt you to confirm adding Chroniq to your device.
                  </p>
                </div>
              ) : (
                /* Fallback Browser Instructions */
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    {isAndroid ? (
                      <>
                        <Smartphone className="w-3.5 h-3.5 text-[#5EEAD4]" />
                        <span>How to Install in Chrome for Android</span>
                      </>
                    ) : isIos ? (
                      <>
                        <Share className="w-3.5 h-3.5 text-[#5EEAD4]" />
                        <span>How to Install in Safari for iOS</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3.5 h-3.5 text-[#5EEAD4]" />
                        <span>How to Install in Chrome / Edge</span>
                      </>
                    )}
                  </h4>

                  {isIos ? (
                    <ol className="space-y-2 text-xs text-[#94A3B8] list-decimal list-inside bg-[#182233] p-3.5 rounded-xl border border-white/[0.06]">
                      <li>
                        Tap the <strong className="text-white">Share</strong> button <Share className="inline w-3 h-3 text-[#5EEAD4]" /> in Safari’s bottom toolbar.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-white">Add</strong> in the top right corner.
                      </li>
                    </ol>
                  ) : (
                    <ol className="space-y-2 text-xs text-[#94A3B8] list-decimal list-inside bg-[#182233] p-3.5 rounded-xl border border-white/[0.06]">
                      <li>
                        Open the browser menu by tapping the <strong className="text-white">three dots (⋮)</strong> <MoreVertical className="inline w-3 h-3 text-[#5EEAD4]" /> in the top right corner.
                      </li>
                      <li>
                        Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                      </li>
                      <li>
                        Confirm <strong className="text-white">Install</strong>. Chroniq will appear on your device like any native application.
                      </li>
                    </ol>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Chroniq — Own your time.</span>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
