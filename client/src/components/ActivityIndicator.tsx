import { memo } from "react";
import { motion } from "framer-motion";
import { Loader, CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface ActivityIndicatorProps {
    status: string | null;
    updateStartedAt?: string | null;
    className?: string;
}

export const ActivityIndicator = memo(function ActivityIndicator({
    status,
    updateStartedAt,
    className = "",
}: ActivityIndicatorProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";

    // Normalize status to lowercase
    const normalizedStatus = (status || "idle").toLowerCase();

    // Detect stuck state: updating/pending for more than 10 minutes
    const isStuck = (normalizedStatus === "updating" || normalizedStatus === "pending") &&
        updateStartedAt &&
        (Date.now() - new Date(updateStartedAt).getTime() > 600000); // 10 minutes

    const getStatusConfig = () => {
        if (isStuck) {
            return {
                icon: XCircle,
                color: "text-orange-600",
                bgColor: isLight ? "bg-white" : "bg-orange-500/20",
                borderColor: isLight ? "border-2 border-orange-500" : "border-0",
                glowColor: isLight ? "shadow-[0_2px_10px_rgba(249,115,22,0.4)]" : "shadow-[0_0_20px_rgba(249,115,22,0.5)]",
                label: "Stuck?",
                iconAnimate: { scale: [1, 1.1, 1] },
                iconTransition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
                containerAnimate: { scale: [1, 1.05, 1] },
                containerTransition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
            };
        }

        switch (normalizedStatus) {
            case "updating":
            case "downloading":
            case "installing":
                return {
                    icon: Loader,
                    color: "text-blue-600",
                    bgColor: isLight ? "bg-white" : "bg-primary/20",
                    borderColor: isLight ? "border-2 border-blue-500" : "border-0",
                    glowColor: isLight ? "shadow-[0_2px_10px_rgba(59,130,246,0.3)]" : "shadow-[0_0_20px_rgba(0,240,255,0.4)]",
                    label: "Updating",
                    iconAnimate: { rotate: 360 },
                    iconTransition: { duration: 1.5, repeat: Infinity, ease: "linear" },
                    containerAnimate: { scale: [1, 1.05, 1] },
                    containerTransition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                };
            case "pending":
                return {
                    icon: Clock,
                    color: "text-amber-600",
                    bgColor: isLight ? "bg-white" : "bg-amber-500/20",
                    borderColor: isLight ? "border-2 border-amber-500" : "border-0",
                    glowColor: isLight ? "shadow-[0_2px_8px_rgba(245,158,11,0.3)]" : "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                    label: "Pending",
                    iconAnimate: { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] },
                    iconTransition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    containerAnimate: { scale: [1, 1.02, 1] },
                    containerTransition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                };
            case "updated":
            case "success":
                return {
                    icon: CheckCircle2,
                    color: isLight ? "text-emerald-600" : "text-emerald-500",
                    bgColor: isLight ? "bg-white" : "bg-emerald-500/20",
                    borderColor: isLight ? "border-2 border-emerald-500" : "border-0",
                    glowColor: isLight ? "shadow-[0_2px_10px_rgba(16,185,129,0.3)]" : "shadow-[0_0_18px_rgba(16,185,129,0.4)]",
                    label: "Updated",
                    iconAnimate: { scale: [0.8, 1], rotate: [0, 10, -10, 0] },
                    iconTransition: { duration: 0.5, ease: "backOut" },
                    containerAnimate: { scale: [1, 1.08, 1] },
                    containerTransition: { duration: 0.6, ease: "backOut" },
                };
            case "failed":
            case "error":
                return {
                    icon: XCircle,
                    color: isLight ? "text-rose-600" : "text-rose-500",
                    bgColor: isLight ? "bg-white" : "bg-rose-500/20",
                    borderColor: isLight ? "border-2 border-rose-500" : "border-0",
                    glowColor: isLight ? "shadow-[0_2px_10px_rgba(244,63,94,0.3)]" : "shadow-[0_0_18px_rgba(244,63,94,0.3)]",
                    label: "Failed",
                    iconAnimate: { x: [-2, 2, -2, 2, 0] },
                    iconTransition: { duration: 0.5, ease: "easeInOut" },
                    containerAnimate: { scale: [1, 1.05, 1] },
                    containerTransition: { duration: 0.5, ease: "easeInOut" },
                };
            case "idle":
            default:
                return {
                    icon: Circle,
                    color: isLight ? "text-slate-500" : "text-muted-foreground",
                    bgColor: isLight ? "bg-white" : "bg-muted-foreground/10",
                    borderColor: isLight ? "border-2 border-slate-200" : "border-0",
                    glowColor: "",
                    label: "Idle",
                    iconAnimate: {},
                    iconTransition: {} as any,
                    containerAnimate: {},
                    containerTransition: {} as any,
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                    ...config.containerAnimate
                }}
                transition={{ duration: 0.3, ...config.containerTransition }}
                className={`relative flex items-center justify-center w-8 h-8 rounded-lg ${config.bgColor} ${config.borderColor} ${config.glowColor}`}
                title={isStuck ? "This update seems stuck. Try resetting the activity." : config.label}
            >
                {/* Shimmer effect for updating status */}
                {(normalizedStatus === "updating" || normalizedStatus === "downloading" || normalizedStatus === "installing") && !isStuck && (
                    <motion.div
                        className={`absolute inset-0 rounded-lg bg-gradient-to-r from-transparent ${isLight ? 'via-primary/20' : 'via-white/50'} to-transparent`}
                        animate={{
                            x: ["-100%", "100%"],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                )}

                <motion.div
                    animate={config.iconAnimate}
                    transition={config.iconTransition}
                >
                    <Icon
                        className={`h-4.5 w-4.5 ${config.color} relative z-10`}
                        strokeWidth={isLight ? 2.5 : 2}
                    />
                </motion.div>
            </motion.div>

            <motion.div
                className="flex flex-col"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <span className={`text-xs font-black uppercase tracking-tighter ${config.color}`}>
                    {config.label}
                </span>
                {isStuck && (
                    <span className={`text-[9px] font-black animate-pulse ${isLight ? 'text-orange-600' : 'text-orange-500/70'}`}>
                        RESET NEEDED
                    </span>
                )}
            </motion.div>
        </div>
    );
});
