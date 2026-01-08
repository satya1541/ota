import { useState, useEffect } from 'react';
import { CloudDownload, X, BellRing, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  setupInstallPrompt,
  showInstallPrompt,
  canInstall,
  requestNotificationPermission,
  checkIfInstalled
} from '@/lib/pwa';

interface PWAInstallPromptProps {
  className?: string;
}

export function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (checkIfInstalled()) {
      return;
    }

    // Don't show if user already dismissed it permanently
    if (localStorage.getItem('pwa-prompt-dismissed') === 'true') {
      return;
    }

    setupInstallPrompt((canInstallApp) => {
      setShowPrompt(canInstallApp);
    });
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const installed = await showInstallPrompt();
    setIsInstalling(false);
    if (installed) {
      setShowPrompt(false);
      // Also mark as dismissed so it won't show again
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal permanently - never show again
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || !canInstall()) {
    return null;
  }

  return (
    <div className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4 ${className}`}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 bg-accent/20 rounded-lg">
          <CloudDownload className="h-6 w-6 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">Install App</h3>
          <p className="text-sm text-slate-400 mt-1">
            Install Universal OTA for quick access and offline support
          </p>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            size="sm"
            className="mt-3 w-full"
          >
            {isInstalling ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <CloudDownload className="h-4 w-4 mr-2" />
                Install
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NotificationPromptProps {
  className?: string;
}

export function NotificationPrompt({ className }: NotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!('Notification' in window)) {
      return;
    }

    setPermission(Notification.permission);

    // Show prompt if not yet decided
    if (Notification.permission === 'default') {
      // Delay showing to not overwhelm user
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 30000); // Show after 30 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!showPrompt || permission !== 'default') {
    return null;
  }

  return (
    <div className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4 ${className}`}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <BellRing className="h-6 w-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">Enable Notifications</h3>
          <p className="text-sm text-slate-400 mt-1">
            Get notified about device updates and OTA status changes
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="flex-1"
            >
              Not Now
            </Button>
            <Button
              onClick={handleEnable}
              size="sm"
              className="flex-1"
            >
              Enable
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UpdateAvailablePromptProps {
  className?: string;
}

export function UpdateAvailablePrompt({ className }: UpdateAvailablePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setShowPrompt(true);
    };

    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-blue-600 text-white rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-top-4 ${className}`}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <RotateCcw className="h-6 w-6" />
        <div className="flex-1">
          <h3 className="font-semibold">Update Available</h3>
          <p className="text-sm text-white/80 mt-1">
            A new version is available. Reload to update.
          </p>
          <Button
            onClick={handleReload}
            variant="secondary"
            size="sm"
            className="mt-3 w-full bg-white text-blue-600 hover:bg-white/90"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reload Now
          </Button>
        </div>
      </div>
    </div>
  );
}
