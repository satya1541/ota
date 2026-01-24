import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { BackgroundImage } from "@/components/BackgroundImage";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import logoGif from "@assets/output-onlinegiftools_(1)_1768286854333.gif";

export default function Login() {
    const [, setLocation] = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            setLocation("/dashboard");
        }
    }, [isAuthenticated, setLocation]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (pin.length !== 4) {
            setIsError(true);
            toast.error("Security Clearance Code must be 4 digits");
            setTimeout(() => setIsError(false), 500);
            return;
        }

        setIsLoading(true);
        try {
            await login("", pin);
            toast.success("Identity Verified. Terminal Unlocked.");
            setLocation("/dashboard");
        } catch (error: any) {
            setIsError(true);
            toast.error(error.message || "Invalid Security Code");
            setPin("");
            setTimeout(() => setIsError(false), 500);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-submit when 4 digits are entered
    useEffect(() => {
        if (pin.length === 4 && !isLoading) {
            handleSubmit();
        }
    }, [pin]);

    const container = {
        hidden: { opacity: 0, scale: 0.95 },
        show: {
            opacity: 1,
            scale: 1,
            transition: {
                staggerChildren: 0.1,
                duration: 0.5,
                ease: "easeOut" as any
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <BackgroundImage />

            {/* HUD Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 left-8 flex items-center gap-2 opacity-20">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">Auth.System V4.2</span>
                </div>
                <div className="absolute bottom-8 right-8 flex items-center gap-2 opacity-20">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground text-right">Encrypted Trunk Connection:<br />Established</span>
                </div>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative z-10 w-full max-w-[450px]"
            >
                <div className={`
          relative overflow-hidden rounded-[2.5rem] border transition-all duration-500
          ${isError ? 'border-destructive/50 shadow-[0_0_50px_rgba(239,68,68,0.2)] bg-destructive/5' : 'border-border/10 bg-card/40 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.5)]'}
        `}>
                    {/* Card Content */}
                    <div className="p-8 md:p-12">

                        {/* Logo Section */}
                        <motion.div variants={item} className="flex flex-col items-center mb-10">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 group-hover:bg-primary/30 transition-all duration-500" />
                                <div className="relative w-20 h-20 rounded-[1.75rem] bg-background/50 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md">
                                    <img
                                        src={logoGif}
                                        alt="OTA Terminal"
                                        className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                    />
                                </div>
                            </div>
                            <h2 className="mt-6 text-3xl font-black text-foreground tracking-tighter uppercase text-center">
                                User Access
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-1 h-1 bg-primary rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 font-mono">
                                    Input Access PIN
                                </span>
                                <div className="w-1 h-1 bg-primary rounded-full" />
                            </div>
                        </motion.div>

                        {/* Entry Form */}
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <motion.div variants={item} className="relative group">
                                <div className="flex justify-center gap-4">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div
                                            key={index}
                                            className={`
                        w-14 h-18 rounded-2xl border-2 flex items-center justify-center transition-all duration-300
                        ${index < pin.length
                                                    ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                                                    : 'bg-background/20 border-white/5'
                                                }
                        ${isError ? 'border-destructive animate-shake shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}
                      `}
                                        >
                                            {index < pin.length ? (
                                                <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),1)]" />
                                            ) : (
                                                <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Hidden Real Input */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                    className="absolute inset-0 opacity-0 cursor-default"
                                    disabled={isLoading}
                                />
                            </motion.div>

                            <motion.div variants={item} className="flex flex-col gap-6">
                                <Button
                                    type="submit"
                                    disabled={isLoading || pin.length < 4}
                                    className={`
                    w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 border-none shadow-2xl
                    ${pin.length === 4 && !isLoading
                                            ? 'bg-primary text-primary-foreground shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:scale-[1.02] active:scale-95'
                                            : 'bg-white/5 text-foreground/30'
                                        }
                  `}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            Authenticating...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4" />
                                            Request Entry
                                        </div>
                                    )}
                                </Button>

                                <div className="flex items-center justify-between px-2">
                                    <Link href="/register">
                                        <button type="button" className="text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-primary transition-colors">
                                            New Identity Request
                                        </button>
                                    </Link>
                                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-foreground/40 hover:text-primary transition-colors">
                                        Reset Security PIN
                                    </button>
                                </div>
                            </motion.div>
                        </form>
                    </div>

                    {/* Card Footer Decoration */}
                    <div className="h-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
                </div>

                {/* System Message */}
                <motion.p
                    variants={item}
                    className="mt-8 text-center text-[9px] font-black uppercase tracking-[0.4em] text-foreground/20 max-w-[300px] mx-auto leading-relaxed"
                >
                    Authorized Personnel Only. All Access Terminals Are Monitored Under System Level 8 protocols.
                </motion.p>
            </motion.div>

            {/* Background Decorative Circles */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
        </div>
    );
}
