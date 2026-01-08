import { useState, useEffect, useCallback, memo, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deviceApi, firmwareApi, deployApi, Device } from "@/lib/api";
import { useDeviceUpdates } from "@/hooks/useDeviceUpdates";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { UpdateProgressBar } from "@/components/UpdateProgressBar";
import { MobileCard } from "@/components/MobileCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  Sparkles,
  MoreHorizontal,
  History,
  Microchip,
  Signal,
  CloudUpload,
  Package,
  Trash,
  PenLine,
  MapPin,
} from "lucide-react";
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
import { Loader } from "@/components/loader";
import { TableSkeleton, StatCardsSkeleton } from "@/components/skeletons/TableSkeleton";

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
  const nameRef = useRef<HTMLInputElement>(null);
  const macRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLSelectElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const latitudeRef = useRef<HTMLInputElement>(null);
  const longitudeRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      name: nameRef.current?.value || "",
      macAddress: (macRef.current?.value || "")
        .toUpperCase()
        .replace(/[^0-9A-F]/g, "")
        .substring(0, 12),
      group: groupRef.current?.value || "APS",
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-4">
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          Friendly Name
        </Label>
        <Input
          ref={nameRef}
          id="name"
          placeholder="e.g. Name"
          className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="mac"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex justify-between items-center"
        >
          <span>MAC Identity</span>
        </Label>
        <Input
          ref={macRef}
          id="mac"
          placeholder="enter mac address"
          maxLength={12}
          className="font-mono h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="group"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          Group
        </Label>
        <Select defaultValue="APS">
          <SelectTrigger
            id="group"
            className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus:ring-accent rounded-xl"
          >
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
        <Label
          htmlFor="currentVersion"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          Current Version
        </Label>
        <Input
          ref={versionRef}
          id="currentVersion"
          placeholder="e.g. 1.0.0"
          className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>
      
      {/* Location Fields - Collapsible Section */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          Location (Optional)
        </Label>
        <div className="space-y-2">
          <Input
            ref={locationRef}
            id="location"
            placeholder="e.g. Building A, Floor 2"
            className="h-10 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="latitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              Latitude
            </Label>
            <Input
              ref={latitudeRef}
              id="latitude"
              placeholder="e.g. 28.6139"
              className="h-10 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="longitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              Longitude
            </Label>
            <Input
              ref={longitudeRef}
              id="longitude"
              placeholder="e.g. 77.2090"
              className="h-10 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
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
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-indigo-500/20"
        >
          {isPending ? "Provisioning..." : "Provision Node"}
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
  if (!editingDevice) return null;

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-4">
      <div className="space-y-2">
        <Label
          htmlFor="edit-name"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          Friendly Name
        </Label>
        <Input
          id="edit-name"
          value={editingDevice.name}
          onChange={onNameChange}
          className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          MAC Identity
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
          Group
        </Label>
        <Select value={editingDevice.group} onValueChange={onGroupChange}>
          <SelectTrigger
            id="edit-group"
            className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus:ring-accent rounded-xl"
          >
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
        <Label
          htmlFor="edit-version"
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
        >
          Current Version
        </Label>
        <Input
          id="edit-version"
          value={editingDevice.currentVersion || ""}
          onChange={onVersionChange}
          className="h-12 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl"
        />
      </div>
      
      {/* Location Fields */}
      <div className="space-y-3 pt-2 border-t border-border/30">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          Location
        </Label>
        <div className="space-y-2">
          <Input
            id="edit-location"
            value={editingDevice.location || ""}
            onChange={onLocationChange}
            placeholder="e.g. Building A, Floor 2"
            className="h-10 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label
              htmlFor="edit-latitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              Latitude
            </Label>
            <Input
              id="edit-latitude"
              value={editingDevice.latitude || ""}
              onChange={onLatitudeChange}
              placeholder="e.g. 28.6139"
              className="h-10 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="edit-longitude"
              className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 ml-1"
            >
              Longitude
            </Label>
            <Input
              id="edit-longitude"
              value={editingDevice.longitude || ""}
              onChange={onLongitudeChange}
              placeholder="e.g. 77.2090"
              className="h-10 bg-muted/30 border-none ring-1 ring-border/50 focus-visible:ring-accent rounded-xl text-sm"
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
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg"
        >
          {isPending ? "Updating..." : "Save Changes"}
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
      <AlertDialogContent className="rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl max-w-[calc(100vw-2rem)] sm:max-w-[425px]">
        <AlertDialogTitle className="font-black text-white">Delete Device?</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-white/60">
          This will permanently remove <b className="text-white">{device?.name}</b> from the fleet registry.
        </AlertDialogDescription>
        
        <div className="space-y-3 pt-2">
          <Label htmlFor="delete-reason" className="text-xs font-bold text-white/70">
            Reason for deletion <span className="text-rose-400">*</span>
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for deleting this device..."
            className="min-h-[80px] rounded-xl border-none ring-1 ring-white/10 bg-white/5 text-white placeholder:text-white/30 focus:ring-rose-500/50 resize-none"
          />
          {reason.trim().length === 0 && (
            <p className="text-[10px] text-white/40">Please provide a reason before deleting</p>
          )}
        </div>
        
        <div className="flex gap-2 justify-end pt-4">
          <AlertDialogCancel className="rounded-xl border-none ring-1 ring-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm">
            Cancel
          </AlertDialogCancel>
          <Button 
            onClick={handleDelete}
            disabled={reason.trim().length === 0 || isPending}
            className="bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 px-6 border-none transition-all hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Deleting..." : "Delete"}
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

  const { progressMap, getProgress } = useDeviceUpdates();

  const {
    data: devices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

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
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  useEffect(() => {
    if (urlSearch) setSearchTerm(urlSearch);
  }, [urlSearch]);

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
        (r) => r.status === "scheduled",
      );
      const failedResults = data.results.filter((r) => r.status === "failed");
      if (failedResults.length > 0) {
        toast.warning(
          `Deployed to ${successfulResults.length} device(s), ${failedResults.length} failed`,
        );
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
      // Update local state immediately if needed, though invalidateQueries handles it
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

  const handleEditDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    updateMutation.mutate({
      id: editingDevice.id,
      updates: {
        name: editingDevice.name,
        group: editingDevice.group,
        currentVersion: editingDevice.currentVersion,
        location: editingDevice.location || null,
        latitude: editingDevice.latitude || null,
        longitude: editingDevice.longitude || null,
      },
    });
  };

  // Debounce search for better performance
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);

  const filteredDevices = devices.filter((device: Device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      device.macAddress.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      device.group.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const status = device.otaStatus || device.status;
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (
      filteredDevices.length > 0 &&
      selectedDevices.length === filteredDevices.length
    ) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(filteredDevices.map((d: Device) => d.macAddress));
    }
  };

  const toggleSelectDevice = (macAddress: string) => {
    if (selectedDevices.includes(macAddress)) {
      setSelectedDevices(selectedDevices.filter((m) => m !== macAddress));
    } else {
      setSelectedDevices([...selectedDevices, macAddress]);
    }
  };

  const handleAddDevice = (formData: {
    name: string;
    macAddress: string;
    group: string;
    currentVersion: string;
  }) => {
    if (!formData.name || !formData.macAddress) {
      toast.error("Name and MAC address are required");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDeploy = () => {
    if (!selectedVersion) {
      toast.error("Please select a firmware version");
      return;
    }
    const devicesToUpdate: string[] = [];
    selectedDevices.forEach((mac) => {
      const device = devices.find((d: Device) => d.macAddress === mac);
      if (device && device.currentVersion !== selectedVersion) {
        devicesToUpdate.push(mac);
      }
    });
    if (devicesToUpdate.length === 0) {
      toast.info(
        "All selected devices are already on version " + selectedVersion,
      );
      return;
    }
    deployMutation.mutate({
      deviceIds: devicesToUpdate,
      version: selectedVersion,
    });
  };

  const handleResetSelected = () => {
    if (selectedDevices.length === 0) return;
    resetMutation.mutate(selectedDevices);
  };

  const handleResetDevice = (macAddress: string) => {
    resetMutation.mutate([macAddress]);
  };

  const handleRollbackSelected = () => {
    if (selectedDevices.length === 0) return;
    const devicesWithRollback = selectedDevices.filter((mac) => {
      const device = devices.find((d: Device) => d.macAddress === mac);
      return device && device.previousVersion;
    });

    if (devicesWithRollback.length === 0) {
      toast.info(
        "None of the selected devices have a previous version to rollback to",
      );
      return;
    }

    devicesWithRollback.forEach((mac) => rollbackMutation.mutate(mac));

    if (devicesWithRollback.length < selectedDevices.length) {
      toast.info(
        `Rolling back ${devicesWithRollback.length} devices. ${selectedDevices.length - devicesWithRollback.length} devices skipped (no previous version).`,
      );
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "online":
      case "updated":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200/50";
      case "offline":
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200/50";
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200/50 animate-pulse";
      case "updating":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200/50 animate-pulse";
      case "failed":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200/50";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  if (isLoading || loadingFirmware) {
    return (
      <Layout title="Fleet Management">
        <div className="flex flex-col gap-8">
          <StatCardsSkeleton count={4} />
          <TableSkeleton rows={8} columns={6} />
        </div>
      </Layout>
    );
  }

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
            {
              label: "Fleet",
              value: devices.length,
              icon: Microchip,
              color: "text-blue-500",
              bg: "bg-blue-50 dark:bg-blue-900/10",
            },
            {
              label: "Online",
              value: devices.filter((d: Device) => d.status === "online").length,
              icon: Signal,
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-900/10",
            },
            {
              label: "Updates",
              value: devices.filter(
                (d: Device) =>
                  d.otaStatus === "pending" || d.otaStatus === "updating",
              ).length,
              icon: RotateCcw,
              color: "text-amber-500",
              bg: "bg-amber-50 dark:bg-amber-900/10",
            },
            {
              label: "Faults",
              value: devices.filter((d: Device) => d.otaStatus === "failed").length,
              icon: History,
              color: "text-rose-500",
              bg: "bg-rose-50 dark:bg-rose-900/10",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={item}
              className="bg-card border-none shadow-sm ring-1 ring-border/50 rounded-2xl p-4 flex items-center gap-3 md:gap-4 h-full"
            >
              <div className={`p-2 md:p-3 rounded-xl ${stat.bg} flex-shrink-0`}>
                <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className="text-lg md:text-xl font-bold tracking-tight">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={item}
          className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-3xl ring-1 ring-white/10 backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64 md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/20" />
              <Input
                placeholder="Search fleet..."
                className="pl-9 h-10 border-none bg-white/5 shadow-inner ring-1 ring-white/10 focus-visible:ring-accent w-full rounded-xl text-white placeholder:text-white/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 border-none bg-white/5 ring-1 ring-white/10 rounded-xl text-white/70 focus:ring-accent transition-all">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl ring-1 ring-white/10 glassmorphism bg-card/40 backdrop-blur-xl text-white">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white rounded-lg">All States</SelectItem>
                <SelectItem value="online" className="focus:bg-white/10 focus:text-white rounded-lg">Online</SelectItem>
                <SelectItem value="offline" className="focus:bg-white/10 focus:text-white rounded-lg">Offline</SelectItem>
                <SelectItem value="updating" className="focus:bg-white/10 focus:text-white rounded-lg">Updating</SelectItem>
                <SelectItem value="failed" className="focus:bg-white/10 focus:text-white rounded-lg">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            <AnimatePresence>
              {selectedDevices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Rollback ({selectedDevices.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl max-w-[calc(100vw-2rem)] sm:max-w-[425px]">
                      <AlertDialogTitle className="font-black text-white">Mass Rollback</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm text-white/60">
                        Attempting to rollback <b className="text-white">{selectedDevices.length}</b> devices to their previous versions. Devices without a previous version record will be skipped.
                      </AlertDialogDescription>
                      <div className="flex gap-2 justify-end pt-4">
                        <AlertDialogCancel className="rounded-xl border-none ring-1 ring-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRollbackSelected} className="bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 px-6 border-none transition-all hover-elevate">Start Rollback</AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all font-black uppercase tracking-widest text-[10px]"
                    onClick={handleResetSelected}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Status
                  </Button>

                  <Dialog
                    open={deployDialogOpen}
                    onOpenChange={setDeployDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="h-10 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 px-6 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]"
                      >
                        <CloudUpload className="mr-2 h-4 w-4" />
                        Deploy ({selectedDevices.length})
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl text-white">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-black">OTA Deployment</DialogTitle>
                        <DialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          Select target firmware for {selectedDevices.length} nodes.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                            Firmware Build
                          </Label>
                          <Select
                            value={selectedVersion}
                            onValueChange={setSelectedVersion}
                          >
                            <SelectTrigger className="h-12 border-none bg-white/5 ring-1 ring-white/10 rounded-xl text-white/70 focus:ring-accent transition-all">
                              <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl ring-1 ring-white/10 glassmorphism bg-card/40 backdrop-blur-xl text-white">
                              {firmwares.map((fw) => (
                                <SelectItem key={fw.id} value={fw.version} className="focus:bg-white/10 focus:text-white rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="font-bold">{fw.version}</span>
                                    <span className="text-[10px] text-white/40 truncate max-w-[250px]">
                                      {fw.description || fw.filename}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="ghost"
                            onClick={() => setDeployDialogOpen(false)}
                            className="h-12 font-bold uppercase text-[10px] tracking-widest text-white/70 hover:text-white transition-all"
                          >
                            Cancel
                          </Button>
                          <Button
                            className="h-12 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 px-8 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]"
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
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 ring-1 ring-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                onClick={() => refetch()}
              >
                <RotateCcw
                  className={`h-4 w-4 ${isLoading ? "animate-spin text-accent" : ""}`}
                />
              </Button>

              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-10 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 px-6 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="mr-2 h-4 w-4" />{" "}
                    <span className="hidden sm:inline">Register Node</span>
                    <span className="sm:hidden">Register</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black text-white">Register ESP32 Node</DialogTitle>
                    <DialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest">Provision a new device to your fleet</DialogDescription>
                  </DialogHeader>
                  <RegisterNodeForm
                    isPending={createMutation.isPending}
                    onSubmit={handleAddDevice}
                    onCancel={() => setAddDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-white">Edit ESP32 Node</DialogTitle>
              <DialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest">Update device configuration</DialogDescription>
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

        {/* Mobile Card View */}
        <motion.div
          variants={item}
          className="md:hidden space-y-3"
        >
          {filteredDevices.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Microchip className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-semibold">No devices found</p>
              <p className="text-sm">Add a device to get started</p>
            </div>
          ) : (
            filteredDevices.map((device: Device) => (
              <MobileCard
                key={device.id}
                title={device.name}
                subtitle={`${device.macAddress} • ${device.group}`}
                icon={<Microchip className={`h-5 w-5 ${device.status === 'online' ? 'text-emerald-400' : 'text-white/40'}`} />}
                status={{
                  label: device.otaStatus || 'idle',
                  color: device.otaStatus === 'updated' ? 'success' 
                    : device.otaStatus === 'failed' ? 'error'
                    : device.otaStatus === 'pending' || device.otaStatus === 'updating' ? 'warning'
                    : 'muted'
                }}
                actions={[
                  { label: 'Edit', onClick: () => { setEditingDevice(device); setEditDialogOpen(true); } },
                  { label: 'Deploy Update', onClick: () => { setSelectedDevices([device.macAddress]); setDeployDialogOpen(true); } },
                  { label: 'Reset Status', onClick: () => handleResetDevice(device.macAddress) },
                  { label: 'Delete', onClick: () => openDeleteDialog(device), destructive: true },
                ]}
              >
                {(device.otaStatus === 'updating' || device.otaStatus === 'pending') && (
                  <div className="mt-2">
                    <UpdateProgressBar progress={getProgress(device.macAddress)} />
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-[10px] text-white/40">
                  <span>v{device.currentVersion || 'N/A'}</span>
                  <span>Last seen: {device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }) : 'Never'}</span>
                </div>
              </MobileCard>
            ))
          )}
        </motion.div>

        {/* Desktop Table View */}
        <motion.div
          variants={item}
          className="hidden md:block bg-white/5 border-none shadow-2xl ring-1 ring-white/10 rounded-3xl overflow-hidden backdrop-blur-md"
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[800px] md:min-w-full">
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[50px] pl-6">
                    <Checkbox
                      className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                      checked={
                        filteredDevices.length > 0 &&
                        selectedDevices.length === filteredDevices.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40">Identity</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40">Group</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40">OTA Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-white/40">Activity</TableHead>
                  <TableHead className="text-right pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center text-white/20 animate-pulse font-black uppercase tracking-widest text-[10px]">Scanning nodes...</TableCell>
                  </TableRow>
                ) : filteredDevices.length > 0 ? (
                  filteredDevices.map((device: Device) => (
                    <TableRow 
                      key={device.id} 
                      className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer"
                      onClick={() => toggleSelectDevice(device.macAddress)}
                    >
                      <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          checked={selectedDevices.includes(device.macAddress)}
                          onCheckedChange={() => toggleSelectDevice(device.macAddress)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white group-hover:text-accent transition-colors truncate max-w-[150px]">{device.name}</span>
                          <span className="font-mono text-[10px] text-white/30 uppercase tracking-tighter">{device.macAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[9px] font-black uppercase px-1.5 py-0 bg-white/5 text-white/70 border-none ring-1 ring-white/10 backdrop-blur-sm">{device.group}</Badge>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-white/60 ring-1 ring-white/5">
                            <Package className="h-3 w-3 text-white/30" />
                            <span className="truncate max-w-[80px]">{device.currentVersion || "BOOT"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                          <div className="relative h-12 w-full bg-white/5 rounded-2xl overflow-hidden ring-1 ring-white/10 group/ota shadow-2xl backdrop-blur-xl">
                            <AnimatePresence mode="wait">
                              {device.otaStatus === "pending" ? (
                                <motion.div 
                                  key="pending" 
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 1.1 }}
                                  className="absolute inset-0 flex items-center justify-center bg-blue-500/10"
                                >
                                  <motion.div 
                                    initial={{ x: "-100%" }} 
                                    animate={{ x: "200%" }} 
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
                                    className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" 
                                  />
                                  <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative">
                                      <RotateCcw className="h-6 w-6 text-blue-400 animate-spin" />
                                      <motion.div 
                                        animate={{ opacity: [0.2, 0.5, 0.2] }} 
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-blue-400/20 blur-md rounded-full" 
                                      />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">Queueing</span>
                                  </div>
                                </motion.div>
                              ) : device.otaStatus === "updating" ? (
                                <motion.div 
                                  key="updating" 
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 1.1 }}
                                  className="absolute inset-0 flex items-center justify-center bg-amber-500/15"
                                >
                                  <motion.div 
                                    initial={{ x: "-100%" }} 
                                    animate={{ x: "200%" }} 
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} 
                                    className="absolute inset-y-0 w-40 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" 
                                  />
                                  <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative">
                                      <motion.div 
                                        animate={{ 
                                          scale: [1, 1.2, 1],
                                          rotate: [0, 180, 360],
                                          opacity: [0.8, 1, 0.8]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                      >
                                        <Sparkles className="h-7 w-7 text-white fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                                      </motion.div>
                                      <div className="absolute inset-0 bg-amber-500/60 blur-xl rounded-full animate-pulse" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">Flashing</span>
                                  </div>
                                </motion.div>
                              ) : device.otaStatus === "updated" || device.status === "updated" ? (
                                <motion.div 
                                  key="updated" 
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 1.1 }}
                                  className="absolute inset-0 flex items-center justify-center bg-emerald-500/15"
                                >
                                  <div className="flex items-center gap-3 relative z-10">
                                    <motion.div 
                                      animate={{ 
                                        scale: [1, 1.3, 1],
                                        opacity: [0.7, 1, 0.7]
                                      }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                      className="relative"
                                    >
                                      <div className="h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)]" />
                                      <div className="absolute inset-0 bg-emerald-400/40 blur-md rounded-full" />
                                    </motion.div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">Verified</span>
                                  </div>
                                </motion.div>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                                  <Badge className="whitespace-nowrap inline-flex items-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate border-transparent text-[10px] font-black uppercase px-3 py-1 w-fit border-none shadow-none bg-transparent opacity-80 tracking-widest text-[#1c00d3]">
                                    {device.otaStatus || device.status}
                                  </Badge>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                          {device.targetVersion && device.targetVersion !== device.currentVersion && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-amber-400 uppercase tracking-widest">
                              <RotateCcw className="h-2.5 w-2.5 animate-spin" />
                              Target: {device.targetVersion}
                            </div>
                          )}
                          {/* Real-time progress bar for updating devices */}
                          <UpdateProgressBar progress={getProgress(device.macAddress)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${device.status === "online" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-white/20"}`} />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">
                            {device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }) : "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 ring-1 ring-white/5 rounded-lg transition-all" 
                            data-testid={`button-delete-device-${device.id}`}
                            onClick={() => openDeleteDialog(device)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10 text-white/60 hover:text-white shadow-sm ring-1 ring-white/5 rounded-lg transition-all"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-none shadow-2xl ring-1 ring-white/10 glassmorphism bg-card/40 backdrop-blur-xl text-white">
                              <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/30">Node Actions</div>
                              <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-white rounded-lg transition-all" onClick={() => { setEditingDevice(device); setEditDialogOpen(true); }}><PenLine className="h-4 w-4" /> Edit Device</DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 focus:bg-accent focus:text-white rounded-lg transition-all" onClick={() => rollbackMutation.mutate(device.macAddress)} disabled={!device.previousVersion}><History className="h-4 w-4" /> Rollback to {device.previousVersion || "N/A"}</DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-white rounded-lg transition-all" onClick={() => resetMutation.mutate([device.macAddress])}><RotateCcw className="h-4 w-4" /> Reset OTA Status</DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => openDeleteDialog(device)} className="text-rose-400 gap-2 focus:bg-rose-500/20 focus:text-rose-300 rounded-lg transition-all">
                                <RotateCcw className="h-4 w-4 rotate-45" /> Terminate Node
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center italic text-white/20 font-black uppercase tracking-widest text-[10px]">No nodes matching current filters</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </motion.div>
      {/* Delete Device Dialog with Required Reason - Memoized to prevent lag */}
      <DeleteDeviceDialog
        open={deleteDialogOpen}
        device={deviceToDelete}
        isPending={deleteMutation.isPending}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeviceToDelete(null);
        }}
        onDelete={handleDeleteDevice}
      />
    </Layout>
  );
}
