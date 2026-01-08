import { format } from "date-fns";
import { Firmware } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileCode, 
  Clock, 
  Download, 
  Hash, 
  HardDrive, 
  Link2, 
  Copy,
  Check,
  ExternalLink,
  Binary,
  FileText,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface FirmwarePreviewProps {
  firmware: Firmware | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * FirmwarePreview component - Shows firmware raw binary content in hex viewer format.
 * Displays hex dump with ASCII representation similar to hex editors.
 */
export function FirmwarePreview({ firmware, open, onOpenChange }: FirmwarePreviewProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [hexContent, setHexContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("hex");

  // Fetch and parse binary file when dialog opens
  useEffect(() => {
    if (open && firmware) {
      fetchBinaryContent();
    } else {
      setHexContent("");
      setError(null);
    }
  }, [open, firmware]);

  const fetchBinaryContent = async () => {
    if (!firmware) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(firmware.fileUrl);
      if (!response.ok) throw new Error("Failed to fetch firmware file");
      
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Generate hex dump (show first 4KB for performance)
      const maxBytes = 4096;
      const bytesToShow = bytes.slice(0, maxBytes);
      const hexDump = generateHexDump(bytesToShow, bytes.length > maxBytes);
      setHexContent(hexDump);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  // Generate hex dump with addresses and ASCII
  const generateHexDump = (bytes: Uint8Array, truncated: boolean): string => {
    const lines: string[] = [];
    const bytesPerLine = 16;
    
    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const address = i.toString(16).padStart(8, '0').toUpperCase();
      const lineBytes = bytes.slice(i, i + bytesPerLine);
      
      // Hex part
      const hexParts: string[] = [];
      for (let j = 0; j < bytesPerLine; j++) {
        if (j < lineBytes.length) {
          hexParts.push(lineBytes[j].toString(16).padStart(2, '0').toUpperCase());
        } else {
          hexParts.push('  ');
        }
      }
      const hex = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');
      
      // ASCII part
      let ascii = '';
      for (let j = 0; j < lineBytes.length; j++) {
        const byte = lineBytes[j];
        ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
      }
      
      lines.push(`${address}  ${hex}  |${ascii.padEnd(16, ' ')}|`);
    }
    
    if (truncated) {
      lines.push('');
      lines.push('... (showing first 4KB of file) ...');
    }
    
    return lines.join('\n');
  };

  if (!firmware) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const downloadUrl = `${window.location.origin}${firmware.fileUrl}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] rounded-3xl border-none ring-1 ring-white/10 shadow-2xl glassmorphism bg-card/40 backdrop-blur-xl text-white p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-accent/20 via-accent/10 to-transparent p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-2xl ring-1 ring-accent/30">
                <Binary className="h-8 w-8 text-accent" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-black text-white tracking-tight">
                  {firmware.filename}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1 flex items-center gap-4">
                  <span>{firmware.version}</span>
                  <span>•</span>
                  <span>{formatFileSize(firmware.size)}</span>
                  <span>•</span>
                  <span>{format(new Date(firmware.createdAt), "MMM d, yyyy")}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
              <TabsTrigger 
                value="hex" 
                className="data-[state=active]:bg-accent data-[state=active]:text-white rounded-lg text-xs font-bold"
              >
                <Binary className="h-3 w-3 mr-2" />
                Hex View
              </TabsTrigger>
              <TabsTrigger 
                value="info" 
                className="data-[state=active]:bg-accent data-[state=active]:text-white rounded-lg text-xs font-bold"
              >
                <FileText className="h-3 w-3 mr-2" />
                File Info
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Hex View Tab */}
          <TabsContent value="hex" className="flex-1 px-6 pb-6 mt-4">
            <div className="bg-black/40 rounded-xl ring-1 ring-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  Binary Content (Hex Dump)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => copyToClipboard(hexContent, "Hex content")}
                  disabled={loading || !hexContent}
                >
                  {copied === "Hex content" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
              </div>
              <ScrollArea className="h-[350px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    <span className="ml-3 text-white/60">Loading binary content...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full py-12 text-red-400">
                    <span>{error}</span>
                  </div>
                ) : (
                  <pre className="p-4 text-xs font-mono text-emerald-400/90 leading-relaxed whitespace-pre overflow-x-auto">
                    <code>{hexContent || "No content available"}</code>
                  </pre>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1 px-6 pb-6 mt-4 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4 text-blue-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Size</span>
                </div>
                <p className="text-lg font-bold text-white">{formatFileSize(firmware.size)}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Created</span>
                </div>
                <p className="text-lg font-bold text-white">{format(new Date(firmware.createdAt), "MMM d")}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-amber-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Downloads</span>
                </div>
                <p className="text-lg font-bold text-white">{firmware.downloadCount || 0}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Release Notes
              </label>
              <div className="bg-white/5 rounded-xl p-4 ring-1 ring-white/10 min-h-[60px]">
                <p className="text-sm text-white/70 leading-relaxed">
                  {firmware.description || "No release notes provided for this firmware version."}
                </p>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Technical Details
              </label>
              
              {/* Checksum */}
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 ring-1 ring-white/10 group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Hash className="h-4 w-4 text-white/40 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">SHA256 Checksum</p>
                    <p className="text-xs font-mono text-white/70 truncate">{firmware.checksum}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={() => copyToClipboard(firmware.checksum, "Checksum")}
                >
                  {copied === "Checksum" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>

              {/* Download URL */}
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 ring-1 ring-white/10 group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Link2 className="h-4 w-4 text-white/40 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Download URL</p>
                    <p className="text-xs font-mono text-white/70 truncate">{firmware.fileUrl}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(downloadUrl, "URL")}
                  >
                    {copied === "URL" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 font-bold uppercase text-[10px] tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-xl"
          >
            Close
          </Button>
          <Button
            asChild
            className="flex-1 h-12 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate font-black uppercase tracking-widest text-[10px]"
          >
            <a href={downloadUrl} download>
              <Download className="mr-2 h-4 w-4" />
              Download Binary
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FirmwarePreview;
