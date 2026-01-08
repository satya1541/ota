import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deviceApi, firmwareApi, logsApi, Device, Firmware, DeviceLog } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ScrollText, AlertTriangle, CircleCheck, Microchip, Signal, Package, Timer, TrendingUp, CloudUpload, Rocket, RotateCcw, Sparkles, Command } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, LineChart, Line } from "recharts";
import { subDays, format, isSameDay, subHours } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

import { Loader } from "@/components/loader";

export default function Dashboard() {
  const [, setLocation] = useLocation();

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
      <Layout title="System Overview">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </Layout>
    );
  }

  const deviceList = devices as Device[];
  const logList = logs as DeviceLog[];
  
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

  const latestFirmware = firmwares.length > 0 ? firmwares[0] as Firmware : null;
  const compliantDevices = latestFirmware 
    ? deviceList.filter(d => d.currentVersion === latestFirmware.version).length 
    : 0;
  const compliance = stats.total > 0 ? Math.round((compliantDevices / stats.total) * 100) : 0;

  const pieData = [
    { name: "Updated", value: stats.online, color: "hsl(var(--chart-2))" },
    { name: "Pending", value: stats.pending, color: "hsl(var(--chart-3))" },
    { name: "Offline", value: stats.offline, color: "hsl(var(--muted-foreground) / 0.3)" },
    { name: "Failed", value: stats.failed, color: "hsl(var(--chart-5))" },
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

  
  // Generate sparkline data for health trend (simulated from logs)
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
  
  // Quick actions
  const quickActions = [
    { label: "Deploy Update", icon: Rocket, color: "bg-accent text-accent-foreground hover:bg-accent/90", action: () => setLocation("/devices") },
    { label: "Upload Firmware", icon: CloudUpload, color: "bg-purple-600 text-white hover:bg-purple-700", action: () => setLocation("/firmware") },
    { label: "Refresh Fleet", icon: RotateCcw, color: "bg-emerald-600 text-white hover:bg-emerald-700", action: () => window.location.reload() },
    { label: "Command Palette", icon: Command, color: "bg-white/10 text-white border border-white/20 hover:bg-white/20", action: () => {
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
      document.dispatchEvent(event);
    }},
  ];

  return (
    <Layout title="System Overview">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Quick Actions */}
        <motion.div variants={item} className="flex flex-wrap gap-2 md:gap-3">
          {quickActions.map((action, i) => (
            <Button
              key={i}
              onClick={action.action}
              className={`${action.color} gap-2 text-xs md:text-sm font-semibold transition-all hover:scale-105 active:scale-95`}
              size="sm"
            >
              <action.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.label.split(' ')[0]}</span>
            </Button>
          ))}
          <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-white/40">
            <kbd className="px-2 py-1 bg-white/10 rounded text-white/60 border border-white/20">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-white/10 rounded text-white/60 border border-white/20">K</kbd>
            <span className="ml-1">for commands</span>
          </div>
        </motion.div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Fleet", value: stats.total, icon: Microchip, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10", sparkline: false },
            { label: "Updated", value: stats.online, icon: Signal, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10", sparkline: false },
            { label: "Pending", value: stats.pending, icon: Timer, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10", sparkline: false },
            { label: "Failed", value: stats.failed, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/10", sparkline: false },
            { label: "Health", value: `${Math.round(sparklineData.reduce((a, b) => a + b.value, 0) / sparklineData.length)}%`, icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/10", sub: "24h avg", sparkline: true }
          ].map((stat, i) => (
            <motion.div key={i} variants={item}>
              <Card className="hover-elevate overflow-hidden border-none shadow-sm ring-1 ring-border/50 h-full bg-card/20 backdrop-blur-md relative">
                {stat.sparkline && (
                  <div className="absolute inset-0 opacity-30">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4 relative z-10">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{stat.label}</CardTitle>
                  <div className={`p-1.5 md:p-2 rounded-lg ${stat.bg} hidden sm:block`}>
                    <stat.icon className={`h-3 w-3 md:h-4 md:w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-4 md:pt-0 relative z-10">
                  <div className="text-lg md:text-2xl font-bold tracking-tight">{stat.value || "0"}</div>
                  {stat.sub && <p className="text-[9px] font-medium text-muted-foreground mt-0.5 md:mt-1 uppercase tracking-tight truncate">{stat.sub}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <motion.div variants={item} className="md:col-span-2 lg:col-span-4">
            <Card className="border-none shadow-sm ring-1 ring-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Update Activity</CardTitle>
                  <CardDescription className="text-xs">Fleet pulse (last 7 days)</CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase">Active</span>
                </div>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <div className="h-[200px] md:h-[300px] mt-4">
                  {barData.every(d => d.updates === 0) ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">
                      No activity detected
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={barData}>
                        <defs>
                          <linearGradient id="colorUpdates" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} hide={window.innerWidth < 640} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            borderRadius: '12px', 
                            border: '1px solid hsl(var(--border))', 
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            fontSize: '12px'
                          }}
                        />
                        <Area type="monotone" dataKey="updates" stroke="hsl(var(--accent))" strokeWidth={3} fillOpacity={1} fill="url(#colorUpdates)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item} className="md:col-span-2 lg:col-span-3">
            <Card className="border-none shadow-sm ring-1 ring-border/50 h-full">
              <CardHeader>
                <CardTitle className="text-base font-bold">Fleet Distribution</CardTitle>
                <CardDescription className="text-xs">Current state segmentation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] md:h-[240px] mt-2 md:mt-4">
                  {pieData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground italic text-sm">
                      Registry empty
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            borderRadius: '12px', 
                            border: '1px solid hsl(var(--border))',
                            fontSize: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 md:mt-6">
                  {pieData.map((stat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">{stat.name}</span>
                      <span className="ml-auto text-xs font-bold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div variants={item}>
            <Card className="border-none shadow-sm ring-1 ring-border/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold">Latest Activity</CardTitle>
                  <CardDescription className="text-xs">Live events</CardDescription>
                </div>
                <ScrollText className="h-4 w-4 text-muted-foreground opacity-50" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentLogs.length === 0 ? (
                    <p className="text-muted-foreground italic text-xs text-center py-8">No activity</p>
                  ) : (
                    recentLogs.map((log) => {
                      const device = deviceList.find(d => d.macAddress === log.macAddress || d.id === log.deviceId);
                      const displayName = device?.name || log.macAddress || log.deviceId;
                      return (
                        <div key={log.id} className="flex items-center justify-between p-2 md:p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 md:p-2 rounded-lg ${
                              log.status === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 
                              log.status === 'failed' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20' : 
                              'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                            }`}>
                              <ScrollText className="h-3 w-3 md:h-4 md:w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[10px] md:text-xs truncate max-w-[100px] md:max-w-[150px]">{displayName}</p>
                              <p className="text-[8px] md:text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{log.action}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                            className="text-[8px] md:text-[9px] font-bold uppercase px-1.5 md:px-2 py-0"
                          >
                            {log.status}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-none shadow-sm ring-1 ring-border/50 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold">Build Assets</CardTitle>
                  <CardDescription className="text-xs">Firmware registry</CardDescription>
                </div>
                <Package className="h-4 w-4 text-muted-foreground opacity-50" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {firmwares.length === 0 ? (
                    <p className="text-muted-foreground italic text-xs text-center py-8">No builds pushed</p>
                  ) : (
                    firmwares.slice(0, 5).map((fw: Firmware, index: number) => (
                      <div key={fw.id} className="flex items-center justify-between p-2 md:p-3 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 md:p-2 rounded-lg ${
                            index === 0 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20' : 'bg-muted text-muted-foreground'
                          }`}>
                            <Package className="h-3 w-3 md:h-4 md:w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold font-mono text-[10px] md:text-xs">{fw.version}</p>
                            <p className="text-[8px] md:text-[10px] font-medium text-muted-foreground uppercase truncate max-w-[120px] md:max-w-[150px]">{fw.description || fw.filename}</p>
                          </div>
                        </div>
                        {index === 0 && <Badge className="bg-indigo-600 text-[8px] md:text-[9px] font-bold uppercase px-1.5 md:px-2 py-0">HEAD</Badge>}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
