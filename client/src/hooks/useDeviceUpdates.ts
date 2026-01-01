import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Device } from "@/lib/api";

export function useDeviceUpdates() {
  const queryClient = useQueryClient();

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

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // WebSocket connected
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "device-update") {
        updateDeviceCache(message.data);
      } else if (message.type === "devices-list") {
        setDevicesList(message.data);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    ws.onclose = () => {
      // WebSocket disconnected
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [updateDeviceCache, setDevicesList]);
}
