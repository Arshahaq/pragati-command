import type {
  AiRecommendation,
  DisasterZone,
  EmergencyResource,
  GeoPoint,
  Hospital,
  HospitalRecommendationResult,
  HospitalRecommendationWeights,
  Incident,
  RoadSegment,
  RouteOption,
  Severity,
} from "./types";

/** Transparent, rule-based prototype intelligence. Replaceable by a real AI service. */

export const severityWeight: Record<Severity, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 15,
};

export function haversineKm(a: GeoPoint, b: GeoPoint) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

function pointSegmentKm(p: GeoPoint, a: GeoPoint, b: GeoPoint) {
  const t =
    ((p.lat - a.lat) * (b.lat - a.lat) + (p.lng - a.lng) * (b.lng - a.lng)) /
    (((b.lat - a.lat) ** 2 + (b.lng - a.lng) ** 2) || 1e-9);
  const c = Math.max(0, Math.min(1, t));
  return haversineKm(p, { lat: a.lat + c * (b.lat - a.lat), lng: a.lng + c * (b.lng - a.lng) });
}

/** Risk 0-100 for travelling between two points, from road status and flood zones. */
export function routeRisk(
  from: GeoPoint,
  to: GeoPoint,
  roads: RoadSegment[],
  zones: DisasterZone[],
): { score: number; hazards: string[] } {
  const hazards: string[] = [];
  let score = 8;
  const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  for (const road of roads) {
    if (road.status === "clear") continue;
    const near = Math.min(
      pointSegmentKm(from, road.from, road.to),
      pointSegmentKm(to, road.from, road.to),
      pointSegmentKm(mid, road.from, road.to),
    );
    if (near < 1.6) {
      const add = road.status === "closed" ? 45 : 30;
      score += Math.round(add * (1 - near / 1.6));
      hazards.push(`${road.name} — ${road.status === "closed" ? "closed" : "flood affected"}`);
    }
  }
  for (const zone of zones) {
    const near = Math.min(haversineKm(mid, zone.center), haversineKm(to, zone.center));
    if (near < zone.radiusKm) {
      score += Math.round(severityWeight[zone.risk] * 0.3 * (1 - near / zone.radiusKm));
      hazards.push(`${zone.name} — ${zone.risk} ${zone.hazard} risk`);
    }
  }
  return { score: Math.min(100, score), hazards: [...new Set(hazards)] };
}

export function riskLabel(score: number) {
  if (score >= 60) return { label: "High risk", tone: "critical" as const };
  if (score >= 35) return { label: "Elevated risk", tone: "warning" as const };
  return { label: "Safe", tone: "safe" as const };
}

export const hospitalRecommendationWeights: HospitalRecommendationWeights = {
  distanceWeight: 0.18,
  travelTimeWeight: 0.14,
  accessibilityWeight: 0.16,
  disasterRiskWeight: 0.14,
  operationalStatusWeight: 0.14,
  emergencyCapacityWeight: 0.14,
  routeReliabilityWeight: 0.1,
};

export interface HospitalRecommendation extends HospitalRecommendationResult {
  /** Compatibility fields retained for existing panels and services. */
  riskScore: number;
  hazards: string[];
  capacityFree: number;
  score: number;
  recommended: boolean;
  reason: string;
}

function normaliseInverse(value: number, max: number) {
  return Math.round(Math.max(0, Math.min(100, 100 - (value / Math.max(max, 0.1)) * 100)));
}

function routeStatusForRisk(score: number): HospitalRecommendationResult["routeStatus"] {
  if (score >= 75) return "blocked";
  if (score >= 35) return "caution";
  return "safe";
}

