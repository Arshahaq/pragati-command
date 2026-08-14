import { createFileRoute, Link } from "@tanstack/react-router";
import { usePragati } from "@/lib/pragati/store";
import { roleMeta } from "@/components/pragati/AppShell";
import { PrototypeTag, StatusPill } from "@/components/pragati/primitives";
import type { Role } from "@/lib/pragati/types";
import { ArrowRight, Brain, MapPinned, ShieldCheck, Siren } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRAGATI · One Disaster. One Map. One Coordinated Response." },
      {
        name: "description",
        content:
          "Entry point to the PRAGATI prototype: choose a demo role to explore the command centre, citizen portal, responder, hospital and relief consoles.",
      },
      { property: "og:title", content: "PRAGATI · Disaster Response & Coordination Prototype" },
      {
        property: "og:description",
        content:
          "Detect, predict, prioritise, optimise and respond — a simulated unified disaster coordination platform for Bengaluru Urban.",
      },
    ],
  }),
  component: Landing,
});

const roles: Role[] = ["government", "citizen", "responder", "hospital", "relief"];

const roleBlurb: Record<Role, string> = {
  government: "Live operational picture, incident queue, resource allocation, scenario simulator and analytics.",
  citizen: "Request help, find a safe hospital, plan a safe route and track your requests.",
  responder: "Active missions, assigned resources, field routes and incoming emergency requests.",
  hospital: "Publish facility status, update capacity and flag access-road disruption.",
  relief: "Manage relief centre occupancy, supplies and medical support availability.",
};

function Landing() {
  const { state, kpis, setRole } = usePragati();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2">
              <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-saffron" />
              <span className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-forest" />
              <span className="size-3 rounded-full border-2 border-primary" />
            </span>
            <div>
              <p className="text-xl font-bold tracking-[0.2em]">PRAGATI</p>
              <p className="text-xs text-muted-foreground">Disaster Response & Coordination</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PrototypeTag />
            <StatusPill tone="safe">System operational</StatusPill>
          </div>
        </header>

        <section className="mt-12 max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
            One Disaster. One Map.{" "}
            <span className="bg-gradient-to-r from-saffron via-foreground to-forest bg-clip-text text-transparent">
              One Coordinated Response.
            </span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            PRAGATI unifies citizens, district administration, emergency services, hospitals and
            relief centres into a single decision-support picture — turning fragmented disaster
            information into allocation, routing and evacuation decisions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/command"
              onClick={() => setRole("government")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Open Command Center <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/citizen"
              onClick={() => setRole("citizen")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2"
            >
              Open Citizen Portal
            </Link>
            <Link
              to="/command/simulator"
              onClick={() => setRole("government")}
              className="inline-flex items-center gap-2 rounded-lg border border-saffron/40 bg-saffron/10 px-4 py-2.5 text-sm font-medium text-saffron"
            >
              <Siren className="size-4" /> Bengaluru Flood scenario
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { k: "Detect", v: "Sensor, citizen, police and drone reports converge on one map." },
            { k: "Predict", v: "Zone risk and road viability projected from live conditions." },
            { k: "Prioritise", v: "Transparent scoring ranks incidents by severity and exposure." },
            { k: "Optimise", v: "Resources matched to incidents by distance and route risk." },
            { k: "Respond", v: "Dispatch, safe routing and citizen guidance in one loop." },
          ].map((item) => (
            <div key={item.k} className="panel p-4">
              <p className="text-sm font-semibold text-foreground">{item.k}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.v}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label-eyebrow">Prototype Demo Mode</p>
              <h2 className="text-lg font-semibold">Choose an interface to demonstrate</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Demo-only role switching — production access requires authenticated RBAC.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Link
                key={role}
                to={roleMeta[role].home}
                onClick={() => setRole(role)}
                className="panel group p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{roleMeta[role].label}</p>
                  <span className="tabular text-[10px] tracking-widest text-muted-foreground">
                    {roleMeta[role].short}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{roleBlurb[role]}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Enter <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="panel p-4">
            <MapPinned className="size-4 text-primary" />
            <p className="mt-2 text-2xl font-semibold tabular">{kpis.activeIncidents}</p>
            <p className="text-xs text-muted-foreground">Active simulated incidents in Bengaluru Urban</p>
          </div>
          <div className="panel p-4">
            <ShieldCheck className="size-4 text-forest" />
            <p className="mt-2 text-2xl font-semibold tabular">
              {kpis.availableAmbulances + kpis.availableRescueTeams}
            </p>
            <p className="text-xs text-muted-foreground">Ambulances and rescue teams available</p>
          </div>
          <div className="panel p-4">
            <Brain className="size-4 text-saffron" />
            <p className="mt-2 text-2xl font-semibold tabular">
              {state.recommendations.filter((r) => r.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">Open decision-support recommendations</p>
          </div>
        </section>

        <p className="mt-10 text-[11px] leading-relaxed text-muted-foreground">
          PRAGATI is an independent Phase 1 prototype. It is not operated by, authorised by, or
          integrated with any government, NDRF/SDRF or emergency service. Every value shown is
          simulated for demonstration.
        </p>
      </div>
    </div>
  );
}
