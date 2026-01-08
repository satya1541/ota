import { formatDistanceToNow } from "date-fns";
import { DeviceLog } from "@/lib/api";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  Upload, 
  RefreshCw,
  RotateCcw,
  Rocket,
  Wifi
} from "lucide-react";
import { motion } from "framer-motion";

interface DeviceTimelineProps {
  logs: DeviceLog[];
  maxItems?: number;
}

const actionConfig: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string;
  successColor: string;
  failedColor: string;
}> = {
  check: { 
    icon: RefreshCw, 
    label: "Check for update",
    successColor: "text-blue-400",
    failedColor: "text-rose-400"
  },
  deploy: { 
    icon: Rocket, 
    label: "Deployment initiated",
    successColor: "text-emerald-400",
    failedColor: "text-rose-400"
  },
  download: { 
    icon: Download, 
    label: "Firmware download",
    successColor: "text-amber-400",
    failedColor: "text-rose-400"
  },
  report: { 
    icon: CheckCircle, 
    label: "Update reported",
    successColor: "text-emerald-400",
    failedColor: "text-rose-400"
  },
  register: { 
    icon: Wifi, 
    label: "Device registered",
    successColor: "text-indigo-400",
    failedColor: "text-rose-400"
  },
  rollback: { 
    icon: RotateCcw, 
    label: "Rollback initiated",
    successColor: "text-orange-400",
    failedColor: "text-rose-400"
  },
  reset: { 
    icon: RefreshCw, 
    label: "OTA state reset",
    successColor: "text-slate-400",
    failedColor: "text-rose-400"
  },
};

/**
 * DeviceTimeline - Shows a vertical timeline of device activity.
 * Displays recent OTA events with icons, status, and timestamps.
 */
export function DeviceTimeline({ logs, maxItems = 10 }: DeviceTimelineProps) {
  const displayLogs = logs.slice(0, maxItems);

  if (displayLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
        <Clock className="h-10 w-10 mb-3 text-white/20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
          No activity recorded
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
      
      <div className="space-y-1">
        {displayLogs.map((log, index) => {
          const config = actionConfig[log.action] || {
            icon: Clock,
            label: log.action,
            successColor: "text-slate-400",
            failedColor: "text-rose-400"
          };
          
          const Icon = config.icon;
          const isSuccess = log.status === "success" || log.status === "updated";
          const isFailed = log.status === "failed";
          const color = isFailed ? config.failedColor : config.successColor;
          const bgColor = isFailed 
            ? "bg-rose-500/10 ring-rose-500/20" 
            : isSuccess 
              ? "bg-emerald-500/10 ring-emerald-500/20" 
              : "bg-white/5 ring-white/10";

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex gap-4 py-3 group"
            >
              {/* Icon */}
              <div className={`relative z-10 p-2 rounded-xl ${bgColor} ring-1 shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-accent transition-colors">
                      {config.label}
                    </p>
                    {log.message && (
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                        {log.message}
                      </p>
                    )}
                    {(log.fromVersion || log.toVersion) && (
                      <div className="flex items-center gap-2 mt-1">
                        {log.fromVersion && (
                          <span className="text-[10px] font-mono text-white/40">
                            {log.fromVersion}
                          </span>
                        )}
                        {log.fromVersion && log.toVersion && (
                          <span className="text-white/20">→</span>
                        )}
                        {log.toVersion && (
                          <span className="text-[10px] font-mono text-accent">
                            {log.toVersion}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Status badge */}
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    isFailed 
                      ? "bg-rose-500/20 text-rose-400" 
                      : isSuccess 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-white/10 text-white/60"
                  }`}>
                    {log.status}
                  </div>
                </div>
                
                {/* Timestamp */}
                <p className="text-[10px] font-medium text-white/30 mt-1.5">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default DeviceTimeline;
