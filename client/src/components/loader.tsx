import { cn } from "@/lib/utils";

export function Loader({ className = "" }: { className?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className={cn("loader", className)} data-testid="loader" />
    </div>
  );
}
