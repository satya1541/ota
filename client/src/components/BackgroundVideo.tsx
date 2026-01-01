import backgroundVideo from "@assets/itachi_1767180619876_1767247903745.webm";
import { useState, useEffect } from "react";

export function BackgroundVideo({ onLoaded }: { onLoaded?: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded && onLoaded) {
      onLoaded();
    }
  }, [isLoaded, onLoaded]);

  return (
    <div className="fixed inset-0 overflow-hidden w-full h-full pointer-events-none" style={{ zIndex: -50 }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        key={backgroundVideo}
        onCanPlayThrough={() => setIsLoaded(true)}
        className={`absolute min-w-full min-h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ filter: "brightness(0.35) contrast(1.1)" }}
      >
        <source src={backgroundVideo} type="video/webm" />
      </video>
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} />
      {!isLoaded && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="loader" />
        </div>
      )}
    </div>
  );
}
