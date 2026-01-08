import { useState, useRef, useEffect } from "react";
import { BellRing, Search, CircleCheck, AlertCircle, CloudDownload, Rocket, RotateCcw, X, Microchip, Package, ScrollText, Trash, PanelLeft, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deviceApi, firmwareApi, logsApi, Device, Firmware, DeviceLog, apiRequest } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    icon: CloudDownload, 
    color: isSuccess ? "text-emerald-500" : isFailed ? "text-rose-500" : "text-amber-500",
    bg: isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-rose-500/10" : "bg-amber-500/10"
  };
  if (action === "check") return { 
    icon: RotateCcw, 
    color: "text-slate-500",
    bg: "bg-slate-500/10"
  };
  if (action === "report" || action === "install") return { 
    icon: isSuccess ? CircleCheck : AlertCircle, 
    color: isSuccess ? "text-emerald-500" : "text-rose-500",
    bg: isSuccess ? "bg-emerald-500/10" : "bg-rose-500/10"
  };
  return { 
    icon: BellRing, 
    color: "text-slate-500",
    bg: "bg-slate-500/10"
  };
};

export function Header({ title, onMenuClick }: HeaderProps) {
  const queryClient = useQueryClient();
  const [clearedTime, setClearedTime] = useState<number>(() => {
    const saved = localStorage.getItem('notificationsClearedTime');
    return saved ? parseInt(saved, 10) : 0;
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsApi.getAll(),
    refetchInterval: 30000,
  });

  const deviceList = devices as Device[];
  const logList = logs as DeviceLog[];

  const recentLogs = logList
    .filter(log => {
      const logTime = new Date(log.createdAt).getTime();
      return logTime > clearedTime;
    })
    .slice(0, 20);
    
  const unreadCount = recentLogs.length;

  const handleClearAll = () => {
    const now = Date.now();
    setClearedTime(now);
    localStorage.setItem('notificationsClearedTime', now.toString());
    toast.success("Notifications cleared");
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
    <header className="flex h-16 items-center gap-4 border-b border-sidebar-border bg-sidebar/20 backdrop-blur-md px-4 md:px-8 sticky top-0 z-[100]">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-black tracking-tight text-white group-hover:text-accent transition-colors truncate max-w-[150px] md:max-w-none">{title}</h1>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">SNB OS</span>
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl ring-1 ring-border/50">
              <BellRing className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] md:w-80 p-0 rounded-2xl border-none shadow-2xl ring-1 ring-border/50 glassmorphism bg-card/20 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="font-black text-xs uppercase tracking-widest text-white">Notifications</h3>
              {unreadCount > 0 && <Badge className="bg-rose-500 text-white border-none text-[9px] px-1.5 py-0">{unreadCount}</Badge>}
            </div>
            <ScrollArea className="h-[300px]">
              {recentLogs.length === 0 ? (
                <div className="p-12 text-center opacity-30">
                  <BellRing className="h-8 w-8 mx-auto mb-2 text-white" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">No Activity</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentLogs.map((log) => {
                    const style = getActionStyle(log.action, log.status);
                    const Icon = style.icon;
                    return (
                      <div key={log.id} className="flex gap-4 px-6 py-4 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className={`p-2 rounded-xl ${style.bg} shrink-0 h-fit backdrop-blur-sm ring-1 ring-white/10`}>
                          <Icon className={`h-4 w-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-tight text-white group-hover:text-accent transition-colors">{formatNotification(log)}</p>
                          <p className="text-[9px] font-black uppercase text-white/40 mt-1">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="border-t border-white/10 p-3 flex gap-2 bg-white/5">
              <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest h-8 text-white/70 hover:text-white hover:bg-white/10" onClick={handleClearAll}>Clear All</Button>
              <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest h-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => queryClient.invalidateQueries({ queryKey: ["logs"] })}>Refresh</Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
