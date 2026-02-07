import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Loader } from "@/components/loader";
import { useState, useEffect, lazy, Suspense } from "react";
import { BackgroundImage } from "@/components/BackgroundImage";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Devices = lazy(() => import("@/pages/devices"));
const Firmware = lazy(() => import("@/pages/firmware"));
const Logs = lazy(() => import("@/pages/logs"));
const FleetMap = lazy(() => import("@/pages/fleet-map"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const NotFound = lazy(() => import("@/pages/not-found"));


// Suspense fallback component
function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center min-h-[50vh]">
      <Loader />
    </div>
  );
}

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent pb-20 lg:pb-0 main-content-area">
          <div className="p-4 md:p-6">
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/devices" component={Devices} />
                <Route path="/firmware" component={Firmware} />
                <Route path="/logs" component={Logs} />
                <Route path="/fleet-map" component={FleetMap} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <AppShell />;
}

function App() {
  const { theme, toggleTheme } = useTheme();

  // Theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
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
        <div className="scanline" />
        <div className="cinematic-vignette" />
        <Toaster
          position="top-right"
          richColors={false}
          closeButton
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "bg-card text-foreground border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-4 w-full flex items-center gap-3 font-mono uppercase tracking-wide",
              title: "font-black text-sm",
              description: "text-xs opacity-80 font-bold",
              actionButton: "bg-primary text-primary-foreground border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all text-xs font-black px-3 py-1",
              cancelButton: "bg-muted text-muted-foreground border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all text-xs font-black px-3 py-1",
              error: "bg-red-500 text-white border-black [&_svg]:text-white",
              success: "bg-green-500 text-white border-black [&_svg]:text-white",
              warning: "bg-yellow-400 text-black border-black [&_svg]:text-black",
              info: "bg-blue-400 text-white border-black [&_svg]:text-white",
            }
          }}
        />
        {CommandPalette && <CommandPalette onThemeToggle={handleThemeToggle} isDark={theme === 'dark'} />}
        {PWAPrompts && (
          <>
            <PWAPrompts.PWAInstallPrompt />
            <PWAPrompts.UpdateAvailablePrompt />
          </>
        )}
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader /></div>}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route>
              <ProtectedRoute />
            </Route>
          </Switch>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>

  );
}

function AppWrapper() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppWrapper;
