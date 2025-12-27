import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Bell, Activity, Globe, Save, RotateCcw } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Settings() {
  const [settings, setSettings] = useState({
    organizationName: "Nexus IoT Global",
    adminEmail: "admin@nexus-ota.io",
    webhookUrl: "https://api.nexus-ota.io/webhooks/deploy",
    autoRetry: true,
    maxRetries: 3,
    rollbackOnFailure: true,
    notifyOnCompletion: true,
    checkInterval: 30, // seconds
  });

  const handleSave = () => {
    toast.success("Configuration synchronized successfully");
  };

  return (
    <Layout title="System Configuration">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl space-y-8"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* Update Behavior */}
          <motion.div variants={item}>
            <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/50 h-full">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 rounded-2xl bg-indigo-500/10">
                    <Zap className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">OTA Protocol</CardTitle>
                    <CardDescription>Firmware delivery and safety</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 ring-1 ring-border/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-black">Verify Hash</Label>
                    <p className="text-xs text-muted-foreground font-medium">Checksum validation before boot</p>
                  </div>
                  <Switch
                    checked={settings.autoRetry}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoRetry: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 ring-1 ring-border/30">
                  <div className="space-y-1">
                    <Label className="text-sm font-black">Fail-Safe Rollback</Label>
                    <p className="text-xs text-muted-foreground font-medium">Revert on application crash</p>
                  </div>
                  <Switch
                    checked={settings.rollbackOnFailure}
                    onCheckedChange={(checked) => setSettings({ ...settings, rollbackOnFailure: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Device Heartbeat */}
          <motion.div variants={item} className="md:col-span-2">
            <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/50">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 rounded-2xl bg-emerald-500/10">
                    <Activity className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Connectivity Cycle</CardTitle>
                    <CardDescription>Manage device check-in intervals</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-10">
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-4 px-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Polling Frequency</Label>
                      <span className="text-sm font-black text-accent">{settings.checkInterval}s</span>
                    </div>
                    <Slider
                      value={[settings.checkInterval]}
                      onValueChange={([value]) => setSettings({ ...settings, checkInterval: value })}
                      min={10}
                      max={300}
                      step={10}
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      Determines how often devices check for new firmware updates.
                    </p>
                  </div>
                  <div className="space-y-4 px-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Max Boot Retries</Label>
                      <span className="text-sm font-black text-accent">{settings.maxRetries} attempts</span>
                    </div>
                    <Slider
                      value={[settings.maxRetries]}
                      onValueChange={([value]) => setSettings({ ...settings, maxRetries: value })}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                      Number of attempts to boot a new firmware before triggering a rollback.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* API & Webhooks */}
          <motion.div variants={item} className="md:col-span-2">
            <Card className="border-none shadow-sm ring-1 ring-border/50 rounded-3xl overflow-hidden bg-card/50">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 rounded-2xl bg-amber-500/10">
                    <Bell className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">External Integration</CardTitle>
                    <CardDescription>Ship fleet events to your infrastructure</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-background/40 ring-1 ring-border/30 max-w-sm">
                  <div className="space-y-1">
                    <Label className="text-sm font-black">Status Notifications</Label>
                    <p className="text-xs text-muted-foreground font-medium">Alert on update success/failure</p>
                  </div>
                  <Switch
                    checked={settings.notifyOnCompletion}
                    onCheckedChange={(checked) => setSettings({ ...settings, notifyOnCompletion: checked })}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    <Label htmlFor="webhook" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notification Webhook URL</Label>
                  </div>
                  <Input
                    id="webhook"
                    type="url"
                    className="h-12 border-none bg-background shadow-inner ring-1 ring-border/50 rounded-xl focus-visible:ring-accent"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                    placeholder="https://your-api.com/ota-events"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    Fleet events are POSTed as JSON to this URL if Status Notifications are enabled.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={item} className="flex justify-end gap-3 pt-4 pb-12">
          <Button variant="ghost" className="h-12 px-8 rounded-xl font-bold">
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Default
          </Button>
          <Button onClick={handleSave} className="h-12 px-10 bg-primary hover-elevate rounded-xl font-bold shadow-lg shadow-primary/20">
            <Save className="mr-2 h-4 w-4" /> Push Configuration
          </Button>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
