import { memo } from "react";
import { useTheme } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";

export const BackgroundImage = memo(function BackgroundImage() {
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-background">
      {/* Video Background Layer - Disabled on Mobile for performance */}
      {!isMobile && (
        <div className="absolute inset-0 z-0">
          <video
            key={theme}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover transition-opacity duration-1000"
            style={{ opacity: theme === "light" ? 0.3 : 0.4 }}
          >
            <source
              src={`/videos/${theme === "light" ? "white.mp4" : "black.mp4"}`}
              type="video/mp4"
            />
          </video>
        </div>
      )}

      {/* Deep Space Base Gradient */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/10 via-background to-background"
        style={{
          background: `
            radial-gradient(circle at 50% 0%, hsla(222, 47%, 15%, 0.2) 0%, transparent 60%),
            radial-gradient(circle at 85% 30%, hsla(190, 100%, 50%, 0.02) 0%, transparent 40%),
            radial-gradient(circle at 15% 70%, hsla(260, 100%, 65%, 0.02) 0%, transparent 40%),
            linear-gradient(to bottom, transparent, hsl(var(--background)))
          `
        }}
      />

      {/* Grid Overlay - subtle technical feel */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at 50% 50%, black 40%, transparent 100%)'
        }}
      />

      {/* Noise Texture for Film Grain */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none">
        <svg className="w-full h-full">
          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.60" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      {/* Aurora / Bloom Effects */}
      <div className="absolute top-[-20%] left-[20%] w-[60%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[40%] bg-secondary/5 blur-[100px] rounded-full animate-pulse-slow delay-1000" />
    </div>
  );
});
