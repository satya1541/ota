// PWA utilities for service worker registration and install prompt

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;
let installPromptSetup = false;
let beforeInstallPromptHandler: ((e: Event) => void) | null = null;
let appInstalledHandler: (() => void) | null = null;

// Check if app is installed
export function checkIfInstalled(): boolean {
  // Check display-mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // Check iOS standalone
  if ((navigator as any).standalone === true) {
    return true;
  }
  return false;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[PWA] Service worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

// Setup install prompt capture
export function setupInstallPrompt(callback?: (canInstall: boolean) => void): void {
  isInstalled = checkIfInstalled();

  if (isInstalled) {
    callback?.(false);
    return;
  }

  // Avoid registering duplicate global listeners if called more than once.
  if (installPromptSetup) {
    callback?.(canInstall());
    return;
  }

  installPromptSetup = true;

  beforeInstallPromptHandler = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    callback?.(true);
    console.log('[PWA] Install prompt captured');
  };

  appInstalledHandler = () => {
    deferredPrompt = null;
    isInstalled = true;
    callback?.(false);
    console.log('[PWA] App installed');
  };

  window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
  window.addEventListener('appinstalled', appInstalledHandler);
}

// Show install prompt
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return false;
  }
}

// Check if can install
export function canInstall(): boolean {
  return deferredPrompt !== null && !isInstalled;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Subscribe to push notifications
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[PWA] Notification permission denied');
      return null;
    }

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return existing;
    }

    // Subscribe (would need VAPID keys in production)
    // For now, just return null as push setup requires server-side VAPID configuration
    console.log('[PWA] Push subscription requires VAPID keys configuration');
    return null;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

// Show a local notification
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    ...options
  });
}

// Update service worker
export async function updateServiceWorker(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.update();
}

// Skip waiting and reload
export async function activateNewServiceWorker(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Reload after activation
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
