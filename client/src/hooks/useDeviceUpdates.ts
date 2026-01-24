import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Device } from "@/lib/api";

export interface UpdateProgress {
  macAddress: string;
  deviceId: string;
  progress: number;
  bytesReceived?: number;
  totalBytes?: number;
}

export function useDeviceUpdates() {
  const queryClient = useQueryClient();
  const [progressMap, setProgressMap] = useState<Map<string, UpdateProgress>>(new Map());
  const cleanupTimeoutsRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef(true);

  const updateDeviceCache = useCallback(
    (device: Device) => {
      queryClient.setQueryData(["devices"], (oldData: Device[] | undefined) => {
        if (!oldData) return [device];
        return oldData.map((d) => (d.id === device.id ? device : d));
      });
    },
    [queryClient]
  );

  const setDevicesList = useCallback(
    (devices: Device[]) => {
      queryClient.setQueryData(["devices"], devices);
    },
    [queryClient]
  );

  const handleProgress = useCallback((progress: UpdateProgress) => {
    setProgressMap((prev) => {
      const newMap = new Map(prev);

      // If we previously scheduled a cleanup for this device, clear it.
      const existingTimeout = cleanupTimeoutsRef.current.get(progress.macAddress);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
        cleanupTimeoutsRef.current.delete(progress.macAddress);
      }

      // Clear progress shortly after completion
      if (progress.progress >= 100) {
        const timeoutId = window.setTimeout(() => {
          if (!isMountedRef.current) return;
          setProgressMap((p) => {
            const updated = new Map(p);
            updated.delete(progress.macAddress);
            return updated;
          });
          cleanupTimeoutsRef.current.delete(progress.macAddress);
        }, 2000);
        cleanupTimeoutsRef.current.set(progress.macAddress, timeoutId);
      }

      newMap.set(progress.macAddress, progress);
      return newMap;
    });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // WebSocket connected
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "device-update") {
          updateDeviceCache(message.data);
        } else if (message.type === "devices-list") {
          setDevicesList(message.data);
        } else if (message.type === "update-progress") {
          handleProgress(message.data as UpdateProgress);
        }
      } catch {
        // Ignore malformed websocket payloads
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    ws.onclose = () => {
      // WebSocket disconnected
    };

    return () => {
      isMountedRef.current = false;

      cleanupTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      cleanupTimeoutsRef.current.clear();

      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [updateDeviceCache, setDevicesList, handleProgress]);

  // Return progress for use in components
  const getProgress = useCallback((macAddress: string): UpdateProgress | undefined => {
    return progressMap.get(macAddress);
  }, [progressMap]);

  return { progressMap, getProgress };
}
