const API_BASE = "/api";

// ==================== TYPES ====================

export interface Device {
  id: string;
  name: string;
  macAddress: string;
  group: string;
  previousVersion: string | null;
  currentVersion: string | null;
  targetVersion: string | null;
  otaStatus: string | null;
  status: string;
  lastSeen: string;
  lastOtaCheck: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Firmware {
  id: number;
  version: string;
  filename: string;
  fileUrl: string;
  size: number;
  checksum: string;
  description: string | null;
  downloadCount: number | null;
  createdAt: string;
}

export interface DeviceLog {
  id: number;
  deviceId: string;
  macAddress: string | null;
  action: string;
  status: string;
  fromVersion: string | null;
  toVersion: string | null;
  message: string | null;
  createdAt: string;
}

export interface DeployResult {
  deviceId: string;
  mac: string;
  status: string;
  message: string;
}

// ==================== DEVICE API ====================

export const deviceApi = {
  getAll: async (): Promise<Device[]> => {
    const res = await fetch(`${API_BASE}/devices`);
    if (!res.ok) throw new Error("Failed to fetch devices");
    return res.json();
  },

  get: async (id: string): Promise<Device> => {
    const res = await fetch(`${API_BASE}/devices/${id}`);
    if (!res.ok) throw new Error("Failed to fetch device");
    return res.json();
  },

  create: async (data: { name: string; macAddress: string; group: string }): Promise<Device> => {
    const res = await fetch(`${API_BASE}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create device");
    }
    return res.json();
  },

  update: async (id: string, data: Partial<Device>): Promise<Device> => {
    const res = await fetch(`${API_BASE}/devices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update device");
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/devices/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete device");
  },
};

// ==================== FIRMWARE API ====================

export const firmwareApi = {
  getAll: async (): Promise<Firmware[]> => {
    const res = await fetch(`${API_BASE}/firmware`);
    if (!res.ok) throw new Error("Failed to fetch firmware");
    return res.json();
  },

  get: async (version: string): Promise<Firmware> => {
    const res = await fetch(`${API_BASE}/firmware/${version}`);
    if (!res.ok) throw new Error("Failed to fetch firmware");
    return res.json();
  },

  upload: async (file: File, version: string, description: string): Promise<Firmware> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("version", version);
    formData.append("description", description);

    const res = await fetch(`${API_BASE}/firmware/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to upload firmware");
    }
    return res.json();
  },

  delete: async (version: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/firmware/${version}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete firmware");
  },
};

// ==================== DEPLOYMENT API ====================

export const deployApi = {
  deploy: async (deviceIds: string[], version: string): Promise<{ success: boolean; results: DeployResult[] }> => {
    const res = await fetch(`${API_BASE}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceIds, version }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to deploy");
    }
    return res.json();
  },

  reset: async (deviceIds: string[]): Promise<{ success: boolean; results: DeployResult[] }> => {
    const res = await fetch(`${API_BASE}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceIds }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to reset OTA state");
    }
    return res.json();
  },

  rollback: async (macAddress: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/rollback/${macAddress}`, { method: "POST" });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to rollback");
    }
    return res.json();
  },
};

// ==================== LOGS API ====================

export const logsApi = {
  getAll: async (deviceId?: string): Promise<DeviceLog[]> => {
    const url = deviceId ? `${API_BASE}/logs?deviceId=${deviceId}` : `${API_BASE}/logs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch logs");
    return res.json();
  },
};

// ==================== SYSTEM LOGS API ====================

export interface SystemLogEntry {
  timestamp?: string;
  level?: string;
  message?: string;
  event?: string;
  [key: string]: any;
}

export interface SystemLogResponse {
  type: string;
  count: number;
  logs: SystemLogEntry[];
}

export interface LogStats {
  [key: string]: {
    size: number;
    lines: number;
    modified: string | null;
  };
}

export const systemLogsApi = {
  getLogContent: async (type: "ota" | "error" | "combined"): Promise<SystemLogResponse> => {
    const res = await fetch(`${API_BASE}/logs/${type}/view`);
    if (!res.ok) throw new Error(`Failed to fetch ${type} logs`);
    return res.json();
  },

  downloadLog: (type: "ota" | "error" | "combined"): void => {
    window.open(`${API_BASE}/logs/${type}/download`, "_blank");
  },

  clearLog: async (type: "ota" | "error" | "combined"): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/logs/${type}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to clear ${type} log`);
    return res.json();
  },

  getStats: async (): Promise<LogStats> => {
    const res = await fetch(`${API_BASE}/logs/stats`);
    if (!res.ok) throw new Error("Failed to fetch log stats");
    return res.json();
  },
};

// Legacy exports for backward compatibility
export const otaApi = {
  getDevices: deviceApi.getAll,
  getDevice: deviceApi.get,
  registerDevice: async (data: { deviceId: string; mac: string; name?: string }) => {
    return deviceApi.create({ 
      name: data.name || `Device-${data.deviceId}`, 
      macAddress: data.mac, 
      group: "default" 
    });
  },
  updateDevice: deviceApi.update,
  deleteDevice: deviceApi.delete,
  getFirmwares: firmwareApi.getAll,
  getFirmware: firmwareApi.get,
  uploadFirmware: firmwareApi.upload,
  deleteFirmware: firmwareApi.delete,
  deploy: deployApi.deploy,
  reset: deployApi.reset,
  rollback: deployApi.rollback,
  getLogs: logsApi.getAll,
};
