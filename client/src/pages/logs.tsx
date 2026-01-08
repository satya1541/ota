import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CircleCheck, Info, Search, RotateCcw, FileDown, Trash, FileText, Package, Pause, Play, ScrollText, History, Activity, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logsApi, systemLogsApi, deviceApi, DeviceLog, Device } from "@/lib/api";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { generateLogsPDF } from "@/lib/pdf-generator";

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
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (urlSearch) setSearchTerm(urlSearch);
  }, [urlSearch]);

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      generateLogsPDF(logs, devices as Device[]);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = logs.filter((log: DeviceLog) => {
    const matchesSearch = 
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || 
                         (actionFilter === "deleted" ? !devices.find(d => d.macAddress === log.macAddress || d.id === log.deviceId) : log.action === actionFilter);
    return matchesSearch && matchesAction;
  });

  const getStatusIcon = (status: string) => {
    if (status === "success") return <CircleCheck className="h-4 w-4 text-emerald-500" />;
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
          <TabsList className="inline-flex h-12 items-center justify-center rounded-2xl bg-white/5 p-1 text-white/50 w-full md:w-auto ring-1 ring-white/10 backdrop-blur-md">
            <TabsTrigger value="activity" className="rounded-xl px-8 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg backdrop-blur-sm transition-all">
              <ScrollText className="h-4 w-4 mr-2" />
              OTA Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-8">
            <motion.div variants={item}>
              <Card className="border-none shadow-2xl ring-1 ring-white/10 rounded-3xl overflow-hidden glassmorphism bg-card/20 backdrop-blur-xl">
                <CardHeader className="p-8 pb-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight text-white">Real-time Stream</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 text-white/60">
                        Live telemetry from connected fleet nodes.
                        {autoRefreshLogs && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/30 backdrop-blur-sm">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live Transmission
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleDownloadPDF}
                        disabled={isExporting || logs.length === 0}
                        className="h-10 rounded-xl px-4 ring-1 ring-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
                        data-testid="button-download-pdf"
                      >
                        <CloudDownload className="mr-2 h-4 w-4" />
                        {isExporting ? "Exporting..." : "Download PDF"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                        className={`h-10 rounded-xl px-4 ring-1 ring-white/10 transition-all backdrop-blur-sm hidden ${autoRefreshLogs ? "text-emerald-400 hover:text-emerald-300 bg-white/5" : "text-white/50"}`}
                      >
                        {autoRefreshLogs ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {autoRefreshLogs ? "Pause Stream" : "Resume Stream"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <Input
                        placeholder="Search telemetry..."
                        className="pl-10 h-12 border-none bg-white/5 shadow-inner ring-1 ring-white/10 focus-visible:ring-accent rounded-xl text-white placeholder:text-white/20 backdrop-blur-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-full md:w-[180px] h-12 border-none bg-white/5 ring-1 ring-white/10 rounded-xl text-white backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glassmorphism bg-card/40 border-white/10 text-white backdrop-blur-xl">
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="deleted">Deleted Devices</SelectItem>
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
                        <div className="text-center py-20 text-white/30 animate-pulse font-bold uppercase tracking-widest text-xs">Synchronizing history...</div>
                      ) : filteredLogs.length > 0 ? (
                        filteredLogs.map((log: DeviceLog) => {
                          const device = (devices as Device[]).find(d => d.macAddress === log.macAddress || d.id === log.deviceId);
                          const displayText = device ? `${device.name}` : (log.macAddress || log.deviceId);
                          const isDeleted = !device;
                          return (
                            <motion.div 
                              key={log.id} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`group flex items-start gap-4 p-4 rounded-2xl transition-all ring-1 ring-white/5 hover:ring-accent/40 backdrop-blur-sm ${isDeleted ? 'bg-white/5 opacity-60' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                              <div className="mt-1">{getStatusIcon(log.status)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className={`text-xs font-black tracking-tight transition-colors ${isDeleted ? 'text-white/40' : 'text-white group-hover:text-accent'}`}>
                                    {displayText} {isDeleted && <span className="ml-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-destructive/20 text-rose-400 tracking-widest ring-1 ring-rose-500/30">Deleted</span>}
                                  </span>
                                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-tighter">{log.macAddress || log.deviceId}</span>
                                  <div className="flex-1" />
                                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                    {format(new Date(log.createdAt), "hh:mm a")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none shadow-none backdrop-blur-sm ring-1 ring-white/5 ${getActionStyle(log.action)}`}>
                                    {log.action}
                                  </Badge>
                                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none shadow-none backdrop-blur-sm ring-1 ring-white/5 ${getStatusStyle(log.status)}`}>
                                    {log.status}
                                  </Badge>
                                  {log.fromVersion && log.toVersion && (
                                    <div className="flex items-center gap-1 px-2 py-0 rounded-md bg-white/10 text-[9px] font-mono font-bold uppercase tracking-tighter text-white/70 ring-1 ring-white/5">
                                      {log.fromVersion} <span className="text-white/30">→</span> {log.toVersion}
                                    </div>
                                  )}
                                </div>
                                {log.message && <p className="text-sm mt-3 text-white/80 leading-relaxed font-medium">{log.message}</p>}
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                          <ScrollText className="h-12 w-12 mb-4 text-white" />
                          <p className="text-xs font-black uppercase tracking-widest text-white">Quiet on the network</p>
                        </div>
                      )}
                    </AnimatePresence>
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
