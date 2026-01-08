import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { firmwareApi, deviceApi, deployApi, Firmware as FirmwareType, Device } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, FileCode, Timer, Trash, Rocket, Search, CloudDownload, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
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
import { Loader } from "@/components/loader";
import { FirmwarePreview } from "@/components/FirmwarePreview";

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

  // 1. ALL HOOKS AT THE TOP
  const { data: firmwares = [], isLoading: isLoadingFw, error: fwError } = useQuery({ 
    queryKey: ["firmware"], 
    queryFn: firmwareApi.getAll,
    retry: false
  });

  const { data: devices = [], isLoading: isLoadingDev, error: devError } = useQuery({ 
    queryKey: ["devices"], 
    queryFn: deviceApi.getAll,
    retry: false
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFirmware, setPreviewFirmware] = useState<FirmwareType | null>(null);
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwareType | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ version: "", description: "" });

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

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlSearch = params.get("search") || "";
    setSearchTerm(urlSearch);
  }, [searchString]);

  // 2. EARLY RETURNS AFTER HOOKS
  if (fwError || devError) {
    return (
      <Layout title="Firmware Library">
        <div className="flex flex-col h-[50vh] items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">Error Loading Data</h3>
            <p className="text-sm text-white/40">{(fwError as Error)?.message || (devError as Error)?.message}</p>
          </div>
          <Button onClick={() => queryClient.invalidateQueries()}>Retry</Button>
        </div>
      </Layout>
    );
  }

  if (isLoadingFw || isLoadingDev) {
    return (
      <Layout title="Firmware Library">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </Layout>
    );
  }

  // 3. HANDLERS AND DERIVED STATE
  const filteredFirmwares = firmwares.filter((fw: FirmwareType) =>
    fw.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fw.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fw.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const openPreviewDialog = (fw: FirmwareType) => {
    setPreviewFirmware(fw);
    setPreviewOpen(true);
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
            <h2 className="text-3xl font-black tracking-tighter text-white">Repository</h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Manage and deploy compiled binary assets across your fleet.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/20" />
              <Input
                placeholder="Search repository..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-none bg-white/5 shadow-inner ring-1 ring-white/10 focus-visible:ring-accent w-full rounded-xl text-white placeholder:text-white/20"
              />
            </div>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 px-6 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]">
                  <CloudUpload className="mr-2 h-4 w-4" /> Push Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-white">Push New Asset</DialogTitle>
                  <DialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Upload a new firmware binary to the central repository.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="file" className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Binary Payload (.bin)</Label>
                    <div className="relative group">
                      <Input 
                        id="file" 
                        type="file" 
                        accept=".bin,.hex"
                        className="h-12 border-dashed border-2 bg-white/5 border-white/10 group-hover:bg-white/10 transition-all rounded-xl cursor-pointer file:text-white file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-none file:bg-white/10"
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
                    <Label htmlFor="version" className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Version ID</Label>
                    <Input 
                      id="version" 
                      placeholder="e.g. v2.1.4-stable"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="h-12 bg-white/5 border-none ring-1 ring-white/10 focus-visible:ring-accent rounded-xl text-white placeholder:text-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Release Notes</Label>
                    <Textarea 
                      id="desc" 
                      placeholder="Commit message or release highlights..." 
                      className="resize-none bg-white/5 border-none ring-1 ring-white/10 focus-visible:ring-accent rounded-xl text-white placeholder:text-white/20"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)} className="h-12 font-bold uppercase text-[10px] tracking-widest text-white/70 hover:text-white transition-all">Cancel</Button>
                    <Button type="submit" disabled={uploading || !file} className="h-12 px-8 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]">
                      {uploading ? <Loader className="w-4 h-4 animate-spin" /> : "Push to Repository"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-white">Stage OTA Deployment</DialogTitle>
              <DialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                Targeting version <span className="font-mono font-bold text-accent">{selectedFirmware?.version}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Target Nodes</Label>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-accent hover:text-accent/80 hover:bg-accent/10" onClick={selectAllDevices}>
                  {selectedDevices.length === devices.length ? "Deselect All" : "Select All Fleet"}
                </Button>
              </div>
              <div className="border-none rounded-2xl p-2 max-h-64 overflow-y-auto space-y-1 bg-white/5 ring-1 ring-white/10">
                {devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-50">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No active nodes</p>
                  </div>
                ) : (
                  devices.map((device: Device) => (
                    <div 
                      key={device.id} 
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        selectedDevices.includes(device.macAddress) 
                        ? "bg-accent/20 ring-1 ring-accent/50" 
                        : "hover:bg-white/5"
                      }`}
                      onClick={() => toggleDevice(device.macAddress)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedDevices.includes(device.macAddress)}
                          onCheckedChange={() => toggleDevice(device.macAddress)}
                          className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{device.name}</span>
                          <span className="text-[10px] text-white/40 font-mono uppercase tracking-tighter">{device.macAddress}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono bg-white/5 border-none ring-1 ring-white/10 text-white/60">
                        {device.currentVersion || "BOOT"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5 border border-accent/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent/80">Staged Nodes</span>
                <span className="text-2xl font-black text-accent">{selectedDevices.length}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDeployOpen(false)} className="h-12 font-bold uppercase text-[10px] tracking-widest text-white/70 hover:text-white transition-all">Cancel</Button>
                <Button 
                  onClick={handleDeploy} 
                  disabled={deployMutation.isPending || selectedDevices.length === 0}
                  className="h-12 px-8 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]"
                >
                  {deployMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : "Initiate Update Cycle"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {firmwares.length === 0 ? (
          <Card className="border-dashed border-2 bg-white/5 border-white/10 rounded-3xl backdrop-blur-md">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-accent/10 mb-6">
                <FileCode className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Empty Repository</h3>
              <p className="text-white/40 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                Your firmware library is empty. Push your first compiled asset to start managing OTA updates.
              </p>
              <Button onClick={() => setUploadOpen(true)} className="h-12 px-10 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]">
                <CloudUpload className="mr-2 h-4 w-4" /> Push First Asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFirmwares.map((fw: FirmwareType) => (
              <motion.div key={fw.id} variants={item}>
                <Card className="group h-full flex flex-col border-none shadow-sm ring-1 ring-white/10 hover:ring-accent/40 bg-white/5 rounded-3xl overflow-hidden transition-all duration-300 backdrop-blur-md">
                  <CardHeader className="pb-4 relative">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-accent/10 rounded-xl">
                        <FileCode className="h-6 w-6 text-accent" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase bg-white/10 border-none ring-1 ring-white/10 text-white/60">
                        {formatFileSize(fw.size)}
                      </Badge>
                    </div>
                    <CardTitle className="mt-5 text-2xl font-black tracking-tight text-white group-hover:text-accent transition-colors">
                      {fw.version}
                    </CardTitle>
                    <CardDescription className="font-mono text-[10px] truncate text-white/20 uppercase tracking-widest mt-1">
                      ID: {fw.filename}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <p className="text-sm text-white/40 mb-6 line-clamp-3 leading-relaxed">
                      {fw.description || "No documentation provided for this build."}
                    </p>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Staged</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white/70">
                          <Timer className="h-3 w-3 text-accent" />
                          {format(new Date(fw.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Usage</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white/70">
                          <CloudDownload className="h-3 w-3 text-accent" />
                          {fw.downloadCount || 0} hits
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 bg-white/5 flex gap-2 p-4">
                    <Button variant="default" size="sm" className="flex-1 h-10 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]" onClick={() => openDeployDialog(fw)}>
                      <Rocket className="mr-2 h-3.5 w-3.5" /> Stage Deploy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                      onClick={() => openPreviewDialog(fw)}
                      title="Preview firmware details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-none shadow-2xl ring-1 ring-white/10 glassmorphism bg-card/40 backdrop-blur-xl text-white">
                        <AlertDialogTitle className="text-xl font-black text-white">Delete Asset Build?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          Permanent deletion of build <b className="text-white">{fw.version}</b>. Active OTA deployments targeting this asset will be interrupted immediately.
                        </AlertDialogDescription>
                        <div className="flex gap-3 justify-end pt-4">
                          <AlertDialogCancel className="h-12 px-6 rounded-xl border-none bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-[10px] tracking-widest transition-all">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(fw.version)} className="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-500/20 font-black uppercase text-[10px] tracking-widest transition-all">Confirm Deletion</AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Firmware Preview Modal */}
        <FirmwarePreview 
          firmware={previewFirmware} 
          open={previewOpen} 
          onOpenChange={setPreviewOpen} 
        />
      </motion.div>
    </Layout>
  );
}
