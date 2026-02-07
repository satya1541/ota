import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Check, Globe2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

interface PreferencesModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

const LANGUAGES = [
    { code: "en", label: "English", native: "English" },
    { code: "hi", label: "Hindi", native: "हिन्दी" },
    { code: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
];

export function PreferencesModal({ isOpen, onComplete }: PreferencesModalProps) {
    const { setTheme } = useTheme();
    const { i18n } = useTranslation();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | null>(null);

    const handleThemeSelect = (newTheme: "light" | "dark") => {
        setSelectedTheme(newTheme);
        setTheme(newTheme);
        // Auto-advance to next step after short delay
        setTimeout(() => setStep(2), 300);
    };

    const handleLanguageSelect = (langCode: string) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem("preferredLanguage", langCode);
        // Auto-complete after selection
        setTimeout(() => onComplete(), 300);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                {/* Card Stack Container */}
                <div className="relative w-full max-w-md">
                    {/* Background cards for stack effect */}
                    <motion.div
                        className="absolute inset-0 border-4 border-foreground bg-card"
                        style={{ transform: "translate(12px, 12px)" }}
                    />
                    <motion.div
                        className="absolute inset-0 border-4 border-foreground bg-card"
                        style={{ transform: "translate(6px, 6px)" }}
                    />

                    {/* Main Card */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: "linear" }}
                        className="relative border-4 border-foreground bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden"
                    >
                        {/* Progress Indicator */}
                        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-foreground bg-foreground/5">
                            <span className="text-xs font-black uppercase tracking-widest">
                                Step {step} of 2
                            </span>
                            <div className="flex gap-2">
                                <div className={`w-3 h-3 border-2 border-foreground ${step >= 1 ? "bg-primary" : "bg-transparent"}`} />
                                <div className={`w-3 h-3 border-2 border-foreground ${step >= 2 ? "bg-primary" : "bg-transparent"}`} />
                            </div>
                        </div>

                        {/* Step Content */}
                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="theme-step"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.15, ease: "linear" }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center space-y-2">
                                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                                Choose Theme
                                            </h2>
                                            <p className="text-xs font-bold uppercase tracking-widest text-foreground/50">
                                                Select your preferred display mode
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Light Mode Card */}
                                            <motion.button
                                                whileHover={{ x: -2, y: -2 }}
                                                whileTap={{ x: 0, y: 0 }}
                                                onClick={() => handleThemeSelect("light")}
                                                className={`
                                                    relative p-6 border-4 transition-all
                                                    ${selectedTheme === "light"
                                                        ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px] shadow-primary"
                                                        : "border-foreground bg-white text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                                    }
                                                `}
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 border-4 border-current flex items-center justify-center bg-yellow-100">
                                                        <Sun className="w-6 h-6" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-black uppercase tracking-wider">Light</span>
                                                </div>
                                                {selectedTheme === "light" && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-primary border-2 border-black flex items-center justify-center"
                                                    >
                                                        <Check className="w-4 h-4 text-primary-foreground" strokeWidth={4} />
                                                    </motion.div>
                                                )}
                                            </motion.button>

                                            {/* Dark Mode Card */}
                                            <motion.button
                                                whileHover={{ x: -2, y: -2 }}
                                                whileTap={{ x: 0, y: 0 }}
                                                onClick={() => handleThemeSelect("dark")}
                                                className={`
                                                    relative p-6 border-4 transition-all
                                                    ${selectedTheme === "dark"
                                                        ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px] shadow-primary"
                                                        : "border-foreground bg-gray-900 text-white hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                                                    }
                                                `}
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 border-4 border-current flex items-center justify-center bg-indigo-900">
                                                        <Moon className="w-6 h-6" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-black uppercase tracking-wider">Dark</span>
                                                </div>
                                                {selectedTheme === "dark" && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-2 right-2 w-6 h-6 bg-primary border-2 border-white flex items-center justify-center"
                                                    >
                                                        <Check className="w-4 h-4 text-primary-foreground" strokeWidth={4} />
                                                    </motion.div>
                                                )}
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="language-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.15, ease: "linear" }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center space-y-2">
                                            <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-foreground bg-primary/10 mb-2">
                                                <Globe2 className="w-6 h-6" strokeWidth={3} />
                                            </div>
                                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                                Choose Language
                                            </h2>
                                            <p className="text-xs font-bold uppercase tracking-widest text-foreground/50">
                                                Select your preferred language
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {LANGUAGES.map((lang) => (
                                                <motion.button
                                                    key={lang.code}
                                                    whileHover={{ x: -2, y: -2 }}
                                                    whileTap={{ x: 0, y: 0 }}
                                                    onClick={() => handleLanguageSelect(lang.code)}
                                                    className={`
                                                        w-full p-4 border-4 flex items-center justify-between transition-all
                                                        ${i18n.language === lang.code
                                                            ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px] shadow-primary"
                                                            : "border-foreground bg-card hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)]"
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 border-2 border-foreground/50 flex items-center justify-center font-black text-lg">
                                                            {lang.code.toUpperCase()}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-sm font-black uppercase tracking-wider">
                                                                {lang.label}
                                                            </div>
                                                            <div className="text-xs font-bold text-foreground/50">
                                                                {lang.native}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {i18n.language === lang.code && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="w-8 h-8 bg-primary border-2 border-foreground flex items-center justify-center"
                                                        >
                                                            <Check className="w-5 h-5 text-primary-foreground" strokeWidth={4} />
                                                        </motion.div>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Bottom Status Bar */}
                        <div className="h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
