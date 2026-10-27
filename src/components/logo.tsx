import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="9" y="6.5" width="14" height="19" rx="2.5" className="fill-primary-foreground" />
      <path
        d="M12.5 12h7M12.5 15.75h7M12.5 19.5h4"
        className="stroke-primary"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-semibold tracking-tight", className)}>
      <LogoMark />
      Briefly
    </span>
  );
}
