import backgroundVideo from "@assets/3051492-hd_1920_1080_25fps_1767859390784.mp4";

export function BackgroundImage() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden w-full h-full pointer-events-none bg-slate-950" 
      style={{ 
        zIndex: -50,
      }}
    >
      <video
        src={backgroundVideo}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
    </div>
  );
}
