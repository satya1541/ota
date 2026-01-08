import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { stagedRolloutApi, firmwareApi, StagedRollout, Firmware } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Rocket, 
  Play, 
  Pause, 
  FastForward, 
  X, 
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface StagedRolloutManagerProps {
  className?: string;
}

/**
 * StagedRolloutManager - Manage phased firmware deployments
 * Supports auto-expansion, failure thresholds, and manual control
 */
export function StagedRolloutManager({ className }: StagedRolloutManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [autoExpand, setAutoExpand] = useState(true);
  const [expandAfterMinutes, setExpandAfterMinutes] = useState(30);
  const [failureThreshold, setFailureThreshold] = useState(10);

  const queryClient = useQueryClient();

  const { data: rollouts = [], isLoading } = useQuery({
    queryKey: ["staged-rollouts"],
    queryFn: stagedRolloutApi.getAll,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: firmwares = [] } = useQuery({
    queryKey: ["firmware"],
    queryFn: firmwareApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: stagedRolloutApi.create,
    onSuccess: () => {
      toast.success("Staged rollout created");
      queryClient.invalidateQueries({ queryKey: ["staged-rollouts"] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const advanceMutation = useMutation({
    mutationFn: stagedRolloutApi.advance,
    onSuccess: () => {
      toast.success("Rollout advanced to next stage");
      queryClient.invalidateQueries({ queryKey: ["staged-rollouts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pauseMutation = useMutation({
    mutationFn: stagedRolloutApi.pause,
    onSuccess: () => {
      toast.success("Rollout paused");
      queryClient.invalidateQueries({ queryKey: ["staged-rollouts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: stagedRolloutApi.resume,
    onSuccess: () => {
      toast.success("Rollout resumed");
      queryClient.invalidateQueries({ queryKey: ["staged-rollouts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: stagedRolloutApi.cancel,
    onSuccess: () => {
      toast.success("Rollout cancelled");
      queryClient.invalidateQueries({ queryKey: ["staged-rollouts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setSelectedVersion("");
    setAutoExpand(true);
    setExpandAfterMinutes(30);
    setFailureThreshold(10);
  };

  const handleCreate = () => {
    if (!selectedVersion) {
      toast.error("Please select a firmware version");
      return;
    }
    createMutation.mutate({
      version: selectedVersion,
      autoExpand,
      expandAfterMinutes,
      failureThreshold,
    });
  };

  const getStagePercentages = (rollout: StagedRollout): number[] => {
    try {
      return JSON.parse(rollout.stagePercentages);
    } catch {
      return [5, 25, 50, 100];
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case "paused":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Paused</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const activeRollouts = rollouts.filter(r => r.status === "active" || r.status === "paused");
  const completedRollouts = rollouts.filter(r => r.status === "completed" || r.status === "failed");

  return (
    <div className={className}>
      <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Rocket className="h-5 w-5 text-accent" />
                Staged Rollouts
              </CardTitle>
              <CardDescription className="text-xs text-white/40 mt-1">
                Deploy firmware progressively to minimize risk
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-accent hover:bg-accent/80"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Rollout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-white/40">Loading rollouts...</div>
          ) : activeRollouts.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Rocket className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No active rollouts</p>
              <p className="text-xs mt-1">Create a staged rollout to deploy firmware progressively</p>
            </div>
          ) : (
            <AnimatePresence>
              {activeRollouts.map(rollout => {
                const stages = getStagePercentages(rollout);
                const currentPercent = stages[rollout.currentStage - 1] || 0;
                const progress = rollout.totalDevices > 0 
                  ? (rollout.updatedDevices / rollout.totalDevices) * 100 
                  : 0;
                const failureRate = rollout.totalDevices > 0
                  ? (rollout.failedDevices / rollout.totalDevices) * 100
                  : 0;

                return (
                  <motion.div
                    key={rollout.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white">{rollout.version}</h4>
                          {getStatusBadge(rollout.status)}
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          Stage {rollout.currentStage} of {stages.length} ({currentPercent}% of fleet)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rollout.status === "active" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => pauseMutation.mutate(rollout.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => advanceMutation.mutate(rollout.id)}
                              disabled={rollout.currentStage >= stages.length}
                            >
                              <FastForward className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => resumeMutation.mutate(rollout.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => cancelMutation.mutate(rollout.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stage indicators */}
                    <div className="flex gap-2 mb-4">
                      {stages.map((percent, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-2 rounded-full ${
                            i + 1 < rollout.currentStage
                              ? "bg-emerald-500"
                              : i + 1 === rollout.currentStage
                              ? "bg-accent"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-white/40">Total</p>
                        <p className="font-bold text-white">{rollout.totalDevices}</p>
                      </div>
                      <div className="bg-emerald-500/10 rounded-lg p-2">
                        <p className="text-emerald-400/70">Updated</p>
                        <p className="font-bold text-emerald-400">{rollout.updatedDevices}</p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-2">
                        <p className="text-red-400/70">Failed</p>
                        <p className="font-bold text-red-400">{rollout.failedDevices}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-white/40">Progress</p>
                        <p className="font-bold text-white">{Math.round(progress)}%</p>
                      </div>
                    </div>

                    {/* Failure threshold warning */}
                    {failureRate >= rollout.failureThreshold && (
                      <div className="mt-3 bg-red-500/20 rounded-lg p-3 flex items-center gap-2 text-xs text-red-300">
                        <AlertTriangle className="h-4 w-4" />
                        Failure rate ({failureRate.toFixed(1)}%) exceeded threshold ({rollout.failureThreshold}%)
                      </div>
                    )}

                    {/* Auto-expand info */}
                    {rollout.autoExpand === 1 && rollout.status === "active" && (
                      <div className="mt-3 text-xs text-white/40 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Auto-expands {rollout.expandAfterMinutes} minutes after stage success
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Completed rollouts summary */}
          {completedRollouts.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h5 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
                Recent Completed
              </h5>
              <div className="space-y-2">
                {completedRollouts.slice(0, 3).map(rollout => (
                  <div
                    key={rollout.id}
                    className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {rollout.status === "completed" ? (
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-red-400" />
                      )}
                      <span className="font-mono text-white">{rollout.version}</span>
                    </div>
                    <span className="text-white/40">
                      {format(new Date(rollout.updatedAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create Staged Rollout</DialogTitle>
            <DialogDescription className="text-white/40">
              Deploy firmware progressively to minimize risk
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Firmware Version
              </Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="h-12 bg-white/5 border-none ring-1 ring-white/10 rounded-xl">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {firmwares.map((fw: Firmware) => (
                    <SelectItem key={fw.version} value={fw.version}>
                      {fw.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-Expand Stages</Label>
                <p className="text-xs text-white/40">Automatically proceed to next stage</p>
              </div>
              <Switch checked={autoExpand} onCheckedChange={setAutoExpand} />
            </div>

            {autoExpand && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Expand After (minutes)
                </Label>
                <Input
                  type="number"
                  value={expandAfterMinutes}
                  onChange={e => setExpandAfterMinutes(parseInt(e.target.value) || 30)}
                  className="h-12 bg-white/5 border-none ring-1 ring-white/10 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Failure Threshold (%)
              </Label>
              <Input
                type="number"
                value={failureThreshold}
                onChange={e => setFailureThreshold(parseInt(e.target.value) || 10)}
                className="h-12 bg-white/5 border-none ring-1 ring-white/10 rounded-xl"
              />
              <p className="text-xs text-white/40">Pause rollout if failure rate exceeds this</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
              <p className="text-xs font-bold text-white/60 mb-2">Deployment Stages:</p>
              <div className="flex items-center gap-2">
                {[5, 25, 50, 100].map((percent, i) => (
                  <div key={i} className="flex items-center">
                    <div className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-lg font-bold">
                      {percent}%
                    </div>
                    {i < 3 && <TrendingUp className="h-3 w-3 mx-1 text-white/20" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedVersion || createMutation.isPending}
              className="bg-accent hover:bg-accent/80"
            >
              {createMutation.isPending ? "Creating..." : "Start Rollout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StagedRolloutManager;
