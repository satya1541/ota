const API_BASE = "/api";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || error.message || "API request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

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

// Staged Rollout
export interface StagedRollout {
  id: number;
  version: string;
  currentStage: number;
  stagePercentages: string;
  status: string;
  totalDevices: number;
  updatedDevices: number;
  failedDevices: number;
  autoExpand: number;
  expandAfterMinutes: number;
  failureThreshold: number;
  lastExpanded: string | null;
  createdAt: string;
  updatedAt: string;
}

// Deployment Analytics
export interface DeploymentAnalytics {
  id: number;
  version: string;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  avgUpdateTimeMs: number | null;
  minUpdateTimeMs: number | null;
  maxUpdateTimeMs: number | null;
  avgDownloadBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

// Device Heartbeat
export interface DeviceHeartbeat {
  id: number;
  macAddress: string;
  signalStrength: number | null;
  freeHeap: number | null;
  uptime: number | null;
  cpuTemp: number | null;
  createdAt: string;
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

// ==================== STAGED ROLLOUTS API ====================

export const stagedRolloutApi = {
  getAll: async (): Promise<StagedRollout[]> => {
    const res = await fetch(`${API_BASE}/rollouts`);
    if (!res.ok) throw new Error("Failed to fetch rollouts");
    return res.json();
  },

  create: async (data: { version: string; stagePercentages?: number[]; autoExpand?: boolean; expandAfterMinutes?: number; failureThreshold?: number }): Promise<StagedRollout> => {
    const res = await fetch(`${API_BASE}/rollouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create rollout");
    }
    return res.json();
  },

  advance: async (id: number): Promise<StagedRollout> => {
    const res = await fetch(`${API_BASE}/rollouts/${id}/advance`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to advance rollout");
    return res.json();
  },

  pause: async (id: number): Promise<StagedRollout> => {
    const res = await fetch(`${API_BASE}/rollouts/${id}/pause`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to pause rollout");
    return res.json();
  },

  resume: async (id: number): Promise<StagedRollout> => {
    const res = await fetch(`${API_BASE}/rollouts/${id}/resume`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to resume rollout");
    return res.json();
  },

  cancel: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/rollouts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to cancel rollout");
  },
};

// ==================== ANALYTICS API ====================

export const analyticsApi = {
  getDeploymentStats: async (version?: string): Promise<DeploymentAnalytics[]> => {
    const url = version ? `${API_BASE}/analytics/deployments?version=${version}` : `${API_BASE}/analytics/deployments`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch deployment analytics");
    return res.json();
  },

  getDeviceHealth: async (): Promise<{ devices: Device[]; avgHealthScore: number; criticalCount: number }> => {
    const res = await fetch(`${API_BASE}/analytics/health`);
    if (!res.ok) throw new Error("Failed to fetch device health");
    return res.json();
  },

  getHeartbeatHistory: async (macAddress: string, hours?: number): Promise<DeviceHeartbeat[]> => {
    const url = hours 
      ? `${API_BASE}/analytics/heartbeats/${macAddress}?hours=${hours}` 
      : `${API_BASE}/analytics/heartbeats/${macAddress}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch heartbeat history");
    return res.json();
  },

  getFleetOverview: async (): Promise<{
    totalDevices: number;
    onlineDevices: number;
    avgHealthScore: number;
    avgSignalStrength: number;
    devicesByGroup: Record<string, number>;
    devicesByStatus: Record<string, number>;
    recentFailures: number;
  }> => {
    const res = await fetch(`${API_BASE}/analytics/fleet`);
    if (!res.ok) throw new Error("Failed to fetch fleet overview");
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

// ==================== WEBHOOKS API ====================

export interface Webhook {
  id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string; // JSON array
  isActive: number;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export const webhookApi = {
  getAll: async (): Promise<Webhook[]> => {
    const res = await fetch(`${API_BASE}/webhooks`);
    if (!res.ok) throw new Error("Failed to fetch webhooks");
    return res.json();
  },

  get: async (id: number): Promise<Webhook> => {
    const res = await fetch(`${API_BASE}/webhooks/${id}`);
    if (!res.ok) throw new Error("Failed to fetch webhook");
    return res.json();
  },

  create: async (data: { name: string; url: string; secret?: string; events?: string[]; isActive?: boolean }): Promise<Webhook> => {
    const res = await fetch(`${API_BASE}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create webhook");
    }
    return res.json();
  },

  update: async (id: number, data: Partial<{ name: string; url: string; secret: string; events: string[]; isActive: boolean }>): Promise<Webhook> => {
    const res = await fetch(`${API_BASE}/webhooks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update webhook");
    return res.json();
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/webhooks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete webhook");
  },

  test: async (id: number): Promise<{ success: boolean; statusCode?: number; error?: string }> => {
    const res = await fetch(`${API_BASE}/webhooks/${id}/test`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to test webhook");
    return res.json();
  },
};

// ==================== DEVICE CONFIG API ====================

export interface DeviceConfig {
  id: number;
  name: string;
  configData: string;
  version: number;
  isDefault: number;
  targetGroup: string | null;
  targetDevices: string | null;
  createdAt: string;
  updatedAt: string;
  // Assignment stats (from API)
  assignedDevices?: number;
  pendingDevices?: number;
  appliedDevices?: number;
}

export const configApi = {
  getAll: async (): Promise<DeviceConfig[]> => {
    const res = await fetch(`${API_BASE}/configs`);
    if (!res.ok) throw new Error("Failed to fetch configs");
    return res.json();
  },

  get: async (id: number): Promise<DeviceConfig> => {
    const res = await fetch(`${API_BASE}/configs/${id}`);
    if (!res.ok) throw new Error("Failed to fetch config");
    return res.json();
  },

  create: async (data: { name: string; configData: string | object; isDefault?: boolean; targetGroup?: string; targetDevices?: string[] }): Promise<DeviceConfig> => {
    const res = await fetch(`${API_BASE}/configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        configData: typeof data.configData === "string" ? data.configData : JSON.stringify(data.configData),
      }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create config");
    }
    return res.json();
  },

  update: async (id: number, data: Partial<{ name: string; configData: string | object; isDefault: boolean; targetGroup: string; targetDevices: string[] }>): Promise<DeviceConfig> => {
    const res = await fetch(`${API_BASE}/configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update config");
    return res.json();
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/configs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete config");
  },

  push: async (id: number, macAddresses?: string[]): Promise<{ success: boolean; assignedCount: number }> => {
    const res = await fetch(`${API_BASE}/configs/${id}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ macAddresses }),
    });
    if (!res.ok) throw new Error("Failed to push config");
    return res.json();
  },
};

// ==================== DEVICE COMMANDS API (Remote Console) ====================

export interface DeviceCommand {
  id: number;
  macAddress: string;
  command: string;
  payload: string | null;
  status: string;
  expiresAt: string | null;
  sentAt: string | null;
  acknowledgedAt: string | null;
  response: string | null;
  createdAt: string;
}

export const commandApi = {
  getHistory: async (macAddress: string): Promise<DeviceCommand[]> => {
    const res = await fetch(`${API_BASE}/devices/${macAddress}/commands`);
    if (!res.ok) throw new Error("Failed to fetch command history");
    return res.json();
  },

  send: async (macAddress: string, command: string, payload?: string): Promise<DeviceCommand> => {
    const res = await fetch(`${API_BASE}/devices/${macAddress}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, payload }),
    });
    if (!res.ok) throw new Error("Failed to send command");
    return res.json();
  },
};

// ==================== ROLLBACK PROTECTION API ====================

export interface AtRiskDevice {
  macAddress: string;
  name: string;
  updateStartedAt: string | null;
  expectedCheckinBy: string | null;
  targetVersion: string | null;
  updateAttempts: number;
}

export const rollbackProtectionApi = {
  getAtRiskDevices: async (): Promise<{ count: number; devices: AtRiskDevice[] }> => {
    const res = await fetch(`${API_BASE}/at-risk`);
    if (!res.ok) throw new Error("Failed to fetch at-risk devices");
    return res.json();
  },

  clearAtRiskFlag: async (macAddress: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/at-risk/${macAddress}/clear`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to clear at-risk flag");
  },

  forceRollback: async (macAddress: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/at-risk/${macAddress}/rollback`, { method: "POST" });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to force rollback");
    }
  },
};