/** Transparent, deterministic safe-hospital ranking. Higher total scores are safer. */
export function rankHospitals(
  origin: GeoPoint,
  hospitals: Hospital[],
  roads: RoadSegment[],
  zones: DisasterZone[],
  scenario?: { active: boolean; floodSeverity: number },
): HospitalRecommendation[] {
  const scored = hospitals.map((hospital): HospitalRecommendation => {
    const distanceKm = haversineKm(origin, hospital.location);
    const routeOptions = planRoutes(origin, hospital.location, roads, zones);
    const route = [...routeOptions].sort(
      (a, b) => a.riskScore * 2 + a.minutes - (b.riskScore * 2 + b.minutes),
    )[0] ?? routeOptions[0];
    const baseRisk = routeRisk(origin, hospital.location, roads, zones);
    const riskScore = Math.min(100, Math.max(baseRisk.score, route?.riskScore ?? baseRisk.score) + (hospital.accessAffected ? 45 : 0));
    const hazards = [...new Set([...(route?.hazards ?? []), ...baseRisk.hazards])];
    const capacityFree = hospital.emergencyBeds.total - hospital.emergencyBeds.used;
    const estimatedTravelTimeMinutes = route?.minutes ?? Math.max(4, Math.round(distanceKm * 2.5));
    const routeStatus = routeStatusForRisk(riskScore);
    const distanceScore = normaliseInverse(distanceKm, 15);
    const travelTimeScore = normaliseInverse(estimatedTravelTimeMinutes, 45);
    const accessibilityScore = hospital.accessAffected ? 15 : routeStatus === "blocked" ? 5 : routeStatus === "caution" ? 58 : 96;
    const disasterRiskScore = Math.max(0, 100 - ({ low: 0, medium: 28, high: 62, critical: 92 }[hospital.floodRisk] ?? 50));
    const operationalStatusScore = { operational: 100, limited: 62, overloaded: 25, offline: 0 }[hospital.status];
    const emergencyCapacityScore = Math.round(Math.max(0, Math.min(100, (capacityFree / Math.max(hospital.emergencyBeds.total, 1)) * 100)));
    const routeReliabilityScore = Math.max(0, 100 - riskScore);
    const scoreBreakdown = {
      distance: distanceScore,
      travelTime: travelTimeScore,
      accessibility: accessibilityScore,
      disasterRisk: disasterRiskScore,
      operationalStatus: operationalStatusScore,
      emergencyCapacity: emergencyCapacityScore,
      routeReliability: routeReliabilityScore,
    };
    const totalScore = Math.round(
      distanceScore * hospitalRecommendationWeights.distanceWeight +
        travelTimeScore * hospitalRecommendationWeights.travelTimeWeight +
        accessibilityScore * hospitalRecommendationWeights.accessibilityWeight +
        disasterRiskScore * hospitalRecommendationWeights.disasterRiskWeight +
        operationalStatusScore * hospitalRecommendationWeights.operationalStatusWeight +
        emergencyCapacityScore * hospitalRecommendationWeights.emergencyCapacityWeight +
        routeReliabilityScore * hospitalRecommendationWeights.routeReliabilityWeight,
    );
    const isDisqualified =
      hospital.status === "offline" ||
      capacityFree <= 0 ||
      routeStatus === "blocked" ||
      (scenario?.active === true && scenario.floodSeverity >= 80 && hospital.accessAffected);
    const disqualificationReason = hospital.status === "offline"
      ? "Hospital is closed in the current simulation."
      : capacityFree <= 0
        ? "No emergency beds are currently available."
        : routeStatus === "blocked"
          ? "The safest available corridor is blocked or too hazardous."
          : scenario?.active && scenario.floodSeverity >= 80 && hospital.accessAffected
            ? "Flood scenario has made the hospital access corridor unreliable."
            : undefined;
    const reasons: string[] = [];
    const warnings: string[] = [];
    if (routeStatus === "safe") reasons.push("Safe route available with no major closure on the corridor.");
    if (!hospital.accessAffected) reasons.push("Primary hospital access is currently clear.");
    if (hospital.status === "operational") reasons.push("Emergency department is operational.");
    if (capacityFree > 0) reasons.push(`${capacityFree} emergency bed${capacityFree === 1 ? "" : "s"} available.`);
    if (hospital.floodRisk === "low") reasons.push("Hospital has low disaster exposure.");
    if (hospital.accessAffected) warnings.push("Primary access road is affected by flooding.");
    if (routeStatus !== "safe") warnings.push(`Route reliability is ${routeStatus}.`);
    if (hospital.status !== "operational") warnings.push(`Hospital status is ${hospital.status}.`);
    if (capacityFree <= 6 && capacityFree > 0) warnings.push("Emergency capacity is limited.");
    return {
      hospital,
      rank: 0,
      totalScore,
      distanceKm,
      estimatedTravelTimeMinutes,
      routeStatus,
      disasterRisk: hospital.floodRisk,
      operationalStatus: hospital.status,
      emergencyCapacity: capacityFree,
      scoreBreakdown,
      reasons,
      warnings,
      disqualificationReason,
      isRecommended: false,
      isDisqualified,
      route: route ?? planRoutes(origin, hospital.location, roads, zones)[0]!,
      riskScore,
      hazards,
      capacityFree,
      score: 100 - totalScore,
      recommended: false,
      reason: "",
    };
  });
  scored.sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1;
    return b.totalScore - a.totalScore;
  });
  const nearest = [...scored].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const recommended = scored.find((item) => !item.isDisqualified);
  return scored.map((item, index) => {
    const isRecommended = item.hospital.id === recommended?.hospital.id;
    const reason = item.isDisqualified
      ? item.disqualificationReason ?? "Not suitable for emergency routing."
      : isRecommended && nearest && nearest.hospital.id !== item.hospital.id
        ? `${nearest.hospital.name} is closer (${nearest.distanceKm} km), but this hospital has a safer, more reliable corridor and better emergency readiness.`
        : item.reasons[0] ?? "Operational alternative for emergency intake.";
    return {
      ...item,
      rank: index + 1,
      isRecommended,
      recommended: isRecommended,
      reason,
    };
  });
}

