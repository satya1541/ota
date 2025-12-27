import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceApi, firmwareApi, deployApi, Device } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Plus, MoreHorizontal, RotateCcw, Cpu, Wifi, Upload, HardDrive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useSearch } from "wouter";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Devices() {
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlSearch = urlParams.get("search") || "";

  const { data: devices = [], isLoading, refetch } = useQuery({ 
    queryKey: ["devices"], 
    queryFn: deviceApi.getAll,
    refetchInterval: 10000,
  });

  const { data: firmwares = [] } = useQuery({ 
    queryKey: ["firmware"], 
    queryFn: firmwareApi.getAll,
  });

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]); // Store MAC addresses
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [newDevice, setNewDevice] = useState({ name: "", macAddress: "", group: "APS", currentVersion: "" });

  useEffect(() => {
    if (urlSearch) setSearchTerm(urlSearch);
  }, [urlSearch]);

  const createMutation = useMutation({
    mutationFn: deviceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device registered successfully");
      setAddDialogOpen(false);
      setNewDevice({ name: "", macAddress: "", group: "default", currentVersion: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => deviceApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device updated successfully");
      setEditDialogOpen(false);
      setEditingDevice(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deployMutation = useMutation({
    mutationFn: ({ deviceIds, version }: { deviceIds: string[]; version: string }) =>
      deployApi.deploy(deviceIds, version),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      const successfulResults = data.results.filter(r => r.status === "scheduled");
      const failedResults = data.results.filter(r => r.status === "failed");
      if (failedResults.length > 0) {
        toast.warning(`Deployed to ${successfulResults.length} device(s), ${failedResults.length} failed`);
      } else if (successfulResults.length > 0) {
        toast.success(`Deployment scheduled`);
      }
      setDeployDialogOpen(false);
      setSelectedDevices([]);
      setSelectedVersion("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: deployApi.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success(`Reset OTA state`);
      setSelectedDevices([]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rollbackMutation = useMutation({
    mutationFn: deployApi.rollback,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success(data.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deviceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Device deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleEditDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    updateMutation.mutate({ 
      id: editingDevice.id, 
      updates: { 
        name: editingDevice.name, 
        group: editingDevice.group,
        currentVersion: editingDevice.currentVersion
      } 
    });
  };

  const filteredDevices = devices.filter((device: Device) => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      device.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.group.toLowerCase().includes(searchTerm.toLowerCase());
    const status = device.otaStatus || device.status;
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (filteredDevices.length > 0 && selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(filteredDevices.map((d: Device) => d.macAddress));
    }
  };

  const toggleSelectDevice = (macAddress: string) => {
    if (selectedDevices.includes(macAddress)) {
      setSelectedDevices(selectedDevices.filter(m => m !== macAddress));
    } else {
      setSelectedDevices([...selectedDevices, macAddress]);
    }
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Provision Node button clicked - registering device:", newDevice);
    if (!newDevice.name || !newDevice.macAddress) {
      toast.error("Name and MAC address are required");
      return;
    }
    createMutation.mutate(newDevice);
  };

  const handleDeploy = () => {
    if (!selectedVersion) {
      toast.error("Please select a firmware version");
      return;
    }
    const devicesToUpdate: string[] = [];
    selectedDevices.forEach(mac => {
      const device = devices.find((d: Device) => d.macAddress === mac);
      if (device && device.currentVersion !== selectedVersion) {
        devicesToUpdate.push(mac);
      }
    });
    if (devicesToUpdate.length === 0) {
      toast.info("All selected devices are already on version " + selectedVersion);
      return;
    }
    deployMutation.mutate({ deviceIds: devicesToUpdate, version: selectedVersion });
  };

  const handleResetSelected = () => {
    if (selectedDevices.length === 0) return;
    console.log("Resetting OTA status for devices:", selectedDevices);
    resetMutation.mutate(selectedDevices);
  };

  const handleRollbackSelected = () => {
    if (selectedDevices.length === 0) return;
    const devicesWithRollback = selectedDevices.filter(mac => {
      const device = devices.find((d: Device) => d.macAddress === mac);
      return device && device.previousVersion;
    });
    
    if (devicesWithRollback.length === 0) {
      toast.info("None of the selected devices have a previous version to rollback to");
      return;
    }

    console.log("Rolling back devices:", devicesWithRollback);
    devicesWithRollback.forEach(mac => rollbackMutation.mutate(mac));
    
    if (devicesWithRollback.length < selectedDevices.length) {
      toast.info(`Rolling back ${devicesWithRollback.length} devices. ${selectedDevices.length - devicesWithRollback.length} devices skipped (no previous version).`);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "online": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200/50";
      case "updated": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200/50";
      case "offline": return "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200/50";
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200/50 animate-pulse";
      case "updating": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200/50 animate-pulse";
      case "failed": return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200/50";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <Layout title="Fleet Management">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Fleet", value: devices.length, icon: Cpu, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
            { label: "Online", value: devices.filter((d: Device) => d.status === "online").length, icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
            { label: "Updates", value: devices.filter((d: Device) => d.otaStatus === "pending" || d.otaStatus === "updating").length, icon: RefreshCw, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
            { label: "Faults", value: devices.filter((d: Device) => d.otaStatus === "failed").length, icon: RotateCcw, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/10" }
          ].map((stat, i) => (
            <motion.div key={i} variants={item} className="bg-card border-none shadow-sm ring-1 ring-border/50 rounded-2xl p-4 flex items-center gap-3 md:gap-4 h-full">
              <div className={`p-2 md:p-3 rounded-xl ${stat.bg} flex-shrink-0`}>
                <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg md:text-xl font-bold tracking-tight">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div variants={item} className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/50 p-4 rounded-2xl ring-1 ring-border/30">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64 md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search fleet..." 
                className="pl-9 h-10 border-none bg-background/50 shadow-inner ring-1 ring-border/50 focus-visible:ring-accent w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 border-none bg-background/50 ring-1 ring-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <AnimatePresence>
              {selectedDevices.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 border-none bg-background/50 ring-1 ring-border/50 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    onClick={() => setSelectedDevices([])}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 border-none bg-background/50 ring-1 ring-border/50"
                    onClick={handleResetSelected}
                    disabled={resetMutation.isPending}
                  >
                    Reset Status ({selectedDevices.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 border-none bg-background/50 ring-1 ring-border/50 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                    onClick={handleRollbackSelected}
                    disabled={rollbackMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Rollback ({selectedDevices.length})
                  </Button>
                  <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-10 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                        <Upload className="mr-2 h-4 w-4" /> 
                        Deploy ({selectedDevices.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>OTA Deployment</DialogTitle>
                        <DialogDescription>
                          Select target firmware for {selectedDevices.length} nodes.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Firmware Build</Label>
                          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                            <SelectTrigger className="h-12 border-none bg-muted/50 ring-1 ring-border/50">
                              <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                              {firmwares.map((fw) => (
                                <SelectItem key={fw.id} value={fw.version}>
                                  <div className="flex flex-col">
                                    <span className="font-bold">{fw.version}</span>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">{fw.description || fw.filename}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="ghost" onClick={() => setDeployDialogOpen(false)}>Cancel</Button>
                          <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 px-8"
                            onClick={handleDeploy} 
                            disabled={deployMutation.isPending || !selectedVersion}
                          >
                            {deployMutation.isPending ? "Deploying..." : "Start OTA"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 ring-1 ring-border/50 rounded-xl" onClick={() => refetch()}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-accent" : ""}`} />
              </Button>
              
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 bg-primary hover-elevate px-4">
                    <Plus className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Register Node</span><span className="sm:hidden">Register</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-2xl border-none ring-1 ring-border/50 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">Register ESP32 Node</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider"> Provision a new device to your fleet</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddDevice} className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Friendly Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. Living Room Gateway" 
                        value={newDevice.name} 
                        onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} 
                        className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mac" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between items-center">
                        <span>MAC Identity</span>
                        <span className="text-[8px] opacity-50 lowercase font-medium">aa:bb:cc:dd:ee:ff</span>
                      </Label>
                      <Input 
                        id="mac" 
                        placeholder="00:00:00:00:00:00" 
                        value={newDevice.macAddress} 
                        onChange={(e) => {
                          let val = e.target.value.toUpperCase().replace(/[^0-9A-F:]/g, "");
                          // Auto-colon formatting
                          const prevVal = newDevice.macAddress;
                          if (val.length > prevVal.length) {
                             if ([2, 5, 8, 11, 14].includes(val.length)) {
                               if (val[val.length - 1] !== ":") {
                                 val = val.slice(0, -1) + ":" + val.slice(-1);
                               }
                             }
                          }
                          setNewDevice({ ...newDevice, macAddress: val.substring(0, 17) });
                        }} 
                        className="font-mono h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Group</Label>
                      <Select 
                        value={newDevice.group} 
                        onValueChange={(val) => setNewDevice({ ...newDevice, group: val })}
                      >
                        <SelectTrigger id="group" className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus:ring-accent rounded-xl">
                          <SelectValue placeholder="Select Group" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl ring-1 ring-border/50">
                          <SelectItem value="APS">APS</SelectItem>
                          <SelectItem value="ERS">ERS</SelectItem>
                          <SelectItem value="FRS">FRS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentVersion" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Version</Label>
                      <Input 
                        id="currentVersion" 
                        placeholder="e.g. v1.0.0" 
                        value={newDevice.currentVersion} 
                        onChange={(e) => setNewDevice({ ...newDevice, currentVersion: e.target.value })} 
                        className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl" 
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} className="h-12 font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending || newDevice.macAddress.length < 17} 
                        className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-indigo-500/20"
                      >
                        {createMutation.isPending ? "Provisioning..." : "Provision Node"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-2xl border-none ring-1 ring-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Edit ESP32 Node</DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Update device configuration</DialogDescription>
            </DialogHeader>
            {editingDevice && (
              <form onSubmit={handleEditDevice} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Friendly Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editingDevice.name} 
                    onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })} 
                    className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">MAC Identity</Label>
                  <Input 
                    disabled 
                    value={editingDevice.macAddress} 
                    className="h-12 bg-muted/10 border-none ring-1 ring-border/20 text-muted-foreground font-mono rounded-xl opacity-60" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-group" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Group</Label>
                  <Select 
                    value={editingDevice.group} 
                    onValueChange={(val) => setEditingDevice({ ...editingDevice, group: val })}
                  >
                    <SelectTrigger id="edit-group" className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus:ring-accent rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl ring-1 ring-border/50">
                      <SelectItem value="APS">APS</SelectItem>
                      <SelectItem value="ERS">ERS</SelectItem>
                      <SelectItem value="FRS">FRS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-version" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Version</Label>
                  <Input 
                    id="edit-version" 
                    value={editingDevice.currentVersion || ""} 
                    onChange={(e) => setEditingDevice({ ...editingDevice, currentVersion: e.target.value })} 
                    className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl" 
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="h-12 font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending} 
                    className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg"
                  >
                    {updateMutation.isPending ? "Updating..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <motion.div variants={item} className="bg-card border-none shadow-sm ring-1 ring-border/50 rounded-2xl overflow-x-auto">
          <Table className="min-w-[800px] md:min-w-full">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[50px] pl-6">
                  <Checkbox checked={filteredDevices.length > 0 && selectedDevices.length === filteredDevices.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Identity</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Group</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">OTA Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Activity</TableHead>
                <TableHead className="text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-64 text-center text-muted-foreground animate-pulse font-bold uppercase tracking-widest text-xs">Scanning nodes...</TableCell></TableRow>
              ) : filteredDevices.length > 0 ? (
                filteredDevices.map((device: Device) => (
                  <TableRow key={device.id} className="group hover:bg-muted/30 transition-colors border-b-border/30 last:border-0">
                    <TableCell className="pl-6">
                      <Checkbox checked={selectedDevices.includes(device.macAddress)} onCheckedChange={() => toggleSelectDevice(device.macAddress)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm group-hover:text-accent transition-colors truncate max-w-[150px]">{device.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">{device.macAddress}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-background/50 border-none ring-1 ring-border/50">{device.group}</Badge>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[80px]">{device.currentVersion || "BOOT"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Badge className={`${getStatusStyle(device.otaStatus || device.status)} text-[9px] font-bold uppercase px-2 py-0.5 w-fit border-none shadow-sm`}>
                          {device.otaStatus || device.status}
                        </Badge>
                        {device.targetVersion && device.targetVersion !== device.currentVersion && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase tracking-tighter">
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                            Target: {device.targetVersion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${device.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase truncate">
                          {device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }) : "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-background shadow-sm ring-1 ring-border/30 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl border-none shadow-xl ring-1 ring-border/50">
                          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Node Actions</div>
                          <DropdownMenuItem className="gap-2" onClick={() => {
                            setEditingDevice(device);
                            setEditDialogOpen(true);
                          }}>
                            <Upload className="h-4 w-4" /> Edit Device
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 focus:bg-accent focus:text-white" onClick={() => rollbackMutation.mutate(device.macAddress)} disabled={!device.previousVersion}>
                            <RotateCcw className="h-4 w-4" /> Rollback to {device.previousVersion || "N/A"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => resetMutation.mutate([device.macAddress])}>
                            <RefreshCw className="h-4 w-4" /> Reset OTA Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 gap-2 focus:bg-rose-500 focus:text-white">
                                <RotateCcw className="h-4 w-4 rotate-45" /> Terminate Node
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl border-none ring-1 ring-border/50 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-[425px]">
                              <AlertDialogTitle className="font-bold">Terminate Node?</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">This will permanently remove <b>{device.name}</b> from the fleet registry.</AlertDialogDescription>
                              <div className="flex gap-2 justify-end pt-4">
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(device.id)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/20 px-6">Terminate</AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-64 text-center italic text-muted-foreground font-medium">No nodes matching current filters</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
