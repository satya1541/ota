import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { auditApi, type AuditLog, type AuditLogStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/layout/Layout";
import { toast } from "sonner";
import { generateAuditLogsPDF } from "@/lib/pdf-generator";
import { 
  FileDown, 
  FileText, 
  SlidersHorizontal, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Microchip, 
  Package, 
  Rocket,
  Trash,
  CloudUpload,
  RotateCcw,
  CalendarDays,
  UserCircle,
  Globe2,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  RefreshCcw
} from "lucide-react";

const actionIcons: Record<string, typeof Info> = {
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

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: typeof Info; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border ${color} backdrop-blur-md p-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60">{title}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        </div>
        <Icon className="h-8 w-8 opacity-50" />
      </div>
    </motion.div>
  );
}

function AuditLogRow({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
  const Icon = actionIcons[log.action] || Info;
  const details = log.details ? (() => { try { return JSON.parse(log.details); } catch { return null; } })() : null;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-b border-white/10 last:border-0"
    >
      <div 
        onClick={onToggle}
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className={`p-2 rounded-lg ${entityColors[log.entityType] || 'bg-gray-500/20 text-gray-400'}`}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white capitalize">{log.action}</span>
            <Badge variant="outline" className={entityColors[log.entityType] || ''}>
              {log.entityType}
            </Badge>
            {log.entityName && (
              <span className="text-white/60 truncate">{log.entityName}</span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <UserCircle className="h-3 w-3" />
              {log.userName || 'System'}
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
          {log.severity || 'info'}
        </Badge>
        
        <Button variant="ghost" size="icon" className="h-8 w-8">
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
              <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-white/70">
                {details ? (
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(details, null, 2)}</pre>
                ) : (
                  <span className="text-white/40 italic">No additional details available</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AuditTrail() {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', actionFilter, entityFilter, startDate, endDate],
    queryFn: () => auditApi.getLogs({
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 500,
    }),
    refetchInterval: 30000,
  });
  
  const { data: stats } = useQuery({
    queryKey: ['audit-logs-stats'],
    queryFn: () => auditApi.getStats(),
    refetchInterval: 60000,
  });

  // Filter logs by severity and search query on client side
  const filteredLogs = logs.filter(log => {
    // Severity filter
    if (severityFilter && (log.severity || 'info') !== severityFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesAction = log.action.toLowerCase().includes(query);
      const matchesEntity = log.entityType.toLowerCase().includes(query);
      const matchesEntityName = log.entityName?.toLowerCase().includes(query);
      const matchesUser = log.userName?.toLowerCase().includes(query);
      const matchesDetails = log.details?.toLowerCase().includes(query);
      
      if (!matchesAction && !matchesEntity && !matchesEntityName && !matchesUser && !matchesDetails) {
        return false;
      }
    }
    
    return true;
  });
  
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const url = auditApi.exportCsv({ startDate, endDate });
      
      // Fetch the CSV and trigger download
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
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    
    setIsExportingPdf(true);
    try {
      generateAuditLogsPDF(filteredLogs);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    } finally {
      setIsExportingPdf(false);
    }
  };
  
  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['audit-logs-stats'] });
    toast.success('Audit logs refreshed');
  };
  
  const clearFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setSeverityFilter("");
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };
  
  const hasFilters = actionFilter || entityFilter || severityFilter || searchQuery || startDate || endDate;

  return (
    <Layout title="Audit Trail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-accent" />
              Audit Trail & Compliance
            </h1>
            <p className="text-white/60 mt-1">Track all system actions for security and compliance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCsv}
              disabled={isExportingCsv || filteredLogs.length === 0}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {isExportingCsv ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPdf}
              disabled={isExportingPdf || filteredLogs.length === 0}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isExportingPdf ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              title="Total Events" 
              value={stats.totalLogs} 
              icon={ShieldCheck} 
              color="border-blue-500/30 bg-blue-500/10" 
            />
            <StatCard 
              title="Devices" 
              value={stats.byEntityType?.device || 0} 
              icon={Microchip} 
              color="border-cyan-500/30 bg-cyan-500/10" 
            />
            <StatCard 
              title="Firmware" 
              value={stats.byEntityType?.firmware || 0} 
              icon={Package} 
              color="border-purple-500/30 bg-purple-500/10" 
            />
            <StatCard 
              title="Warnings" 
              value={(stats.bySeverity?.warning || 0) + (stats.bySeverity?.critical || 0)} 
              icon={AlertTriangle} 
              color="border-yellow-500/30 bg-yellow-500/10" 
            />
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              {/* Search */}
              <div className="lg:col-span-2 xl:col-span-2">
                <Label className="text-white/60 text-xs mb-1.5 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-white/5 border-white/20 pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Action Filter */}
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Action</Label>
                <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="deploy">Deploy</SelectItem>
                    <SelectItem value="rollback">Rollback</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Entity Filter */}
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Entity Type</Label>
                <Select value={entityFilter || "all"} onValueChange={(v) => setEntityFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="device">Device</SelectItem>
                    <SelectItem value="firmware">Firmware</SelectItem>
                    <SelectItem value="deployment">Deployment</SelectItem>
                    <SelectItem value="rollout">Rollout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Severity Filter */}
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Severity</Label>
                <Select value={severityFilter || "all"} onValueChange={(v) => setSeverityFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Range */}
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white/5 border-white/20"
                />
              </div>
              
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>
            
            {/* Clear Filters */}
            {hasFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={clearFilters} size="sm" className="text-white/60 gap-2">
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Activity Log</span>
              {isFetching && !isLoading && (
                <span className="text-xs text-white/40 font-normal flex items-center gap-1">
                  <RefreshCcw className="h-3 w-3 animate-spin" />
                  Updating...
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-white/60">
              {filteredLogs.length} events {hasFilters && `(filtered from ${logs.length} total)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <ShieldCheck className="h-12 w-12 mb-4 opacity-50" />
                <p>No audit logs found</p>
                {hasFilters && (
                  <Button variant="link" onClick={clearFilters} className="text-accent mt-2">
                    Clear filters to see all logs
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {filteredLogs.map((log) => (
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
      </div>
    </Layout>
  );
}