function offsetPath(from: GeoPoint, to: GeoPoint, bend: number): GeoPoint[] {
  const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  const control = { lat: mid.lat + dx * bend, lng: mid.lng - dy * bend };
  const pts: GeoPoint[] = [];
  for (let i = 0; i <= 12; i++) {
    const s = i / 12;
    pts.push({
      lat: (1 - s) ** 2 * from.lat + 2 * (1 - s) * s * control.lat + s ** 2 * to.lat,
      lng: (1 - s) ** 2 * from.lng + 2 * (1 - s) * s * control.lng + s ** 2 * to.lng,
    });
  }
  return pts;
}

function pathRisk(path: GeoPoint[], roads: RoadSegment[], zones: DisasterZone[]) {
  let worst = { score: 0, hazards: [] as string[] };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) continue;
    const r = routeRisk(a, b, roads, zones);
    if (r.score > worst.score) worst = { score: r.score, hazards: r.hazards };
  }
  return worst;
}

/** Simulated multi-option routing. Swap for a real routing API later. */
export function planRoutes(
  from: GeoPoint,
  to: GeoPoint,
  roads: RoadSegment[],
  zones: DisasterZone[],
): RouteOption[] {
  const directKm = Math.max(0.6, haversineKm(from, to));
  const variants: { label: RouteOption["label"]; bend: number; factor: number }[] = [
    { label: "Fastest", bend: 0, factor: 1 },
    { label: "Safest", bend: 0.42, factor: 1.24 },
    { label: "Emergency", bend: -0.28, factor: 1.14 },
  ];
  const options = variants.map(({ label, bend, factor }) => {
    const path = offsetPath(from, to, bend);
    const { score, hazards } = pathRisk(path, roads, zones);
    const distanceKm = Math.round(directKm * factor * 10) / 10;
    const speed = label === "Emergency" ? 34 : 24;
    const minutes = Math.max(4, Math.round((distanceKm / speed) * 60 + score * 0.12));
    return {
      id: `RT-${label.toUpperCase()}`,
      label,
      minutes,
      distanceKm,
      riskScore: score,
      hazards,
      path,
      recommended: false,
      reason: "",
    } satisfies RouteOption;
  });
  const best = [...options].sort(
    (a, b) => a.riskScore * 1.6 + a.minutes - (b.riskScore * 1.6 + b.minutes),
  )[0];
  return options.map((o) => ({
    ...o,
    recommended: o.id === best?.id,
    reason:
      o.hazards.length === 0
        ? "No flood-affected roads or active hazard zones on this corridor."
        : `Passes: ${o.hazards.join("; ")}.`,
  }));
}

