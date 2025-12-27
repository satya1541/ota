import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle, Info, Search, RefreshCw, Download, Trash2, FileText, HardDrive, Pause, Play, Activity, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logsApi, systemLogsApi, deviceApi, DeviceLog, Device } from "@/lib/api";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Logs() {
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlSearch = urlParams.get("search") || "";

  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const [autoRefreshStats, setAutoRefreshStats] = useState(true);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  const { data: logs = [], isLoading, refetch } = useQuery({ 
    queryKey: ["logs"], 
    queryFn: () => logsApi.getAll(),
    refetchInterval: autoRefreshLogs ? 3000 : false,
  });

  const { data: logStats, refetch: refetchStats } = useQuery({
    queryKey: ["log-stats"],
    queryFn: () => systemLogsApi.getStats(),
    refetchInterval: autoRefreshStats ? 5000 : false,
  });

  const clearLogMutation = useMutation({
    mutationFn: (type: "ota" | "error" | "combined") => systemLogsApi.clearLog(type),
    onSuccess: (_, type) => {
      toast.success(`${type} log cleared successfully`);
      refetchStats();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    if (urlSearch) setSearchTerm(urlSearch);
  }, [urlSearch]);

  const filteredLogs = logs.filter((log: DeviceLog) => {
    const matchesSearch = 
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (status === "failed") return <AlertCircle className="h-4 w-4 text-rose-500" />;
    if (status === "pending") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "success": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200/50";
      case "failed": return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200/50";
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200/50";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200/50";
    }
  };

  const getActionStyle = (action: string) => {
    switch (action) {
      case "deploy": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200/50";
      case "report": return "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border-teal-200/50";
      case "check": return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200/50";
      case "rollback": return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200/50";
      case "download": return "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200/50";
      case "register": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200/50";
      case "reset": return "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200/50";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Layout title="Telemetry & Logs">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground w-full md:w-auto ring-1 ring-border/50">
            <TabsTrigger value="activity" className="rounded-xl px-8 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Activity className="h-4 w-4 mr-2" />
              OTA Activity
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl px-8 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <History className="h-4 w-4 mr-2" />
              System State
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-8">
            <motion.div variants={item}>
              <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/50">
                <CardHeader className="p-8 pb-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">Real-time Stream</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        Live telemetry from connected fleet nodes.
                        {autoRefreshLogs && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-500 ring-1 ring-emerald-500/20">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Transmission
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                        className={`h-10 rounded-xl px-4 ring-1 ring-border/50 ${autoRefreshLogs ? "text-emerald-600 hover:text-emerald-700" : "text-muted-foreground"}`}
                      >
                        {autoRefreshLogs ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {autoRefreshLogs ? "Pause Stream" : "Resume Stream"}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl ring-1 ring-border/50" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search telemetry..."
                        className="pl-10 h-12 border-none bg-background shadow-inner ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-full md:w-[180px] h-12 border-none bg-background ring-1 ring-border/50 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="deploy">Deployment</SelectItem>
                        <SelectItem value="report">Status Report</SelectItem>
                        <SelectItem value="check">Update Check</SelectItem>
                        <SelectItem value="rollback">Rollback</SelectItem>
                        <SelectItem value="download">Payload DL</SelectItem>
                        <SelectItem value="register">Provisioning</SelectItem>
                        <SelectItem value="reset">State Reset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence initial={false}>
                      {isLoading ? (
                        <div className="text-center py-20 text-muted-foreground animate-pulse font-bold uppercase tracking-widest text-xs">Synchronizing history...</div>
                      ) : filteredLogs.length > 0 ? (
                        filteredLogs.map((log: DeviceLog) => {
                          const device = (devices as Device[]).find(d => d.macAddress === log.macAddress || d.id === log.deviceId);
                          const displayText = device ? `${device.name}` : (log.macAddress || log.deviceId);
                          return (
                            <motion.div 
                              key={log.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="group flex items-start gap-4 p-4 rounded-2xl bg-background/40 hover:bg-background transition-all ring-1 ring-border/30 hover:ring-accent/30"
                            >
                              <div className="mt-1">{getStatusIcon(log.status)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className="text-xs font-black tracking-tight group-hover:text-accent transition-colors">{displayText}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-50 tracking-tighter">{log.macAddress || log.deviceId}</span>
                                  <div className="flex-1" />
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {format(new Date(log.createdAt), "HH:mm:ss.SSS")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none shadow-none ${getActionStyle(log.action)}`}>
                                    {log.action}
                                  </Badge>
                                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none shadow-none ${getStatusStyle(log.status)}`}>
                                    {log.status}
                                  </Badge>
                                  {log.fromVersion && log.toVersion && (
                                    <div className="flex items-center gap-1 px-2 py-0 rounded-md bg-secondary text-[9px] font-mono font-bold uppercase tracking-tighter">
                                      {log.fromVersion} <span className="text-muted-foreground opacity-50">→</span> {log.toVersion}
                                    </div>
                                  )}
                                </div>
                                {log.message && <p className="text-sm mt-3 text-foreground/80 leading-relaxed font-medium">{log.message}</p>}
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                          <Activity className="h-12 w-12 mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest">Quiet on the network</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="system" className="mt-8">
            <motion.div variants={item} className="grid gap-6 md:grid-cols-3">
              {[
                { 
                  title: "OTA Transmission", 
                  stats: logStats?.ota, 
                  icon: FileText, 
                  color: "text-blue-500", 
                  bg: "bg-blue-500/10",
                  type: "ota" as const
                },
                { 
                  title: "Fault Registry", 
                  stats: logStats?.error, 
                  icon: AlertCircle, 
                  color: "text-rose-500", 
                  bg: "bg-rose-500/10",
                  type: "error" as const
                },
                { 
                  title: "Master Ledger", 
                  stats: logStats?.combined, 
                  icon: HardDrive, 
                  color: "text-indigo-500", 
                  bg: "bg-indigo-500/10",
                  type: "combined" as const
                }
              ].map((logFile, i) => (
                <Card key={i} className="border-none shadow-sm ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/50 flex flex-col">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${logFile.bg}`}>
                        <logFile.icon className={`h-5 w-5 ${logFile.color}`} />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold border-none bg-muted/50 ring-1 ring-border/50">
                        {logFile.stats?.lines || 0} Records
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-black tracking-tight">{logFile.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">System-level log persistence</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Footprint</span>
                        <p className="text-sm font-bold">{formatBytes(logFile.stats?.size || 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Last Update</span>
                        <p className="text-sm font-bold">
                          {logFile.stats?.modified ? format(new Date(logFile.stats.modified), "HH:mm") : "Idle"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button size="sm" variant="outline" className="flex-1 h-10 rounded-xl border-none ring-1 ring-border/50 font-bold text-xs" onClick={() => systemLogsApi.downloadLog(logFile.type)}>
                        <Download className="mr-2 h-3.5 w-3.5" /> Archive
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 ring-1 ring-border/50" onClick={() => clearLogMutation.mutate(logFile.type)} disabled={clearLogMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            <motion.div variants={item} className="mt-8">
              <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-3xl bg-card/50">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-black tracking-tight">Persistence Management</CardTitle>
                  <CardDescription className="text-sm">Log rotation and storage policies</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="p-6 rounded-2xl bg-indigo-500/5 ring-1 ring-indigo-500/20 flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 rounded-2xl bg-indigo-500/10">
                      <HardDrive className="h-8 w-8 text-indigo-500" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Automatic Archiving Active</h4>
                      <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70 mt-1">
                        Logs are rotated at <span className="font-black">5.0 MB</span>. System maintains up to <span className="font-black">5 depth</span> backups per channel to optimize cloud storage footprint.
                      </p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-none bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-500/20 px-8 h-12">
                      Configure Policies
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}
