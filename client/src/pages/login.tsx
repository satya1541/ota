
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { BackgroundImage } from "@/components/BackgroundImage";
import { motion } from "framer-motion";
import { ShieldCheck, Terminal, ChevronRight } from "lucide-react";
import { PreferencesModal } from "@/components/PreferencesModal";


export default function Login() {
    const [, setLocation] = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);

    // Check if user has already set preferences
    const hasSetPreferences = () => {
        return localStorage.getItem("preferencesSet") === "true";
    };

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && hasSetPreferences()) {
            setLocation("/dashboard");
        } else if (isAuthenticated && !hasSetPreferences()) {
            setShowPreferences(true);
        }
    }, [isAuthenticated, setLocation]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (pin.length !== 4) {
            setIsError(true);
            toast.error("SECURITY CODE INVALID: MUST BE 4 DIGITS");
            setTimeout(() => setIsError(false), 500);
            return;
        }

        setIsLoading(true);
        try {
            await login("", pin);
            toast.success("ACCESS GRANTED. WELCOME, ADMIN.");

            // Show preferences modal for first-time users, otherwise redirect
            if (!hasSetPreferences()) {
                setShowPreferences(true);
            } else {
                setLocation("/dashboard");
            }
        } catch (error: any) {
            setIsError(true);
            toast.error(error.message ? error.message.toUpperCase() : "INVALID SECURITY CODE");
            setPin("");
            setTimeout(() => setIsError(false), 500);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle preferences completion
    const handlePreferencesComplete = () => {
        localStorage.setItem("preferencesSet", "true");
        setShowPreferences(false);
        setLocation("/dashboard");
    };

    // Auto-submit when 4 digits are entered
    useEffect(() => {
        if (pin.length === 4 && !isLoading) {
            handleSubmit();
        }
    }, [pin]);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.95 },
        show: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 100, damping: 10 } as any
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden font-mono bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
            <BackgroundImage />

            {/* Hard Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-0" />

            {/* Grid Overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="relative z-10 w-full max-w-md">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="border-4 border-foreground bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-8 relative overflow-hidden"
                >
                    {/* Corner Decorations */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-r-4 border-b-4 border-foreground" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-l-4 border-b-4 border-foreground" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-r-4 border-t-4 border-foreground" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-l-4 border-t-4 border-foreground" />

                    {/* Header */}
                    <motion.div variants={itemVariants} className="mb-10 text-center space-y-2">
                        <div className="inline-flex items-center justify-center p-3 border-2 border-foreground rounded-none mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-primary text-primary-foreground">
                            <Terminal className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">
                            System Access
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                            v.4.2.0 // SECURITY LEVEL: MAX
                        </p>
                    </motion.div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <motion.div variants={itemVariants} className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-primary animate-pulse" />
                                    Enter Security PIN
                                </label>
                                <span className="text-[10px] font-bold opacity-50 bg-foreground/10 px-2 py-0.5">
                                    {pin.length}/4
                                </span>
                            </div>

                            <div className="relative group">
                                <div className="flex justify-between gap-3">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div
                                            key={index}
                                            className={`
                                                aspect-square flex-1 border-2 flex items-center justify-center text-2xl font-black transition-all duration-200
                                                ${index < pin.length
                                                    ? 'bg-foreground text-background border-foreground shadow-[2px_2px_0px_0px_currentColor]'
                                                    : 'bg-transparent border-foreground/30'
                                                }
                                                ${isError ? 'border-destructive text-destructive animate-shake' : ''}
                                                ${index === pin.length && !isError ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : ''}
                                            `}
                                        >
                                            {index < pin.length ? '•' : ''}
                                        </div>
                                    ))}
                                </div>

                                {/* Hidden Input */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                    className="absolute inset-0 opacity-0 cursor-text"
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Button
                                type="submit"
                                disabled={isLoading || pin.length < 4}
                                className={`
                                    w-full h-14 rounded-none border-2 border-foreground font-black uppercase tracking-widest text-sm transition-all duration-200
                                    ${pin.length === 4 && !isLoading
                                        ? 'bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                                        : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin text-xl">✶</span> PROCESSING...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Initialize Session
                                    </span>
                                )}
                            </Button>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex justify-between items-center pt-4 border-t-2 border-dashed border-foreground/20">
                            <Link href="/register">
                                <button type="button" className="text-[10px] font-bold uppercase tracking-wider hover:bg-foreground hover:text-background px-2 py-1 transition-colors border border-transparent hover:border-foreground">
                                    [ Request Access ]
                                </button>
                            </Link>
                            <button type="button" className="text-[10px] font-bold uppercase tracking-wider hover:bg-destructive hover:text-destructive-foreground px-2 py-1 transition-colors border border-transparent hover:border-destructive">
                                [ Reset Protocol ]
                            </button>
                        </motion.div>
                    </form>

                    {/* Decorative Status Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-6 text-center"
                >
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">
                        Restricted Area // Authorization Required
                    </p>
                </motion.div>
            </div>

            {/* Preferences Modal - shown after successful login for first-time users */}
            <PreferencesModal
                isOpen={showPreferences}
                onComplete={handlePreferencesComplete}
            />
        </div>
    );
}
