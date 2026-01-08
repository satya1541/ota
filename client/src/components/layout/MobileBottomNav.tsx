import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  LayoutGrid, 
  Microchip, 
  Package, 
  ScrollText,
  TrendingUp,
  Menu
} from "lucide-react";

interface MobileBottomNavProps {
  onMenuClick?: () => void;
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: LayoutGrid },
    { href: "/devices", label: "Devices", icon: Microchip },
    { href: "/firmware", label: "Firmware", icon: Package },
    { href: "/logs", label: "Logs", icon: ScrollText },
    { href: "/overview", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-t border-white/10" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/overview" && ["/overview", "/fleet-map", "/health", "/staged-rollouts", "/firmware-diff", "/serial-monitor", "/audit-trail"].includes(location));
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[56px] py-2 px-3 rounded-xl transition-all",
                  isActive 
                    ? "bg-accent/20 text-accent" 
                    : "text-white/50"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 mb-1 transition-all",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-accent" : "text-white/50"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute bottom-1 w-1 h-1 bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
        
        {/* More menu button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center min-w-[56px] py-2 px-3 rounded-xl text-white/50"
        >
          <Menu className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-semibold">More</span>
        </motion.button>
      </div>
    </nav>
  );
}
