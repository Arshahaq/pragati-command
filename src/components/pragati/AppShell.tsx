import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePragati } from "@/lib/pragati/store";
import type { Role } from "@/lib/pragati/types";
import { LiveClock, PrototypeTag, StatusPill } from "./primitives";
import {
  Activity,
  Ambulance,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Brain,
  ClipboardList,
  Home,
  LifeBuoy,
  Map as MapIcon,
  Menu,
  Radar,
  Route as RouteIcon,
  Settings,
  ShieldAlert,
  Siren,
  Tent,
  TriangleAlert,
  Users,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export const roleMeta: Record<Role, { label: string; short: string; home: string; org: string }> = {
  government: { label: "Government / Admin", short: "GOV", home: "/command", org: "District Emergency Operations Centre — Bengaluru Urban (simulated)" },
  citizen: { label: "Citizen", short: "CIT", home: "/citizen", org: "Public safety portal — Koramangala, Bengaluru" },
  responder: { label: "Emergency Responder", short: "RES", home: "/responder", org: "Field operations — Rescue Team R04 (simulated)" },
  hospital: { label: "Hospital", short: "HOS", home: "/hospital", org: "Facility console — hospital administrator (simulated)" },
  relief: { label: "Relief Center", short: "REL", home: "/relief", org: "Relief operations console (simulated)" },
};

const nav: Record<Role, NavItem[]> = {
  government: [
    { to: "/command", label: "Overview", icon: <Activity className="size-4" /> },
    { to: "/command/map", label: "Live Map", icon: <MapIcon className="size-4" /> },
    { to: "/command/incidents", label: "Incidents", icon: <TriangleAlert className="size-4" /> },
    { to: "/command/resources", label: "Resources", icon: <Boxes className="size-4" /> },
    { to: "/command/hospitals", label: "Hospitals", icon: <Building2 className="size-4" /> },
    { to: "/command/relief-centers", label: "Relief Centers", icon: <Tent className="size-4" /> },
    { to: "/command/routes", label: "Routes", icon: <RouteIcon className="size-4" /> },
    { to: "/command/intelligence", label: "AI Intelligence", icon: <Brain className="size-4" /> },
    { to: "/command/drones", label: "Field Intelligence", icon: <Radar className="size-4" /> },
    { to: "/command/simulator", label: "Scenario Simulator", icon: <Siren className="size-4" /> },
    { to: "/command/alerts", label: "Alerts", icon: <Bell className="size-4" /> },
    { to: "/command/reports", label: "Reports", icon: <BarChart3 className="size-4" /> },
    { to: "/command/settings", label: "Settings", icon: <Settings className="size-4" /> },
  ],
  citizen: [
    { to: "/citizen", label: "Home", icon: <Home className="size-4" /> },
    { to: "/citizen/help", label: "Find Help", icon: <LifeBuoy className="size-4" /> },
    { to: "/citizen/safe-route", label: "Safe Route", icon: <RouteIcon className="size-4" /> },
    { to: "/citizen/hospitals", label: "Hospitals", icon: <Building2 className="size-4" /> },
    { to: "/citizen/relief-centers", label: "Relief Centers", icon: <Tent className="size-4" /> },
    { to: "/citizen/report", label: "Report Incident", icon: <TriangleAlert className="size-4" /> },
    { to: "/citizen/requests", label: "My Requests", icon: <ClipboardList className="size-4" /> },
  ],
  responder: [
    { to: "/responder", label: "Active Missions", icon: <ShieldAlert className="size-4" /> },
    { to: "/responder/incidents", label: "Incidents", icon: <TriangleAlert className="size-4" /> },
    { to: "/responder/resources", label: "Assigned Resources", icon: <Boxes className="size-4" /> },
    { to: "/responder/routes", label: "Routes", icon: <RouteIcon className="size-4" /> },
    { to: "/responder/requests", label: "Emergency Requests", icon: <ClipboardList className="size-4" /> },
  ],
  hospital: [
    { to: "/hospital", label: "Hospital Status", icon: <Building2 className="size-4" /> },
    { to: "/hospital/capacity", label: "Capacity", icon: <Activity className="size-4" /> },
    { to: "/hospital/requests", label: "Emergency Requests", icon: <ClipboardList className="size-4" /> },
    { to: "/hospital/ambulances", label: "Ambulances", icon: <Ambulance className="size-4" /> },
    { to: "/hospital/updates", label: "Updates", icon: <Bell className="size-4" /> },
  ],
  relief: [
    { to: "/relief", label: "Centre Overview", icon: <Tent className="size-4" /> },
    { to: "/relief/occupancy", label: "Occupancy & Supplies", icon: <Users className="size-4" /> },
    { to: "/relief/updates", label: "Updates", icon: <Bell className="size-4" /> },
  ],
};

export function AppShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: Role;
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const { state, kpis } = usePragati();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const items = nav[role];
  const unackAlerts = state.alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
            <Emblem />
            <div className="min-w-0">
              <p className="text-base font-bold leading-none tracking-[0.18em] text-foreground">PRAGATI</p>
              <p className="mt-1 truncate text-[10.5px] text-muted-foreground">Disaster Response & Coordination</p>
            </div>
          </div>

          <RoleSwitcher />

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {items.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <span className={cn(active ? "text-primary" : "")}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {item.label === "Alerts" && unackAlerts > 0 && (
                    <span className="tabular ml-auto rounded bg-critical/20 px-1.5 text-[10px] font-bold text-critical">
                      {unackAlerts}
                    </span>
                  )}
                  {item.label === "Incidents" && (
                    <span className="tabular ml-auto text-[10px] text-muted-foreground">{kpis.activeIncidents}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <p className="text-[10.5px] leading-relaxed text-muted-foreground">
              PRAGATI is an independent prototype. It is not operated by, or integrated with, any
              government system. All data shown is simulated.
            </p>
          </div>
        </aside>

        {open && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-background/70 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <div className="min-w-0 flex-1 lg:pl-64">
          <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <button
                className="rounded-md border border-border p-1.5 text-muted-foreground lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold">{title}</h1>
                <p className="truncate text-xs text-muted-foreground">
                  {subtitle ?? roleMeta[role].org}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {actions}
                <div className="hidden items-center gap-2 sm:flex">
                  <StatusPill tone={state.scenarioActive ? "critical" : "safe"}>
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full rounded-full bg-current opacity-70 marker-pulse" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                    </span>
                    {state.scenarioActive ? "Scenario active" : "Operational"}
                  </StatusPill>
                  <span className="text-xs text-muted-foreground">
                    <LiveClock />
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 py-5 sm:px-6">{children}</main>

          <footer className="border-t border-border px-4 py-4 text-[11px] text-muted-foreground sm:px-6">
            PRAGATI Phase 1 prototype · simulated data for demonstration only · no live government
            or emergency-service integration.
          </footer>
        </div>
      </div>
    </div>
  );
}

function Emblem() {
  return (
    <span className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-surface-2">
      <span className="absolute inset-x-1.5 top-1.5 h-1 rounded-full bg-saffron" />
      <span className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full bg-forest" />
      <span className="size-2.5 rounded-full border-2 border-primary" />
    </span>
  );
}

export function RoleSwitcher({ className }: { className?: string | undefined }) {
  const { state, setRole } = usePragati();
  const roles: Role[] = ["government", "citizen", "responder", "hospital", "relief"];
  return (
    <div className={cn("border-b border-sidebar-border px-3 py-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <p className="label-eyebrow">Prototype Demo Mode</p>
        <PrototypeTag className="scale-90" />
      </div>
      <div className="grid grid-cols-1 gap-1">
        {roles.map((role) => {
          const active = state.role === role;
          return (
            <Link
              key={role}
              to={roleMeta[role].home}
              onClick={() => setRole(role)}
              className={cn(
                "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary/50 bg-primary/12 font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span>{roleMeta[role].label}</span>
              <span className="tabular text-[10px] tracking-widest opacity-70">{roleMeta[role].short}</span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Demo-only view switch. Production deployments require authenticated, role-based access
        control per organisation.
      </p>
    </div>
  );
}