export interface PriorityRow {
  incident: Incident;
  score: number;
  distanceKm: number;
  riskScore: number;
  resource?: EmergencyResource | undefined;
  breakdown: { label: string; value: string; points: number }[];
}

const preferredResource: Partial<Record<Incident["type"], EmergencyResource["type"][]>> = {
  Fire: ["Fire Truck", "Rescue Team"],
  "Medical Emergency": ["Ambulance", "Medical Team"],
  Accident: ["Ambulance", "Police Unit"],
  "Trapped Person": ["Rescue Team", "Boat"],
  Flood: ["Boat", "Rescue Team"],
  Landslide: ["Rescue Team"],
  "Missing Person": ["Police Unit", "Rescue Team"],
  "Building Damage": ["Rescue Team"],
  "Road Blockage": ["Police Unit", "Fire Truck"],
};

/** Rule-based incident prioritisation + resource matching. */
export function prioritise(
  incidents: Incident[],
  resources: EmergencyResource[],
  roads: RoadSegment[],
  zones: DisasterZone[],
): PriorityRow[] {
  const open = incidents.filter((i) => i.status !== "resolved");
  const taken = new Set<string>();
  const rows = open.map((incident) => {
    const wanted = preferredResource[incident.type] ?? ["Rescue Team"];
    const candidates = resources
      .filter((r) => r.status === "available" && wanted.includes(r.type) && !taken.has(r.id))
      .map((r) => ({
        r,
        d: haversineKm(r.location, incident.location),
        risk: routeRisk(r.location, incident.location, roads, zones).score,
      }))
      .sort((a, b) => a.d * 6 + a.risk - (b.d * 6 + b.risk));
    const best = candidates[0];
    const distanceKm = best ? best.d : 0;
    const riskScore = best ? best.risk : 60;
    const sevPts = severityWeight[incident.severity] * 0.45;
    const peoplePts = Math.min(20, incident.peopleAffected * 1.6);
    const distPts = Math.max(0, 18 - distanceKm * 2.4);
    const availPts = best ? 12 : 0;
    const riskPts = -riskScore * 0.14;
    const agePts = Math.min(10, (Date.now() - Date.parse(incident.reportedAt)) / 600_000);
    const score = Math.round(sevPts + peoplePts + distPts + availPts + riskPts + agePts);
    if (best) taken.add(best.r.id);
    return {
      incident,
      score,
      distanceKm,
      riskScore,
      resource: best?.r,
      breakdown: [
        { label: "Severity", value: incident.severity, points: Math.round(sevPts) },
        { label: "People affected", value: String(incident.peopleAffected), points: Math.round(peoplePts) },
        { label: "Nearest resource distance", value: best ? `${distanceKm} km` : "none free", points: Math.round(distPts) },
        { label: "Resource availability", value: best ? best.r.callSign : "unavailable", points: availPts },
        { label: "Route risk", value: `${riskScore}/100`, points: Math.round(riskPts) },
        { label: "Time waiting", value: `${Math.round((Date.now() - Date.parse(incident.reportedAt)) / 60_000)} min`, points: Math.round(agePts) },
      ],
    } satisfies PriorityRow;
  });
  return rows.sort((a, b) => b.score - a.score);
}

