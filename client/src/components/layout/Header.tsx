import { useState, useRef, useEffect } from "react";
import { Bell, Search, Check, AlertCircle, Download, Rocket, RefreshCw, X, Cpu, HardDrive, Activity, Trash2, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deviceApi, firmwareApi, logsApi, Device, Firmware, DeviceLog } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

const getActionStyle = (action: string, status: string) => {
  const isSuccess = status === "success";
  const isFailed = status === "failed";
  
  if (action === "deploy") return { 
    icon: Rocket, 
    color: isSuccess ? "text-emerald-500" : isFailed ? "text-rose-500" : "text-blue-500",
    bg: isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-rose-500/10" : "bg-blue-500/10"
  };
  if (action === "download") return { 
    icon: Download, 
    color: isSuccess ? "text-emerald-500" : isFailed ? "text-rose-500" : "text-amber-500",
    bg: isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-rose-500/10" : "bg-amber-500/10"
  };
  if (action === "check") return { 
    icon: RefreshCw, 
    color: "text-slate-500",
    bg: "bg-slate-500/10"
  };
  if (action === "report" || action === "install") return { 
    icon: isSuccess ? Check : AlertCircle, 
    color: isSuccess ? "text-emerald-500" : "text-rose-500",
    bg: isSuccess ? "bg-emerald-500/10" : "bg-rose-500/10"
  };
  return { 
    icon: Bell, 
    color: "text-slate-500",
    bg: "bg-slate-500/10"
  };
};

export function Header({ title, onMenuClick }: HeaderProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [clearedTime, setClearedTime] = useState<number>(() => {
    const saved = localStorage.getItem('notificationsClearedTime');
    return saved ? parseInt(saved, 10) : 0;
  });
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  const { data: firmwares = [] } = useQuery({
    queryKey: ["firmware"],
    queryFn: firmwareApi.getAll,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsApi.getAll(),
    refetchInterval: 30000,
  });

  const deviceList = devices as Device[];
  const firmwareList = firmwares as Firmware[];
  const logList = logs as DeviceLog[];

  const recentLogs = logList
    .filter(log => {
      const logTime = new Date(log.createdAt).getTime();
      return logTime > clearedTime;
    })
    .slice(0, 20);
    
  const unreadCount = recentLogs.length;

  const handleClearAll = () => {
    // Set cleared time to the timestamp of the most recent log, or now if no logs
    const latestLogTime = logList.length > 0 
      ? new Date(logList[0].createdAt).getTime() 
      : Date.now();
    
    // Add 1ms to ensure we don't show the same log again
    const newClearedTime = latestLogTime + 1;
    
    setClearedTime(newClearedTime);
    localStorage.setItem('notificationsClearedTime', newClearedTime.toString());
  };

  const query = searchQuery.toLowerCase().trim();
  const filteredDevices = query 
    ? deviceList.filter(d => 
        d.macAddress.toLowerCase().includes(query) ||
        d.name?.toLowerCase().includes(query) ||
        d.currentVersion?.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  const filteredFirmwares = query
    ? firmwareList.filter(f =>
        f.version.toLowerCase().includes(query) ||
        f.filename.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  const filteredLogs = query
    ? logList.filter(l =>
        l.macAddress?.toLowerCase().includes(query) ||
        l.action.toLowerCase().includes(query) ||
        l.message?.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  const hasResults = filteredDevices.length > 0 || filteredFirmwares.length > 0 || filteredLogs.length > 0;

  const handleResultClick = (type: string, searchValue: string) => {
    setShowResults(false);
    setSearchQuery("");
    if (type === "device") {
      setLocation(`/devices?search=${encodeURIComponent(searchValue)}`);
    } else if (type === "firmware") {
      setLocation(`/firmware?search=${encodeURIComponent(searchValue)}`);
    } else if (type === "log") {
      setLocation(`/logs?search=${encodeURIComponent(searchValue)}`);
    }
  };

  const formatNotification = (log: DeviceLog) => {
    const deviceRecord = deviceList.find(d => d.macAddress === log.macAddress || d.id === log.deviceId);
    const device = deviceRecord?.name || log.macAddress || `Node ${log.deviceId}`;
    
    if (log.action === "deploy") return log.status === "success" ? `Update staged: ${device}` : `Deploy failed: ${device}`;
    if (log.action === "download") return `${device} fetched binary`;
    if (log.action === "install") return `${device} patched to ${log.toVersion}`;
    return log.message || `${log.action} - ${device}`;
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card/50 backdrop-blur-md px-4 md:px-8 sticky top-0 z-[100]">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-black tracking-tight group-hover:text-accent transition-colors truncate max-w-[150px] md:max-w-none">{title}</h1>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Nexus IoT OS</span>
        </div>
      </div>
      <div className="flex-1" />
      
      <div className="relative w-72 hidden md:block" ref={searchRef}>
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Global search..." 
          className="pl-10 h-10 border-none bg-background shadow-inner ring-1 ring-border/50 rounded-xl focus-visible:ring-accent transition-all" 
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        <AnimatePresence>
          {showResults && query && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-3 bg-card border-none rounded-2xl shadow-2xl z-[200] overflow-hidden ring-1 ring-border/50"
            >
              {!hasResults ? (
                <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">No matches found</div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  {filteredDevices.map((device) => (
                    <button key={device.id} className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-4 border-b border-border/30 last:border-0" onClick={() => handleResultClick("device", device.name || device.macAddress)}>
                      <div className={`w-2 h-2 rounded-full ${device.status === "online" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{device.name || device.macAddress}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">{device.macAddress}</p>
                      </div>
                    </button>
                  ))}
                  {filteredFirmwares.map((fw) => (
                    <button key={fw.id} className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0" onClick={() => handleResultClick("firmware", fw.version)}>
                      <p className="text-sm font-black">v{fw.version}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">{fw.filename}</p>
                    </button>
                  ))}
                </ScrollArea>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl ring-1 ring-border/50">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] md:w-80 p-0 rounded-2xl border-none shadow-2xl ring-1 ring-border/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="font-black text-xs uppercase tracking-widest">Notifications</h3>
              {unreadCount > 0 && <Badge className="bg-rose-500 text-white border-none text-[9px] px-1.5 py-0">{unreadCount}</Badge>}
            </div>
            <ScrollArea className="h-[300px]">
              {recentLogs.length === 0 ? (
                <div className="p-12 text-center opacity-30">
                  <Bell className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Activity</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentLogs.map((log) => {
                    const style = getActionStyle(log.action, log.status);
                    const Icon = style.icon;
                    return (
                      <div key={log.id} className="flex gap-4 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleResultClick("log", log.macAddress || String(log.deviceId))}>
                        <div className={`p-2 rounded-xl ${style.bg} shrink-0 h-fit`}>
                          <Icon className={`h-4 w-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-tight">{formatNotification(log)}</p>
                          <p className="text-[9px] font-black uppercase text-muted-foreground opacity-50 mt-1">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="border-t border-border/30 p-3 flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest h-8" onClick={handleClearAll}>Clear All</Button>
              <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest h-8" onClick={() => queryClient.invalidateQueries({ queryKey: ["logs"] })}>Refresh</Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
