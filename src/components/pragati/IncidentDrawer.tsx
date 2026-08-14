import { usePragati } from "@/lib/pragati/store";
import { haversineKm, rankHospitals, routeRisk, riskLabel } from "@/lib/pragati/logic";
import { SeverityBadge, StatusPill, clockTime, timeAgo } from "./primitives";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export function IncidentDrawer({
  incidentId,
  onClose,
}: {
  incidentId: string | null;
  onClose: () => void;
}) {
  const { state, dispatch, priorities } = usePragati();
  const incident = state.incidents.find((i) => i.id === incidentId) ?? null;

  return (
    <Sheet open={!!incident} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-border bg-surface sm:max-w-xl">
        {incident && (
          <>
            <SheetHeader className="space-y-2">
              <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
                {incident.id}
                <SeverityBadge severity={incident.severity} />
                <StatusPill tone={incident.status === "awaiting" ? "warning" : "info"}>
                  {incident.status.replace("_", " ")}
                </StatusPill>
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {incident.type} · {incident.area} · reported {timeAgo(incident.reportedAt)} via{" "}
                {incident.source.replace("_", " ")}
              </p>
            </SheetHeader>

            <div className="mt-5 space-y-5 px-4 pb-8">
              <Block title="Description">
                <p className="text-sm leading-relaxed text-foreground">{incident.description}</p>
                <div className="mt-3 flex gap-2">
                  {Array.from({ length: incident.photoCount ?? 0 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-[10px] text-muted-foreground"
                    >
                      <Camera className="mr-1 size-3" /> photo {i + 1}
                    </div>
                  ))}
                  {!incident.photoCount && (
                    <p className="text-xs text-muted-foreground">No media attached to this report.</p>
                  )}
                </div>
              </Block>

              <Block title="Situation">
                <Rows
                  rows={[
                    { label: "People affected", value: String(incident.peopleAffected) },
                    { label: "Coordinates (simulated)", value: `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}` },
                    { label: "Priority score", value: String(priorities.find((p) => p.incident.id === incident.id)?.score ?? "—") },
                    { label: "ETA", value: incident.etaMinutes ? `${incident.etaMinutes} min` : "Not dispatched" },
                  ]}
                />
              </Block>

              <NearestBlock incidentId={incident.id} />

              <Block title="Resource assignment">
                {incident.assignedResourceId ? (
                  <p className="text-sm text-foreground">
                    Assigned to{" "}
                    <span className="font-semibold">
                      {state.resources.find((r) => r.id === incident.assignedResourceId)?.callSign ??
                        incident.assignedResourceId}
                    </span>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {state.resources
                      .filter((r) => r.status === "available")
                      .slice(0, 6)
                      .map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            dispatch({ type: "assignResource", incidentId: incident.id, resourceId: r.id });
                            toast.success(`${r.callSign} dispatched to ${incident.id}`);
                          }}
                          className="rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:border-primary/60 hover:bg-primary/10"
                        >
                          Assign {r.callSign}
                        </button>
                      ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["on_scene", "resolved"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => dispatch({ type: "setIncidentStatus", incidentId: incident.id, status })}
                      className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Mark {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </Block>

              <Block title="Timeline">
                <ol className="space-y-3">
                  {incident.timeline.map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className="flex gap-3">
                      <span className="tabular w-12 shrink-0 text-[11px] text-muted-foreground">
                        {clockTime(entry.at)}
                      </span>
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-xs">
                        <span className="text-foreground">{entry.label}</span>
                        {entry.actor && <span className="text-muted-foreground"> · {entry.actor}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </Block>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NearestBlock({ incidentId }: { incidentId: string }) {
  const { state } = usePragati();
  const incident = state.incidents.find((i) => i.id === incidentId);
  if (!incident) return null;
  const hospitals = rankHospitals(incident.location, state.hospitals, state.roads, state.zones);
  const best = hospitals[0];
  const team = [...state.resources]
    .filter((r) => r.status === "available")
    .sort((a, b) => haversineKm(a.location, incident.location) - haversineKm(b.location, incident.location))[0];
  const risk = best ? routeRisk(incident.location, best.hospital.location, state.roads, state.zones) : null;

  return (
    <Block title="PRAGATI recommendation">
      <Rows
        rows={[
          {
            label: "Recommended hospital",
            value: best ? `${best.hospital.name} · ${best.distanceKm} km · ${best.capacityFree} beds free` : "—",
          },
          {
            label: "Nearest available resource",
            value: team ? `${team.callSign} · ${haversineKm(team.location, incident.location)} km` : "None free",
          },
          {
            label: "Route risk",
            value: risk ? `${risk.score}/100 · ${riskLabel(risk.score).label}` : "—",
          },
          {
            label: "Hazards on corridor",
            value: risk && risk.hazards.length ? risk.hazards.join("; ") : "None detected",
          },
        ]}
      />
      {best && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{best.reason}</p>}
    </Block>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="label-eyebrow mb-2">{title}</p>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 text-xs">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="max-w-[62%] text-right font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}