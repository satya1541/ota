import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, logsApi, DeviceLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity,
  Zap,
  Timer,
  BarChart3
} from "lucide-react";
import { format, subDays, isSameDay } from "date-fns";

interface DeploymentAnalyticsProps {
  className?: string;
}

/**
 * DeploymentAnalytics - Comprehensive OTA deployment statistics
 * Shows success rates, timing, and trends
 */
export function DeploymentAnalytics({ className }: DeploymentAnalyticsProps) {
  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsApi.getAll(),
  });

  const analytics = useMemo(() => {
    const logList = logs as DeviceLog[];
    
    // Overall stats
    const deployLogs = logList.filter(l => l.action === "deploy" || l.action === "report");
    const successLogs = deployLogs.filter(l => l.status === "success" || l.status === "updated" || l.status === "completed");
    const failedLogs = deployLogs.filter(l => l.status === "failed");
    
    const successRate = deployLogs.length > 0 
      ? (successLogs.length / deployLogs.length) * 100 
      : 0;

    // Daily breakdown (last 7 days)
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    const dailyData = last7Days.map(date => {
      const dayLogs = logList.filter(log => isSameDay(new Date(log.createdAt), date));
      const dayDeploys = dayLogs.filter(l => l.action === "deploy" || l.action === "report");
      const daySuccess = dayDeploys.filter(l => l.status === "success" || l.status === "updated" || l.status === "completed");
      const dayFailed = dayDeploys.filter(l => l.status === "failed");
      
      return {
        name: format(date, "EEE"),
        date: format(date, "MMM d"),
        success: daySuccess.length,
        failed: dayFailed.length,
        total: dayDeploys.length,
      };
    });

    // Version distribution
    const versionCounts = new Map<string, number>();
    logList
      .filter(l => l.toVersion && (l.status === "success" || l.status === "updated"))
      .forEach(l => {
        const count = versionCounts.get(l.toVersion!) || 0;
        versionCounts.set(l.toVersion!, count + 1);
      });
    
    const versionData = Array.from(versionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([version, count]) => ({ version, count }));

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }).map((_, hour) => {
      const hourLogs = logList.filter(l => new Date(l.createdAt).getHours() === hour);
      return {
        hour: `${hour}:00`,
        count: hourLogs.length,
      };
    });

    // Action breakdown
    const actionCounts = {
      deploy: logList.filter(l => l.action === "deploy").length,
      report: logList.filter(l => l.action === "report").length,
      check: logList.filter(l => l.action === "check").length,
      rollback: logList.filter(l => l.action === "rollback").length,
      download: logList.filter(l => l.action === "download").length,
    };

    const pieData = [
      { name: "Deploy", value: actionCounts.deploy, color: "#8b5cf6" },
      { name: "Report", value: actionCounts.report, color: "#22c55e" },
      { name: "Check", value: actionCounts.check, color: "#3b82f6" },
      { name: "Download", value: actionCounts.download, color: "#f59e0b" },
      { name: "Rollback", value: actionCounts.rollback, color: "#ef4444" },
    ].filter(d => d.value > 0);

    return {
      totalDeploys: deployLogs.length,
      successCount: successLogs.length,
      failedCount: failedLogs.length,
      successRate,
      dailyData,
      versionData,
      hourlyData,
      pieData,
      actionCounts,
    };
  }, [logs]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 backdrop-blur-md rounded-lg px-3 py-2 text-xs border border-white/10">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-mono">
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-xl">
                <Activity className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{analytics.totalDeploys}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/40">Total Deploys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{analytics.successCount}</p>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/60">Successful</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{analytics.failedCount}</p>
                <p className="text-[10px] uppercase tracking-widest text-red-400/60">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{analytics.successRate.toFixed(1)}%</p>
                <p className="text-[10px] uppercase tracking-widest text-blue-400/60">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Daily Deployment Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-white/60">Success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-white/60">Failed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Distribution */}
        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              Action Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {analytics.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs">
              {analytics.pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-white/60">{entry.name}</span>
                  <span className="text-white/40">({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Timer className="h-4 w-4 text-accent" />
              Hourly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.hourlyData}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                    interval={3}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorActivity)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Versions */}
        <Card className="border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Top Deployed Versions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.versionData.length === 0 ? (
                <p className="text-center text-white/40 py-8">No deployment data yet</p>
              ) : (
                analytics.versionData.map((item, i) => (
                  <div key={item.version} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono text-white">{item.version}</span>
                        <span className="text-xs text-white/40">{item.count} deploys</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full"
                          style={{ 
                            width: `${(item.count / (analytics.versionData[0]?.count || 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DeploymentAnalytics;
