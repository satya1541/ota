import { useState, useEffect, useRef, useCallback } from "react";
import { Device } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Terminal, 
  Play, 
  Square, 
  Trash2, 
  Download,
  Search,
  Filter,
  Wifi,
  WifiOff,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source: string;
}

interface LiveSerialMonitorProps {
  devices: Device[];
  className?: string;
}

/**
 * LiveSerialMonitor - Real-time device log streaming via WebSocket
 * Shows live output from ESP32 devices with filtering and search
 */
export function LiveSerialMonitor({ devices, className }: LiveSerialMonitorProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Connect to WebSocket for log streaming
  const connect = useCallback(() => {
    if (!selectedDevice) {
      toast.error("Please select a device first");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsStreaming(true);
        toast.success("Connected to device stream");
        
        // Subscribe to device logs
        ws.send(JSON.stringify({
          type: "subscribe-logs",
          deviceId: selectedDevice,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "device-log" || data.type === "serial") {
            const entry: LogEntry = {
              id: `log-${logIdCounter.current++}`,
              timestamp: new Date(data.timestamp || Date.now()),
              level: data.level || "info",
              message: data.message || data.data || JSON.stringify(data),
              source: data.source || data.mac || selectedDevice,
            };
            setLogs(prev => [...prev.slice(-500), entry]); // Keep last 500 logs
          }
          
          // Handle device updates as logs too
          if (data.type === "device-update" && data.device?.macAddress === selectedDevice) {
            const entry: LogEntry = {
              id: `log-${logIdCounter.current++}`,
              timestamp: new Date(),
              level: "info",
              message: `Device status: ${data.device.otaStatus} (${data.device.currentVersion})`,
              source: "system",
            };
            setLogs(prev => [...prev.slice(-500), entry]);
          }
        } catch (err) {
          // Raw message
          const entry: LogEntry = {
            id: `log-${logIdCounter.current++}`,
            timestamp: new Date(),
            level: "debug",
            message: event.data,
            source: "raw",
          };
          setLogs(prev => [...prev.slice(-500), entry]);
        }
      };

      ws.onerror = () => {
        toast.error("WebSocket connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsStreaming(false);
      };
    } catch (err) {
      toast.error("Failed to connect");
    }
  }, [selectedDevice]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
    logIdCounter.current = 0;
  };

  const exportLogs = () => {
    const content = logs
      .map(log => `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join("\n");
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `device-logs-${selectedDevice}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported");
  };

  const copyLogs = async () => {
    const content = logs
      .map(log => `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join("\n");
    
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Logs copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter !== "all" && log.level !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error": return "text-red-400";
      case "warn": return "text-amber-400";
      case "debug": return "text-blue-400";
      default: return "text-emerald-400";
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case "error": return "bg-red-500/20";
      case "warn": return "bg-amber-500/20";
      case "debug": return "bg-blue-500/20";
      default: return "bg-emerald-500/20";
    }
  };

  // Simulate some logs for demo (remove in production)
  useEffect(() => {
    if (isStreaming && selectedDevice) {
      const demoMessages = [
        { level: "info", message: "OTA check initiated..." },
        { level: "debug", message: "Connecting to update server" },
        { level: "info", message: "Current version: v1.0.0" },
        { level: "info", message: "Free heap: 45.2 KB" },
        { level: "debug", message: "WiFi RSSI: -52 dBm" },
        { level: "info", message: "System uptime: 2h 34m" },
      ];

      const interval = setInterval(() => {
        const msg = demoMessages[Math.floor(Math.random() * demoMessages.length)];
        const entry: LogEntry = {
          id: `log-${logIdCounter.current++}`,
          timestamp: new Date(),
          level: msg.level as any,
          message: msg.message,
          source: selectedDevice,
        };
        setLogs(prev => [...prev.slice(-500), entry]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isStreaming, selectedDevice]);

  return (
    <Card className={`border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Terminal className="h-5 w-5 text-accent" />
            Live Serial Monitor
            {isConnected && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[180px] h-8 bg-white/5 border-none ring-1 ring-white/10 text-xs">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map(device => (
                  <SelectItem key={device.id} value={device.macAddress}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isStreaming ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={connect}
                disabled={!selectedDevice}
                className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="pl-9 h-9 bg-white/5 border-none ring-1 ring-white/10 text-sm"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[120px] h-9 bg-white/5 border-none ring-1 ring-white/10 text-xs">
              <Filter className="h-3 w-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={clearLogs}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={copyLogs}>
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={exportLogs}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Log Output */}
        <div 
          ref={scrollRef}
          className="h-[350px] bg-black/40 rounded-xl ring-1 ring-white/10 overflow-auto font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
              <Terminal className="h-12 w-12 mb-3" />
              <p>No logs yet</p>
              <p className="text-[10px] mt-1">
                {isStreaming ? "Waiting for device output..." : "Start streaming to see logs"}
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              <AnimatePresence initial={false}>
                {filteredLogs.map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 hover:bg-white/5 px-2 py-1 rounded"
                  >
                    <span className="text-white/30 flex-shrink-0">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${getLevelBg(log.level)} ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="text-white/80 break-all">{log.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <div className="flex items-center gap-4">
            <span>{filteredLogs.length} / {logs.length} logs</span>
            {selectedDevice && (
              <span className="font-mono">{selectedDevice}</span>
            )}
          </div>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 ${autoScroll ? "text-accent" : "text-white/40"}`}
          >
            Auto-scroll: {autoScroll ? "ON" : "OFF"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveSerialMonitor;
