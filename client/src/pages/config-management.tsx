import { Layout } from "@/components/layout/Layout";
import { useState, useEffect, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi, deviceApi, type DeviceConfig, type Device } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings2, 
  Plus, 
  Trash2, 
  Edit, 
  Send, 
  Copy,
  RefreshCw,
  FileJson,
  Layers,
  Microchip,
  Check
} from "lucide-react";

const CONFIG_TEMPLATES = {
  basic: {
    name: "Basic Config",
    config: {
      ota: {
        checkIntervalMs: 3600000,
        serverUrl: "/ota"
      },
      reporting: {
        intervalMs: 30000,
        debugMode: false
      }
    }
  },
  wifi: {
    name: "WiFi Settings",
    config: {
      wifi: {
        ssid: "YOUR_SSID",
        password: "YOUR_PASSWORD",
        timeout: 30000
      },
      fallback: {
        enabled: true,
        ssid: "BACKUP_SSID",
        password: "BACKUP_PASSWORD"
      }
    }
  },
  mqtt: {
    name: "MQTT Config",
    config: {
      mqtt: {
        broker: "mqtt.example.com",
        port: 1883,
        clientId: "${MAC}",
        username: "",
        password: "",
        keepalive: 60,
        qos: 1
      },
      topics: {
        status: "devices/${MAC}/status",
        command: "devices/${MAC}/command",
        telemetry: "devices/${MAC}/telemetry"
      }
    }
  },
  full: {
    name: "Full Config",
    config: {
      wifi: {
        ssid: "",
        password: "",
        timeout: 30000
      },
      mqtt: {
        broker: "",
        port: 1883,
        clientId: "${MAC}"
      },
      ota: {
        checkIntervalMs: 3600000,
        serverUrl: "/ota"
      },
      reporting: {
        intervalMs: 30000,
        debugMode: false
      },
      features: {
        gps: true,
        accelerometer: false,
        display: false
      }
    }
  }
};

const CONFIG_TEMPLATE = CONFIG_TEMPLATES.basic.config;

