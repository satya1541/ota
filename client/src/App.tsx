import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Loader } from "@/components/loader";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, lazy, Suspense } from "react";
import { BackgroundImage } from "@/components/BackgroundImage";

import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import Firmware from "@/pages/firmware";
import Logs from "@/pages/logs";
import Overview from "@/pages/overview";
import FleetMap from "@/pages/fleet-map";
import StagedRollouts from "@/pages/staged-rollouts";
import FirmwareDiff from "@/pages/firmware-diff";
import SerialMonitor from "@/pages/serial-monitor";
import AuditTrail from "@/pages/audit-trail";
import Webhooks from "@/pages/webhooks";
import ConfigManagement from "@/pages/config-management";
import RemoteConsole from "@/pages/remote-console";
import NotFound from "@/pages/not-found";

// Map routes to page titles
const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/devices": "Devices",
  "/firmware": "Firmware",
  "/logs": "System Logs",
  "/overview": "Deployment Overview",
  "/fleet-map": "Fleet Map",
  "/staged-rollouts": "Staged Rollouts",
  "/firmware-diff": "Firmware Diff",
  "/serial-monitor": "Serial Monitor",
  "/audit-trail": "Audit Trail",
  "/webhooks": "Webhooks",
  "/config-management": "Config Management",
  "/remote-console": "Remote Console",
};

// Suspense fallback component
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center min-h-[50vh]">
      <Loader />
    </div>
  );
}

function AppShell() {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const title = routeTitles[location] || "Dashboard";

  // Close mobile sidebar when location changes (instant, no loading delay)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Desktop Sidebar - Persistent, never re-renders on navigation */}
      <div className="hidden lg:flex bg-transparent">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[150] bg-background/20 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-[200] w-64 shadow-2xl lg:hidden"
          >
            <Sidebar onClear={() => setIsSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        <Header 
          title={title} 
          onMenuClick={() => setIsSidebarOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent pb-20 lg:pb-0">
          <div className="p-4 md:p-6">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/devices" component={Devices} />
                <Route path="/firmware" component={Firmware} />
                <Route path="/logs" component={Logs} />
                <Route path="/overview" component={Overview} />
                <Route path="/fleet-map" component={FleetMap} />
                <Route path="/staged-rollouts" component={StagedRollouts} />
                <Route path="/firmware-diff" component={FirmwareDiff} />
                <Route path="/serial-monitor" component={SerialMonitor} />
                <Route path="/audit-trail" component={AuditTrail} />
                <Route path="/webhooks" component={Webhooks} />
                <Route path="/config-management" component={ConfigManagement} />
                <Route path="/remote-console" component={RemoteConsole} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={() => setIsSidebarOpen(true)} />
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(true);
  
  // Theme toggle
  const handleThemeToggle = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('light-theme', !isDark);
  };

  // Register service worker for PWA
  useEffect(() => {
    if (import.meta.env.DEV) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => r.unregister());
        });
      }
      return;
    }

    import("@/lib/pwa").then(({ registerServiceWorker }) => {
      registerServiceWorker();
    });
  }, []);

  // Dynamic import for CommandPalette to avoid SSR issues
  const [CommandPalette, setCommandPalette] = useState<React.ComponentType<{ onThemeToggle?: () => void; isDark?: boolean }> | null>(null);
  const [PWAPrompts, setPWAPrompts] = useState<{
    PWAInstallPrompt: React.ComponentType;
    UpdateAvailablePrompt: React.ComponentType;
  } | null>(null);
  
  useEffect(() => {
    import("@/components/CommandPalette").then((mod) => {
      setCommandPalette(() => mod.CommandPalette);
    });
    import("@/components/PWAPrompts").then((mod) => {
      setPWAPrompts({
        PWAInstallPrompt: mod.PWAInstallPrompt,
        UpdateAvailablePrompt: mod.UpdateAvailablePrompt
      });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BackgroundImage />
        <Toaster position="top-right" richColors closeButton />
        {CommandPalette && <CommandPalette onThemeToggle={handleThemeToggle} isDark={isDark} />}
        {PWAPrompts && (
          <>
            <PWAPrompts.PWAInstallPrompt />
            <PWAPrompts.UpdateAvailablePrompt />
          </>
        )}
        <AppShell />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
