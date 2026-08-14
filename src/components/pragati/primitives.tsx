import { cn } from "@/lib/utils";
import type { AlertLevel, Severity } from "@/lib/pragati/types";
import { useEffect, useState, type ReactNode } from "react";

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string | undefined;
}) {
  const map: Record<Severity, string> = {
    critical: "bg-critical/15 text-critical border-critical/40",
    high: "bg-warning/15 text-warning border-warning/40",
    medium: "bg-saffron/12 text-saffron border-saffron/35",
    low: "bg-forest/12 text-forest border-forest/35",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        map[severity],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "safe" | "warning" | "critical" | "info" | undefined;
  className?: string | undefined;
}) {
  const map = {
    neutral: "bg-surface-3 text-muted-foreground border-border",
    safe: "bg-forest/12 text-forest border-forest/35",
    warning: "bg-warning/15 text-warning border-warning/40",
    critical: "bg-critical/15 text-critical border-critical/40",
    info: "bg-primary/15 text-primary border-primary/40",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function alertTone(level: AlertLevel) {
  return level === "critical" ? "critical" : level === "warning" ? "warning" : "info";
}

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode | undefined;
  eyebrow?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      {(title || actions || eyebrow) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
            {title && <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  tone?: "neutral" | "safe" | "warning" | "critical" | "info" | undefined;
  icon?: ReactNode | undefined;
}) {
  const accent = {
    neutral: "text-foreground",
    safe: "text-forest",
    warning: "text-warning",
    critical: "text-critical",
    info: "text-primary",
  }[tone];
  const bar = {
    neutral: "bg-border",
    safe: "bg-forest",
    warning: "bg-warning",
    critical: "bg-critical",
    info: "bg-primary",
  }[tone];
  return (
    <div className="panel relative overflow-hidden p-4">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", bar)} />
      <div className="flex items-start justify-between">
        <p className="label-eyebrow">{label}</p>
        {icon && <span className={cn("opacity-70", accent)}>{icon}</span>}
      </div>
      <p className={cn("tabular mt-2 text-3xl font-semibold leading-none", accent)}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function PrototypeTag({ className }: { className?: string | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-saffron/40 bg-saffron/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-saffron",
        className,
      )}
    >
      Prototype · Simulation
    </span>
  );
}

/** Client-only clock so SSR markup stays stable. */
export function LiveClock({ className }: { className?: string | undefined }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setNow(
        new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={cn("tabular", className)}>{now ?? "--:--:--"} IST</span>;
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} h ${mins % 60} min ago`;
}

export function clockTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function ProgressBar({
  value,
  total,
  tone = "info",
}: {
  value: number;
  total: number;
  tone?: "info" | "safe" | "warning" | "critical" | undefined;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const bar = { info: "bg-primary", safe: "bg-forest", warning: "bg-warning", critical: "bg-critical" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}