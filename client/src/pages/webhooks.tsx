import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { webhookApi, type Webhook } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Webhook as WebhookIcon, 
  Plus, 
  Trash2, 
  Edit, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

const WEBHOOK_EVENTS = [
  { value: "update.started", label: "Update Started", description: "When OTA update begins" },
  { value: "update.success", label: "Update Success", description: "When OTA completes successfully" },
  { value: "update.failed", label: "Update Failed", description: "When OTA fails" },
  { value: "device.online", label: "Device Online", description: "When device comes online" },
  { value: "device.offline", label: "Device Offline", description: "When device goes offline" },
  { value: "device.at_risk", label: "Device At Risk", description: "When device is flagged as at-risk" },
  { value: "rollout.started", label: "Rollout Started", description: "When staged rollout begins" },
  { value: "rollout.complete", label: "Rollout Complete", description: "When staged rollout finishes" },
  { value: "config.pushed", label: "Config Pushed", description: "When config is pushed to device" },
  { value: "command.sent", label: "Command Sent", description: "When remote command is sent" },
];

export default function Webhooks() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [showSecrets, setShowSecrets] = useState<Set<number>>(new Set());

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);
  const [isActive, setIsActive] = useState(true);

  const { data: webhooks = [], isLoading, refetch } = useQuery({
    queryKey: ["webhooks"],
    queryFn: webhookApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: webhookApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created successfully");
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof webhookApi.update>[1] }) =>
      webhookApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated successfully");
      resetForm();
      setEditingWebhook(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: webhookApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: webhookApi.test,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Webhook test successful (${result.statusCode})`);
      } else {
        toast.error(`Webhook test failed: ${result.error || `Status ${result.statusCode}`}`);
      }
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setUrl("");
    setSecret("");
    setSelectedEvents(["*"]);
    setIsActive(true);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setName(webhook.name);
    setUrl(webhook.url);
    setSecret(webhook.secret || "");
    try {
      setSelectedEvents(JSON.parse(webhook.events));
    } catch {
      setSelectedEvents(["*"]);
    }
    setIsActive(webhook.isActive === 1);
  };

  const handleSubmit = () => {
    if (!name || !url) {
      toast.error("Name and URL are required");
      return;
    }

    const data = {
      name,
      url,
      secret: secret || undefined,
      events: selectedEvents.length === 0 ? ["*"] : selectedEvents,
      isActive,
    };

    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleEvent = (event: string) => {
    if (event === "*") {
      setSelectedEvents(["*"]);
    } else {
      setSelectedEvents((prev) => {
        const filtered = prev.filter((e) => e !== "*");
        if (filtered.includes(event)) {
          return filtered.filter((e) => e !== event);
        }
        return [...filtered, event];
      });
    }
  };

  const toggleSecret = (id: number) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (webhook: Webhook) => {
    if (!webhook.lastTriggeredAt) {
      return <Badge variant="outline" className="bg-gray-500/20 text-gray-400">Never triggered</Badge>;
    }
    if (webhook.lastStatusCode && webhook.lastStatusCode >= 200 && webhook.lastStatusCode < 300) {
      return <Badge className="bg-emerald-500/20 text-emerald-400">Last: {webhook.lastStatusCode}</Badge>;
    }
    return <Badge variant="destructive" className="bg-red-500/20 text-red-400">Last: {webhook.lastStatusCode || "Error"}</Badge>;
  };

  return (
    <Layout title="Webhooks">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Webhook Notifications</h1>
            <p className="text-white/40 text-sm">Configure HTTP callbacks for OTA events</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="border-white/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={() => { resetForm(); setCreateDialogOpen(true); }}
              className="bg-accent hover:bg-accent/80"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>
        </div>

        {/* Webhooks Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : webhooks.length === 0 ? (
          <Card className="glassmorphism border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <WebhookIcon className="h-16 w-16 text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No Webhooks Configured</h3>
              <p className="text-white/40 text-center mb-4">
                Add webhooks to receive notifications when OTA events occur
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {webhooks.map((webhook) => (
                <motion.div
                  key={webhook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className={`glassmorphism border-white/10 ${webhook.isActive ? "" : "opacity-60"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <WebhookIcon className={`h-5 w-5 ${webhook.isActive ? "text-accent" : "text-white/30"}`} />
                          <CardTitle className="text-lg">{webhook.name}</CardTitle>
                        </div>
                        <Switch
                          checked={webhook.isActive === 1}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({ id: webhook.id, data: { isActive: checked } })
                          }
                        />
                      </div>
                      <CardDescription className="text-xs text-white/40 break-all">
                        {webhook.url}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Events */}
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const events = JSON.parse(webhook.events);
                            if (events.includes("*")) {
                              return <Badge variant="secondary" className="text-xs">All Events</Badge>;
                            }
                            return events.slice(0, 3).map((e: string) => (
                              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                            ));
                          } catch {
                            return <Badge variant="secondary">All Events</Badge>;
                          }
                        })()}
                      </div>

                      {/* Secret */}
                      {webhook.secret && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-white/40">Secret:</span>
                          <code className="bg-white/5 px-2 py-0.5 rounded font-mono">
                            {showSecrets.has(webhook.id) ? webhook.secret : "••••••••"}
                          </code>
                          <button onClick={() => toggleSecret(webhook.id)} className="text-white/40 hover:text-white">
                            {showSecrets.has(webhook.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </div>
                      )}

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        {getStatusBadge(webhook)}
                        {webhook.failureCount > 0 && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {webhook.failureCount} failures
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-white/10">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(webhook)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (confirm("Delete this webhook?")) {
                              deleteMutation.mutate(webhook.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={createDialogOpen || !!editingWebhook} onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingWebhook(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-lg glassmorphism border-white/10">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "Edit Webhook" : "Create Webhook"}</DialogTitle>
              <DialogDescription>
                Configure HTTP POST callbacks for OTA events
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="My Webhook"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://example.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label>Secret (optional)</Label>
                <Input
                  placeholder="HMAC signing secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
                <p className="text-xs text-white/40">
                  Used to sign payloads with HMAC-SHA256 (X-Webhook-Signature header)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Events</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-white/5 rounded-lg">
                  <div className="col-span-2 flex items-center space-x-2 pb-2 border-b border-white/10">
                    <Checkbox
                      id="all-events"
                      checked={selectedEvents.includes("*")}
                      onCheckedChange={() => toggleEvent("*")}
                    />
                    <label htmlFor="all-events" className="text-sm font-medium">
                      All Events
                    </label>
                  </div>
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event.value} className="flex items-start space-x-2">
                      <Checkbox
                        id={event.value}
                        checked={selectedEvents.includes(event.value) || selectedEvents.includes("*")}
                        onCheckedChange={() => toggleEvent(event.value)}
                        disabled={selectedEvents.includes("*")}
                      />
                      <label htmlFor={event.value} className="text-xs">
                        <span className="font-medium">{event.label}</span>
                        <p className="text-white/40">{event.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setEditingWebhook(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-accent hover:bg-accent/80"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingWebhook ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
