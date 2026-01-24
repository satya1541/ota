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
  // Location fields
  latitude: string | null;
  longitude: string | null;
  location: string | null;
  // Health monitoring
  healthScore: number | null;
  signalStrength: number | null;
  freeHeap: number | null;
  uptime: number | null;
  lastHeartbeat: string | null;
  consecutiveFailures: number | null;
  // A/B testing
  testGroup: string | null;
  updatedAt: string;
  updateStartedAt: string | null;
  otaError: string | null;
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

  create: async (data: {
    name: string;
    macAddress: string;
    group: string;
    currentVersion?: string;
    latitude?: string;
    longitude?: string;
    location?: string;
  }): Promise<Device> => {
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

  delete: async (id: string, reason: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/devices/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Failed to delete device" }));
      throw new Error(error.error || "Failed to delete device");
    }
  },

  updateLocation: async (id: string, data: { latitude?: string; longitude?: string; location?: string }): Promise<Device> => {
    const res = await fetch(`${API_BASE}/devices/${id}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update device location");
    return res.json();
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

  resetActivity: async (macAddress: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/reset-activity/${macAddress}`, { method: "POST" });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to reset activity");
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



// ==================== FIRMWARE DIFF API ====================

export const firmwareDiffApi = {
  compare: async (versionA: string, versionB: string): Promise<{
    versionA: string;
    versionB: string;
    sizeDiff: number;
    addedBytes: number;
    removedBytes: number;
    changedRegions: Array<{ offset: number; length: number; type: 'added' | 'removed' | 'changed' }>;
  }> => {
    const res = await fetch(`${API_BASE}/firmware/diff?a=${versionA}&b=${versionB}`);
    if (!res.ok) throw new Error("Failed to compare firmware versions");
    return res.json();
  },
};

// ==================== AUDIT LOG API ====================

export interface AuditLog {
  id: number;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  severity: string | null;
  createdAt: string;
}

export interface AuditLogStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export const auditApi = {
  getLogs: async (filters?: {
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> => {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const res = await fetch(`${API_BASE}/audit-logs?${params}`);
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  getStats: async (): Promise<AuditLogStats> => {
    const res = await fetch(`${API_BASE}/audit-logs/stats`);
    if (!res.ok) throw new Error("Failed to fetch audit log stats");
    return res.json();
  },

  exportCsv: (filters?: { startDate?: string; endDate?: string }): string => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    return `${API_BASE}/audit-logs/export/csv?${params}`;
  },
};


