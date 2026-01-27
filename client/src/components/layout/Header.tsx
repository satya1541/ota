import { useState, useMemo } from "react";
import { BellRing, CircleCheck, AlertCircle, CloudDownload, Rocket, RotateCcw, Microchip, Package, ScrollText, Languages, Check, LogOut, Sun, Moon, LayoutGrid, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import logoGif from "@assets/output-onlinegiftools_(1)_1768286854333.gif";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deviceApi, logsApi, Device, DeviceLog } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";


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
    bg: isSuccess ? "bg-emerald-500/10" : isFailed ? "bg-rose-500/10" : "bg-rose-500/10"
  };
  return {
    icon: BellRing,
    color: "text-slate-500",
    bg: "bg-slate-500/10"
  };
};

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-xl ring-1 ring-border/50 text-foreground"
      title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutGrid },
  { href: "/devices", labelKey: "nav.devices", icon: Microchip },
  { href: "/firmware", labelKey: "nav.firmware", icon: Package },
  { href: "/logs", labelKey: "nav.logs", icon: ScrollText },
  { href: "/fleet-map", labelKey: "nav.fleet_map", icon: Globe2 },
];

export function Header() {
  const [location] = useLocation();
  const { i18n, t } = useTranslation();
  const { logout } = useAuth();
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

  const recentLogs = useMemo(() => {
    return (logs as DeviceLog[])
      .filter(log => {
        const logTime = new Date(log.createdAt).getTime();
        return logTime > clearedTime;
      })
      .slice(0, 20);
  }, [logs, clearedTime]);

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
    <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 px-4 md:px-8 sticky top-0 z-[100] shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-3 group transition-all">
          <img src={logoGif} alt="Universal OTA" className="h-10 w-10 object-contain flex-shrink-0 group-hover:rotate-12 transition-transform duration-500" />
          <div className="flex flex-col hidden sm:flex">
            <h1 className="text-sm md:text-base font-black tracking-tighter text-foreground uppercase leading-none">Universal OTA</h1>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-0.5">SNB OS</span>
          </div>
        </Link>
      </div>
      <div className="flex-1" />
      <nav className="hidden lg:flex items-center gap-1 mx-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all",
                  isActive
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive && "text-accent")} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{t(item.labelKey)}</span>
                {isActive && (
                  <motion.div
                    layoutId="headerNavIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl ring-1 ring-border/50">
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl bg-card border border-border/50 text-foreground ring-1 ring-border/50 shadow-2xl">
            <DropdownMenuItem onClick={() => i18n.changeLanguage('en')} className="flex items-center justify-between">
              <span>English</span>
              {i18n.language === 'en' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => i18n.changeLanguage('hi')} className="flex items-center justify-between">
              <span>हिन्दी</span>
              {i18n.language === 'hi' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => i18n.changeLanguage('or')} className="flex items-center justify-between">
              <span>ଓଡ଼ିଆ</span>
              {i18n.language === 'or' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl ring-1 ring-border/50 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
          onClick={() => {
            logout();
            toast.success("Logged out successfully");
          }}
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl ring-1 ring-border/50">
              <BellRing className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] md:w-80 p-0 rounded-2xl border border-border/50 shadow-2xl ring-1 ring-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/10">
              <h3 className="font-black text-xs uppercase tracking-widest text-foreground">Notifications</h3>
              {unreadCount > 0 && <Badge className="bg-rose-500 text-white border-none text-[9px] px-1.5 py-0">{unreadCount}</Badge>}
            </div>
            <ScrollArea className="h-[300px]">
              {recentLogs.length === 0 ? (
                <div className="p-12 text-center opacity-30">
                  <BellRing className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground">No Activity</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {recentLogs.map((log) => {
                    const style = getActionStyle(log.action, log.status);
                    const Icon = style.icon;
                    return (
                      <div key={log.id} className="flex gap-4 px-6 py-4 hover:bg-foreground/5 transition-colors cursor-pointer group">
                        <div className={`p-2 rounded-xl ${style.bg} shrink-0 h-fit ring-1 ring-border/10`}>
                          <Icon className={`h-4 w-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-tight text-foreground group-hover:text-primary transition-colors">{formatNotification(log)}</p>
                          <p className="text-[9px] font-black uppercase text-foreground/40 mt-1">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="border-t border-border/10 p-3 flex gap-2 bg-foreground/5">
              <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest h-8 text-foreground/70 hover:text-foreground hover:bg-foreground/10" onClick={handleClearAll}>Clear All</Button>
              <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest h-8 text-foreground/70 hover:text-foreground hover:bg-foreground/10" onClick={() => queryClient.invalidateQueries({ queryKey: ["logs"] })}>Refresh</Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
