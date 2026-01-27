import { memo, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader, CheckCircle2, XCircle, Clock, Circle, Radio } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface ActivityIndicatorProps {
    status: string | null;
    updateStartedAt?: string | null;
    className?: string;
}

// Planet configuration for solar system effect
const planets = [
    { color: "bg-cyan-400", glowColor: "shadow-[0_0_6px_rgba(34,211,238,0.8)]", size: 3, orbitRadius: 16, duration: 2, trail: true },
    { color: "bg-blue-500", glowColor: "shadow-[0_0_4px_rgba(59,130,246,0.7)]", size: 2.5, orbitRadius: 12, duration: 1.5, trail: true },
    { color: "bg-purple-400", glowColor: "shadow-[0_0_4px_rgba(192,132,252,0.7)]", size: 2, orbitRadius: 20, duration: 3, trail: false },
];

// Generate random particles for success explosion
const generateParticles = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        angle: (360 / count) * i + Math.random() * 30,
        distance: 20 + Math.random() * 15,
        size: 2 + Math.random() * 2,
        delay: Math.random() * 0.2,
    }));
};

export const ActivityIndicator = memo(function ActivityIndicator({
    status,
    updateStartedAt,
    className = "",
}: ActivityIndicatorProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [showParticles, setShowParticles] = useState(false);
    const [prevStatus, setPrevStatus] = useState(status);

    const normalizedStatus = (status || "idle").toLowerCase();

    const isStuck = (normalizedStatus === "updating" || normalizedStatus === "pending") &&
        updateStartedAt &&
        (Date.now() - new Date(updateStartedAt).getTime() > 600000);

    useEffect(() => {
        if ((normalizedStatus === "updated" || normalizedStatus === "success") &&
            prevStatus !== normalizedStatus) {
            setShowParticles(true);
            const timer = setTimeout(() => setShowParticles(false), 1000);
            return () => clearTimeout(timer);
        }
        setPrevStatus(normalizedStatus);
    }, [normalizedStatus, prevStatus]);

    const particles = useMemo(() => generateParticles(16), []);

    const getStatusConfig = () => {
        if (isStuck) {
            return {
                icon: XCircle,
                color: "text-orange-600",
                bgColor: isLight ? "bg-white" : "bg-orange-500/20",
                borderColor: isLight ? "border-2 border-orange-500" : "border-0",
                glowColor: isLight ? "shadow-[0_2px_10px_rgba(249,115,22,0.4)]" : "shadow-[0_0_20px_rgba(249,115,22,0.5)]",
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
                    color: isLight ? "text-blue-600" : "text-cyan-400",
                    bgColor: isLight ? "bg-gradient-to-br from-blue-50 to-cyan-50" : "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900",
                    borderColor: isLight ? "border-2 border-blue-400" : "ring-1 ring-cyan-500/30",
                    glowColor: isLight ? "shadow-[0_2px_15px_rgba(59,130,246,0.4)]" : "shadow-[0_0_25px_rgba(0,240,255,0.3)]",
                    label: "Updating",
                    type: "updating",
                };
            case "checking":
                return {
                    icon: Radio,
                    color: "text-cyan-600",
                    bgColor: isLight ? "bg-white" : "bg-cyan-500/20",
                    borderColor: isLight ? "border-2 border-cyan-500" : "border-0",
                    glowColor: isLight ? "shadow-[0_2px_10px_rgba(6,182,212,0.3)]" : "shadow-[0_0_20px_rgba(6,182,212,0.4)]",
                    label: "Checking",
                    type: "checking",
                };
            case "pending":
                return {
                    icon: Clock,
                    color: "text-amber-600",
                    bgColor: isLight ? "bg-white" : "bg-amber-500/20",
                    borderColor: isLight ? "border-2 border-amber-500" : "border-0",
                    glowColor: isLight ? "shadow-[0_2px_8px_rgba(245,158,11,0.3)]" : "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                    label: "Pending",
                    type: "pending",
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
                    type: "success",
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
                    type: "failed",
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
                    type: "idle",
                };
        }
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    const getIconAnimation = () => {
        switch (config.type) {
            case "updating":
                return {};
            case "pending":
                return { scale: [1, 1.2, 1, 1.15, 1] };
            case "success":
                return { scale: [0.5, 1.2, 1], rotate: [0, 15, -15, 0] };
            case "failed":
                return { x: [-3, 3, -2, 2, -1, 1, 0] };
            case "stuck":
                return { scale: [1, 1.1, 1] };
            default:
                return {};
        }
    };

    const getIconTransition = () => {
        switch (config.type) {
            case "pending":
                return { duration: 1.2, repeat: Infinity, times: [0, 0.2, 0.4, 0.5, 1], ease: "easeInOut" as const };
            case "success":
                return { duration: 0.6, ease: "backOut" as const };
            case "failed":
                return { duration: 0.4, repeat: 2 };
            case "stuck":
                return { duration: 1, repeat: Infinity, ease: "easeInOut" as const };
            default:
                return {};
        }
    };

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`relative flex items-center justify-center w-10 h-10 rounded-xl ${config.bgColor} ${config.borderColor} ${config.glowColor} overflow-hidden`}
                title={isStuck ? "This update seems stuck. Try resetting the activity." : config.label}
            >
                {/* ===== SOLAR SYSTEM for Updating Status ===== */}
                {config.type === "updating" && (
                    <>
                        {/* Glowing Sun Core */}
                        <motion.div
                            className={`absolute w-3 h-3 rounded-full ${isLight ? 'bg-amber-400' : 'bg-yellow-400'}`}
                            animate={{
                                scale: [1, 1.2, 1],
                                boxShadow: [
                                    "0 0 8px 2px rgba(251,191,36,0.6)",
                                    "0 0 15px 4px rgba(251,191,36,0.8)",
                                    "0 0 8px 2px rgba(251,191,36,0.6)"
                                ]
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ zIndex: 10 }}
                        />

                        {/* Orbital Rings (faint) */}
                        {planets.map((planet, i) => (
                            <div
                                key={`ring-${i}`}
                                className={`absolute rounded-full border ${isLight ? 'border-blue-200/50' : 'border-cyan-500/10'}`}
                                style={{
                                    width: planet.orbitRadius * 2,
                                    height: planet.orbitRadius * 2,
                                }}
                            />
                        ))}

                        {/* Orbiting Planets with Comet Trails */}
                        {planets.map((planet, i) => (
                            <motion.div
                                key={`planet-${i}`}
                                className="absolute"
                                style={{ width: planet.orbitRadius * 2, height: planet.orbitRadius * 2 }}
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: planet.duration,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                {/* Comet Trail */}
                                {planet.trail && (
                                    <motion.div
                                        className={`absolute rounded-full ${planet.color} opacity-30 blur-[1px]`}
                                        style={{
                                            width: planet.size * 3,
                                            height: planet.size,
                                            top: 0,
                                            left: '50%',
                                            transformOrigin: 'left center',
                                            transform: 'translateX(-100%) rotate(-30deg)',
                                        }}
                                    />
                                )}
                                {/* Planet */}
                                <div
                                    className={`absolute rounded-full ${planet.color} ${planet.glowColor}`}
                                    style={{
                                        width: planet.size,
                                        height: planet.size,
                                        top: 0,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                    }}
                                />
                            </motion.div>
                        ))}

                        {/* Shooting Star / Meteor (occasional) */}
                        <motion.div
                            className={`absolute w-1 h-0.5 ${isLight ? 'bg-blue-400' : 'bg-cyan-300'} rounded-full`}
                            initial={{ x: -20, y: 20, opacity: 0 }}
                            animate={{
                                x: [null, 25],
                                y: [null, -25],
                                opacity: [0, 1, 1, 0],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                repeatDelay: 4,
                                ease: "easeOut"
                            }}
                            style={{
                                boxShadow: isLight
                                    ? "0 0 4px 1px rgba(59,130,246,0.6)"
                                    : "0 0 6px 2px rgba(103,232,249,0.6)",
                                zIndex: 5
                            }}
                        />

                        {/* Starfield Background (twinkling) */}
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={`star-${i}`}
                                className={`absolute w-0.5 h-0.5 rounded-full ${isLight ? 'bg-blue-300' : 'bg-white'}`}
                                style={{
                                    top: `${15 + Math.random() * 70}%`,
                                    left: `${15 + Math.random() * 70}%`,
                                }}
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                transition={{
                                    duration: 1 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </>
                )}

                {/* Particle Explosion for Success */}
                <AnimatePresence>
                    {showParticles && particles.map((p) => (
                        <motion.div
                            key={p.id}
                            className="absolute rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                            style={{ width: p.size, height: p.size, boxShadow: "0 0 4px rgba(16,185,129,0.6)" }}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{
                                x: Math.cos(p.angle * Math.PI / 180) * p.distance,
                                y: Math.sin(p.angle * Math.PI / 180) * p.distance,
                                opacity: 0,
                                scale: 0,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
                        />
                    ))}
                </AnimatePresence>

                {/* Radar Sweep for Checking */}
                {config.type === "checking" && (
                    <motion.div
                        className={`absolute inset-0 rounded-xl border-t-2 ${isLight ? 'border-cyan-500' : 'border-cyan-400'}`}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                )}

                {/* Glitch overlay for Failed */}
                {config.type === "failed" && (
                    <motion.div
                        className="absolute inset-0 rounded-xl bg-rose-500/20"
                        animate={{ opacity: [0, 0.5, 0, 0.3, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    />
                )}

                {/* Icon with morphing animation (hidden during updating = solar system mode) */}
                {config.type !== "updating" && (
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={normalizedStatus}
                            layoutId="activity-icon"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0, ...getIconAnimation() }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ scale: { duration: 0.3, ease: "backOut" }, ...getIconTransition() }}
                            className="relative z-10"
                        >
                            <Icon className={`h-4.5 w-4.5 ${config.color}`} strokeWidth={isLight ? 2.5 : 2} />
                        </motion.div>
                    </AnimatePresence>
                )}
            </motion.div>

            <motion.div
                className="flex flex-col"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <AnimatePresence mode="wait">
                    <motion.span
                        key={config.label}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className={`text-xs font-black uppercase tracking-tighter ${config.color}`}
                    >
                        {config.label}
                    </motion.span>
                </AnimatePresence>
                {isStuck && (
                    <motion.span
                        className={`text-[9px] font-black ${isLight ? 'text-orange-600' : 'text-orange-500/70'}`}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                    >
                        RESET NEEDED
                    </motion.span>
                )}
            </motion.div>
        </div>
    );
});
