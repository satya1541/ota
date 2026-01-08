import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  LayoutGrid, 
  Microchip, 
  Package, 
  ScrollText,
  TrendingUp,
  Globe2,
  HeartPulse,
  Layers,
  GitBranch,
  TerminalSquare,
  ShieldCheck,
  Search,
  Plus,
  CloudUpload,
  RotateCcw,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { deviceApi, firmwareApi } from "@/lib/api";
import { toast } from "sonner";

interface CommandPaletteProps {
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export function CommandPalette({ onThemeToggle, isDark }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: deviceApi.getAll,
    enabled: open,
  });
  
  const { data: firmwares = [] } = useQuery({
    queryKey: ['firmware'],
    queryFn: firmwareApi.getAll,
    enabled: open,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const navigationItems = [
    { href: "/dashboard", label: "Go to Dashboard", icon: LayoutGrid },
    { href: "/devices", label: "Go to Devices", icon: Microchip },
    { href: "/firmware", label: "Go to Firmware", icon: Package },
    { href: "/logs", label: "Go to System Logs", icon: ScrollText },
    { href: "/audit-trail", label: "Go to Audit Trail", icon: ShieldCheck },
    { href: "/overview", label: "Go to Overview", icon: TrendingUp },
    { href: "/fleet-map", label: "Go to Fleet Map", icon: Globe2 },
    { href: "/health", label: "Go to Health Monitor", icon: HeartPulse },
    { href: "/staged-rollouts", label: "Go to Staged Rollouts", icon: Layers },
    { href: "/firmware-diff", label: "Go to Firmware Diff", icon: GitBranch },
    { href: "/serial-monitor", label: "Go to Serial Monitor", icon: TerminalSquare },
  ];

  const actionItems = [
    { 
      label: "Add New Device", 
      icon: Plus, 
      action: () => {
        setLocation("/devices");
        toast.info("Navigate to Devices and click Add Device");
      }
    },
    { 
      label: "Upload Firmware", 
      icon: CloudUpload, 
      action: () => {
        setLocation("/firmware");
        toast.info("Navigate to Firmware and click Upload");
      }
    },
    { 
      label: "Refresh All Data", 
      icon: RotateCcw, 
      action: () => {
        window.location.reload();
      }
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border border-white/20 bg-black/90 backdrop-blur-xl">
        <CommandInput 
          placeholder="Type a command or search..." 
          className="border-none focus:ring-0"
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            {actionItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => runCommand(item.action)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-accent" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
            {onThemeToggle && (
              <CommandItem
                onSelect={() => runCommand(onThemeToggle)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-blue-400" />}
                <span>Toggle {isDark ? 'Light' : 'Dark'} Mode</span>
              </CommandItem>
            )}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => setLocation(item.href))}
                className="flex items-center gap-3 cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-white/60" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          {devices.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Devices">
                {devices.slice(0, 5).map((device) => (
                  <CommandItem
                    key={device.id}
                    onSelect={() => runCommand(() => {
                      setLocation("/devices");
                      toast.info(`Device: ${device.name} (${device.macAddress})`);
                    })}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Microchip className="h-4 w-4 text-cyan-400" />
                    <span>{device.name}</span>
                    <span className="ml-auto text-xs text-white/40">{device.macAddress}</span>
                  </CommandItem>
                ))}
                {devices.length > 5 && (
                  <CommandItem
                    onSelect={() => runCommand(() => setLocation("/devices"))}
                    className="text-white/40 text-xs"
                  >
                    +{devices.length - 5} more devices...
                  </CommandItem>
                )}
              </CommandGroup>
            </>
          )}
          
          {firmwares.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Firmware Versions">
                {firmwares.slice(0, 5).map((fw) => (
                  <CommandItem
                    key={fw.id}
                    onSelect={() => runCommand(() => {
                      setLocation("/firmware");
                      toast.info(`Firmware v${fw.version}`);
                    })}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Package className="h-4 w-4 text-purple-400" />
                    <span>v{fw.version}</span>
                    <span className="ml-auto text-xs text-white/40">{fw.filename}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        
        <div className="border-t border-white/10 p-2 flex items-center justify-between text-xs text-white/40">
          <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">↵</kbd> to select</span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Esc</kbd> to close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

// Hook to open command palette programmatically
export function useCommandPalette() {
  const openCommandPalette = useCallback(() => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  return { openCommandPalette };
}
