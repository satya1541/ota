import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { firmwareApi, deviceApi, deployApi, Firmware as FirmwareType, Device } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileCode, Clock, Hash, Trash2, Loader2, Rocket, HardDrive, Search, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function Firmware() {
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlSearch = urlParams.get("search") || "";
  
  const { data: firmwares = [], isLoading } = useQuery({ 
    queryKey: ["firmware"], 
    queryFn: firmwareApi.getAll 
  });

  const { data: devices = [] } = useQuery({ 
    queryKey: ["devices"], 
    queryFn: deviceApi.getAll 
  });

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareType | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]); // MAC addresses
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ version: "", description: "" });

  useEffect(() => {
    if (urlSearch) setSearchTerm(urlSearch);
  }, [urlSearch]);

  const filteredFirmwares = firmwares.filter((fw: FirmwareType) =>
    fw.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fw.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fw.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uploadMutation = useMutation({
    mutationFn: ({ file, version, description }: { file: File; version: string; description: string }) =>
      firmwareApi.upload(file, version, description),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["firmware"] });
      toast.success(`Firmware ${data.version} uploaded successfully`);
      setUploadOpen(false);
      setFile(null);
      setFormData({ version: "", description: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deployMutation = useMutation({
    mutationFn: ({ deviceIds, version }: { deviceIds: string[]; version: string }) =>
      deployApi.deploy(deviceIds, version),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      const successful = data.results.filter(r => r.status === "scheduled").length;
      toast.success(`Firmware deployed to ${successful} device(s)`);
      setDeployOpen(false);
      setSelectedDevices([]);
      setSelectedFirmware(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: firmwareApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firmware"] });
      toast.success("Firmware deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version) {
      toast.error("Please provide a version number");
      return;
    }
    if (!file) {
      toast.error("Please select a firmware file");
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, version: formData.version, description: formData.description });
    } finally {
      setUploading(false);
    }
  };

  const handleDeploy = () => {
    if (!selectedFirmware || selectedDevices.length === 0) {
      toast.error("Please select at least one device");
      return;
    }
    deployMutation.mutate({ deviceIds: selectedDevices, version: selectedFirmware.version });
  };

  const openDeployDialog = (fw: FirmwareType) => {
    setSelectedFirmware(fw);
    setSelectedDevices([]);
    setDeployOpen(true);
  };

  const toggleDevice = (macAddress: string) => {
    if (selectedDevices.includes(macAddress)) {
      setSelectedDevices(selectedDevices.filter(m => m !== macAddress));
    } else {
      setSelectedDevices([...selectedDevices, macAddress]);
    }
  };

  const selectAllDevices = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map((d: Device) => d.macAddress));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Layout title="Firmware Library">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Repository</h2>
            <p className="text-muted-foreground text-sm">Manage and deploy compiled binary assets across your fleet.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repository..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-none bg-card/50 ring-1 ring-border/50"
              />
            </div>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 px-6 bg-primary hover-elevate">
                  <Upload className="mr-2 h-4 w-4" /> Push Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Push New Asset</DialogTitle>
                  <DialogDescription>
                    Upload a new firmware binary to the central repository.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="file" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Binary Payload (.bin)</Label>
                    <div className="relative group">
                      <Input 
                        id="file" 
                        type="file" 
                        accept=".bin,.hex"
                        className="h-12 border-dashed border-2 bg-muted/30 group-hover:bg-muted/50 transition-colors"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setFile(f);
                            toast.info(`Asset selected: ${f.name}`);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Version ID</Label>
                    <Input 
                      id="version" 
                      placeholder="e.g. v2.1.4-stable"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Release Notes</Label>
                    <Textarea 
                      id="desc" 
                      placeholder="Commit message or release highlights..." 
                      className="resize-none"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={uploading || !file} className="px-8">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Push to Repository"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Stage OTA Deployment</DialogTitle>
              <DialogDescription>
                Targeting version <span className="font-mono font-bold text-accent">{selectedFirmware?.version}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-end">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Nodes</Label>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={selectAllDevices}>
                  {selectedDevices.length === devices.length ? "Deselect All" : "Select All Fleet"}
                </Button>
              </div>
              <div className="border rounded-xl p-2 max-h-64 overflow-y-auto space-y-1 bg-muted/20 ring-1 ring-border/50">
                {devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-50">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No active nodes</p>
                  </div>
                ) : (
                  devices.map((device: Device) => (
                    <div 
                      key={device.id} 
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedDevices.includes(device.macAddress) 
                        ? "bg-accent/10 ring-1 ring-accent/50" 
                        : "hover:bg-background/80"
                      }`}
                      onClick={() => toggleDevice(device.macAddress)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedDevices.includes(device.macAddress)}
                          onCheckedChange={() => toggleDevice(device.macAddress)}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{device.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">{device.macAddress}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/50 border-none ring-1 ring-border/30">
                        {device.currentVersion || "BOOT"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/20">
                <span className="text-xs font-bold uppercase tracking-widest text-accent/80">Staged Nodes</span>
                <span className="text-lg font-black text-accent">{selectedDevices.length}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDeployOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleDeploy} 
                  disabled={deployMutation.isPending || selectedDevices.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 px-8"
                >
                  {deployMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initiate Update Cycle"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse ring-1 ring-border/50" />
            ))}
          </div>
        ) : firmwares.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/5 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-6">
                <FileCode className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Empty Repository</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                Your firmware library is empty. Push your first compiled asset to start managing OTA updates.
              </p>
              <Button onClick={() => setUploadOpen(true)} className="px-10 h-11 hover-elevate">
                <Upload className="mr-2 h-4 w-4" /> Push First Asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFirmwares.map((fw: FirmwareType) => (
              <motion.div key={fw.id} variants={item}>
                <Card className="group h-full flex flex-col border-none shadow-sm ring-1 ring-border/50 hover:ring-accent/50 rounded-2xl overflow-hidden transition-all duration-300">
                  <CardHeader className="pb-4 relative">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                        <FileCode className="h-6 w-6 text-blue-500" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase bg-muted/50 border-none ring-1 ring-border/50">
                        {formatFileSize(fw.size)}
                      </Badge>
                    </div>
                    <CardTitle className="mt-5 text-2xl font-black tracking-tight group-hover:text-accent transition-colors">
                      {fw.version}
                    </CardTitle>
                    <CardDescription className="font-mono text-[10px] truncate opacity-60 uppercase tracking-widest mt-1">
                      ID: {fw.filename}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                      {fw.description || "No documentation provided for this build."}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Staged</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Clock className="h-3 w-3 text-accent" />
                          {format(new Date(fw.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Usage</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Download className="h-3 w-3 text-accent" />
                          {fw.downloadCount || 0} hits
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 bg-muted/10 flex gap-2 p-4">
                    <Button variant="default" size="sm" className="flex-1 h-9 bg-accent hover:bg-accent/90" onClick={() => openDeployDialog(fw)}>
                      <Rocket className="mr-2 h-3.5 w-3.5" /> Stage Deploy
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-none shadow-2xl ring-1 ring-border/50">
                        <AlertDialogTitle className="font-bold">Delete Asset Build?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          Permanent deletion of build <b>{fw.version}</b>. Active OTA deployments targeting this asset will be interrupted immediately.
                        </AlertDialogDescription>
                        <div className="flex gap-2 justify-end pt-4">
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(fw.version)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/20 px-8">Confirm Deletion</AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
