import { useMemo, useState } from "react";
import { Device, deviceApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  MapPin, 
  Signal, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  List,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DeviceMapProps {
  devices: Device[];
  onDeviceSelect?: (device: Device) => void;
}

interface MapMarker {
  device: Device;
  x: number;
  y: number;
}

/**
 * DeviceMap - Interactive world map showing device locations
 * Uses SVG-based map for lightweight rendering without external dependencies
 */
export function DeviceMap({ devices, onDeviceSelect }: DeviceMapProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const queryClient = useQueryClient();

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, latitude, longitude, location }: { id: string; latitude?: string; longitude?: string; location?: string }) => {
      return deviceApi.updateLocation(id, { latitude, longitude, location });
    },
    onSuccess: () => {
      toast.success("Device location updated");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setEditingDevice(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const openEditDialog = (device: Device) => {
    setEditingDevice(device);
    setEditLat(device.latitude || "");
    setEditLng(device.longitude || "");
    setEditLocation(device.location || "");
  };

  const handleSaveLocation = () => {
    if (!editingDevice) return;
    updateLocationMutation.mutate({
      id: editingDevice.id,
      latitude: editLat || undefined,
      longitude: editLng || undefined,
      location: editLocation || undefined,
    });
  };

  // Convert lat/lng to SVG coordinates (simple Mercator-like projection)
  const latLngToXY = (lat: number, lng: number): { x: number; y: number } => {
    const x = ((lng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  // Filter devices with valid coordinates
  const markers: MapMarker[] = useMemo(() => {
    return devices
      .filter(d => d.latitude && d.longitude)
      .map(device => {
        const lat = parseFloat(device.latitude!);
        const lng = parseFloat(device.longitude!);
        const { x, y } = latLngToXY(lat, lng);
        return { device, x, y };
      });
  }, [devices]);

  // Group devices by approximate location for clustering
  const clusters = useMemo(() => {
    const clusterMap = new Map<string, MapMarker[]>();
    markers.forEach(marker => {
      const key = `${Math.round(marker.x / 30)}-${Math.round(marker.y / 30)}`;
      if (!clusterMap.has(key)) clusterMap.set(key, []);
      clusterMap.get(key)!.push(marker);
    });
    return Array.from(clusterMap.entries()).map(([key, items]) => ({
      key,
      markers: items,
      x: items.reduce((sum, m) => sum + m.x, 0) / items.length,
      y: items.reduce((sum, m) => sum + m.y, 0) / items.length,
    }));
  }, [markers]);

  const getStatusColor = (device: Device) => {
    if (device.otaStatus === "failed") return "#ef4444";
    if (device.otaStatus === "updating" || device.otaStatus === "pending") return "#f59e0b";
    if (device.status === "online" || device.otaStatus === "updated") return "#22c55e";
    return "#6b7280";
  };

  const getStatusIcon = (device: Device) => {
    if (device.otaStatus === "failed") return AlertTriangle;
    if (device.otaStatus === "updating" || device.otaStatus === "pending") return Clock;
    if (device.status === "online" || device.otaStatus === "updated") return CheckCircle;
    return WifiOff;
  };

  const handleMarkerClick = (device: Device) => {
    setSelectedDevice(device);
    onDeviceSelect?.(device);
  };

  const devicesWithLocation = devices.filter(d => d.latitude && d.longitude);
  const devicesWithoutLocation = devices.filter(d => !d.latitude || !d.longitude);

  return (
    <Card className="overflow-hidden border-none shadow-lg ring-1 ring-white/10 bg-card/40 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Fleet Map
            <Badge variant="secondary" className="ml-2 text-xs">
              {devicesWithLocation.length} located
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            >
              {viewMode === "map" ? <List className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </Button>
            {viewMode === "map" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {viewMode === "map" ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden"
            >
              {/* SVG World Map */}
              <svg
                viewBox="0 0 800 400"
                className="w-full h-full"
                style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              >
                {/* Simplified world outline */}
                <defs>
                  <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Ocean background */}
                <rect width="800" height="400" fill="url(#oceanGradient)" />
                
                {/* Grid lines */}
                {Array.from({ length: 19 }).map((_, i) => (
                  <line
                    key={`lat-${i}`}
                    x1="0"
                    y1={(i * 400) / 18}
                    x2="800"
                    y2={(i * 400) / 18}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 37 }).map((_, i) => (
                  <line
                    key={`lng-${i}`}
                    x1={(i * 800) / 36}
                    y1="0"
                    x2={(i * 800) / 36}
                    y2="400"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="0.5"
                  />
                ))}

                {/* Simplified land masses (rough outlines) */}
                <path
                  d="M50,100 L100,80 L200,100 L250,120 L300,100 L350,80 L380,100 L400,140 L380,180 L320,200 L280,180 L200,200 L150,180 L80,160 Z"
                  fill="rgba(100,116,139,0.3)"
                  stroke="rgba(148,163,184,0.3)"
                  strokeWidth="0.5"
                />
                <path
                  d="M420,60 L500,40 L600,60 L700,80 L750,120 L720,180 L650,220 L580,240 L500,220 L450,180 L420,140 Z"
                  fill="rgba(100,116,139,0.3)"
                  stroke="rgba(148,163,184,0.3)"
                  strokeWidth="0.5"
                />
                <path
                  d="M200,250 L300,230 L400,250 L450,300 L400,350 L300,360 L200,340 L150,300 Z"
                  fill="rgba(100,116,139,0.3)"
                  stroke="rgba(148,163,184,0.3)"
                  strokeWidth="0.5"
                />
                <path
                  d="M600,200 L700,180 L780,220 L760,300 L680,340 L600,320 L550,280 L560,240 Z"
                  fill="rgba(100,116,139,0.3)"
                  stroke="rgba(148,163,184,0.3)"
                  strokeWidth="0.5"
                />

                {/* Device markers */}
                {clusters.map(cluster => (
                  <g key={cluster.key}>
                    {cluster.markers.length === 1 ? (
                      <g
                        onClick={() => handleMarkerClick(cluster.markers[0].device)}
                        className="cursor-pointer"
                        transform={`translate(${cluster.x}, ${cluster.y})`}
                      >
                        <circle
                          r="8"
                          fill={getStatusColor(cluster.markers[0].device)}
                          opacity="0.3"
                          filter="url(#glow)"
                        />
                        <circle
                          r="5"
                          fill={getStatusColor(cluster.markers[0].device)}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        {/* Pulse animation for online devices */}
                        {cluster.markers[0].device.status === "online" && (
                          <circle r="8" fill="none" stroke={getStatusColor(cluster.markers[0].device)} strokeWidth="1">
                            <animate attributeName="r" from="5" to="15" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="1" to="0" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    ) : (
                      <g
                        className="cursor-pointer"
                        transform={`translate(${cluster.x}, ${cluster.y})`}
                      >
                        <circle r="15" fill="rgba(139,92,246,0.3)" filter="url(#glow)" />
                        <circle r="12" fill="#8b5cf6" stroke="white" strokeWidth="2" />
                        <text
                          textAnchor="middle"
                          dy="4"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {cluster.markers.length}
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-white/70">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-white/70">Updating</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-white/70">Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-white/70">Offline</span>
                </div>
              </div>

              {/* Selected device popup */}
              <AnimatePresence>
                {selectedDevice && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4 w-64 ring-1 ring-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white">{selectedDevice.name}</h4>
                        <p className="text-xs text-white/50 font-mono">{selectedDevice.macAddress}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 -mt-1 -mr-1"
                        onClick={() => setSelectedDevice(null)}
                      >
                        ×
                      </Button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/50">Location</span>
                        <span className="text-white">{selectedDevice.location || "Unknown"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Version</span>
                        <span className="text-white font-mono">{selectedDevice.currentVersion || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Health</span>
                        <span className={`font-bold ${
                          (selectedDevice.healthScore || 0) >= 80 ? "text-emerald-400" :
                          (selectedDevice.healthScore || 0) >= 50 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {selectedDevice.healthScore || 0}%
                        </span>
                      </div>
                      {selectedDevice.signalStrength && (
                        <div className="flex justify-between">
                          <span className="text-white/50">Signal</span>
                          <span className="text-white flex items-center gap-1">
                            <Signal className="h-3 w-3" />
                            {selectedDevice.signalStrength} dBm
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* No location warning */}
              {devicesWithoutLocation.length > 0 && (
                <div className="absolute top-4 left-4 bg-amber-500/20 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {devicesWithoutLocation.length} device{devicesWithoutLocation.length > 1 ? "s" : ""} without location
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-amber-300 hover:text-amber-200"
                    onClick={() => setViewMode("list")}
                  >
                    Set locations
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-h-[400px] overflow-auto"
            >
              <div className="divide-y divide-white/5">
                {devices.map(device => {
                  const StatusIcon = getStatusIcon(device);
                  const hasLocation = device.latitude && device.longitude;
                  return (
                    <div
                      key={device.id}
                      className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => onDeviceSelect?.(device)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getStatusColor(device) }}
                        />
                        <div>
                          <p className="font-medium text-white">{device.name}</p>
                          <p className="text-xs text-white/40 font-mono">{device.macAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {device.location ? (
                          <span className="text-white/50 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {device.location}
                          </span>
                        ) : (
                          <span className="text-amber-400/60 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            No location
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {device.currentVersion || "N/A"}
                        </Badge>
                        <StatusIcon className="h-4 w-4" style={{ color: getStatusColor(device) }} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(device);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      {/* Edit Location Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Device Location</DialogTitle>
            <DialogDescription>
              Set the geographic coordinates for {editingDevice?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Location Name</Label>
              <Input
                id="location"
                placeholder="e.g., Office Building, Floor 3"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 37.7749"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., -122.4194"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: You can find coordinates using Google Maps - right-click on a location and select "What's here?"
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDevice(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveLocation}
              disabled={updateLocationMutation.isPending}
            >
              {updateLocationMutation.isPending ? "Saving..." : "Save Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default DeviceMap;
