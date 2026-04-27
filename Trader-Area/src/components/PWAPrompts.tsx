import React, { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const PWAPrompts: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setShowInstall(true)
    }

    const handleInstalled = () => {
      setInstallEvent(null)
      setShowInstall(false)
    }

    const handleUpdateAvailable = () => {
      setShowUpdate(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('pwa:update-available', handleUpdateAvailable)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('pwa:update-available', handleUpdateAvailable)
    }
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') {
      setShowInstall(false)
      setInstallEvent(null)
    }
  }

  const handleUpdate = async () => {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration?.waiting) return

    setUpdating(true)

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    }, { once: true })

    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  return (
    <>
      {(showInstall || showUpdate) && (
        <div style={{
          position: 'fixed',
          left: '50%',
          bottom: '16px',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 420px)',
          zIndex: 5000,
          borderRadius: '20px',
          background: 'linear-gradient(180deg, #0b2430 0%, #0f3340 100%)',
          border: '1px solid rgba(127, 231, 247, 0.16)',
          boxShadow: '0 18px 44px rgba(0,0,0,0.28)',
          color: '#eef7fb',
          padding: '16px',
        }}>
          {showInstall && !showUpdate ? (
            <>
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>Install MacheFunded</div>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(238,247,251,0.78)', marginBottom: '14px' }}>
                Add MacheFunded to your home screen for faster access and a more app-like experience.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowInstall(false)} style={{ background: 'transparent', color: '#eef7fb', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}>
                  Not now
                </button>
                <button type="button" onClick={() => void handleInstall()} style={{ background: '#7fe7f7', color: '#04151b', border: 'none', borderRadius: '999px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
                  Install
                </button>
              </div>
            </>
          ) : null}

          {showUpdate ? (
            <>
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px' }}>Update available</div>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(238,247,251,0.78)', marginBottom: '14px' }}>
                A newer version of MacheFunded is ready. Update now to use the latest improvements.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUpdate(false)} disabled={updating} style={{ background: 'transparent', color: '#eef7fb', border: '1px solid rgba(255,255,255,0.16)', borderRadius: '999px', padding: '10px 14px', cursor: 'pointer' }}>
                  Later
                </button>
                <button type="button" onClick={() => void handleUpdate()} disabled={updating} style={{ background: '#7fe7f7', color: '#04151b', border: 'none', borderRadius: '999px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
                  {updating ? 'Updating...' : 'Update now'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  )
}

export default PWAPrompts