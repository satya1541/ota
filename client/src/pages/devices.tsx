import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceApi, firmwareApi, deployApi, Device } from "@/lib/api";
import { ActivityIndicator } from "@/components/ActivityIndicator";
import { useDeviceUpdates } from "@/hooks/useDeviceUpdates";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RotateCcw,
  Plus,
  MoreHorizontal,
  History as HistoryIcon,
  Microchip,
  Package,
  Trash,
  PenLine,
  MapPin,
  CloudUpload,
  Loader as LoaderIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSearch } from "wouter";

// Memoized Register Node Form Component using uncontrolled inputs
const RegisterNodeForm = memo(function RegisterNodeForm({
  isPending,
  onSubmit,
  onCancel,
}: {
  isPending: boolean;
  onSubmit: (formData: {
    name: string;
    macAddress: string;
    group: string;
    currentVersion: string;
    latitude?: string;
    longitude?: string;
    location?: string;
  }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);
  const macRef = useRef<HTMLInputElement>(null);
  const [group, setGroup] = useState("APS");
  const customGroupRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const latitudeRef = useRef<HTMLInputElement>(null);
  const longitudeRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const macValue = (macRef.current?.value || "").replace(/[^0-9A-F]/gi, "");
    if (macValue.length !== 12) {
      toast.error("MAC address must be 12 characters (0-9, A-F)");
      return;
    }

    if (!nameRef.current?.value || nameRef.current.value.trim().length === 0) {
      toast.error("Friendly Name is required");
      return;
    }

    if (group === "custom" && (!customGroupRef.current?.value || customGroupRef.current.value.trim().length === 0)) {
      toast.error("Please enter a custom group name");
      return;
    }

    const finalGroup = group === "custom" ? customGroupRef.current?.value || "" : group;

    const formData = {
      name: nameRef.current.value.trim(),
      macAddress: macValue.toUpperCase(),
      group: finalGroup.trim(),
      currentVersion: versionRef.current?.value || "",
      location: locationRef.current?.value || undefined,
      latitude: latitudeRef.current?.value || undefined,
      longitude: longitudeRef.current?.value || undefined,
    };
    onSubmit(formData);

    // Clear inputs after submission to prevent values leaking to next registration
    if (nameRef.current) nameRef.current.value = "";
    if (macRef.current) macRef.current.value = "";
    if (versionRef.current) versionRef.current.value = "";
    if (locationRef.current) locationRef.current.value = "";
    if (latitudeRef.current) latitudeRef.current.value = "";
    if (longitudeRef.current) longitudeRef.current.value = "";
    if (customGroupRef.current) customGroupRef.current.value = "";
    setGroup("APS");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-4">
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          {t('devices.friendly_name')}
        </Label>
        <Input
          ref={nameRef}
          id="name"
          placeholder={t('devices.eg_name')}
          className="h-12 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="mac"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between items-center"
        >
          <span>{t('devices.mac_identity')}</span>
        </Label>
        <Input
          ref={macRef}
          id="mac"
          placeholder={t('devices.enter_mac')}
          maxLength={12}
          className="font-mono h-12 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor="group"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          {t('devices.group')}
        </Label>
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger
            id="group"
            className="h-12 bg-muted border-none ring-1 ring-border/50 focus:ring-accent rounded-xl text-foreground"
          >
            <SelectValue placeholder={t('devices.select_group')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-xl ring-1 ring-border/50">
            <SelectItem value="APS">APS</SelectItem>
            <SelectItem value="ERS">ERS</SelectItem>
            <SelectItem value="FRS">FRS</SelectItem>
            <SelectItem value="custom">{t('devices.custom')}</SelectItem>
          </SelectContent>
        </Select>
        {group === "custom" && (
          <Input
            ref={customGroupRef}
            placeholder={t('devices.enter_custom_group')}
            className="h-12 mt-2 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl placeholder:text-muted-foreground"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="currentVersion"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          {t('devices.current_version')}
        </Label>
        <Input
          ref={versionRef}
          id="currentVersion"
          placeholder={t('devices.eg_version')}
          className="h-12 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>

      {/* Location Fields - Collapsible Section */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {t('devices.location_optional')}
        </Label>
        <div className="space-y-2">
          <Input
            ref={locationRef}
            id="location"
            placeholder={t('devices.eg_location')}
            className="h-10 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="latitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              {t('devices.latitude')}
            </Label>
            <Input
              ref={latitudeRef}
              id="latitude"
              placeholder={t('devices.eg_latitude')}
              className="h-10 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="longitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              {t('devices.longitude')}
            </Label>
            <Input
              ref={longitudeRef}
              id="longitude"
              placeholder={t('devices.eg_longitude')}
              className="h-10 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-12 font-bold uppercase text-[10px] tracking-widest"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-foreground font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-indigo-500/20"
        >
          {isPending ? t('devices.provisioning') : t('devices.provision_node')}
        </Button>
      </div>
    </form>
  );
});

// Memoized Edit Device Form Component
const EditDeviceForm = memo(function EditDeviceForm({
  editingDevice,
  isPending,
  onNameChange,
  onGroupChange,
  onVersionChange,
  onLocationChange,
  onLatitudeChange,
  onLongitudeChange,
  onSubmit,
  onCancel,
}: {
  editingDevice: Device | null;
  isPending: boolean;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGroupChange: (val: string) => void;
  onVersionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLatitudeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLongitudeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  if (!editingDevice) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDevice) return;

    if (!editingDevice.name || editingDevice.name.trim().length === 0) {
      toast.error("Friendly Name is required");
      return;
    }

    if (!editingDevice.group || editingDevice.group.trim().length === 0) {
      toast.error("Group is required");
      return;
    }

    onSubmit(e);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-3 pt-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="edit-name"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          {t('devices.friendly_name')}
        </Label>
        <Input
          id="edit-name"
          value={editingDevice.name}
          onChange={onNameChange}
          className="h-12 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          {t('devices.mac_identity')}
        </Label>
        <Input
          disabled
          value={editingDevice.macAddress}
          className="h-12 bg-muted/10 border-none ring-1 ring-border/20 text-muted-foreground font-mono rounded-xl opacity-60"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="edit-group"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          {t('devices.group')}
        </Label>
        <Select
          value={["APS", "ERS", "FRS"].includes(editingDevice.group) ? editingDevice.group : "custom"}
          onValueChange={(val) => onGroupChange(val === "custom" ? "" : val)}
        >
          <SelectTrigger
            id="edit-group"
            className="h-12 bg-muted border-none ring-1 ring-border/50 focus:ring-accent rounded-xl"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-none shadow-xl ring-1 ring-border/50">
            <SelectItem value="APS">APS</SelectItem>
            <SelectItem value="ERS">ERS</SelectItem>
            <SelectItem value="FRS">FRS</SelectItem>
            <SelectItem value="custom">{t('devices.custom')}</SelectItem>
          </SelectContent>
        </Select>
        {!["APS", "ERS", "FRS"].includes(editingDevice.group) && (
          <Input
            value={editingDevice.group}
            onChange={(e) => onGroupChange(e.target.value)}
            placeholder={t('devices.enter_custom_group')}
            className="h-12 mt-2 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="edit-version"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          {t('devices.current_version')}
        </Label>
        <Input
          id="edit-version"
          value={editingDevice.currentVersion || ""}
          onChange={onVersionChange}
          className="h-12 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>

      {/* Location Fields */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {t('devices.location_optional')}
        </Label>
        <div className="space-y-2">
          <Input
            id="edit-location"
            value={editingDevice.location || ""}
            onChange={onLocationChange}
            placeholder={t('devices.eg_location')}
            className="h-10 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="edit-latitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              {t('devices.latitude')}
            </Label>
            <Input
              id="edit-latitude"
              value={editingDevice.latitude || ""}
              onChange={onLatitudeChange}
              placeholder={t('devices.eg_latitude')}
              className="h-10 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="edit-longitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              {t('devices.longitude')}
            </Label>
            <Input
              id="edit-longitude"
              value={editingDevice.longitude || ""}
              onChange={onLongitudeChange}
              placeholder={t('devices.eg_longitude')}
              className="h-10 bg-muted border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-12 font-bold uppercase text-[10px] tracking-widest"
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg"
        >
          {isPending ? t('devices.updating') : t('devices.save_changes')}
        </Button>
      </div>
    </form>
  );
});

// Instant animations - no stagger delay for faster perceived load
const container = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const item = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

// Memoized Delete Dialog Component with local state to prevent parent re-renders
const DeleteDeviceDialog = memo(function DeleteDeviceDialog({
  open,
  device,
  isPending,
  onClose,
  onDelete,
}: {
  open: boolean;
  device: Device | null;
  isPending: boolean;
  onClose: () => void;
  onDelete: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  // Reset reason when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  const handleDelete = useCallback(() => {
    if (reason.trim()) {
      onDelete(reason.trim());
    }
  }, [reason, onDelete]);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background max-w-[500px] p-6">
        <AlertDialogTitle className="font-black text-foreground">{t('devices.delete_device')}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-foreground/60">
          {t('devices.delete_device_confirm', { deviceName: device?.name })}
        </AlertDialogDescription>

        <div className="space-y-3 pt-2">
          <Label htmlFor="delete-reason" className="text-xs font-bold text-foreground/70">
            {t('devices.reason_for_deletion')} <span className="text-rose-400">*</span>
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('devices.enter_reason')}
            className="min-h-[80px] rounded-xl border-none ring-1 ring-border-border/50 bg-background/50 backdrop-blur-md transition-all duration-300 transform-gpu cursor-default group focus-within:ring-1 focus-within:ring-primary/300/50 resize-none"
          />
          {reason.trim().length === 0 && (
            <p className="text-[10px] text-foreground/40">{t('devices.provide_reason')}</p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <AlertDialogCancel className="rounded-xl border-none ring-1 ring-border/50 bg-background/80 text-foreground/70 hover:bg-accent/10 hover:text-foreground transition-all">
            {t('common.cancel')}
          </AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={reason.trim().length === 0 || isPending}
            className="bg-rose-500/80 hover:bg-rose-500 text-foreground rounded-xl shadow-lg shadow-rose-500/20 px-6 border-none transition-all hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('devices.deleting') : t('common.delete')}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
});

export default function Devices() {
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlSearch = urlParams.get("search") || "";
  const highlightMac = urlParams.get("highlight") || "";
  const { t } = useTranslation();

  useDeviceUpdates();
  const {
    data: devices = [],
    isLoading,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Handle highlighting and scrolling
  useEffect(() => {
    if (highlightMac && !isLoading) {
      const element = document.getElementById(`device-row-${highlightMac}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Optional: add a temporary highlight class if needed
      }
    }
  }, [highlightMac, isLoading, devices]);

  const { data: firmwares = [], isLoading: loadingFirmware } = useQuery({
    queryKey: ["firmware"],
    queryFn: firmwareApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  useEffect(() => {
    if (urlSearch) setSearchTerm(urlSearch);
  }, [urlSearch]);

  // Refetch firmwares when deploy dialog opens to ensure we have latest data
  useEffect(() => {
    if (deployDialogOpen) {
      queryClient.invalidateQueries({ queryKey: ["firmware"] });
    }
  }, [deployDialogOpen, queryClient]);

  const createMutation = useMutation({
    mutationFn: deviceApi.create,
    onSuccess: (newDevice) => {
      queryClient.setQueryData(["devices"], (oldData: Device[] | undefined) => {
        return oldData ? [newDevice, ...oldData] : [newDevice];
      });
      toast.success("Device registered successfully");
      setAddDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      deviceApi.update(id, updates),
    onSuccess: (updatedDevice) => {
      queryClient.setQueryData(["devices"], (oldData: Device[] | undefined) => {
        if (!oldData) return [updatedDevice];
        return oldData.map((d) => (d.id === updatedDevice.id ? updatedDevice : d));
      });
      toast.success("Device updated successfully");
      setEditDialogOpen(false);
      setEditingDevice(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deployMutation = useMutation({
    mutationFn: ({
      deviceIds,
      version,
    }: {
      deviceIds: string[];
      version: string;
    }) => deployApi.deploy(deviceIds, version),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });

      const successfulResults = data.results.filter(
        (r) => r.status === "queued" || r.status === "scheduled",
      );
      const failedResults = data.results.filter((r) => r.status === "failed");

      if (failedResults.length > 0) {
        // Show detailed toast for each failure
        failedResults.forEach(fail => {
          toast.error(`Failed for ${fail.mac}: ${fail.message}`);
        });

        if (successfulResults.length > 0) {
          toast.success(`Deployment queued for ${successfulResults.length} device(s)`);
        }
      } else if (successfulResults.length > 0) {
        toast.success(`Deployment successfully queued`);
      }

      setDeployDialogOpen(false);
      setSelectedDevices([]);
      setSelectedVersion("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rollbackMutation = useMutation({
    mutationFn: deployApi.rollback,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      // Update local state immediately if needed, though invalidateQueries handles it
      toast.success(data.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetActivityMutation = useMutation({
    mutationFn: deployApi.resetActivity,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success(data.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deviceApi.delete(id, reason),
    onSuccess: (_result, { id }) => {
      queryClient.setQueryData(["devices"], (oldData: Device[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((d) => d.id !== id);
      });
      toast.success("Device deleted successfully");
      // Reset delete dialog state
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      // Find all device IDs for the selected MAC addresses
      const deviceIdsToDelete = devices
        .filter((d) => ids.includes(d.macAddress))
        .map((d) => d.id);

      // Delete devices one by one (or add bulk endpoint to API if needed)
      // For now, using the existing single delete to maintain reason tracking
      return Promise.all(deviceIdsToDelete.map(id => deviceApi.delete(id, reason)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Devices deleted successfully");
      setBulkDeleteReason("");
      setBulkDeleteDialogOpen(false);
      setSelectedDevices([]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState("");

  const handleBulkDelete = () => {
    if (bulkDeleteReason.trim() && selectedDevices.length > 0) {
      bulkDeleteMutation.mutate({ ids: selectedDevices, reason: bulkDeleteReason.trim() });
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = useCallback((device: Device) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  }, []);

  // Handle device deletion with reason (called from memoized DeleteDeviceDialog)
  const handleDeleteDevice = useCallback((reason: string) => {
    if (!deviceToDelete) return;
    deleteMutation.mutate({ id: deviceToDelete.id, reason });
  }, [deviceToDelete, deleteMutation]);

  const handleEditNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingDevice) return;
      setEditingDevice({ ...editingDevice, name: e.target.value });
    },
    [editingDevice],
  );

  const handleEditVersionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingDevice) return;
      setEditingDevice({ ...editingDevice, currentVersion: e.target.value });
    },
    [editingDevice],
  );

  const handleEditGroupChange = useCallback(
    (val: string) => {
      if (!editingDevice) return;
      setEditingDevice({ ...editingDevice, group: val });
    },
    [editingDevice],
  );

  const handleEditLocationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingDevice) return;
      setEditingDevice({ ...editingDevice, location: e.target.value });
    },
    [editingDevice],
  );

  const handleEditLatitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingDevice) return;
      setEditingDevice({ ...editingDevice, latitude: e.target.value });
    },
    [editingDevice],
  );

  const handleEditLongitudeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!editingDevice) return;
      setEditingDevice({ ...editingDevice, longitude: e.target.value });
    },
    [editingDevice],
  );

  const handleEditDevice = (_e: React.FormEvent) => {
    if (!editingDevice) return;
    updateMutation.mutate({
      id: editingDevice.id,
      updates: {
        name: editingDevice.name,
        group: editingDevice.group,
        currentVersion: editingDevice.currentVersion,
        location: editingDevice.location,
        latitude: editingDevice.latitude,
        longitude: editingDevice.longitude,
      },
    });
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.macAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && device.status === "online") ||
      (statusFilter === "offline" && device.status === "offline") ||
      (statusFilter === "updating" && device.otaStatus === "downloading");
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedDevices.length === filteredDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(filteredDevices.map((d) => d.macAddress));
    }
  };

  const toggleSelectDevice = (macAddress: string) => {
    setSelectedDevices((prev) =>
      prev.includes(macAddress)
        ? prev.filter((id) => id !== macAddress)
        : [...prev, macAddress],
    );
  };


  if (isLoading) {
    return (
      <Layout title={t('devices.title')}>
        <div className="space-y-4 md:space-y-6">
          <div className="h-12 w-48 bg-white/5 animate-pulse rounded-xl" />
          <div className="h-14 w-full bg-white/5 animate-pulse rounded-xl" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 md:h-16 w-full bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const MobileDeviceCard = ({ device }: { device: Device }) => (
    <motion.div
      variants={item}
      className={`
        p-4 rounded-2xl border transition-all duration-300 active:scale-[0.98]
        ${selectedDevices.includes(device.macAddress)
          ? 'bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(0,240,255,0.1)]'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'}
      `}
      onClick={() => toggleSelectDevice(device.macAddress)}
    >
      <div className="flex items-start justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedDevices.includes(device.macAddress)}
              onCheckedChange={() => toggleSelectDevice(device.macAddress)}
              className="h-5 w-5 rounded-md border-white/20 data-[state=checked]:bg-primary transition-colors"
            />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-foreground uppercase">{device.name}</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/40 font-mono mt-0.5">
              <Microchip className="h-2.5 w-2.5" />
              {device.macAddress}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">{device.status}</span>
          </div>
          <Badge variant="outline" className="h-5 text-[9px] bg-white/5 border-white/10 font-mono px-2 rounded-md font-bold">
            {device.currentVersion || "v0.0.0"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <ActivityIndicator
            status={device.otaStatus}
            updateStartedAt={device.updateStartedAt}
          />
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground/40 hover:text-primary hover:bg-primary/10 rounded-xl"
            onClick={() => {
              setEditingDevice(device);
              setEditDialogOpen(true);
            }}
          >
            <PenLine className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl"
            onClick={() => openDeleteDialog(device)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <Layout title={t('devices.title')}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-4 relative z-50">
          <motion.div variants={item} className="w-full md:w-auto">
            <div className="flex items-center justify-between md:block">
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">{t('devices.title')}</h2>
                <p className="text-foreground/40 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none">{t('devices.fleet')}</p>
              </div>
              <div className="md:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setAddDialogOpen(true)}
                  className="h-10 w-10 border-primary/20 bg-primary/5 text-primary shadow-[0_0_15px_rgba(0,240,255,0.2)] rounded-xl"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
          <motion.div variants={item} className="hidden md:flex gap-2">
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,240,255,0.6)] font-black uppercase tracking-widest text-[10px] rounded-xl border-none"
            >
              <Plus className="h-4 w-4" />
              {t('devices.register_new_node')}
            </Button>
          </motion.div>
        </div>

        {/* Action Bar */}
        <motion.div variants={item} className="flex flex-col gap-3 md:flex-row md:items-center justify-between bg-black/20 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/5 relative z-50">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 flex-1">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder={t('devices.search_fleet')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 md:h-10 bg-black/20 border-white/5 ring-1 ring-white/5 focus-visible:ring-primary/40 text-sm placeholder:text-muted-foreground/40"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px] h-11 md:h-10 bg-black/20 border-white/5 ring-1 ring-white/5 text-sm">
                <SelectValue placeholder={t('devices.all_states')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('devices.all_states')}</SelectItem>
                <SelectItem value="online">{t('devices.online')}</SelectItem>
                <SelectItem value="offline">{t('dashboard.offline')}</SelectItem>
                <SelectItem value="updating">{t('devices.updating')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AnimatePresence>
            {selectedDevices.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t border-white/5 md:border-0"
              >
                <Badge variant="secondary" className="h-10 px-3 bg-primary/10 text-primary border border-primary/20 font-black tracking-widest text-[9px] uppercase">
                  {selectedDevices.length} {t('devices.fleet')}
                </Badge>
                <div className="flex items-center gap-2 flex-1 md:flex-initial">
                  <Button
                    onClick={() => {
                      selectedDevices.forEach((mac) => resetActivityMutation.mutate(mac));
                    }}
                    disabled={resetActivityMutation.isPending}
                    className="h-10 flex-1 md:flex-initial px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-foreground transition-all active:scale-95 border border-white/10"
                    title={t('devices.reset_status')}
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2 text-[10px] font-black uppercase tracking-widest">{t('devices.reset_status')}</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setRollbackDialogOpen(true);
                    }}
                    disabled={rollbackMutation.isPending}
                    className="h-10 flex-1 md:flex-initial px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.4)] border-none"
                    title={t('devices.rollback', { count: selectedDevices.length })}
                  >
                    <HistoryIcon className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2 text-[10px] font-black uppercase tracking-widest">ROLLBACK</span>
                  </Button>
                  <Button
                    onClick={() => setDeployDialogOpen(true)}
                    className="h-10 flex-1 md:flex-initial px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95 shadow-[0_0_25px_rgba(0,240,255,0.5)] border-none"
                    title={t('devices.deploy', { count: selectedDevices.length })}
                  >
                    <CloudUpload className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2 text-[10px] font-black uppercase tracking-widest">{t('devices.deploy', { count: selectedDevices.length })}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/10">
                        <MoreHorizontal className="h-4 w-4 text-foreground/50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-white/10 bg-black/90 backdrop-blur-xl">
                      <DropdownMenuItem
                        className="text-destructive font-bold uppercase tracking-widest text-[10px] p-3"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                      >
                        <Trash className="mr-3 h-4 w-4" />
                        {t('devices.delete_all_selected')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Devices List (Card View for Mobile, Table for Desktop) */}
        <motion.div variants={item}>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden px-1">
            {filteredDevices.map((device) => (
              <MobileDeviceCard key={device.id} device={device} />
            ))}
            {filteredDevices.length === 0 && (
              <div className="h-40 flex items-center justify-center text-muted-foreground bg-black/20 rounded-xl border border-dashed border-white/10">
                No devices found.
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden bg-black/20">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDevices.length === filteredDevices.length && filteredDevices.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-foreground/70 font-bold uppercase tracking-wider text-xs">Devices</TableHead>
                  <TableHead className="text-foreground/70 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="text-foreground/70 font-bold uppercase tracking-wider text-xs">Version</TableHead>
                  <TableHead className="text-foreground/70 font-bold uppercase tracking-wider text-xs">Activity</TableHead>
                  <TableHead className="text-right text-foreground/70 font-bold uppercase tracking-wider text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow
                    key={device.id}
                    id={`device-row-${device.macAddress}`}
                    className={`
                      transition-colors border-b border-white/5 last:border-0 cursor-pointer
                      ${selectedDevices.includes(device.macAddress) ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-white/5'}
                    `}
                    onClick={() => toggleSelectDevice(device.macAddress)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDevices.includes(device.macAddress)}
                        onCheckedChange={() => toggleSelectDevice(device.macAddress)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{device.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Microchip className="h-3 w-3" />
                          {device.macAddress}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shadow-[0_0_8px_currentColor] ${device.status === 'online' ? 'bg-emerald-500 text-emerald-500' :
                          device.status === 'offline' ? 'bg-slate-500 text-slate-500' :
                            'bg-amber-500 text-amber-500'
                          }`} />
                        <span className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                          {device.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-white/5 border-border/50 font-mono text-xs">
                        {device.currentVersion || "v0.0.0"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ActivityIndicator
                        status={device.otaStatus}
                        updateStartedAt={device.updateStartedAt}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-white/10 text-foreground/50 hover:text-foreground"
                          onClick={() => {
                            setEditingDevice(device);
                            setEditDialogOpen(true);
                          }}
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-rose-500/10 text-foreground/50 hover:text-rose-500"
                          onClick={() => openDeleteDialog(device)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDevices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No devices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </motion.div>

      {/* Dialogs */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background max-w-[600px] p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-foreground">Register New Device</DialogTitle>
            <DialogDescription className="text-xs text-foreground/50">
              {t('devices.onboard_new_device')}
            </DialogDescription>
          </DialogHeader>
          <RegisterNodeForm
            isPending={createMutation.isPending}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background max-w-[600px] p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-foreground">Edit Device</DialogTitle>
            <DialogDescription className="text-xs text-foreground/50">
              {t('devices.update_device_parameters')}
            </DialogDescription>
          </DialogHeader>
          <EditDeviceForm
            editingDevice={editingDevice}
            isPending={updateMutation.isPending}
            onNameChange={handleEditNameChange}
            onGroupChange={handleEditGroupChange}
            onVersionChange={handleEditVersionChange}
            onLocationChange={handleEditLocationChange}
            onLatitudeChange={handleEditLatitudeChange}
            onLongitudeChange={handleEditLongitudeChange}
            onSubmit={handleEditDevice}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteDeviceDialog
        open={deleteDialogOpen}
        device={deviceToDelete}
        isPending={deleteMutation.isPending}
        onClose={() => setDeleteDialogOpen(false)}
        onDelete={handleDeleteDevice}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background max-w-[550px] p-6">
          <AlertDialogTitle className="font-black text-foreground">Delete {selectedDevices.length} Devices?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-foreground/60">
            This action cannot be undone. These devices will be permanently removed from the device registry.
          </AlertDialogDescription>

          <div className="space-y-3 pt-2">
            <Label htmlFor="bulk-delete-reason" className="text-xs font-bold text-foreground/70">
              {t('devices.reason_for_deletion')} <span className="text-rose-400">*</span>
            </Label>
            <Textarea
              id="bulk-delete-reason"
              value={bulkDeleteReason}
              onChange={(e) => setBulkDeleteReason(e.target.value)}
              placeholder="Reason for bulk deletion..."
              className="min-h-[80px] rounded-xl border-none ring-1 ring-border/50 bg-white/5 text-foreground placeholder:text-foreground/30 focus:ring-rose-500/50 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <AlertDialogCancel className="rounded-xl border-none ring-1 ring-border/50 bg-white/5 text-foreground/70 hover:bg-accent/10 hover:text-foreground transition-all">
              {t('common.cancel')}
            </AlertDialogCancel>
            <Button
              onClick={handleBulkDelete}
              disabled={bulkDeleteReason.trim().length === 0 || bulkDeleteMutation.isPending}
              className="bg-rose-500/80 hover:bg-rose-500 text-foreground rounded-xl shadow-lg shadow-rose-500/20 px-6 border-none transition-all hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleteMutation.isPending ? t('devices.deleting') : `Delete ${selectedDevices.length} Devices`}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background max-w-[550px] p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-foreground">
              {selectedDevices.length === 1
                ? `Rollback ${devices.find(d => d.macAddress === selectedDevices[0])?.name || 'Device'}?`
                : `Rollback ${selectedDevices.length} Devices?`
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-foreground/60">
              {(() => {
                const targets = devices.filter(d => selectedDevices.includes(d.macAddress));
                const names = targets.map(d => d.name).join(", ");
                const versions = targets.map(d => d.previousVersion || "unknown version").join(", ");
                return `Are you sure you want to rollback ${names} to ${targets.length === 1 ? 'its' : 'their'} previous firmware version (${versions})? This action may interrupt current operations.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <AlertDialogCancel className="rounded-xl border-none ring-1 ring-border/50 bg-white/5 text-foreground/70 hover:bg-accent/10 hover:text-foreground transition-all">
              {t('common.cancel')}
            </AlertDialogCancel>
            <Button
              onClick={() => {
                selectedDevices.forEach((mac) => rollbackMutation.mutate(mac));
                setRollbackDialogOpen(false);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-lg shadow-amber-500/20 px-6 border-none transition-all hover-elevate"
            >
              Confirm Rollback
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-[550px] rounded-2xl border-none ring-1 ring-border/50 shadow-2xl bg-background p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.deploy_to_selected', { count: selectedDevices.length })}</DialogTitle>
            <DialogDescription>
              {t('dashboard.choose_firmware_version')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firmware">{t('dashboard.firmware_version')}</Label>
              <Select
                key={`fw-select-${firmwares.length}`}
                value={selectedVersion}
                onValueChange={setSelectedVersion}
              >
                <SelectTrigger id="firmware">
                  <SelectValue placeholder={t('dashboard.select_version')} />
                </SelectTrigger>
                <SelectContent>
                  {loadingFirmware ? (
                    <div className="flex items-center justify-center py-4">
                      <LoaderIcon className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">Loading firmwares...</span>
                    </div>
                  ) : firmwares.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 px-4">
                      <Package className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        No firmware available. Upload firmware first.
                      </p>
                    </div>
                  ) : (
                    firmwares.map((fw: any) => (
                      <SelectItem key={fw.id} value={fw.version}>
                        {fw.version} ({fw.filename})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => deployMutation.mutate({ deviceIds: selectedDevices, version: selectedVersion })}
              disabled={!selectedVersion || deployMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all hover-elevate active-elevate-2 border-none"
            >
              {deployMutation.isPending ? <LoaderIcon className="w-4 h-4 animate-spin mr-2" /> : <CloudUpload className="w-4 h-4 mr-2" />}
              {t('dashboard.deploy_update')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
