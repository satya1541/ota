import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutGrid, 
  Microchip, 
  Package, 
  ScrollText,
  Boxes,
  X,
  TrendingUp,
  Globe2,
  Layers,
  GitBranch,
  TerminalSquare,
  ShieldCheck,
  Webhook,
  Settings2,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  onClear?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

export function Sidebar({ onClear }: SidebarProps) {
  const [location] = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Sidebar is always expanded
  const isExpanded = true;

  const allNavItems: NavItem[] = [
    // Core
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, section: "core" },
    { href: "/devices", label: "Devices", icon: Microchip, section: "core" },
    { href: "/firmware", label: "Firmware", icon: Package, section: "core" },
    { href: "/logs", label: "System Logs", icon: ScrollText, section: "core" },
    { href: "/audit-trail", label: "Audit Trail", icon: ShieldCheck, section: "core" },
    // Analytics
    { href: "/overview", label: "Overview", icon: TrendingUp, section: "analytics" },
    { href: "/fleet-map", label: "Fleet Map", icon: Globe2, section: "analytics" },
    { href: "/staged-rollouts", label: "Staged Rollouts", icon: Layers, section: "analytics" },
    { href: "/firmware-diff", label: "Firmware Diff", icon: GitBranch, section: "analytics" },
    { href: "/serial-monitor", label: "Serial Monitor", icon: TerminalSquare, section: "analytics" },
    // Advanced
    { href: "/webhooks", label: "Webhooks", icon: Webhook, section: "advanced" },
    { href: "/config-management", label: "Config", icon: Settings2, section: "advanced" },
    { href: "/remote-console", label: "Console", icon: Terminal, section: "advanced" },
  ];

  const sections = [
    { key: "core", items: allNavItems.filter(i => i.section === "core") },
    { key: "analytics", items: allNavItems.filter(i => i.section === "analytics") },
    { key: "advanced", items: allNavItems.filter(i => i.section === "advanced") },
  ];

  // Mobile version - always expanded
  if (onClear) {
    return (
      <div className="flex h-screen w-64 flex-col border-r border-white/10 bg-black/20 backdrop-blur-2xl text-white glassmorphism no-default-hover-elevate">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold group">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="p-1.5 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors"
            >
              <Boxes className="h-6 w-6 text-blue-400" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-lg tracking-tight font-black leading-none">Universal OTA</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">SNB OS</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="px-3 space-y-1">
            {sections.map((section) => (
              <div key={section.key} className="space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={onClear}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        location === item.href 
                          ? "bg-white/15 text-white" 
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4",
                        location === item.href ? "text-blue-400" : "text-white/40"
                      )} />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  // Desktop version - always expanded
  return (
    <motion.div 
      className="relative flex h-screen flex-col border-r border-white/10 bg-black/20 backdrop-blur-2xl text-white overflow-visible glassmorphism no-default-hover-elevate"
      initial={false}
      animate={{ 
        width: 240,
      }}
      transition={{ 
        type: "spring",
        stiffness: 250,
        damping: 32,
        mass: 0.5
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-3">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold group w-full">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-colors flex-shrink-0"
          >
            <Boxes className="h-5 w-5 text-blue-400" />
          </motion.div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                className="flex flex-col overflow-hidden"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <span className="text-base tracking-tight font-black leading-none whitespace-nowrap">Universal OTA</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-0.5 whitespace-nowrap">SNB OS</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className="px-2 space-y-1">
          {sections.map((section, sectionIndex) => (
            <div key={section.key} className="space-y-1">
              {/* Section Divider (collapsed state) */}
              {!isExpanded && sectionIndex > 0 && (
                <div className="mx-3 my-1 h-px bg-white/10" />
              )}

              {/* Nav Items */}
              {section.items.map((item, itemIndex) => {
                const isActive = location === item.href;
                const isHovered = hoveredItem === item.href;

                return (
                  <div 
                    key={item.href} 
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link href={item.href}>
                      <motion.div
                        className={cn(
                          "relative flex items-center rounded-xl transition-all cursor-pointer overflow-hidden",
                          isExpanded ? "px-3 py-2.5 gap-3" : "p-3 justify-center",
                          isActive 
                            ? "bg-white/20 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-white/20" 
                            : "text-white/50 hover:text-white hover:bg-white/10"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div 
                            layoutId="activeIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full"
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          />
                        )}

                        {/* Icon */}
                        <motion.div
                          animate={{ 
                            scale: isHovered && !isExpanded ? 1.15 : 1,
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 transition-colors duration-200 flex-shrink-0",
                            isActive ? "text-blue-400" : "text-white/40 group-hover:text-white"
                          )} />
                        </motion.div>

                        {/* Label */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.span 
                              className="text-sm font-medium whitespace-nowrap overflow-hidden"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ 
                                duration: 0.2,
                                ease: "easeOut"
                              }}
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>

                    {/* Tooltip popup (collapsed state only) */}
                    <AnimatePresence>
                      {!isExpanded && isHovered && (
                        <motion.div
                          className="absolute left-full top-1/2 ml-3 z-50 pointer-events-none"
                          initial={{ opacity: 0, x: -8, y: "-50%", scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, y: "-50%", scale: 1 }}
                          exit={{ opacity: 0, x: -8, y: "-50%", scale: 0.9 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 25,
                            mass: 0.5
                          }}
                        >
                          <div className="relative">
                            {/* Arrow */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-white/20" />
                            {/* Tooltip content */}
                            <div className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl border border-white/10",
                              "bg-gray-900/95 backdrop-blur-xl",
                              isActive ? "text-blue-400" : "text-white"
                            )}>
                              {item.label}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom glow effect when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
