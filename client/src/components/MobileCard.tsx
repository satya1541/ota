import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  status?: {
    label: string;
    color: "success" | "warning" | "error" | "muted";
  };
  actions?: Array<{
    label: string;
    onClick: () => void;
    destructive?: boolean;
  }>;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

const statusColors = {
  success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  error: "bg-red-500/20 text-red-400 border-red-500/30",
  muted: "bg-white/10 text-white/60 border-white/20",
};

export function MobileCard({ 
  title, 
  subtitle, 
  icon, 
  status, 
  actions, 
  onClick, 
  className,
  children 
}: MobileCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl",
        "bg-white/5 border border-white/10 backdrop-blur-md",
        "active:bg-white/10 transition-colors",
        // Minimum touch target size (44px)
        "min-h-[56px]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          {icon}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white truncate text-sm">{title}</h3>
          {status && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
              statusColors[status.color]
            )}>
              {status.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-white/50 mt-0.5 truncate">{subtitle}</p>
        )}
        {children}
      </div>
      
      {/* Actions or Chevron */}
      {actions && actions.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0">
              <MoreVertical className="h-5 w-5 text-white/50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            {actions.map((action, i) => (
              <DropdownMenuItem
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={cn(
                  "text-sm py-3",
                  action.destructive && "text-red-500 focus:text-red-500"
                )}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : onClick ? (
        <ChevronRight className="h-5 w-5 text-white/30 flex-shrink-0" />
      ) : null}
    </motion.div>
  );
}

// Swipeable card with actions
interface SwipeableCardProps extends MobileCardProps {
  leftAction?: {
    label: string;
    color: string;
    icon: ReactNode;
    onClick: () => void;
  };
  rightAction?: {
    label: string;
    color: string;
    icon: ReactNode;
    onClick: () => void;
  };
}

export function SwipeableCard({
  leftAction,
  rightAction,
  ...props
}: SwipeableCardProps) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100 && leftAction) {
          leftAction.onClick();
        } else if (info.offset.x < -100 && rightAction) {
          rightAction.onClick();
        }
      }}
    >
      {/* Background actions */}
      <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-emerald-600 rounded-l-xl">
        {leftAction?.icon}
      </div>
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-600 rounded-r-xl">
        {rightAction?.icon}
      </div>
      
      {/* Card */}
      <motion.div className="relative bg-black">
        <MobileCard {...props} />
      </motion.div>
    </motion.div>
  );
}
