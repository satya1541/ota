import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceApi, firmwareApi, logsApi, deployApi, Device, Firmware, DeviceLog } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, PlayCircle, Rocket, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Deployments() {
  const queryClient = useQueryClient();
  
  const { data: devices = [] } = useQuery({ 
    queryKey: ["devices"], 
    queryFn: deviceApi.getAll 
  });
  
  const { data: firmwares = [] } = useQuery({ 
    queryKey: ["firmware"], 
    queryFn: firmwareApi.getAll 
  });
  
  const { data: logs = [], refetch: refetchLogs } = useQuery({ 
    queryKey: ["logs"], 
    queryFn: () => logsApi.getAll(),
    refetchInterval: 5000,
  });

  const deviceList = devices as Device[];
  const firmwareList = firmwares as Firmware[];
  const logList = logs as DeviceLog[];

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    version: "",
    selectedDevices: [] as string[], // MAC addresses
  });

  // Deploy mutation - uses MAC addresses
  const deployMutation = useMutation({
    mutationFn: ({ macAddresses, version }: { macAddresses: string[]; version: string }) =>
      deployApi.deploy(macAddresses, version),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      
      const successful = data.results.filter(r => r.status === "scheduled").length;
      const failed = data.results.filter(r => r.status === "failed").length;
      
      if (failed > 0) {
        toast.warning(`Deployed to ${successful} device(s), ${failed} failed`);
      } else {
        toast.success(`Deployment scheduled for ${successful} device(s)`);
      }
      
      setOpen(false);
      setFormData({ version: "", selectedDevices: [] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Rollback mutation - uses MAC address
  const rollbackMutation = useMutation({
    mutationFn: deployApi.rollback,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDeploy = () => {
    if (formData.selectedDevices.length === 0) {
      toast.error("Please select at least one device");
      return;
    }
    if (!formData.version) {
      toast.error("Please select a firmware version");
      return;
    }
    deployMutation.mutate({
      macAddresses: formData.selectedDevices,
      version: formData.version,
    });
  };

  const toggleDevice = (macAddress: string) => {
    if (formData.selectedDevices.includes(macAddress)) {
      setFormData({ 
        ...formData, 
        selectedDevices: formData.selectedDevices.filter(d => d !== macAddress) 
      });
    } else {
      setFormData({ 
        ...formData, 
        selectedDevices: [...formData.selectedDevices, macAddress] 
      });
    }
  };

  const selectAllDevices = () => {
    if (formData.selectedDevices.length === deviceList.length) {
      setFormData({ ...formData, selectedDevices: [] });
    } else {
      setFormData({ 
        ...formData, 
        selectedDevices: deviceList.map(d => d.macAddress) 
      });
    }
  };

  // Get pending deployments (devices with pending OTA status)
  const pendingDevices = deviceList.filter(d => 
    d.otaStatus === "pending" && d.targetVersion && d.targetVersion !== d.currentVersion
  );

  // Get recent deployment logs
  const deploymentLogs = logList.filter(l => 
    ["deploy", "report", "rollback", "check"].includes(l.action)
  ).slice(0, 50);

  const getActionIcon = (action: string, status: string) => {
    if (status === "failed") return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === "success") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (action === "deploy") return <Rocket className="h-4 w-4 text-blue-600" />;
    if (action === "rollback") return <RefreshCw className="h-4 w-4 text-yellow-600" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout title="Deployments">
      <div className="flex flex-col gap-6">
        {/* Pending Updates Section */}
        {pendingDevices.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Updates ({pendingDevices.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingDevices.map((device) => (
                <Card key={device.id} className="border-yellow-200 bg-yellow-50/20">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base font-mono">{device.macAddress}</CardTitle>
                        <CardDescription>{device.name || "Unnamed device"}</CardDescription>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current:</span>
                        <span className="font-mono">{device.currentVersion || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-mono text-yellow-700">{device.targetVersion}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => rollbackMutation.mutate(device.macAddress)}
                        disabled={!device.previousVersion || rollbackMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Create Deployment & Logs */}
        <section>
          <Tabs defaultValue="history">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Deployment Management</h2>
              <div className="flex gap-2">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={firmwareList.length === 0}>
                      <PlayCircle className="mr-2 h-4 w-4" /> Create Deployment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Deployment</DialogTitle>
                      <DialogDescription>
                        Select firmware and target devices for OTA update.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Firmware Version</Label>
                        <Select value={formData.version} onValueChange={(val) => setFormData({ ...formData, version: val })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select firmware" />
                          </SelectTrigger>
                          <SelectContent>
                            {firmwareList.map((fw) => (
                              <SelectItem key={fw.id} value={fw.version}>
                                {fw.version} - {fw.description || fw.filename}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Target Devices</Label>
                          <Button variant="ghost" size="sm" onClick={selectAllDevices}>
                            {formData.selectedDevices.length === deviceList.length ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                          {deviceList.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No devices registered</p>
                          ) : (
                            deviceList.map((device) => (
                              <div key={device.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={formData.selectedDevices.includes(device.macAddress)}
                                  onCheckedChange={() => toggleDevice(device.macAddress)}
                                />
                                <span className="text-sm font-mono">{device.macAddress}</span>
                                <span className="text-xs text-muted-foreground">({device.currentVersion || "N/A"})</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleDeploy} 
                          disabled={deployMutation.isPending || !formData.version || formData.selectedDevices.length === 0}
                        >
                          {deployMutation.isPending ? "Deploying..." : "Deploy"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <TabsList>
                  <TabsTrigger value="history">Activity Log</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Deployment Activity</CardTitle>
                  <CardDescription>Real-time log of all OTA operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {deploymentLogs.length > 0 ? (
                      deploymentLogs.map((log) => {
                        const device = deviceList.find(d => d.macAddress === log.macAddress || d.id === log.deviceId);
                        const displayName = device?.name || log.macAddress || log.deviceId;
                        const macAddress = log.macAddress || device?.macAddress;
                        return (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border-b last:border-0">
                          {getActionIcon(log.action, log.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {displayName}{macAddress && displayName !== macAddress && ` (${macAddress})`}
                              </Badge>
                              <Badge className={`text-xs ${getStatusColor(log.status)}`}>{log.action}</Badge>
                              {log.toVersion && (
                                <span className="text-xs text-muted-foreground">
                                  {log.fromVersion ? `${log.fromVersion} → ${log.toVersion}` : `→ ${log.toVersion}`}
                                </span>
                              )}
                            </div>
                            {log.message && <p className="text-sm mt-1 text-foreground">{log.message}</p>}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                            </span>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No deployment activity yet. Create your first deployment above.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="stats">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{deviceList.length}</div>
                    <p className="text-xs text-muted-foreground">Total Devices</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {deviceList.filter(d => d.otaStatus === "updated").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Successfully Updated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{pendingDevices.length}</div>
                    <p className="text-xs text-muted-foreground">Pending Updates</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {deviceList.filter(d => d.otaStatus === "failed").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </Layout>
  );
}
