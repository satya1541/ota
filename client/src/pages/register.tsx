import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import logoGif from "@assets/output-onlinegiftools_(1)_1768286854333.gif";

export default function Register() {
    const [, setLocation] = useLocation();
    const { register } = useAuth();
    // const [username, setUsername] = useState(""); // Removed
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (pin.length !== 4) {
            toast.error("PIN must be 4 digits");
            return;
        }

        if (pin !== confirmPin) {
            toast.error("PINs do not match");
            return;
        }

        setIsLoading(true);

        try {
            await register("", pin);
            toast.success("Account created! Please login.");
            setLocation("/login");
        } catch (error: any) {
            toast.error(error.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518546305927-5a3998b8a774?q=80&w=2069&auto=format&fit=crop')] opacity-10 bg-cover bg-center pointer-events-none mix-blend-screen" />
            <div className="absolute inset-0 bg-background/80 pointer-events-none" />

            <div className="w-full max-w-md space-y-8 bg-background/80 p-10 rounded-3xl shadow-2xl ring-1 ring-white/20 relative z-10">
                {/* Header */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-background/80 ring-1 ring-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <img src={logoGif} alt="Universal OTA" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight glitch-effect">Initialize Identity</h1>
                        <p className="mt-2 text-[10px] font-mono text-emerald-500/80 tracking-widest uppercase">
                            New Operator Registration
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pin" className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                Assign PIN
                            </Label>
                            <Input
                                id="pin"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                className="h-14 bg-black border border-white/20 rounded-xl text-white text-center text-3xl tracking-widest font-mono focus:ring-accent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPin" className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                                Confirm
                            </Label>
                            <Input
                                id="confirmPin"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="••••"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                className="h-14 bg-black border border-white/20 rounded-xl text-white text-center text-3xl tracking-widest font-mono focus:ring-accent"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-white/90 text-white dark:text-slate-900 font-semibold rounded-lg transition-all"
                    >
                        {isLoading ? "Creating account..." : "Register"}
                    </Button>
                </form>

                {/* Login Link */}
                <p className="text-center text-sm text-slate-500 dark:text-white/60">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
