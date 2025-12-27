import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Cpu, 
  HardDrive, 
  Radio, 
  Settings, 
  Activity,
  Box,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onClear?: () => void;
}

export function Sidebar({ onClear }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/devices", label: "Devices", icon: Cpu },
    { href: "/firmware", label: "Firmware", icon: HardDrive },
    { href: "/deployments", label: "Deployments", icon: Radio },
  ];

  const secondaryItems = [
    { href: "/logs", label: "System Logs", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold group">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="p-1.5 rounded-xl bg-sidebar-primary/10 group-hover:bg-sidebar-primary/20 transition-colors"
          >
            <Box className="h-6 w-6 text-sidebar-primary" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-lg tracking-tight font-black leading-none">Universal OTA</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 mt-1">SNB OS</span>
          </div>
        </Link>
        {onClear && (
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto py-8">
        <div className="px-8 text-[10px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/30 mb-4">
          OTA Management
        </div>
        <nav className="grid gap-1 px-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 6 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all relative overflow-hidden",
                  location === item.href 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-white/10" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 transition-all duration-300",
                  location === item.href ? "text-sidebar-primary scale-110" : "text-sidebar-foreground/40 group-hover:text-sidebar-primary group-hover:scale-110"
                )} />
                <span className="relative z-10">{item.label}</span>
                {location === item.href && (
                  <motion.div 
                    layoutId="sidebarActiveIndicator"
                    className="absolute left-0 w-1 h-5 bg-sidebar-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          ))}
        </nav>
        
        <div className="mt-10 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/30 mb-4">
          Infrastructure
        </div>
        <nav className="grid gap-1 px-4">
          {secondaryItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 6 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all relative overflow-hidden",
                  location === item.href 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-white/10" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 transition-all duration-300",
                  location === item.href ? "text-sidebar-primary scale-110" : "text-sidebar-foreground/40 group-hover:text-sidebar-primary group-hover:scale-110"
                )} />
                <span className="relative z-10">{item.label}</span>
                {location === item.href && (
                  <motion.div 
                    layoutId="sidebarActiveIndicatorSecondary"
                    className="absolute left-0 w-1 h-5 bg-sidebar-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          ))}
        </nav>
      </div>
      
    </div>
  );
}
