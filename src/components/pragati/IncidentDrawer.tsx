import { useEffect, useState } from "react";
import { usePragati } from "@/lib/pragati/store";
import { useAuth } from "@/lib/AuthProvider";
import { haversineKm, rankHospitals, routeRisk, riskLabel } from "@/lib/pragati/logic";
import { SeverityBadge, StatusPill, clockTime, timeAgo } from "./primitives";
import { MapCanvas } from "./MapCanvas";
import { routingService } from "@/lib/pragati/services";
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
  const { user } = useAuth();
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [liveRoutes, setLiveRoutes] = useState<import("@/lib/pragati/types").RouteOption[]>([]);
  const incident = state.incidents.find((i) => i.id === incidentId);
  const hospitals = incident ? rankHospitals(incident.location, state.hospitals, state.roads, state.zones, {
    active: state.scenarioActive,
    floodSeverity: state.whatIf.floodSeverity,
  }) : [];
  const best = hospitals.find((hospital) => hospital.isRecommended);
  const selected = hospitals.find((hospital) => hospital.hospital.id === (selectedHospitalId ?? best?.hospital.id));
  const override = incident ? state.hospitalOverrides.find((audit) => audit.incidentId === incident.id && audit.hospitalId === selected?.hospital.id) : undefined;
  useEffect(() => {
    let active = true;
    if (!incident || !selected) return () => {
      active = false;
    };
    routingService.getRoutes(incident.location, selected.hospital.location, state.roads, state.zones).then((routes) => {
      if (active) setLiveRoutes(routes);
    });
    return () => {
      active = false;
    };
  }, [incident?.id, selected?.hospital.id, state.roads, state.zones]);
  const liveRoute = liveRoutes.find((route) => route.recommended) ?? selected?.route;
  if (!incident) return null;
  const team = [...state.resources]
    .filter((r) => r.status === "available")
    .sort((a, b) => haversineKm(a.location, incident.location) - haversineKm(b.location, incident.location))[0];
  const risk = selected ? routeRisk(incident.location, selected.hospital.location, state.roads, state.zones) : null;

  return (
    <Block title="PRAGATI recommendation">
      {selected && (
        <>
          <div className="mb-3 rounded-lg border border-forest/40 bg-forest/8 p-3">
            <p className="label-eyebrow text-forest">Safest recommended hospital</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selected.hospital.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusPill tone="safe">Score {selected.totalScore}/100</StatusPill>
              <StatusPill tone={selected.routeStatus === "safe" ? "safe" : selected.routeStatus === "caution" ? "warning" : "critical"}>Route {selected.routeStatus}</StatusPill>
              <StatusPill tone={selected.emergencyCapacity > 4 ? "safe" : "warning"}>{selected.emergencyCapacity} beds free</StatusPill>
            </div>
          </div>
          {liveRoute && <MapCanvas className="mb-3 min-h-[240px]" origin={incident.location} routes={[liveRoute]} compact />}
        </>
      )}
      <Rows
        rows={[
          {
            label: "Recommended hospital",
            value: best ? `${best.hospital.name} · ${best.distanceKm} km · ${best.emergencyCapacity} beds free` : "No eligible hospital",
          },
          {
            label: "Nearest available resource",
            value: team ? `${team.callSign} · ${haversineKm(team.location, incident.location)} km` : "None free",
          },
          {
            label: "Route risk",
            value: liveRoute ? `${liveRoute.routeStatus?.replace("_", " ") ?? "analyzed"} · ${liveRoute.minutes} min` : risk ? `${risk.score}/100 · ${riskLabel(risk.score).label}` : "—",
          },
          {
            label: "Hazards on corridor",
            value: risk && risk.hazards.length ? risk.hazards.join("; ") : "None detected",
          },
        ]}
      />
      {selected && (
        <>
          <div className="mt-3 space-y-1 text-xs">
            {selected.reasons.map((reason) => <p key={reason} className="text-foreground">• {reason}</p>)}
            {selected.warnings.map((warning) => <p key={warning} className="text-warning">Warning: {warning}</p>)}
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <p className="label-eyebrow mb-2">Alternative hospitals</p>
            <div className="space-y-2">
              {hospitals.filter((hospital) => !hospital.isRecommended).slice(0, 3).map((hospital) => (
                <div key={hospital.hospital.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-xs">
                  <span className="min-w-0 truncate text-foreground">{hospital.hospital.name} · {hospital.distanceKm} km</span>
                  <button type="button" onClick={() => setSelectedHospitalId(hospital.hospital.id)} className="shrink-0 text-primary hover:underline">Select</button>
                </div>
              ))}
            </div>
          </div>
          {selectedHospitalId && selectedHospitalId !== best?.hospital.id && !override && (
            <div className="mt-3 space-y-2 rounded-md border border-saffron/35 bg-saffron/8 p-3">
              <p className="text-xs font-semibold text-foreground">Override recommendation</p>
              <textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Reason required for audit trail" className="min-h-16 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary" />
              <button type="button" disabled={overrideReason.trim().length < 8} onClick={() => {
                dispatch({
                  type: "recordHospitalOverride",
                  audit: {
                    incidentId: incident.id,
                    hospitalId: selected.hospital.id,
                    reason: overrideReason.trim(),
                    operator: user?.name ?? "Government operator",
                    at: new Date().toISOString(),
                  },
                });
                setOverrideReason("");
                toast.success("Hospital override recorded for audit");
              }} className="rounded-md bg-saffron px-2.5 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50">Record override</button>
            </div>
          )}
          {override && <p className="mt-3 text-[11px] text-saffron">Override recorded for {selected.hospital.name} by {override.operator} at {clockTime(override.at)}: {override.reason}</p>}
        </>
      )}
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