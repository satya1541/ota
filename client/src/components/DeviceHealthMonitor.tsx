import { useMemo } from "react";
import { Device } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Heart, 
  Signal, 
  Cpu, 
  HardDrive, 
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { motion } from "framer-motion";

interface DeviceHealthMonitorProps {
  devices: Device[];
  className?: string;
}

/**
 * DeviceHealthMonitor - Real-time fleet health visualization
 * Shows health scores, signal strength, memory usage, and trends
 */
export function DeviceHealthMonitor({ devices, className }: DeviceHealthMonitorProps) {
  const healthStats = useMemo(() => {
    const devicesWithHealth = devices.filter(d => d.healthScore !== null);
    const totalHealth = devicesWithHealth.reduce((sum, d) => sum + (d.healthScore || 0), 0);
    const avgHealth = devicesWithHealth.length > 0 ? totalHealth / devicesWithHealth.length : 0;

    const critical = devices.filter(d => (d.healthScore || 0) < 30);
    const warning = devices.filter(d => (d.healthScore || 0) >= 30 && (d.healthScore || 0) < 70);
    const healthy = devices.filter(d => (d.healthScore || 0) >= 70);

    const avgSignal = devices.reduce((sum, d) => sum + (d.signalStrength || -100), 0) / devices.length;
    const avgUptime = devices.reduce((sum, d) => sum + (d.uptime || 0), 0) / devices.length;

    return {
      avgHealth,
      critical: critical.length,
      warning: warning.length,
      healthy: healthy.length,
      avgSignal,
      avgUptime,
      criticalDevices: critical,
    };
  }, [devices]);

  const formatUptime = (seconds: number) => {
    if (!seconds) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getSignalBars = (rssi: number | null) => {
    if (!rssi) return 0;
    if (rssi >= -50) return 4;
    if (rssi >= -60) return 3;
    if (rssi >= -70) return 2;
    return 1;
  };

  return (
    <Card className={`border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          Fleet Health Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Score */}
        <div className="relative">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(healthStats.avgHealth / 100) * 351.86} 351.86`}
                  className={getHealthColor(healthStats.avgHealth)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-black ${getHealthColor(healthStats.avgHealth)}`}>
                  {Math.round(healthStats.avgHealth)}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">Health</span>
              </div>
            </div>
          </div>

          {/* Health distribution */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
              <Heart className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-emerald-400">{healthStats.healthy}</p>
              <p className="text-[9px] uppercase tracking-widest text-emerald-400/60">Healthy</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 text-center">
              <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-400">{healthStats.warning}</p>
              <p className="text-[9px] uppercase tracking-widest text-amber-400/60">Warning</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center">
              <Activity className="h-4 w-4 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-400">{healthStats.critical}</p>
              <p className="text-[9px] uppercase tracking-widest text-red-400/60">Critical</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Fleet Metrics
          </h4>

          {/* Average Signal Strength */}
          <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white/70">Avg Signal</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map(bar => (
                  <div
                    key={bar}
                    className={`w-1.5 rounded-sm ${
                      bar <= getSignalBars(healthStats.avgSignal)
                        ? "bg-blue-400"
                        : "bg-white/20"
                    }`}
                    style={{ height: `${bar * 4}px` }}
                  />
                ))}
                <span className="ml-2 text-sm font-mono text-white">
                  {Math.round(healthStats.avgSignal)} dBm
                </span>
              </div>
            </div>
          </div>

          {/* Average Uptime */}
          <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white/70">Avg Uptime</span>
              </div>
              <span className="text-sm font-mono text-white">
                {formatUptime(healthStats.avgUptime)}
              </span>
            </div>
          </div>
        </div>

        {/* Critical Devices */}
        {healthStats.criticalDevices.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400/70 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              Critical Devices
            </h4>
            <div className="space-y-2">
              {healthStats.criticalDevices.slice(0, 5).map(device => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 rounded-xl p-3 ring-1 ring-red-500/20 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{device.name}</p>
                    <p className="text-xs text-white/40 font-mono">{device.macAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-400">{device.healthScore}%</p>
                    <div className="flex items-center gap-1 text-xs text-red-400/70">
                      {device.consecutiveFailures && device.consecutiveFailures > 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3" />
                          {device.consecutiveFailures} failures
                        </>
                      ) : (
                        <>
                          <Minus className="h-3 w-3" />
                          Low health
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Device Health List */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">
            All Devices
          </h4>
          <div className="max-h-[200px] overflow-auto space-y-2 pr-2">
            {devices
              .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0))
              .map(device => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{device.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {device.signalStrength && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4].map(bar => (
                          <div
                            key={bar}
                            className={`w-1 rounded-sm ${
                              bar <= getSignalBars(device.signalStrength)
                                ? "bg-white/60"
                                : "bg-white/20"
                            }`}
                            style={{ height: `${bar * 3}px` }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="w-16">
                      <Progress 
                        value={device.healthScore || 0} 
                        className="h-1.5"
                      />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${getHealthColor(device.healthScore || 0)}`}>
                      {device.healthScore || 0}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DeviceHealthMonitor;
