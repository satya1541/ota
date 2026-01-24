import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CircleCheck, Info, Search, Pause, Play, ScrollText, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { logsApi, deviceApi, DeviceLog, Device } from "@/lib/api";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlSearch = urlParams.get("search") || "";

  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsApi.getAll(),
    refetchInterval: autoRefreshLogs ? 3000 : false,
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
      case "success": return "bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "failed": return "bg-rose-100/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "pending": return "bg-amber-100/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default: return "bg-blue-100/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  const getActionStyle = (action: string) => {
    switch (action) {
      case "deploy": return "bg-indigo-100/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "report": return "bg-teal-100/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "check": return "bg-blue-100/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "rollback": return "bg-orange-100/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "download": return "bg-violet-100/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
      case "register": return "bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "reset": return "bg-slate-100/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
      default: return "bg-slate-100/10 text-slate-600";
    }
  };


  return (
    <Layout title={t('logs.title')}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-2xl bg-background/80 p-1 text-foreground/50 w-full md:w-auto ring-1 ring-border/50">
            <TabsTrigger value="activity" className="rounded-xl px-8 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground data-[state=active]:shadow-lg transition-all">
              <ScrollText className="h-4 w-4 mr-2" />
              {t('logs.ota_activity')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-8">
            <motion.div variants={item}>
              <Card className="border-none shadow-2xl ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/90">
                <CardHeader className="p-8 pb-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight text-foreground">{t('logs.real_time_stream')}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 text-foreground/70">
                        {t('logs.live_telemetry')}
                        {autoRefreshLogs && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/30">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {t('logs.live_transmission')}
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
                        className="h-10 rounded-xl px-4 border border-border/50 bg-background/50 hover:bg-accent/10 text-foreground transition-all"
                      >
                        <CloudDownload className="mr-2 h-4 w-4" />
                        {isExporting ? t('logs.exporting') : t('logs.download_pdf')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                        className={`h-10 rounded-xl px-4 border border-border/50 transition-all ${autoRefreshLogs ? "text-emerald-500 bg-emerald-500/10" : "text-foreground/50 bg-background/50"}`}
                      >
                        {autoRefreshLogs ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {autoRefreshLogs ? t('logs.pause_stream') : t('logs.resume_stream')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-foreground/40" />
                      <Input
                        placeholder={t('logs.search_telemetry')}
                        className="pl-10 h-12 border-none bg-background/80 shadow-inner ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-foreground placeholder:text-foreground/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-full md:w-[180px] h-12 border-none bg-background/80 ring-1 ring-border/50 rounded-xl text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-border/50 text-foreground">
                        <SelectItem value="all">{t('logs.all_events')}</SelectItem>
                        <SelectItem value="deleted">{t('logs.deleted_devices')}</SelectItem>
                        <SelectItem value="deploy">{t('logs.deployment')}</SelectItem>
                        <SelectItem value="report">{t('logs.status_report')}</SelectItem>
                        <SelectItem value="check">{t('logs.update_check')}</SelectItem>
                        <SelectItem value="rollback">{t('logs.rollback')}</SelectItem>
                        <SelectItem value="download">{t('logs.payload_dl')}</SelectItem>
                        <SelectItem value="register">{t('logs.provisioning')}</SelectItem>
                        <SelectItem value="reset">{t('logs.state_reset')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence initial={false}>
                      {isLoading ? (
                        <div className="text-center py-20 text-foreground/30 animate-pulse font-bold uppercase tracking-widest text-xs">{t('logs.synchronizing_history')}</div>
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
                              className={`group flex items-start gap-4 p-4 rounded-2xl transition-all ring-1 ring-white/5 ${isDeleted ? 'bg-background/80 opacity-60' : 'bg-background/80'}`}
                            >
                              <div className="mt-1">{getStatusIcon(log.status)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className={`text-xs font-black tracking-tight transition-colors ${isDeleted ? 'text-foreground/50' : 'text-foreground'}`}>
                                    {displayText} {isDeleted && <span className="ml-1 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-destructive/20 text-rose-400 tracking-widest ring-1 ring-rose-500/30">{t('logs.deleted')}</span>}
                                  </span>
                                  <span className="text-[10px] font-mono text-foreground/50 uppercase tracking-tighter">{log.macAddress || log.deviceId}</span>
                                  <div className="flex-1" />
                                  <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest">
                                    {format(new Date(log.createdAt), "hh:mm a")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none shadow-none ring-1 ring-white/5 ${getActionStyle(log.action)}`}>
                                    {log.action}
                                  </Badge>
                                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0 border-none shadow-none ring-1 ring-white/5 ${getStatusStyle(log.status)}`}>
                                    {log.status}
                                  </Badge>
                                  {log.fromVersion && log.toVersion && (
                                    <div className="flex items-center gap-1 px-2 py-0 rounded-md bg-white/10 text-[9px] font-mono font-bold uppercase tracking-tighter text-foreground/70 ring-1 ring-white/5">
                                      {log.fromVersion} <span className="text-foreground/30">→</span> {log.toVersion}
                                    </div>
                                  )}
                                </div>
                                {log.message && <p className="text-sm mt-3 text-foreground/80 leading-relaxed font-medium">{log.message}</p>}
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                          <ScrollText className="h-12 w-12 mb-4 text-foreground" />
                          <p className="text-xs font-black uppercase tracking-widest text-foreground">{t('logs.quiet_on_network')}</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div >
          </TabsContent >
        </Tabs >
      </motion.div >
    </Layout >
  );
}
