import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceApi, commandApi, type Device, type DeviceCommand } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Send, 
  Trash2, 
  RefreshCw,
  Power,
  RotateCcw,
  Settings,
  Wifi,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown
} from "lucide-react";

interface ConsoleMessage {
  id: string;
  type: "stdout" | "stderr" | "info" | "command" | "response";
  message: string;
  timestamp: Date;
  mac?: string;
}

const QUICK_COMMANDS = [
  { label: "Reboot", command: "reboot", icon: Power, description: "Restart the device" },
  { label: "Factory Reset", command: "factory_reset", icon: RotateCcw, description: "Reset to factory defaults" },
  { label: "Reload Config", command: "config_reload", icon: Settings, description: "Reload configuration" },
  { label: "WiFi Scan", command: "wifi_scan", icon: Wifi, description: "Scan for WiFi networks" },
  { label: "Get Status", command: "status", icon: Terminal, description: "Get device status" },
];

export default function RemoteConsole() {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [customCommand, setCustomCommand] = useState("");
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  const { data: commandHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ["commandHistory", selectedDevice],
    queryFn: () => commandApi.getHistory(selectedDevice),
    enabled: !!selectedDevice,
  });

  const sendCommandMutation = useMutation({
    mutationFn: ({ mac, command, payload }: { mac: string; command: string; payload?: string }) =>
      commandApi.send(mac, command, payload),
    onSuccess: (cmd) => {
      addMessage({
        type: "command",
        message: `> ${cmd.command}${cmd.payload ? ` ${cmd.payload}` : ""}`,
      });
      toast.success("Command sent");
      refetchHistory();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const selectedDeviceInfo = devices.find((d) => d.macAddress === selectedDevice);

  // WebSocket connection for real-time console output
  useEffect(() => {
    if (!selectedDevice) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Subscribe to console output for this device
      ws.send(JSON.stringify({ type: "subscribe-console", deviceId: selectedDevice }));
      addMessage({ type: "info", message: `Connected to device ${selectedDevice}` });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "console-output" && data.mac === selectedDevice) {
          addMessage({
            type: data.output.type || "stdout",
            message: data.output.message,
            mac: data.mac,
          });
        } else if (data.type === "command-ack" && data.mac === selectedDevice) {
          addMessage({
            type: "response",
            message: `[ACK] ${data.status}${data.response ? `: ${data.response}` : ""}`,
          });
          refetchHistory();
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      addMessage({ type: "info", message: "Disconnected from device" });
    };

    ws.onerror = () => {
      toast.error("WebSocket connection error");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe-console", deviceId: selectedDevice }));
      }
      ws.close();
    };
  }, [selectedDevice]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (msg: Omit<ConsoleMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev.slice(-500), // Keep last 500 messages
      {
        ...msg,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendCommand = (command: string, payload?: string) => {
    if (!selectedDevice) {
      toast.error("Select a device first");
      return;
    }
    sendCommandMutation.mutate({ mac: selectedDevice, command, payload });
  };

  const handleCustomCommand = () => {
    if (!customCommand.trim()) return;
    
    const parts = customCommand.trim().split(" ");
    const command = parts[0];
    const payload = parts.slice(1).join(" ") || undefined;
    
    handleSendCommand(command, payload);
    setCustomCommand("");
  };

  const clearConsole = () => {
    setMessages([]);
    addMessage({ type: "info", message: "Console cleared" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "acknowledged":
        return <CheckCircle className="h-3 w-3 text-emerald-400" />;
      case "failed":
      case "expired":
        return <XCircle className="h-3 w-3 text-red-400" />;
      case "sent":
        return <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />;
      default:
        return <Clock className="h-3 w-3 text-white/40" />;
    }
  };

  const getMessageClass = (type: ConsoleMessage["type"]) => {
    switch (type) {
      case "stderr":
        return "text-red-400";
      case "command":
        return "text-cyan-400 font-bold";
      case "response":
        return "text-emerald-400";
      case "info":
        return "text-white/40 italic";
      default:
        return "text-white/80";
    }
  };

  return (
    <Layout title="Remote Console">
      <div className="container mx-auto p-4 md:p-6 h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Device Selector */}
            <Card className="glassmorphism border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-accent" />
                  Select Device
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Choose a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.macAddress}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${device.status === "online" ? "bg-emerald-400" : "bg-red-400"}`} />
                          <span>{device.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDeviceInfo && (
                  <div className="mt-3 p-2 bg-white/5 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-white/40">Status:</span>
                      <Badge variant={selectedDeviceInfo.status === "online" ? "default" : "destructive"} className="text-xs">
                        {selectedDeviceInfo.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Version:</span>
                      <span>{selectedDeviceInfo.currentVersion || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Connection:</span>
                      <span className={isConnected ? "text-emerald-400" : "text-red-400"}>
                        {isConnected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Commands */}
            <Card className="glassmorphism border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Commands</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {QUICK_COMMANDS.map((cmd) => (
                  <Button
                    key={cmd.command}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 border-white/10 hover:bg-white/10"
                    onClick={() => handleSendCommand(cmd.command)}
                    disabled={!selectedDevice || sendCommandMutation.isPending}
                  >
                    <cmd.icon className="h-4 w-4 text-accent" />
                    <span>{cmd.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Command History */}
            <Card className="glassmorphism border-white/10 flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">History</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => refetchHistory()}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-48">
                  <div className="px-4 pb-4 space-y-1">
                    {commandHistory.slice(0, 20).map((cmd) => (
                      <div
                        key={cmd.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded bg-white/5"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {getStatusIcon(cmd.status)}
                          <span className="truncate">{cmd.command}</span>
                        </div>
                        <span className="text-white/30 text-[10px]">
                          {new Date(cmd.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {commandHistory.length === 0 && (
                      <p className="text-white/30 text-xs text-center py-4">No commands yet</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Console */}
          <Card className="lg:col-span-3 glassmorphism border-white/10 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-accent" />
                    Console Output
                  </CardTitle>
                  <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                    {isConnected ? "● Live" : "○ Offline"}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={clearConsole} className="border-white/10">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </CardHeader>

            {/* Console Output */}
            <div 
              ref={consoleRef}
              className="flex-1 bg-black/50 mx-4 rounded-lg p-3 font-mono text-sm overflow-y-auto min-h-0"
            >
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`py-0.5 ${getMessageClass(msg.type)}`}
                  >
                    <span className="text-white/30 text-xs mr-2">
                      [{msg.timestamp.toLocaleTimeString()}]
                    </span>
                    <span className="break-all">{msg.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {messages.length === 0 && (
                <div className="text-white/30 text-center py-8">
                  {selectedDevice 
                    ? "Waiting for output... Send a command to get started." 
                    : "Select a device to start the console session."}
                </div>
              )}
            </div>

            {/* Command Input */}
            <div className="p-4 flex-shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-accent font-mono">$</span>
                  <Input
                    placeholder="Enter command..."
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomCommand()}
                    className="bg-black/30 border-white/10 pl-7 font-mono"
                    disabled={!selectedDevice}
                  />
                </div>
                <Button
                  onClick={handleCustomCommand}
                  disabled={!selectedDevice || !customCommand.trim() || sendCommandMutation.isPending}
                  className="bg-accent hover:bg-accent/80"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-white/30 mt-2">
                Tip: Commands like "reboot", "status", "config_reload" are common. Custom commands depend on your ESP32 firmware.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
