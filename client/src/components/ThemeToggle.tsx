import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

/**
 * ThemeToggle component for switching between dark and light modes.
 * Persists preference to localStorage and respects system preference.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    // Default to dark mode for this project's aesthetic
    const shouldBeDark = stored === "dark" || (!stored && prefersDark) || stored === null;
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle("dark", isDark);
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }, [isDark, mounted]);

  if (!mounted) return null;

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={() => setIsDark(!isDark)}
      className="h-10 w-10 rounded-xl ring-1 ring-border/50 hover:bg-white/10 transition-all"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600" />
      )}
    </Button>
  );
}

export default ThemeToggle;
