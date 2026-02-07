import { memo, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader, CheckCircle2, XCircle, Clock, Circle, Radio, AlertTriangle } from "lucide-react";

interface ActivityIndicatorProps {
    status: string | null;
    updateStartedAt?: string | null;
    className?: string;
}

// Generate random particles for success stamp
const generateParticles = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        angle: (360 / count) * i + Math.random() * 30,
        distance: 15 + Math.random() * 10,
        size: 3 + Math.random() * 3,
        delay: Math.random() * 0.1,
    }));
};

export const ActivityIndicator = memo(function ActivityIndicator({
    status,
    updateStartedAt,
    className = "",
}: ActivityIndicatorProps) {
    const [showParticles, setShowParticles] = useState(false);
    const [prevStatus, setPrevStatus] = useState(status);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const normalizedStatus = (status || "idle").toLowerCase();

    const isStuck = (normalizedStatus === "updating" || normalizedStatus === "pending") &&
        updateStartedAt &&
        (Date.now() - new Date(updateStartedAt).getTime() > 600000);

    // Simulate download progress for updating status
    useEffect(() => {
        if (normalizedStatus === "updating" || normalizedStatus === "downloading" || normalizedStatus === "installing") {
            const interval = setInterval(() => {
                setDownloadProgress(prev => {
                    if (prev >= 100) return 0;
                    return prev + 25;
                });
            }, 800);
            return () => clearInterval(interval);
        } else {
            setDownloadProgress(0);
        }
    }, [normalizedStatus]);

    useEffect(() => {
        if ((normalizedStatus === "updated" || normalizedStatus === "success") &&
            prevStatus !== normalizedStatus) {
            setShowParticles(true);
            const timer = setTimeout(() => setShowParticles(false), 600);
            return () => clearTimeout(timer);
        }
        setPrevStatus(normalizedStatus);
    }, [normalizedStatus, prevStatus]);

    const particles = useMemo(() => generateParticles(8), []);

    const getStatusConfig = () => {
        if (isStuck) {
            return {
                icon: AlertTriangle,
                color: "text-orange-500",
                bgColor: "bg-card",
                borderColor: "border-2 border-orange-500",
                glowColor: "shadow-[4px_4px_0px_0px_rgba(249,115,22,1)]",
                label: "Stuck?",
                type: "stuck",
            };
        }

        switch (normalizedStatus) {
            case "updating":
            case "downloading":
            case "installing":
                return {
                    icon: Loader,
                    color: "text-cyan-400",
                    bgColor: "bg-black",
                    borderColor: "border-2 border-cyan-400",
                    glowColor: "shadow-[4px_4px_0px_0px_rgba(34,211,238,1)]",
                    label: "Updating",
                    type: "updating",
                };
            case "checking":
                return {
                    icon: Radio,
                    color: "text-cyan-500",
                    bgColor: "bg-card",
                    borderColor: "border-2 border-cyan-500",
                    glowColor: "shadow-[4px_4px_0px_0px_rgba(6,182,212,1)]",
                    label: "Checking",
                    type: "checking",
                };
            case "pending":
                return {
                    icon: Clock,
                    color: "text-amber-500",
                    bgColor: "bg-card",
                    borderColor: "border-2 border-amber-500",
                    glowColor: "shadow-[4px_4px_0px_0px_rgba(245,158,11,1)]",
                    label: "Pending",
                    type: "pending",
                };
            case "updated":
            case "success":
                return {
                    icon: CheckCircle2,
                    color: "text-emerald-500",
                    bgColor: "bg-card",
                    borderColor: "border-2 border-emerald-500",
                    glowColor: "shadow-[4px_4px_0px_0px_rgba(16,185,129,1)]",
                    label: "Updated",
                    type: "success",
                };
            case "failed":
            case "error":
                return {
                    icon: XCircle,
                    color: "text-rose-500",
                    bgColor: "bg-card",
                    borderColor: "border-2 border-rose-500",
                    glowColor: "shadow-[4px_4px_0px_0px_rgba(244,63,94,1)]",
                    label: "Failed",
                    type: "failed",
                };
            case "idle":
            default:
                return {
                    icon: Circle,
                    color: "text-foreground",
                    bgColor: "bg-card",
                    borderColor: "border-2 border-foreground/50",
                    glowColor: "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]",
                    label: "Idle",
                    type: "idle",
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.1, ease: "linear" }}
                className={`relative flex items-center justify-center w-10 h-10 ${config.bgColor} ${config.borderColor} ${config.glowColor} overflow-hidden`}
                title={isStuck ? "This update seems stuck. Try resetting the activity." : config.label}
            >
                {/* ===== UPDATING: Terminal Download ===== */}
                {config.type === "updating" && (
                    <>
                        {/* Blocky progress bar background */}
                        <div className="absolute inset-1 bg-black border border-cyan-400/50" />

                        {/* Progress blocks */}
                        <div className="absolute inset-1 flex gap-0.5 p-0.5">
                            {[0, 25, 50, 75].map((threshold, i) => (
                                <motion.div
                                    key={i}
                                    className="flex-1 h-full"
                                    animate={{
                                        backgroundColor: downloadProgress > threshold ? "#22d3ee" : "#0f172a",
                                    }}
                                    transition={{ duration: 0, ease: "linear" }}
                                />
                            ))}
                        </div>

                        {/* Percentage text */}
                        <motion.span
                            className="absolute font-mono text-[10px] font-black text-cyan-400 z-10"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
                        >
                            {downloadProgress}%
                        </motion.span>

                        {/* Scanline effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent h-2"
                            animate={{ y: [-10, 50] }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}

                {/* ===== CHECKING: Ping Pulse ===== */}
                {config.type === "checking" && (
                    <>
                        {/* Expanding square borders */}
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                className="absolute border-2 border-cyan-500"
                                initial={{ width: 8, height: 8, opacity: 1 }}
                                animate={{
                                    width: [8, 40],
                                    height: [8, 40],
                                    opacity: [1, 0],
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.33,
                                    ease: "linear",
                                }}
                            />
                        ))}

                        {/* Center dot */}
                        <motion.div
                            className="absolute w-2 h-2 bg-cyan-500"
                            animate={{
                                backgroundColor: ["#06b6d4", "#ffffff", "#06b6d4"],
                            }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Scanline */}
                        <motion.div
                            className="absolute inset-x-0 h-0.5 bg-cyan-400"
                            animate={{ top: ["0%", "100%"] }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}

                {/* ===== PENDING: Blinking Cursor ===== */}
                {config.type === "pending" && (
                    <>
                        {/* Blinking icon */}
                        <motion.div
                            animate={{ opacity: [1, 0, 1, 0, 1] }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                times: [0, 0.25, 0.5, 0.75, 1],
                                ease: "linear"
                            }}
                        >
                            <Icon className={`h-5 w-5 ${config.color}`} strokeWidth={3} />
                        </motion.div>

                        {/* Blinking cursor */}
                        <motion.div
                            className="absolute bottom-1 right-1 w-1.5 h-3 bg-amber-500"
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Border flash */}
                        <motion.div
                            className="absolute inset-0 border-2 border-amber-500"
                            animate={{
                                borderColor: ["#f59e0b", "#000000", "#f59e0b"],
                            }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}

                {/* ===== SUCCESS: Stamp Effect ===== */}
                {config.type === "success" && (
                    <>
                        {/* White flash on transition */}
                        <AnimatePresence>
                            {showParticles && (
                                <motion.div
                                    className="absolute inset-0 bg-white"
                                    initial={{ opacity: 1 }}
                                    animate={{ opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1, ease: "linear" }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Stamp icon - slams in from above */}
                        <motion.div
                            initial={{ y: -20, scale: 1.5 }}
                            animate={{ y: 0, scale: 1 }}
                            transition={{ duration: 0.1, ease: "linear" }}
                        >
                            <Icon className={`h-5 w-5 ${config.color}`} strokeWidth={3} />
                        </motion.div>

                        {/* Square particles burst */}
                        <AnimatePresence>
                            {showParticles && particles.map((p) => (
                                <motion.div
                                    key={p.id}
                                    className="absolute bg-emerald-500"
                                    style={{ width: p.size, height: p.size }}
                                    initial={{ x: 0, y: 0, opacity: 1 }}
                                    animate={{
                                        x: Math.cos(p.angle * Math.PI / 180) * p.distance,
                                        y: Math.sin(p.angle * Math.PI / 180) * p.distance,
                                        opacity: 0,
                                    }}
                                    transition={{ duration: 0.3, delay: p.delay, ease: "linear" }}
                                />
                            ))}
                        </AnimatePresence>
                    </>
                )}

                {/* ===== FAILED: Error Static ===== */}
                {config.type === "failed" && (
                    <>
                        {/* Screen tear effect - split icon */}
                        <motion.div
                            className="absolute"
                            animate={{
                                x: [-2, 2, -1, 3, 0, -2, 1, 0],
                                y: [0, -1, 1, 0, -1, 1, 0, 0],
                            }}
                            transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
                        >
                            <Icon className={`h-5 w-5 ${config.color}`} strokeWidth={3} />
                        </motion.div>

                        {/* Static noise overlay */}
                        <motion.div
                            className="absolute inset-0 opacity-30"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                            }}
                            animate={{ opacity: [0.2, 0.5, 0.1, 0.4, 0.2] }}
                            transition={{ duration: 0.2, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Red flash */}
                        <motion.div
                            className="absolute inset-0 bg-rose-500"
                            animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
                            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Horizontal tear line */}
                        <motion.div
                            className="absolute inset-x-0 h-0.5 bg-rose-500"
                            animate={{
                                top: ["30%", "70%", "40%", "60%", "50%"],
                                opacity: [1, 0, 1, 0, 1],
                            }}
                            transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}

                {/* ===== STUCK: Hazard Stripes ===== */}
                {config.type === "stuck" && (
                    <>
                        {/* Animated diagonal stripes */}
                        <motion.div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `repeating-linear-gradient(
                                    45deg,
                                    #000 0px,
                                    #000 4px,
                                    #f59e0b 4px,
                                    #f59e0b 8px
                                )`,
                            }}
                            animate={{ backgroundPosition: ["0px 0px", "16px 16px"] }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Center icon with flash */}
                        <motion.div
                            className="relative z-10 bg-black p-1"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                        >
                            <Icon className={`h-4 w-4 ${config.color}`} strokeWidth={3} />
                        </motion.div>

                        {/* Border flash */}
                        <motion.div
                            className="absolute inset-0 border-2"
                            animate={{
                                borderColor: ["#f59e0b", "#000000", "#f59e0b"],
                            }}
                            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}

                {/* ===== IDLE: Standby Mode ===== */}
                {config.type === "idle" && (
                    <>
                        {/* CRT scanlines */}
                        <div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                backgroundImage: `repeating-linear-gradient(
                                    0deg,
                                    transparent,
                                    transparent 2px,
                                    rgba(0,0,0,0.3) 2px,
                                    rgba(0,0,0,0.3) 4px
                                )`,
                            }}
                        />

                        {/* Dimmed icon */}
                        <motion.div
                            animate={{ opacity: [0.6, 0.4, 0.6] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                            <Icon className={`h-5 w-5 ${config.color} opacity-50`} strokeWidth={2} />
                        </motion.div>

                        {/* Blinking underscore cursor */}
                        <motion.div
                            className="absolute bottom-1 right-1 w-1.5 h-0.5 bg-foreground/50"
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    </>
                )}
            </motion.div>

            {/* Label */}
            <motion.div
                className="flex flex-col"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1, ease: "linear" }}
            >
                <AnimatePresence mode="wait">
                    <motion.span
                        key={config.label}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1, ease: "linear" }}
                        className={`text-xs font-black uppercase tracking-tighter ${config.color}`}
                    >
                        {config.label}
                    </motion.span>
                </AnimatePresence>
                {isStuck && (
                    <motion.span
                        className="text-[9px] font-black text-orange-500"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    >
                        RESET NEEDED
                    </motion.span>
                )}
            </motion.div>
        </div>
    );
});
