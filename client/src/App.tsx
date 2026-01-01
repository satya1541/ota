import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import Firmware from "@/pages/firmware";
import Logs from "@/pages/logs";

import { useState } from "react";
import { BackgroundVideo } from "@/components/BackgroundVideo";

function Router() {
  return (
    <div className="flex-1 relative z-10 flex flex-col min-h-screen">
      <Switch>
        <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/devices" component={Devices} />
        <Route path="/firmware" component={Firmware} />
        <Route path="/logs" component={Logs} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BackgroundVideo onLoaded={() => setVideoLoaded(true)} />
        <Toaster position="top-right" richColors closeButton />
        {videoLoaded && <Router />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
