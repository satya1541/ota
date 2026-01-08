import { useState, useCallback, useRef, ReactNode } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 100], [0, 1]);
  const rotate = useTransform(pullProgress, [0, 1], [0, 360]);
  
  const threshold = 80;
  
  const handlePanEnd = useCallback(async (_: any, info: PanInfo) => {
    if (info.offset.y >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    y.set(0);
  }, [onRefresh, isRefreshing, y]);
  
  const handlePan = useCallback((_: any, info: PanInfo) => {
    // Only allow pull if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0 && info.offset.y > 0) {
      // Add resistance
      const resistance = 0.4;
      y.set(Math.min(info.offset.y * resistance, 120));
    }
  }, [y]);

  return (
    <div ref={containerRef} className={className}>
      {/* Pull indicator */}
      <motion.div
        style={{ y, opacity: pullProgress }}
        className="absolute left-1/2 -translate-x-1/2 top-4 z-50 flex items-center justify-center"
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : rotate }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : undefined}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
        >
          <RefreshCw className={`h-5 w-5 text-accent ${isRefreshing ? 'animate-spin' : ''}`} />
        </motion.div>
      </motion.div>
      
      <motion.div
        style={{ y: useTransform(y, [0, 120], [0, 60]) }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