/** Derive live AI recommendations from current simulated state. */
export function deriveRecommendations(args: {
  incidents: Incident[];
  resources: EmergencyResource[];
  hospitals: Hospital[];
  roads: RoadSegment[];
  zones: DisasterZone[];
  now: string;
  scenario?: { active: boolean; floodSeverity: number };
}): AiRecommendation[] {
  const { incidents, resources, hospitals, roads, zones, now, scenario } = args;
  const out: AiRecommendation[] = [];

  const ranked = prioritise(incidents, resources, roads, zones).filter(
    (r) => r.incident.status === "awaiting",
  );
  for (const row of ranked.slice(0, 3)) {
    if (!row.resource) continue;
    out.push({
      id: `AI-DYN-${row.incident.id}`,
      kind: "resource_allocation",
      headline: `Assign ${row.resource.callSign} to ${row.incident.id}`,
      reason: `${row.incident.id} (${row.incident.type}, ${row.incident.severity}, ${row.incident.peopleAffected} affected) scores ${row.score} on the prioritisation model. ${row.resource.callSign} is ${row.distanceKm} km away with route risk ${row.riskScore}/100.`,
      suggestedAction: `Dispatch ${row.resource.callSign} to ${row.incident.area}.`,
      severity: row.incident.severity,
      at: now,
      confidence: Math.min(0.94, 0.6 + row.score / 260),
      status: "pending",
      incidentId: row.incident.id,
      resourceId: row.resource.id,
      factors: row.breakdown.map((b) => ({ label: b.label, value: `${b.value} (${b.points >= 0 ? "+" : ""}${b.points})` })),
    });
  }

  for (const h of hospitals) {
    const free = h.emergencyBeds.total - h.emergencyBeds.used;
    if (h.status === "overloaded" || free <= 3) {
      const alt = hospitals
        .filter((x) => x.id !== h.id && !x.accessAffected && x.status === "operational")
        .sort(
          (a, b) =>
            b.emergencyBeds.total - b.emergencyBeds.used - (a.emergencyBeds.total - a.emergencyBeds.used),
        )[0];
      out.push({
        id: `AI-CAP-${h.id}`,
        kind: "capacity",
        headline: `${h.name} approaching emergency capacity`,
        reason: `${free} emergency bed(s) and ${h.icu.total - h.icu.used} ICU bed(s) remaining, oxygen at ${h.oxygenPct}%.`,
        suggestedAction: alt
          ? `Divert new critical intake to ${alt.name}.`
          : "Escalate to district health officer for capacity expansion.",
        severity: free <= 1 ? "critical" : "high",
        at: now,
        confidence: 0.81,
        status: "pending",
        factors: [
          { label: "Emergency beds", value: `${h.emergencyBeds.used}/${h.emergencyBeds.total}` },
          { label: "ICU", value: `${h.icu.used}/${h.icu.total}` },
          { label: "Oxygen", value: `${h.oxygenPct}%` },
        ],
      });
    }
    if (h.accessAffected) {
      const alt = rankHospitals(h.location, hospitals.filter((x) => x.id !== h.id), roads, zones, scenario)[0];
      out.push({
        id: `AI-ACC-${h.id}`,
        kind: "hospital_routing",
        headline: `Re-route casualties away from ${h.name}`,
        reason: `${h.name} is reachable on paper but its primary access road is flood affected in the simulation. ${alt ? `${alt.hospital.name} has a longer route with lower risk (${alt.riskScore}/100) and ${alt.capacityFree} emergency beds free.` : ""}`,
        suggestedAction: alt ? `Set ${alt.hospital.name} as preferred receiving facility.` : "Hold transfers until access is restored.",
        severity: "high",
        at: now,
        confidence: 0.84,
        status: "pending",
        factors: [{ label: "Access", value: "Flood affected" }],
      });
    }
  }

  for (const road of roads.filter((r) => r.status !== "clear")) {
    out.push({
      id: `AI-RD-${road.id}`,
      kind: "route",
      headline: `${road.name} becoming unsafe`,
      reason: `Segment reported ${road.status.replace("_", " ")} with ${road.severity} severity. ${road.note ?? ""}`,
      suggestedAction: "Recalculate ambulance corridors and publish citizen advisory.",
      severity: road.severity,
      at: now,
      confidence: 0.77,
      status: "pending",
      factors: [{ label: "Status", value: road.status.replace("_", " ") }],
    });
  }

  for (const zone of zones.filter((z) => z.risk === "critical" || z.risk === "high")) {
    out.push({
      id: `AI-Z-${zone.id}`,
      kind: "evacuation",
      headline: `${zone.name} evacuation ${zone.risk === "critical" ? "recommended" : "readiness advised"}`,
      reason: `${zone.populationExposed.toLocaleString("en-IN")} residents exposed within ${zone.radiusKm} km of the hazard centre at ${zone.risk} risk.`,
      suggestedAction: zone.risk === "critical" ? "Begin staged evacuation to nearest open relief centre." : "Pre-position boats and stage relief capacity.",
      severity: zone.risk,
      at: now,
      confidence: 0.72,
      status: "pending",
      factors: [{ label: "Population exposed", value: zone.populationExposed.toLocaleString("en-IN") }],
    });
  }

  return out;
}