import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import Firmware from "@/pages/firmware";
import Deployments from "@/pages/deployments";
import Logs from "@/pages/logs";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/devices" component={Devices} />
      <Route path="/firmware" component={Firmware} />
      <Route path="/deployments" component={Deployments} />
      <Route path="/logs" component={Logs} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