// Memoized dialog to prevent parent re-renders when typing in form fields
const ConfigFormDialog = memo(function ConfigFormDialog({
  open,
  editingConfig,
  groups,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingConfig: DeviceConfig | null;
  groups: string[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; configData: string; isDefault: boolean; targetGroup?: string }) => void;
}) {
  // LOCAL state to prevent parent re-renders on every keystroke
  const [name, setName] = useState("");
  const [configData, setConfigData] = useState(JSON.stringify(CONFIG_TEMPLATE, null, 2));
  const [isDefault, setIsDefault] = useState(false);
  const [targetGroup, setTargetGroup] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("basic");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or editingConfig changes
  useEffect(() => {
    if (open) {
      if (editingConfig) {
        setName(editingConfig.name);
        try {
          setConfigData(JSON.stringify(JSON.parse(editingConfig.configData), null, 2));
        } catch {
          setConfigData(editingConfig.configData);
        }
        setIsDefault(editingConfig.isDefault === 1);
        setTargetGroup(editingConfig.targetGroup || "");
        setJsonError(null);
      } else {
        // Reset to defaults for new config
        setName("");
        setSelectedTemplate("basic");
        setConfigData(JSON.stringify(CONFIG_TEMPLATES.basic.config, null, 2));
        setIsDefault(false);
        setTargetGroup("");
        setJsonError(null);
      }
    }
  }, [open, editingConfig]);

  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = CONFIG_TEMPLATES[templateKey as keyof typeof CONFIG_TEMPLATES];
    if (template) {
      setConfigData(JSON.stringify(template.config, null, 2));
      setJsonError(null);
    }
  };

  const validateJson = (json: string): boolean => {
    try {
      JSON.parse(json);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(configData);
      setConfigData(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleSubmit = () => {
    if (!name) {
      return;
    }
    if (!validateJson(configData)) {
      return;
    }
    onSubmit({
      name,
      configData,
      isDefault,
      targetGroup: targetGroup || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl glassmorphism border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingConfig ? "Edit Config" : "Create Config"}</DialogTitle>
          <DialogDescription>
            Create JSON configuration to push to devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selection (only for new configs) */}
          {!editingConfig && (
            <div className="space-y-2">
              <Label>Start from Template</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CONFIG_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant={selectedTemplate === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyTemplate(key)}
                    className={selectedTemplate === key ? "bg-accent" : ""}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Production Config"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label>Target Group (optional)</Label>
              <Select value={targetGroup || "all"} onValueChange={(val) => setTargetGroup(val === "all" ? "" : val)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Configuration (JSON)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={formatJson}
                className="text-xs"
              >
                Format JSON
              </Button>
            </div>
            <Textarea
              placeholder='{"key": "value"}'
              value={configData}
              onChange={(e) => {
                setConfigData(e.target.value);
                validateJson(e.target.value);
              }}
              className="bg-black/30 border-white/10 font-mono text-sm min-h-[300px]"
            />
            {jsonError && (
              <p className="text-xs text-red-400">{jsonError}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            <Label>Set as default config for new devices</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-accent hover:bg-accent/80"
              onClick={handleSubmit}
              disabled={isPending || !!jsonError || !name}
            >
              {editingConfig ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default function ConfigManagement() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DeviceConfig | null>(null);
  const [pushDialogOpen, setPushDialogOpen] = useState<DeviceConfig | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const { data: configs = [], isLoading, refetch } = useQuery({
    queryKey: ["configs"],
    queryFn: configApi.getAll,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  // Get unique groups (filter out null/undefined)
  const groups = Array.from(new Set(devices.map((d) => d.group).filter(Boolean))) as string[];

  const createMutation = useMutation({
    mutationFn: configApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      toast.success("Config created successfully");
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof configApi.update>[1] }) =>
      configApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      toast.success("Config updated (version incremented)");
      setEditingConfig(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: configApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      toast.success("Config deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const pushMutation = useMutation({
    mutationFn: ({ id, macAddresses }: { id: number; macAddresses?: string[] }) =>
      configApi.push(id, macAddresses),
    onSuccess: (result) => {
      toast.success(`Config pushed to ${result.assignedCount} devices`);
      setPushDialogOpen(null);
      setSelectedDevices([]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handle form submission from memoized dialog
  const handleFormSubmit = (data: { name: string; configData: string; isDefault: boolean; targetGroup?: string }) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const copyConfig = (config: DeviceConfig) => {
    navigator.clipboard.writeText(config.configData);
    toast.success("Config copied to clipboard");
  };

  return (
    <Layout title="Config Management">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Device Configuration</h1>
            <p className="text-white/40 text-sm">Manage and push configs to devices without firmware updates</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="border-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-accent hover:bg-accent/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Config
            </Button>
          </div>
        </div>

        {/* Configs Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : configs.length === 0 ? (
          <Card className="glassmorphism border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings2 className="h-16 w-16 text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Configurations</h3>
              <p className="text-white/40 text-center mb-4">
                Create JSON configurations to push to your devices
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Config
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {configs.map((config) => (
                <motion.div
                  key={config.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="glassmorphism border-white/10 h-full flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-5 w-5 text-accent" />
                          <CardTitle className="text-lg">{config.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          v{config.version}
                        </Badge>
                      </div>
                      <CardDescription className="flex flex-wrap gap-2 mt-2">
                        {config.isDefault === 1 && (
                          <Badge className="bg-accent/20 text-accent text-xs">Default</Badge>
                        )}
                        {config.targetGroup && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {config.targetGroup}
                          </Badge>
                        )}
                        {(config.assignedDevices ?? 0) > 0 && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs flex items-center gap-1 ${
                              (config.pendingDevices ?? 0) > 0 ? 'border-yellow-500/50 text-yellow-400' : 'border-green-500/50 text-green-400'
                            }`}
                          >
                            <Microchip className="h-3 w-3" />
                            {config.appliedDevices ?? 0}/{config.assignedDevices ?? 0} applied
                          </Badge>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {/* Config Preview */}
                      <div className="bg-black/30 rounded-lg p-3 mb-4 flex-1 overflow-hidden">
                        <pre className="text-xs text-white/60 font-mono overflow-hidden max-h-32">
                          {(() => {
                            try {
                              const parsed = JSON.parse(config.configData);
                              const preview = JSON.stringify(parsed, null, 2);
                              return preview.length > 200 ? preview.substring(0, 200) + "..." : preview;
                            } catch {
                              return config.configData.substring(0, 200);
                            }
                          })()}
                        </pre>
                      </div>

                      {/* Updated Time */}
                      <p className="text-xs text-white/30 mb-3">
                        Updated: {new Date(config.updatedAt).toLocaleString()}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-white/10">
                        <Button
                          className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent"
                          size="sm"
                          onClick={() => {
                            setPushDialogOpen(config);
                            setSelectedDevices([]);
                          }}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Push
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyConfig(config)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingConfig(config)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (confirm("Delete this config?")) {
                              deleteMutation.mutate(config.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create/Edit Dialog - Memoized to prevent lag when typing */}
        <ConfigFormDialog
          open={createDialogOpen || !!editingConfig}
          editingConfig={editingConfig}
          groups={groups}
          isPending={createMutation.isPending || updateMutation.isPending}
          onClose={() => {
            setCreateDialogOpen(false);
            setEditingConfig(null);
          }}
          onSubmit={handleFormSubmit}
        />

        {/* Push Dialog */}
        <Dialog open={!!pushDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setPushDialogOpen(null);
            setSelectedDevices([]);
          }
        }}>
          <DialogContent className="max-w-md glassmorphism border-white/10">
            <DialogHeader>
              <DialogTitle>Push Config: {pushDialogOpen?.name}</DialogTitle>
              <DialogDescription>
                Select devices to push this configuration to
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={selectedDevices.length === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDevices([])}
                  className={selectedDevices.length === 0 ? "bg-accent" : ""}
                >
                  All Devices
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDevices(devices.map(d => d.macAddress))}
                >
                  Select All
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 bg-white/5 rounded-lg p-2">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      selectedDevices.includes(device.macAddress)
                        ? "bg-accent/20 text-accent"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => {
                      setSelectedDevices((prev) =>
                        prev.includes(device.macAddress)
                          ? prev.filter((m) => m !== device.macAddress)
                          : [...prev, device.macAddress]
                      );
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Microchip className="h-4 w-4" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-white/40">{device.macAddress}</p>
                      </div>
                    </div>
                    {selectedDevices.includes(device.macAddress) && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPushDialogOpen(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-accent hover:bg-accent/80"
                  onClick={() => {
                    if (pushDialogOpen) {
                      pushMutation.mutate({
                        id: pushDialogOpen.id,
                        macAddresses: selectedDevices.length > 0 ? selectedDevices : undefined,
                      });
                    }
                  }}
                  disabled={pushMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Push to {selectedDevices.length || devices.length} devices
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
