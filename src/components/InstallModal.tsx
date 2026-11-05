import React, { useState, useEffect } from 'react'
import logoUrl from '@/assets/logo.png'

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
  deferredPrompt: propDeferredPrompt,
  onInstallPwa,
  isStandalone = false,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    propDeferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt : null)
  )
  const [isInstalling, setIsInstalling] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  // Sync prop changes
  useEffect(() => {
    if (propDeferredPrompt) {
      setDeferredPrompt(propDeferredPrompt)
    }
  }, [propDeferredPrompt])

  // Listen for beforeinstallprompt directly in window as well
  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      ;(window as any).__deferredInstallPrompt = e
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    setIsIos(/iphone|ipad|ipod/.test(ua))
    setIsAndroid(/android/.test(ua))
  }, [])

  const [guideNotice, setGuideNotice] = useState<string | null>(null)

  if (!isOpen) return null

  // 1-Click Native Install Prompt Handler
  const handleInstallClick = async () => {
    setGuideNotice(null)
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredInstallPrompt : null)

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      setIsInstalling(true)
      try {
        await promptEvent.prompt()
        const choice = await promptEvent.userChoice
        if (choice && choice.outcome === 'accepted') {
          setDeferredPrompt(null)
          if (typeof window !== 'undefined') {
            ;(window as any).__deferredInstallPrompt = null
          }
          onClose()
          return
        }
      } catch (err) {
        console.warn('Install prompt failed:', err)
      } finally {
        setIsInstalling(false)
      }
    } else if (onInstallPwa) {
      setIsInstalling(true)
      try {
        await onInstallPwa()
        onClose()
        return
      } catch (err) {
        console.warn('onInstallPwa failed:', err)
      } finally {
        setIsInstalling(false)
      }
    }

    // Contextual fallback advice when programmatic prompt is blocked by browser heuristics
    if (isIos) {
      setGuideNotice('Tap the Share icon at the bottom of Safari, then choose "Add to Home Screen".')
    } else if (isAndroid) {
      setGuideNotice('Tap the browser menu (⋮) in the top-right, then select "Install app" or "Add to Home screen".')
    } else {
      setGuideNotice('Click the install icon (⊕ or ⬇) in your browser address bar or menu (⋮) to install.')
    }
  }

  const hasNativePrompt = Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredInstallPrompt))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#181615]/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#F4EFEB] border border-[rgba(45,41,38,0.12)] rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150 text-[#181615]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(45,41,38,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[rgba(45,41,38,0.12)] bg-[#FAF7F2] flex-shrink-0 flex items-center justify-center p-1 shadow-xs">
              <img
                src={logoUrl}
                alt="Chroniq"
                className="w-full h-full object-contain rounded-full"
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
            <div>
              <h2 className="text-base font-semibold text-[#181615] tracking-tight font-serif">
                Install Chroniq
              </h2>
              <p className="text-xs text-[#7A746E]">
                Add to your home screen or desktop
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
              <span>Chroniq is installed and running as a standalone app!</span>
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
                    <span className="font-semibold text-[#181615]">Full-Screen Experience</span>
                    <p className="text-[11px] text-[#7A746E] mt-0.5">
                      Launch instantly from your home screen or taskbar without browser toolbars.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <span className="material-symbols-outlined text-base text-[#745A2E] flex-shrink-0 mt-0.5">
                    offline_bolt
                  </span>
                  <div>
                    <span className="font-semibold text-[#181615]">Works Offline</span>
                    <p className="text-[11px] text-[#7A746E] mt-0.5">
                      View and manage your tasks anytime, even with poor or no internet connection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary 1-Click Install Action Button - ALWAYS VISIBLE */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3 px-4 rounded-xl bg-[#1C1917] hover:bg-[#2D2926] text-[#FAF7F2] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-base text-[#C2A26F]">download</span>
                  <span>{isInstalling ? 'Opening Installer...' : 'Install App'}</span>
                </button>
                {guideNotice && (
                  <div className="p-3 rounded-xl bg-[#FEDAA3]/40 border border-[#745A2E]/25 text-[#745A2E] text-xs flex items-center gap-2 animate-in fade-in duration-200">
                    <span className="material-symbols-outlined text-base flex-shrink-0">info</span>
                    <span>{guideNotice}</span>
                  </div>
                )}
                <p className="text-[11px] text-center text-[#7A746E]">
                  {hasNativePrompt
                    ? 'Click above to add Chroniq to your device in one step.'
                    : 'Click above to install, or follow the browser steps below.'}
                </p>
              </div>

              {/* Step-by-Step Instructions Below */}
              <div className="space-y-2.5 pt-2 border-t border-[rgba(45,41,38,0.08)]">
                <h4 className="text-xs font-semibold text-[#181615] flex items-center gap-1.5">
                  {isAndroid ? (
                    <>
                      <span className="material-symbols-outlined text-sm text-[#745A2E]">smartphone</span>
                      <span>How to Install on Android</span>
                    </>
                  ) : isIos ? (
                    <>
                      <span className="material-symbols-outlined text-sm text-[#745A2E]">ios_share</span>
                      <span>How to Install on iPhone / iPad</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm text-[#745A2E]">desktop_windows</span>
                      <span>How to Install on Desktop (Chrome / Edge)</span>
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
                        Confirm <strong className="text-[#181615]">Install</strong>.
                      </li>
                    </ol>
                  )}
                </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[rgba(45,41,38,0.08)] flex items-center justify-between text-[11px] text-[#7A746E]">
          <span>Chroniq App</span>
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
