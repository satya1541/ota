import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deviceApi, firmwareApi, logsApi, Device, DeviceLog } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ScrollText, AlertTriangle, Microchip, Signal, Package, Timer, TrendingUp, CloudUpload, Rocket, RotateCcw, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area, LineChart, Line, CartesianGrid } from "recharts";
import { subDays, format, isSameDay, subHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MotionWrapper, GlitchWrapper } from "@/components/ui/motion-wrapper";
import { Loader } from "@/components/loader";
import { motion } from "framer-motion";
import { lazy, Suspense } from "react";

const DeploymentAnalytics = lazy(() => import("@/components/DeploymentAnalytics").then(mod => ({ default: mod.DeploymentAnalytics })));

// Animation Variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  const { data: devices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll
  });

  const { data: firmwares = [], isLoading: loadingFirmware } = useQuery({
    queryKey: ["firmware"],
    queryFn: firmwareApi.getAll
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: () => logsApi.getAll()
  });

  if (loadingDevices || loadingFirmware || loadingLogs) {
    return (
      <Layout title={t("dashboard.title")}>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </Layout>
    );
  }

  const deviceList = devices as Device[];
  const logList = logs as DeviceLog[];

  // Stats Logic
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const deviceStatusMap = new Map<string, DeviceLog>();

  logList
    .filter(log => new Date(log.createdAt).getTime() > oneDayAgo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach(log => {
      const deviceKey = log.macAddress || `device-${log.deviceId}`;
      if (!deviceStatusMap.has(deviceKey)) {
        deviceStatusMap.set(deviceKey, log);
      }
    });

  const recentSuccessDevices = Array.from(deviceStatusMap.values()).filter(
    log => log.action === "report" && (log.status === "success" || log.status === "updated")
  );
  const recentPendingDevices = Array.from(deviceStatusMap.values()).filter(
    log => log.action === "deploy" && log.status === "pending"
  );
  const recentFailedDevices = Array.from(deviceStatusMap.values()).filter(
    log => log.status === "failed"
  );

  const stats = {
    total: deviceList.length,
    online: recentSuccessDevices.length,
    pending: recentPendingDevices.length,
    failed: recentFailedDevices.length,
    offline: deviceList.filter(d => d.status === "offline" || d.otaStatus === "idle").length,
  };

  const pieData = [
    { name: t("dashboard.updated"), value: stats.online, color: "#00FFA3" }, // Neon Green
    { name: t("dashboard.pending"), value: stats.pending, color: "#FAFF00" }, // Neon Yellow
    { name: t("dashboard.offline"), value: stats.offline, color: "#FF00FF" }, // Neon Magenta
    { name: t("dashboard.failed"), value: stats.failed, color: "#EF4444" }, // Red
  ].filter(item => item.value > 0);

  const generateBarData = () => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    return last7Days.map(date => {
      const dayLogs = logList.filter(log =>
        isSameDay(new Date(log.createdAt), date) &&
        (log.status === "success" || log.status === "updated" || log.status === "completed")
      );
      return {
        name: format(date, "EEE"),
        updates: dayLogs.length,
      };
    });
  };

  const barData = generateBarData();
  const recentLogs = logList.slice(0, 5);

  const generateSparklineData = () => {
    const last24Hours = Array.from({ length: 12 }).map((_, i) => {
      const hour = subHours(new Date(), 11 - i);
      const hourLogs = logList.filter(log => {
        const logDate = new Date(log.createdAt);
        return logDate >= subHours(hour, 1) && logDate < hour;
      });
      const successRate = hourLogs.length > 0
        ? (hourLogs.filter(l => l.status === 'success' || l.status === 'updated').length / hourLogs.length) * 100
        : 100;
      return { time: format(hour, 'HH:mm'), value: Math.round(successRate) };
    });
    return last24Hours;
  };

  const sparklineData = generateSparklineData();

  const quickActions = [
    { label: t("dashboard.deploy_update"), icon: Rocket, variant: "default" as const, color: "shadow-primary/20", action: () => setLocation("/devices") },
    { label: t("dashboard.upload_firmware"), icon: CloudUpload, variant: "outline" as const, color: "text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/5 shadow-purple-500/10", action: () => setLocation("/firmware") },
    { label: t("dashboard.refresh_fleet"), icon: RotateCcw, variant: "outline" as const, color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10", action: () => window.location.reload() },
  ];

  return (
    <Layout title={t("dashboard.title")}>
      <MotionWrapper>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={item}>
            <Suspense fallback={<div className="h-64 flex items-center justify-center bg-card border border-border/50 rounded-3xl backdrop-blur-md shadow-xl"><Loader /></div>}>
              <DeploymentAnalytics />
            </Suspense>
          </motion.div>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">



            <motion.div variants={item} className="flex gap-2">
              {quickActions.map((action, i) => (
                <GlitchWrapper key={i}>
                  <Button
                    variant={action.variant}
                    onClick={action.action}
                    className={`${action.color} border border-border/50 rounded-none transform skew-x-[-10deg] hover:skew-x-0 transition-all duration-300 font-mono text-xs uppercase shadow-lg`}
                    size="sm"
                  >
                    <div className="transform skew-x-[10deg] flex items-center gap-2">
                      <action.icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{action.label}</span>
                    </div>
                  </Button>
                </GlitchWrapper>
              ))}
            </motion.div>
          </div>

          {/* Stats Grid */}
          <motion.div
            variants={item}
            className="grid gap-6 grid-cols-2 lg:grid-cols-5"
          >
            {[
              { label: t("dashboard.fleet"), value: stats.total, icon: Microchip, color: "text-blue-400", border: "border-blue-500/50", glow: "shadow-[0_0_30px_rgba(59,130,246,0.2)]" },
              { label: t("dashboard.updated"), value: stats.online, icon: Signal, color: "text-emerald-400", border: "border-emerald-500/50", glow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]" },
              { label: t("dashboard.pending"), value: stats.pending, icon: Timer, color: "text-amber-400", border: "border-amber-500/50", glow: "shadow-[0_0_30px_rgba(251,191,36,0.2)]" },
              { label: t("dashboard.failed"), value: stats.failed, icon: AlertTriangle, color: "text-rose-500", border: "border-rose-500/50", glow: "shadow-[0_0_30px_rgba(244,63,94,0.3)]" },
              { label: t("dashboard.health"), value: `${Math.round(sparklineData.reduce((a, b) => a + b.value, 0) / sparklineData.length)}%`, icon: Sparkles, color: "text-cyan-400", border: "border-cyan-500/50", glow: "shadow-[0_0_30px_rgba(34,211,238,0.2)]", sparkline: true }
            ].map((stat, i) => (
              <div key={i} className={`relative overflow-hidden bg-background/40 tech-border group hover:bg-background/10 transition-colors duration-500 ${stat.glow}`}>
                {stat.sparkline && (
                  <div className="absolute inset-x-0 bottom-0 h-16 opacity-40 pointer-events-none mix-blend-screen">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line type="stepAfter" dataKey="value" stroke="currentColor" className="text-cyan-400" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="p-4 relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground">{stat.label}</span>
                    <stat.icon className={`h-4 w-4 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                  </div>
                  <div className="text-4xl md:text-5xl font-black tracking-tighter text-foreground font-mono tabular-nums leading-none mt-2">
                    {stat.value}
                  </div>
                </div>
                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-border/50" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-border/50" />
              </div>
            ))}
          </motion.div>

          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <motion.div variants={item} className="md:col-span-2 lg:col-span-4">
              <Card className="h-full bg-background/20 border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    {t("dashboard.update_activity")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={barData}>
                        <defs>
                          <pattern id="patternUpdates" patternUnits="userSpaceOnUse" width="4" height="4">
                            <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" style={{ stroke: "#00f0ff", strokeWidth: 1 }} />
                          </pattern>
                        </defs>
                        <CartesianGrid stroke="#333" strokeDasharray="0" vertical={false} strokeWidth={1} />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={{ strokeWidth: 2, stroke: 'hsl(var(--foreground))' }}
                          tick={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}
                          dy={10}
                        />
                        <YAxis
                          stroke="hsl(var(--foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={{ strokeWidth: 2, stroke: 'hsl(var(--foreground))' }}
                          tick={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: '#000',
                            borderWidth: '2px',
                            borderRadius: '0px',
                            boxShadow: '4px 4px 0px 0px #000',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase'
                          }}
                          itemStyle={{ color: '#00f0ff', fontSize: '12px', fontWeight: '900' }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: '900', borderBottom: '2px solid #000', marginBottom: '8px', paddingBottom: '4px' }}
                          cursor={{ stroke: '#000', strokeWidth: 2, strokeDasharray: '0' }}
                        />
                        <Area
                          type="step"
                          dataKey="updates"
                          stroke="#00f0ff"
                          strokeWidth={3}
                          fill="url(#patternUpdates)"
                          animationDuration={300}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item} className="md:col-span-2 lg:col-span-3">
              <Card className="h-full bg-background/20 border-white/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">{t("dashboard.fleet_distribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mt-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={0}
                          dataKey="value"
                          stroke="#000000"
                          strokeWidth={3}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: '#000',
                            borderWidth: '2px',
                            borderRadius: '0px',
                            boxShadow: '4px 4px 0px 0px #000',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase'
                          }}
                          itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: '900' }}
                          labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '10px', marginBottom: '4px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-2xl font-black text-foreground">{stats.total}</div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Devices</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    {pieData.map((stat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: stat.color, color: stat.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">{stat.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Logs & Firmware */}
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={item}>
              <Card className="h-full bg-background/20 border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">{t("dashboard.latest_activity")}</CardTitle>
                  <ScrollText className="h-4 w-4 text-foreground/20" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-background/10 hover:bg-background/20 transition-colors border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-8 rounded-full ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            log.status === 'failed' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                              'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                            }`} />
                          <div>
                            <p className="text-xs font-bold text-foreground uppercase tracking-tight">{log.action}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{log.macAddress || log.deviceId}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] border-border/50 bg-background/40 text-foreground/60 font-mono">
                          {log.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="h-full bg-background/20 border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">{t("dashboard.build_assets")}</CardTitle>
                  <Package className="h-4 w-4 text-foreground/20" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {firmwares.slice(0, 5).map((fw, idx) => (
                      <div key={fw.id} className="flex items-center justify-between p-3 rounded-lg bg-background/10 hover:bg-background/20 transition-colors border border-white/5 group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/20 transition-colors">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground font-mono">{fw.version}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{fw.filename}</p>
                          </div>
                        </div>
                        {idx === 0 && (
                          <Badge className="bg-indigo-500 text-white text-[9px] shadow-[0_0_10px_rgba(99,102,241,0.5)] border-none">HEAD</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </MotionWrapper>
    </Layout>
  );
}
