import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileDown,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  UserCircle,
  CalendarDays,
  Globe2,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  AlertTriangle,
  Info,
  Microchip,
  Package,
  Rocket,
  Trash,
  CloudUpload,
  RotateCcw,
  Search,
  X,
  ScrollText,
  Pause,
  Play,
  CircleCheck,
  AlertCircle,
  CloudDownload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logsApi, deviceApi, auditApi, DeviceLog, Device, AuditLog } from "@/lib/api";
import { format } from "date-fns";
import { useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { generateLogsPDF, generateAuditLogsPDF } from "@/lib/pdf-generator";
import { Label } from "@/components/ui/label";

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

const actionIcons: Record<string, any> = {
  create: Microchip,
  delete: Trash,
  upload: CloudUpload,
  deploy: Rocket,
  rollback: RotateCcw,
  update: Package,
};

const severityColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const entityColors: Record<string, string> = {
  device: "bg-cyan-500/20 text-cyan-400",
  firmware: "bg-purple-500/20 text-purple-400",
  deployment: "bg-green-500/20 text-green-400",
  rollout: "bg-orange-500/20 text-orange-400",
  config: "bg-pink-500/20 text-pink-400",
};

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border ${color} p-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground/60">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        </div>
        <Icon className="h-8 w-8 opacity-50" />
      </div>
    </motion.div>
  );
}

function AuditLogRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const Icon = actionIcons[log.action] || Info;
  const details = log.details ? (() => { try { return JSON.parse(log.details); } catch { return null; } })() : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-b border-border/50 last:border-0"
    >
      <div
        onClick={onToggle}
        className="flex items-center gap-4 p-4 cursor-pointer bg-accent/5 transition-colors"
      >
        <div className={`p-2 rounded-lg ${entityColors[log.entityType] || 'bg-gray-500/20 text-gray-400'}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground capitalize">{t(`audit_trail.${log.action}`)}</span>
            <Badge variant="outline" className={entityColors[log.entityType] || ''}>
              {t(`audit_trail.${log.entityType}`)}
            </Badge>
            {log.entityName && (
              <span className="text-foreground/60 truncate">{log.entityName}</span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserCircle className="h-3 w-3" />
              {log.userName || t('audit_trail.system')}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(log.createdAt).toLocaleString()}
            </span>
            {log.ipAddress && (
              <span className="flex items-center gap-1">
                <Globe2 className="h-3 w-3" />
                {log.ipAddress}
              </span>
            )}
          </div>
        </div>

        <Badge variant="outline" className={severityColors[log.severity || 'info']}>
          {log.severity === 'critical' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {t(`audit_trail.${log.severity || 'info'}`)}
        </Badge>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-14">
              <div className="bg-background/50 rounded-lg p-3 font-mono text-xs text-foreground/70">
                {details ? (
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(details, null, 2)}</pre>
                ) : (
                  <span className="text-muted-foreground italic">{t('audit_trail.no_details')}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Logs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlSearch = urlParams.get("search") || "";

  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  // OTA Activity State
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [actionFilter, setActionFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  // Audit Trail State
  const [auditActionFilter, setAuditActionFilter] = useState<string>("");
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("");
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>("");
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");
  const [auditStartDate, setAuditStartDate] = useState<string>("");
  const [auditEndDate, setAuditEndDate] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsApi.getAll(),
    refetchInterval: autoRefreshLogs ? 3000 : false,
  });

  // Audit Trail Queries
  const { data: auditLogs = [], isLoading: isLoadingAudit, refetch: refetchAudit, isFetching: isFetchingAudit } = useQuery({
    queryKey: ['audit-logs', auditActionFilter, auditEntityFilter, auditStartDate, auditEndDate],
    queryFn: () => auditApi.getLogs({
      action: auditActionFilter || undefined,
      entityType: auditEntityFilter || undefined,
      startDate: auditStartDate || undefined,
      endDate: auditEndDate || undefined,
      limit: 500,
    }),
    refetchInterval: 30000,
  });

  const { data: auditStats } = useQuery({
    queryKey: ['audit-logs-stats'],
    queryFn: () => auditApi.getStats(),
    refetchInterval: 60000,
  });

  // Audit Trail filtering
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditSeverityFilter && (log.severity || 'info') !== auditSeverityFilter) return false;
    if (auditSearchQuery) {
      const query = auditSearchQuery.toLowerCase();
      const matchesAction = log.action.toLowerCase().includes(query);
      const matchesEntity = log.entityType.toLowerCase().includes(query);
      const matchesEntityName = log.entityName?.toLowerCase().includes(query);
      const matchesUser = log.userName?.toLowerCase().includes(query);
      const matchesDetails = log.details?.toLowerCase().includes(query);
      if (!matchesAction && !matchesEntity && !matchesEntityName && !matchesUser && !matchesDetails) return false;
    }
    return true;
  });

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const url = auditApi.exportCsv({ startDate: auditStartDate, endDate: auditEndDate });
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to export CSV');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
      console.error(error);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (filteredAuditLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    setIsExportingPdf(true);
    try {
      generateAuditLogsPDF(filteredAuditLogs);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleRefreshAudit = () => {
    refetchAudit();
    queryClient.invalidateQueries({ queryKey: ['audit-logs-stats'] });
    toast.success('Audit logs refreshed');
  };

  const clearAuditFilters = () => {
    setAuditActionFilter("");
    setAuditEntityFilter("");
    setAuditSeverityFilter("");
    setAuditSearchQuery("");
    setAuditStartDate("");
    setAuditEndDate("");
  };

  const hasAuditFilters = auditActionFilter || auditEntityFilter || auditSeverityFilter || auditSearchQuery || auditStartDate || auditEndDate;

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
            <TabsTrigger value="audit" className="rounded-xl px-8 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground data-[state=active]:shadow-lg transition-all">
              <ShieldCheck className="h-4 w-4 mr-2" />
              {t('audit_trail.title')}
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

          <TabsContent value="audit" className="mt-8">
            <motion.div variants={item} className="space-y-6">
              {/* Audit Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary shadow-sm" />
                    {t('audit_trail.header')}
                  </h2>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAudit}
                    disabled={isFetchingAudit}
                    className="gap-2 rounded-xl bg-background/50 border-border/50"
                  >
                    <RefreshCcw className={`h-4 w-4 ${isFetchingAudit ? 'animate-spin' : ''}`} />
                    {t('audit_trail.refresh')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={isExportingCsv || filteredAuditLogs.length === 0}
                    className="gap-2 rounded-xl bg-background/50 border-border/50"
                  >
                    <FileDown className="h-4 w-4" />
                    {isExportingCsv ? t('audit_trail.exporting') : t('audit_trail.export_csv')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf || filteredAuditLogs.length === 0}
                    className="gap-2 rounded-xl bg-background/50 border-border/50"
                  >
                    <FileText className="h-4 w-4" />
                    {isExportingPdf ? t('audit_trail.generating') : t('audit_trail.export_pdf')}
                  </Button>
                </div>
              </div>

              {/* Audit Stats */}
              {auditStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title={t('audit_trail.total_events')}
                    value={auditStats.totalLogs}
                    icon={ShieldCheck}
                    color="border-blue-500/30 bg-blue-500/10"
                  />
                  <StatCard
                    title={t('audit_trail.devices')}
                    value={auditStats.byEntityType?.device || 0}
                    icon={Microchip}
                    color="border-cyan-500/30 bg-cyan-500/10"
                  />
                  <StatCard
                    title={t('audit_trail.firmware')}
                    value={auditStats.byEntityType?.firmware || 0}
                    icon={Package}
                    color="border-purple-500/30 bg-purple-500/10"
                  />
                  <StatCard
                    title={t('audit_trail.warnings')}
                    value={(auditStats.bySeverity?.warning || 0) + (auditStats.bySeverity?.critical || 0)}
                    icon={AlertTriangle}
                    color="border-yellow-500/30 bg-yellow-500/10"
                  />
                </div>
              )}

              {/* Audit Filters */}
              <Card className="border-none shadow-xl ring-1 ring-border/50 rounded-3xl bg-card/90">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t('audit_trail.filters')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1">
                      <Label className="text-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">{t('audit_trail.search')}</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          placeholder={t('audit_trail.search_logs')}
                          className="h-10 border-none bg-background/80 ring-1 ring-border/50 rounded-xl pl-9"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">{t('audit_trail.action')}</Label>
                      <Select value={auditActionFilter || "all"} onValueChange={(v) => setAuditActionFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-10 border-none bg-background/80 ring-1 ring-border/50 rounded-xl">
                          <SelectValue placeholder={t('audit_trail.all_actions')} />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-border/50 text-foreground">
                          <SelectItem value="all">{t('audit_trail.all_actions')}</SelectItem>
                          <SelectItem value="create">{t('audit_trail.create')}</SelectItem>
                          <SelectItem value="delete">{t('audit_trail.delete')}</SelectItem>
                          <SelectItem value="upload">{t('audit_trail.upload')}</SelectItem>
                          <SelectItem value="deploy">{t('audit_trail.deploy')}</SelectItem>
                          <SelectItem value="rollback">{t('audit_trail.rollback')}</SelectItem>
                          <SelectItem value="update">{t('audit_trail.update')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">{t('audit_trail.entity_type')}</Label>
                      <Select value={auditEntityFilter || "all"} onValueChange={(v) => setAuditEntityFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-10 border-none bg-background/80 ring-1 ring-border/50 rounded-xl">
                          <SelectValue placeholder={t('audit_trail.all_types')} />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-border/50 text-foreground">
                          <SelectItem value="all">{t('audit_trail.all_types')}</SelectItem>
                          <SelectItem value="device">{t('audit_trail.device')}</SelectItem>
                          <SelectItem value="firmware">{t('audit_trail.firmware')}</SelectItem>
                          <SelectItem value="deployment">{t('audit_trail.deployment')}</SelectItem>
                          <SelectItem value="rollout">{t('audit_trail.rollout')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-foreground/60 text-[10px] font-bold uppercase tracking-widest mb-1.5 block">{t('audit_trail.severity')}</Label>
                      <Select value={auditSeverityFilter || "all"} onValueChange={(v) => setAuditSeverityFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="h-10 border-none bg-background/80 ring-1 ring-border/50 rounded-xl">
                          <SelectValue placeholder={t('audit_trail.all_severities')} />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-border/50 text-foreground">
                          <SelectItem value="all">{t('audit_trail.all_severities')}</SelectItem>
                          <SelectItem value="info">{t('audit_trail.info')}</SelectItem>
                          <SelectItem value="warning">{t('audit_trail.warning')}</SelectItem>
                          <SelectItem value="critical">{t('audit_trail.critical')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {hasAuditFilters && (
                    <div className="mt-4 flex justify-end">
                      <Button variant="ghost" onClick={clearAuditFilters} size="sm" className="text-foreground/60 gap-2 h-8 rounded-xl hover:bg-foreground/5 transition-all">
                        <X className="h-4 w-4" />
                        {t('audit_trail.clear_all_filters')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audit List */}
              <Card className="border-none shadow-xl ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/90">
                <CardHeader>
                  <CardTitle className="text-lg font-black tracking-tight text-foreground flex items-center justify-between">
                    <span>{t('audit_trail.activity_log')}</span>
                    {isFetchingAudit && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                        <RefreshCcw className="h-3 w-3 animate-spin" />
                        {t('audit_trail.updating')}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAudit ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : filteredAuditLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <ShieldCheck className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-xs font-bold uppercase tracking-widest">{t('audit_trail.no_logs_found')}</p>
                    </div>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                      {filteredAuditLogs.map((log) => (
                        <AuditLogRow
                          key={log.id}
                          log={log}
                          expanded={expandedId === log.id}
                          onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent >
        </Tabs >
      </motion.div >
    </Layout >
  );
}
