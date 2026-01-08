import { useEffect, useRef, useState, useCallback } from "react";
import { Upload, File, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FirmwareUploaderProps {
  onUpload: (file: File, version: string, description: string) => Promise<void>;
  isUploading?: boolean;
  onCancel?: () => void;
}

/**
 * FirmwareUploader - Enhanced file upload component with drag & drop support.
 * Automatically extracts version from filename if possible.
 */
export function FirmwareUploader({ onUpload, isUploading = false, onCancel }: FirmwareUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const binFile = droppedFiles.find(f => 
      f.name.endsWith(".bin") || f.name.endsWith(".hex")
    );

    if (binFile) {
      handleFileSelect(binFile);
    } else {
      toast.error("Please drop a .bin or .hex file");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    
    // Try to extract version from filename (e.g., firmware_v1.2.3.bin)
    const versionMatch = selectedFile.name.match(/v?(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      setVersion(versionMatch[0].startsWith('v') ? versionMatch[0] : `v${versionMatch[1]}`);
    }
    
    toast.info(`Selected: ${selectedFile.name}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a firmware file");
      return;
    }
    
    if (!version) {
      toast.error("Please provide a version number");
      return;
    }

    // Simulate progress
    setUploadProgress(0);
    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    progressIntervalRef.current = window.setInterval(() => {
      if (!isMountedRef.current) return;
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      await onUpload(file, version, description);
      if (isMountedRef.current) setUploadProgress(100);
      
      // Reset form
      if (isMountedRef.current) {
        setFile(null);
        setVersion("");
        setDescription("");
      }
    } catch (error) {
      // Error is handled by parent
    } finally {
      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (isMountedRef.current) setUploadProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setVersion("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${isDragActive 
            ? "border-accent bg-accent/10 scale-[1.02]" 
            : "border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10"
          }
          ${file ? "border-emerald-500/50 bg-emerald-500/10" : ""}
        `}
      >
        <input
          type="file"
          accept=".bin,.hex"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center gap-4"
            >
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <File className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white truncate max-w-[200px]">{file.name}</p>
                <p className="text-sm text-white/40">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="drop-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className={`
                p-4 rounded-full mx-auto w-fit
                ${isDragActive ? "bg-accent/20" : "bg-white/10"}
                transition-colors
              `}>
                <Upload className={`
                  h-8 w-8 
                  ${isDragActive ? "text-accent" : "text-white/40"}
                  transition-colors
                `} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {isDragActive ? "Drop your firmware file here" : "Drag & drop firmware file"}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  or click to browse (.bin, .hex)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Version Input */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
          Version ID *
        </Label>
        <Input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. v2.1.4-stable"
          className="h-12 bg-white/5 border-none ring-1 ring-white/10 focus-visible:ring-accent rounded-xl text-white placeholder:text-white/20"
        />
      </div>

      {/* Description Input */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
          Release Notes
        </Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's new in this version? Bug fixes, features, etc."
          rows={3}
          className="resize-none bg-white/5 border-none ring-1 ring-white/10 focus-visible:ring-accent rounded-xl text-white placeholder:text-white/20"
        />
      </div>

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-white/40">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-12 font-bold uppercase text-[10px] tracking-widest text-white/70 hover:text-white transition-all"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isUploading || !file || !version}
          className="h-12 px-8 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20 rounded-xl border-none transition-all hover-elevate active-elevate-2 font-black uppercase tracking-widest text-[10px]"
        >
          {isUploading ? "Uploading..." : "Push to Repository"}
        </Button>
      </div>
    </form>
  );
}

export default FirmwareUploader;
