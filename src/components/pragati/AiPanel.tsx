import { useState } from "react";
import { usePragati } from "@/lib/pragati/store";
import { Panel, SeverityBadge, StatusPill, timeAgo } from "./primitives";
import { Brain, Check, ChevronDown, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AiPanel({ limit, className }: { limit?: number | undefined; className?: string | undefined }) {
  const { state, dispatch } = usePragati();
  const [expanded, setExpanded] = useState<string | null>(null);

  const pending = state.recommendations.filter((r) => r.status === "pending");
  const shown = limit ? pending.slice(0, limit) : pending;

  return (
    <Panel
      eyebrow="Decision support · rule-based prototype"
      title={
        <span className="flex items-center gap-2">
          <Brain className="size-4 text-primary" /> AI Disaster Intelligence
        </span>
      }
      actions={
        <button
          onClick={() => {
            dispatch({ type: "refreshRecommendations" });
            toast.success("Recommendations recalculated from current simulated state");
          }}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3" /> Recalculate
        </button>
      }
      className={className}
      bodyClassName="p-0"
    >
      <div className="divide-y divide-border">
        {shown.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No open recommendations. Activate a scenario or adjust what-if controls to generate new
            guidance.
          </p>
        )}
        {shown.map((rec) => {
          const open = expanded === rec.id;
          return (
            <article key={rec.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={rec.severity} />
                    <StatusPill tone="info">{rec.kind.replace("_", " ")}</StatusPill>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(rec.at)}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-foreground">{rec.headline}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rec.suggestedAction}</p>
                </div>
                <span className="tabular shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
                  {Math.round(rec.confidence * 100)}%
                </span>
              </div>

              {open && (
                <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
                  <p className="label-eyebrow">Reason</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">{rec.reason}</p>
                  {rec.factors && rec.factors.length > 0 && (
                    <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {rec.factors.map((f) => (
                        <div key={f.label} className="flex justify-between gap-2 text-[11px]">
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="text-right font-medium text-foreground">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setExpanded(open ? null : rec.id)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
                  View reason
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: "recStatus", id: rec.id, status: "accepted" });
                    toast.success("Recommendation accepted", { description: rec.suggestedAction });
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-forest/45 bg-forest/15 px-2.5 py-1.5 text-xs font-medium text-forest"
                >
                  <Check className="size-3" /> Accept recommendation
                </button>
                <button
                  onClick={() => dispatch({ type: "recStatus", id: rec.id, status: "dismissed" })}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" /> Dismiss
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}