import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { deviceApi, firmwareApi, logsApi, Device, Firmware, DeviceLog } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle, Smartphone, Wifi, HardDrive, Clock, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from "recharts";
import { subDays, format, isSameDay } from "date-fns";
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

  return (
    <Layout title="System Overview">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Fleet", value: stats.total, icon: Smartphone, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
            { label: "Updated", value: stats.online, icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
            { label: "Failed", value: stats.failed, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/10" },
            { label: "Compliance", value: `${compliance}%`, icon: CheckCircle, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/10", sub: latestFirmware ? `${latestFirmware.version}` : "N/A" }
          ].map((stat, i) => (
            <motion.div key={i} variants={item}>
              <Card className="hover-elevate overflow-hidden border-none shadow-sm ring-1 ring-border/50 h-full bg-card/20 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{stat.label}</CardTitle>
                  <div className={`p-1.5 md:p-2 rounded-lg ${stat.bg} hidden sm:block`}>
                    <stat.icon className={`h-3 w-3 md:h-4 md:w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
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
                <Activity className="h-4 w-4 text-muted-foreground opacity-50" />
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
                              <Activity className="h-3 w-3 md:h-4 md:w-4" />
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
                <HardDrive className="h-4 w-4 text-muted-foreground opacity-50" />
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
                            <HardDrive className="h-3 w-3 md:h-4 md:w-4" />
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
