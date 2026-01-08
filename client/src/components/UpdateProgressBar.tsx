import { Progress } from "@/components/ui/progress";
import { UpdateProgress } from "@/hooks/useDeviceUpdates";
import { motion, AnimatePresence } from "framer-motion";
import { CloudDownload } from "lucide-react";

interface UpdateProgressBarProps {
  progress: UpdateProgress | undefined;
  className?: string;
}

/**
 * Displays a real-time progress bar for OTA updates.
 * Shows download progress with bytes transferred when available.
 */
export function UpdateProgressBar({ progress, className = "" }: UpdateProgressBarProps) {
  if (!progress) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`space-y-1 ${className}`}
      >
        <div className="flex items-center gap-2">
          <CloudDownload className="h-3 w-3 text-blue-400 animate-pulse" />
          <Progress 
            value={progress.progress} 
            className="h-1.5 flex-1 bg-white/10"
          />
          <span className="text-[10px] font-bold text-blue-400 min-w-[3rem] text-right">
            {progress.progress.toFixed(0)}%
          </span>
        </div>
        {progress.bytesReceived !== undefined && progress.totalBytes !== undefined && (
          <p className="text-[9px] text-white/40 text-right">
            {formatBytes(progress.bytesReceived)} / {formatBytes(progress.totalBytes)}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default UpdateProgressBar;
