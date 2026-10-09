'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Si ya se ejecuta en modo standalone (App instalada), no mostrar nada
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. Si el usuario ya descartó el aviso en esta sesión, no volver a molestar
    if (sessionStorage.getItem('lacajita_install_dismissed') === '1') {
      return;
    }

    // 3. Registrar el Service Worker para asegurar que el navegador valide la PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Error registrando Service Worker:', err);
      });
    }

    // 4. Capturar el evento nativo de instalación (Android y Desktop Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Disparar el diálogo nativo del sistema operativo
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('lacajita_install_dismissed', '1');
  };

  // Si no está listo el instalador nativo, si ya está instalada o fue descartado, no renderizar nada
  if (!visible || installed || !deferredPrompt) {
    return null;
  }

  return (
    <aside className="install-banner-wrap" aria-label="Instalar aplicación de La Cajita">
      <div className="install-banner-card">
        <div className="install-banner-icon-box">
          <img src="/icon-192.png" alt="La Cajita" width={42} height={42} className="install-banner-img" />
        </div>
        
        <div className="install-banner-info">
          <p className="install-banner-title">Pimentones La Cajita</p>
          <p className="install-banner-subtitle">Instala la app para pedir en 1 solo clic desde tu pantalla</p>
        </div>

        <div className="install-banner-actions">
          <button
            type="button"
            onClick={handleInstallClick}
            className="install-btn-confirm"
            id="btn-pwa-install"
          >
            Instalar App
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="install-btn-dismiss"
            aria-label="Cerrar aviso de instalación"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
