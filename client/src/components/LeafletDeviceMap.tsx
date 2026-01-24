import { useMemo, useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
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
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Signal,
  AlertTriangle,
  List,
  Edit2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LeafletDeviceMapProps {
  devices: Device[];
  onDeviceSelect?: (device: Device) => void;
}

// Status colors for markers
const statusColors: Record<string, string> = {
  idle: "#22c55e",      // green
  pending: "#f59e0b",   // amber
  updating: "#3b82f6",  // blue
  updated: "#10b981",   // emerald
  failed: "#ef4444",    // red
  offline: "#6b7280",   // gray
};

// Create custom colored marker icon with enhanced visibility
function createColoredIcon(color: string, isSelected: boolean = false, status: string = ""): L.DivIcon {
  const size = isSelected ? 24 : 18;
  const borderWidth = isSelected ? 4 : 3;
  const isUpdating = status === "updating" || status === "pending";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <!-- Glowing Pulse Effect -->
        <div style="
          position: absolute;
          inset: -8px;
          background-color: ${color};
          border-radius: 50%;
          opacity: 0.4;
          animation: map-pulse 2s infinite ease-out;
        "></div>
        
        <!-- Rotating/Spinning Ring for active status -->
        ${isUpdating ? `
          <div style="
            position: absolute;
            inset: -4px;
            border: 2px dashed ${color};
            border-radius: 50%;
            animation: map-rotate 3s linear infinite;
          "></div>
        ` : ''}

        <!-- Main Marker -->
        <div style="
          position: relative;
          width: 100%;
          height: 100%;
          background-color: ${color};
          border: ${borderWidth}px solid white;
          border-radius: 50%;
          box-shadow: 0 0 15px ${color}80, 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Inner Dot for updated status -->
          ${status === "updated" ? `
            <div style="width: 40%; height: 40%; background-color: white; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          ` : ''}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Component to fit map bounds to markers
function FitBounds({ devices }: { devices: Device[] }) {
  const map = useMap();

  useEffect(() => {
    if (devices.length > 0) {
      const bounds = L.latLngBounds(
        devices.map(d => [parseFloat(d.latitude!), parseFloat(d.longitude!)])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [devices, map]);

  return null;
}

// Component to handle marker clustering
function MarkerClusterGroup({ devices, onDeviceClick, selectedDeviceId, getStatusColor, t }: {
  devices: Device[];
  onDeviceClick: (device: Device) => void;
  selectedDeviceId: string | null;
  getStatusColor: (device: Device) => string;
  t: (key: string) => string;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    // Remove existing cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    // Create new cluster group
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            background-color: #8b5cf6;
            color: white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(40, 40),
        });
      },
    });

    // Add markers to cluster group
    devices.forEach(device => {
      const lat = parseFloat(device.latitude!);
      const lng = parseFloat(device.longitude!);
      const color = getStatusColor(device);
      const isSelected = device.id === selectedDeviceId;

      const marker = L.marker([lat, lng], {
        icon: createColoredIcon(color, isSelected, device.otaStatus || device.status),
      });

      // Create tooltip content (shows on hover)
      const tooltipContent = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif; padding: 4px;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600; font-size: 14px;">${device.name || device.macAddress}</h4>
          <div style="font-size: 11px; color: #666; margin-bottom: 8px; font-family: monospace;">${device.macAddress}</div>
          <div style="display: grid; gap: 4px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #666;">${t('fleet_map.location')}:</span>
              <span>${device.location || t('fleet_map.unknown')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #666;">${t('fleet_map.version')}:</span>
              <span style="font-family: monospace;">${device.currentVersion || t('fleet_map.not_available')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #666;">${t('fleet_map.status')}:</span>
              <span style="color: ${color}; font-weight: 600; text-transform: capitalize;">${device.otaStatus || device.status}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #666;">${t('fleet_map.health')}:</span>
              <span style="font-weight: 600; color: ${(device.healthScore || 0) >= 80 ? '#22c55e' : (device.healthScore || 0) >= 50 ? '#f59e0b' : '#ef4444'};">${device.healthScore || 0}%</span>
            </div>
            ${device.signalStrength ? `
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                <span style="color: #666;">${t('fleet_map.signal')}:</span>
                <span>${device.signalStrength} dBm</span>
              </div>
            ` : ''}
            ${device.ipAddress ? `
              <div style="display: flex; justify-content: space-between; gap: 16px;">
                <span style="color: #666;">${t('fleet_map.ip')}:</span>
                <span style="font-family: monospace; font-size: 11px;">${device.ipAddress}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Bind tooltip for hover (instead of popup for click)
      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: L.point(0, -10),
        opacity: 0.95,
        className: 'device-tooltip',
      });

      marker.on("click", () => onDeviceClick(device));

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [devices, map, onDeviceClick, selectedDeviceId, getStatusColor, t]);

  return null;
}

/**
 * LeafletDeviceMap - Interactive OpenStreetMap showing device locations
 * Features: Free OpenStreetMap tiles, marker clustering, real-time updates
 */
export function LeafletDeviceMap({ devices, onDeviceSelect }: LeafletDeviceMapProps) {
  const { t } = useTranslation();
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

  // Filter devices with valid coordinates
  const devicesWithLocation = useMemo(() => {
    return devices.filter(d => {
      if (!d.latitude || !d.longitude) return false;
      const lat = parseFloat(d.latitude);
      const lng = parseFloat(d.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });
  }, [devices]);

  const devicesWithoutLocation = useMemo(() => {
    return devices.filter(d => !d.latitude || !d.longitude);
  }, [devices]);

  const getStatusColor = (device: Device): string => {
    if (device.otaStatus === "failed") return statusColors.failed;
    if (device.otaStatus === "updating") return statusColors.updating;
    if (device.otaStatus === "pending") return statusColors.pending;
    if (device.otaStatus === "updated") return statusColors.updated;
    if (device.status === "online") return statusColors.idle;
    return statusColors.offline;
  };

  const handleMarkerClick = (device: Device) => {
    setSelectedDevice(device);
    onDeviceSelect?.(device);
  };

  const getStatusIcon = (device: Device) => {
    if (device.otaStatus === "failed") return AlertTriangle;
    return Signal;
  };

  // Default center (India)
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <Card className="overflow-hidden border-none shadow-lg ring-1 ring-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            {t('fleet_map.title')}
            <Badge variant="secondary" className="ml-2 text-xs">
              {devicesWithLocation.length} {t('fleet_map.located')}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["devices"] })}
              title={t('fleet_map.refresh_devices')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            >
              {viewMode === "map" ? <List className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </Button>
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
              className="relative"
            >
              <style>{`
                .custom-marker {
                  background: transparent !important;
                  border: none !important;
                }
                .custom-cluster-icon {
                  background: transparent !important;
                  border: none !important;
                }
                @keyframes map-pulse {
                  0% { transform: scale(1); opacity: 0.6; }
                  100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes map-rotate {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes ping {
                  75%, 100% { transform: scale(2); opacity: 0; }
                }
                .leaflet-popup-content-wrapper {
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                }
                .leaflet-popup-content {
                  margin: 12px 16px;
                }
                .device-tooltip {
                  background-color: hsl(var(--card) / 0.95) !important;
                  border: 1px solid hsl(var(--border)) !important;
                  border-radius: 12px !important;
                  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
                  padding: 0 !important;
                }
                .device-tooltip .leaflet-tooltip-content {
                  color: hsl(var(--foreground));
                }
                .device-tooltip::before {
                  border-top-color: hsl(var(--card) / 0.95) !important;
                }
                .device-tooltip h4 {
                  color: hsl(var(--foreground)) !important;
                }
                .device-tooltip span {
                  color: hsl(var(--muted-foreground)) !important;
                }
                .device-tooltip div > span:last-child {
                  color: hsl(var(--foreground)) !important;
                }
              `}</style>

              <MapContainer
                center={defaultCenter}
                zoom={5}
                style={{ height: "500px", width: "100%" }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {devicesWithLocation.length > 0 && (
                  <>
                    <FitBounds devices={devicesWithLocation} />
                    <MarkerClusterGroup
                      devices={devicesWithLocation}
                      onDeviceClick={handleMarkerClick}
                      selectedDeviceId={selectedDevice?.id || null}
                      getStatusColor={getStatusColor}
                      t={t}
                    />
                  </>
                )}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 z-[1000] bg-background/80 backdrop-blur-md rounded-lg p-3 text-xs space-y-2 ring-1 ring-border/50 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.idle }} />
                  <span className="text-foreground/80">{t('fleet_map.online')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.updating }} />
                  <span className="text-foreground/80">{t('fleet_map.updating')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.pending }} />
                  <span className="text-foreground/80">{t('fleet_map.pending')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.failed }} />
                  <span className="text-foreground/80">{t('fleet_map.failed')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.offline }} />
                  <span className="text-foreground/80">{t('fleet_map.offline')}</span>
                </div>
              </div>

              {/* No location warning */}
              {devicesWithoutLocation.length > 0 && (
                <div className="absolute top-4 left-4 z-[1000] bg-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2 border border-amber-500/30">
                  <AlertTriangle className="h-4 w-4" />
                  {devicesWithoutLocation.length} {devicesWithoutLocation.length > 1 ? t('fleet_map.devices') : t('fleet_map.device')} {t('fleet_map.without_location')}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                    onClick={() => setViewMode("list")}
                  >
                    {t('fleet_map.set_locations')}
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
              className="max-h-[500px] overflow-auto"
            >
              <div className="divide-y divide-border">
                {devices.map(device => {
                  const StatusIcon = getStatusIcon(device);
                  return (
                    <div
                      key={device.id}
                      className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between"
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
                          <p className="font-medium text-foreground">{device.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{device.macAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {device.location ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {device.location}
                          </span>
                        ) : (
                          <span className="text-amber-500/80 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('fleet_map.no_location')}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {device.currentVersion || t('fleet_map.not_available')}
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
            <DialogTitle>{t('fleet_map.set_device_location')}</DialogTitle>
            <DialogDescription>
              {t('fleet_map.set_coordinates')} {editingDevice?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="location">{t('fleet_map.location_name')}</Label>
              <Input
                id="location"
                placeholder={t('fleet_map.location_placeholder')}
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">{t('fleet_map.latitude')}</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder={t('fleet_map.latitude_placeholder')}
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">{t('fleet_map.longitude')}</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder={t('fleet_map.longitude_placeholder')}
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('fleet_map.coordinates_tip')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDevice(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={updateLocationMutation.isPending}
            >
              {updateLocationMutation.isPending ? t('fleet_map.saving') : t('fleet_map.save_location')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
