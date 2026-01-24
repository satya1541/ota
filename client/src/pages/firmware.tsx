import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { firmwareApi, deviceApi, deployApi, Firmware as FirmwareType, Device } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloudUpload, FileCode, Timer, Trash, Rocket, Search, CloudDownload, AlertCircle, Eye, Loader as LoaderIcon } from "lucide-react";
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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const highlightVersion = urlParams.get("highlight") || "";

  // 1. ALL HOOKS AT THE TOP
  const { data: firmwares = [], isLoading: isLoadingFw, error: fwError } = useQuery({
    queryKey: ["firmware"],
    queryFn: firmwareApi.getAll,
    retry: false
  });

  // Handle highlighting and scrolling
  useEffect(() => {
    if (highlightVersion && !isLoadingFw) {
      const element = document.getElementById(`fw-card-${highlightVersion}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightVersion, isLoadingFw, firmwares]);

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

  // Refetch devices when deploy dialog opens to ensure we have latest data
  useEffect(() => {
    if (deployOpen) {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    }
  }, [deployOpen, queryClient]);

  // 2. EARLY RETURNS AFTER HOOKS
  if (fwError || devError) {
    return (
      <Layout title={t('firmware.title')}>
        <div className="flex flex-col h-[50vh] items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground">{t('firmware.error_loading')}</h3>
            <p className="text-sm text-foreground/40">{(fwError as Error)?.message || (devError as Error)?.message}</p>
          </div>
          <Button onClick={() => queryClient.invalidateQueries()}>{t('firmware.retry')}</Button>
        </div>
      </Layout>
    );
  }

  if (isLoadingFw || isLoadingDev) {
    return (
      <Layout title={t('firmware.title')}>
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
    <Layout title={t('firmware.title')}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">{t('firmware.repository')}</h2>
            <p className="text-foreground/40 text-[10px] font-black uppercase tracking-widest">{t('firmware.manage_deploy')}</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground/20" />
              <Input
                placeholder={t('firmware.search_repo')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-none bg-background/80 shadow-inner ring-1 ring-border/50 focus-visible:ring-accent w-full rounded-xl text-foreground placeholder:text-foreground/20"
              />
            </div>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 px-6 bg-accent hover:bg-accent/80 text-foreground shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]">
                  <CloudUpload className="mr-2 h-4 w-4" /> {t('firmware.push_asset')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[600px] rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background text-foreground p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl font-black text-foreground">Upload Firmware</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {t('firmware.upload_binary_repo')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="file" className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1">{t('firmware.binary_payload')}</Label>
                    <div className="relative group">
                      <Input
                        id="file"
                        type="file"
                        accept=".bin,.hex"
                        className="h-12 border-dashed border-2 bg-background/50 border-border/50 group-hover:bg-primary/5 group-hover:border-primary/50 hover:text-foreground transition-all rounded-xl cursor-pointer file:text-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-none file:bg-white/10"
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
                    <Label htmlFor="version" className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1">{t('firmware.version_id')}</Label>
                    <Input
                      id="version"
                      placeholder={t('firmware.eg_version')}
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="h-12 bg-background/50 border-none ring-1 ring-border/50 focus-visible:ring-primary rounded-xl text-foreground placeholder:text-foreground/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1">{t('firmware.release_notes')}</Label>
                    <Textarea
                      id="desc"
                      placeholder={t('firmware.commit_message_placeholder')}
                      className="resize-none bg-background/50 border-none ring-1 ring-border/50 focus-visible:ring-primary rounded-xl text-foreground placeholder:text-foreground/30"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)} className="h-12 font-bold uppercase text-[10px] tracking-widest text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all">{t('common.cancel')}</Button>
                    <Button type="submit" disabled={uploading || !file} className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]">
                      {uploading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : t('firmware.push_to_repo')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
          <DialogContent className="max-w-[650px] rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background text-foreground p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-black text-foreground">Stage OTA Deployment</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('firmware.targeting_version')} <span className="font-mono font-bold text-primary">{selectedFirmware?.version}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-black uppercase tracking-widest text-foreground/60 ml-1">{t('firmware.target_nodes')}</Label>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/10" onClick={selectAllDevices}>
                  {selectedDevices.length === devices.length ? t('firmware.deselect_all') : t('firmware.select_all_fleet')}
                </Button>
              </div>
              <div className="border border-border/50 rounded-2xl p-2 max-h-64 overflow-y-auto space-y-1 bg-background/50 backdrop-blur-sm shadow-inner">
                {isLoadingDev ? (
                  <div className="flex items-center justify-center py-8">
                    <LoaderIcon className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : devices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 opacity-50">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{t('firmware.no_active_nodes')}</p>
                  </div>
                ) : (
                  devices.map((device: Device) => (
                    <div
                      key={device.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedDevices.includes(device.macAddress)
                        ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                        : "bg-white/5 border-transparent hover:bg-white/10 hover:border-border/50"
                        }`}
                      onClick={() => toggleDevice(device.macAddress)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedDevices.includes(device.macAddress)}
                          onCheckedChange={() => toggleDevice(device.macAddress)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{device.name}</span>
                          <span className="text-[10px] text-foreground/50 font-mono uppercase tracking-tighter">{device.macAddress}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/50 border-border/50 text-foreground/70">
                        {device.currentVersion || "BOOT"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">{t('firmware.staged_nodes')}</span>
                <span className="text-2xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">{selectedDevices.length}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDeployOpen(false)} className="h-12 font-bold uppercase text-[10px] tracking-widest text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all">{t('common.cancel')}</Button>
                <Button
                  onClick={handleDeploy}
                  disabled={deployMutation.isPending || selectedDevices.length === 0}
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.3)] rounded-xl border-none transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest text-[10px]"
                >
                  {deployMutation.isPending ? <LoaderIcon className="w-4 h-4 animate-spin" /> : t('firmware.initiate_update_cycle')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {firmwares.length === 0 ? (
          <Card className="border-dashed border-2 bg-background/80 border-border/50 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-accent/10 mb-6">
                <FileCode className="h-10 w-10 text-accent" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">{t('firmware.empty_repository')}</h3>
              <p className="text-foreground/40 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                {t('firmware.empty_repo_message')}
              </p>
              <Button onClick={() => setUploadOpen(true)} className="h-12 px-10 bg-accent hover:bg-accent/80 text-foreground shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]">
                <CloudUpload className="mr-2 h-4 w-4" /> {t('firmware.push_first_asset')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFirmwares.map((fw: FirmwareType) => (
              <motion.div key={fw.id} variants={item} id={`fw-card-${fw.version}`}>
                <Card className={`group h-full flex flex-col transition-all duration-300 transform-gpu cursor-default focus-within:ring-1 focus-within:ring-primary/30 ${highlightVersion === fw.version
                  ? "ring-primary bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                  : "bg-card/40 backdrop-blur-xl border-border/50 hover:bg-card/60 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                  }`}>
                  <CardHeader className="pb-4 relative">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                        <FileCode className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase bg-background/50 backdrop-blur-sm border-border/50 text-foreground/80">
                        {formatFileSize(fw.size)}
                      </Badge>
                    </div>
                    <CardTitle className="mt-5 text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {fw.version}
                    </CardTitle>
                    <CardDescription className="font-mono text-[10px] truncate text-foreground/40 uppercase tracking-widest mt-1">
                      {t('firmware.id')}: {fw.filename}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <p className="text-sm text-foreground/70 mb-6 line-clamp-3 leading-relaxed">
                      {fw.description || t('firmware.no_docs')}
                    </p>
                    <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-6">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">{t('firmware.staged')}</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                          <Timer className="h-3 w-3 text-primary/60" />
                          {format(new Date(fw.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">{t('firmware.usage')}</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                          <CloudDownload className="h-3 w-3 text-primary/60" />
                          {fw.downloadCount || 0} {t('firmware.hits')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 bg-background/30 backdrop-blur-md flex gap-2 p-4 border-t border-border/10">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.3)] rounded-xl border-none transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest text-[10px]"
                      onClick={() => openDeployDialog(fw)}
                    >
                      <Rocket className="mr-2 h-4 w-4" /> {t('firmware.stage_deploy')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      onClick={() => openPreviewDialog(fw)}
                      title={t('firmware.preview_details')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl border-none shadow-2xl ring-1 ring-border/50 bg-background text-foreground max-w-[500px] p-6">
                        <AlertDialogTitle className="text-xl font-black text-foreground">{t('firmware.delete_asset_build')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                          {t('firmware.permanent_delete_warning')} <b className="text-foreground">{fw.version}</b>. {t('firmware.interruption_warning')}
                        </AlertDialogDescription>
                        <div className="flex gap-3 justify-end pt-4">
                          <AlertDialogCancel className="h-12 px-6 rounded-xl border-none bg-background/80 hover:bg-white/10 text-foreground font-bold uppercase text-[10px] tracking-widest transition-all">{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(fw.version)} className="h-12 px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl shadow-lg shadow-destructive/20 font-black uppercase text-[10px] tracking-widest transition-all">{t('firmware.confirm_deletion')}</AlertDialogAction>
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
