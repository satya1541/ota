import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { firmwareApi, firmwareDiffApi, Firmware } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GitCompare, 
  ArrowRight, 
  Plus, 
  Minus, 
  RefreshCw,
  FileCode,
  HardDrive,
  TrendingUp,
  TrendingDown,
  Equal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FirmwareDiffViewerProps {
  className?: string;
}

interface DiffResult {
  versionA: string;
  versionB: string;
  sizeDiff: number;
  addedBytes: number;
  removedBytes: number;
  changedRegions: Array<{ offset: number; length: number; type: 'added' | 'removed' | 'changed' }>;
}

/**
 * FirmwareDiffViewer - Compare two firmware versions
 * Shows byte-level differences and statistics
 */
export function FirmwareDiffViewer({ className }: FirmwareDiffViewerProps) {
  const [versionA, setVersionA] = useState<string>("");
  const [versionB, setVersionB] = useState<string>("");

  const { data: firmwares = [] } = useQuery({
    queryKey: ["firmware"],
    queryFn: firmwareApi.getAll,
  });

  const { data: diffResult, isLoading, refetch, isError } = useQuery({
    queryKey: ["firmware-diff", versionA, versionB],
    queryFn: () => firmwareDiffApi.compare(versionA, versionB),
    enabled: !!(versionA && versionB && versionA !== versionB),
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const absBytes = Math.abs(bytes);
    const sign = bytes < 0 ? "-" : "+";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(absBytes) / Math.log(k));
    return `${sign}${parseFloat((absBytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatOffset = (offset: number) => {
    return `0x${offset.toString(16).padStart(8, '0').toUpperCase()}`;
  };

  const canCompare = versionA && versionB && versionA !== versionB;

  return (
    <Card className={`border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-accent" />
          Firmware Diff Viewer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Version Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-2">
              Base Version
            </label>
            <Select value={versionA} onValueChange={setVersionA}>
              <SelectTrigger className="h-12 bg-white/5 border-none ring-1 ring-white/10 rounded-xl">
                <SelectValue placeholder="Select version A" />
              </SelectTrigger>
              <SelectContent>
                {firmwares.map((fw: Firmware) => (
                  <SelectItem key={fw.version} value={fw.version} disabled={fw.version === versionB}>
                    {fw.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowRight className="h-5 w-5 text-white/30 mt-6" />

          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-2">
              Compare To
            </label>
            <Select value={versionB} onValueChange={setVersionB}>
              <SelectTrigger className="h-12 bg-white/5 border-none ring-1 ring-white/10 rounded-xl">
                <SelectValue placeholder="Select version B" />
              </SelectTrigger>
              <SelectContent>
                {firmwares.map((fw: Firmware) => (
                  <SelectItem key={fw.version} value={fw.version} disabled={fw.version === versionA}>
                    {fw.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => refetch()}
            disabled={!canCompare || isLoading}
            className="mt-6 bg-accent hover:bg-accent/80"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {!canCompare ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <GitCompare className="h-16 w-16 mx-auto text-white/10 mb-4" />
              <p className="text-white/40">Select two different versions to compare</p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <RefreshCw className="h-8 w-8 mx-auto text-accent animate-spin mb-4" />
              <p className="text-white/40">Analyzing firmware differences...</p>
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <p className="text-red-400">Failed to compare firmware versions</p>
              <p className="text-xs text-white/40 mt-2">The API endpoint may not be available yet</p>
            </motion.div>
          ) : diffResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`rounded-xl p-4 ring-1 ${
                  diffResult.sizeDiff > 0 
                    ? "bg-amber-500/10 ring-amber-500/20" 
                    : diffResult.sizeDiff < 0 
                    ? "bg-emerald-500/10 ring-emerald-500/20"
                    : "bg-white/5 ring-white/10"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {diffResult.sizeDiff > 0 ? (
                      <TrendingUp className="h-4 w-4 text-amber-400" />
                    ) : diffResult.sizeDiff < 0 ? (
                      <TrendingDown className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Equal className="h-4 w-4 text-white/40" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Size Change</span>
                  </div>
                  <p className={`text-xl font-bold ${
                    diffResult.sizeDiff > 0 ? "text-amber-400" : 
                    diffResult.sizeDiff < 0 ? "text-emerald-400" : "text-white"
                  }`}>
                    {formatBytes(diffResult.sizeDiff)}
                  </p>
                </div>

                <div className="bg-emerald-500/10 rounded-xl p-4 ring-1 ring-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4 text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/60">Added</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatBytes(diffResult.addedBytes).replace('+', '')}
                  </p>
                </div>

                <div className="bg-red-500/10 rounded-xl p-4 ring-1 ring-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Minus className="h-4 w-4 text-red-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-400/60">Removed</span>
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    {formatBytes(diffResult.removedBytes).replace('+', '')}
                  </p>
                </div>
              </div>

              {/* Changed Regions */}
              {diffResult.changedRegions && diffResult.changedRegions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    Changed Regions ({diffResult.changedRegions.length})
                  </h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-4">
                      {diffResult.changedRegions.map((region, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                            region.type === 'added' 
                              ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" 
                              : region.type === 'removed'
                              ? "bg-red-500/10 ring-1 ring-red-500/20"
                              : "bg-amber-500/10 ring-1 ring-amber-500/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {region.type === 'added' && <Plus className="h-3 w-3 text-emerald-400" />}
                            {region.type === 'removed' && <Minus className="h-3 w-3 text-red-400" />}
                            {region.type === 'changed' && <RefreshCw className="h-3 w-3 text-amber-400" />}
                            <span className="font-mono text-white/70">{formatOffset(region.offset)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {region.length} bytes
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Visual diff bar */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Binary Diff Visualization
                </h4>
                <div className="h-8 bg-white/5 rounded-lg overflow-hidden flex">
                  {/* Simulated diff visualization */}
                  {diffResult.changedRegions?.slice(0, 50).map((region, i) => (
                    <div
                      key={i}
                      className={`h-full ${
                        region.type === 'added' ? 'bg-emerald-500/60' :
                        region.type === 'removed' ? 'bg-red-500/60' :
                        'bg-amber-500/60'
                      }`}
                      style={{ 
                        width: `${Math.max(2, (region.length / 1000))}%`,
                        marginLeft: '1px'
                      }}
                    />
                  ))}
                  {(!diffResult.changedRegions || diffResult.changedRegions.length === 0) && (
                    <div className="flex-1 bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">
                      No significant changes detected
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[9px] text-white/30">
                  <span>0x00000000</span>
                  <span>End of file</span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default FirmwareDiffViewer;
