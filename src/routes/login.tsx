import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  ShieldCheck,
  Tent,
  UserRound,
  Users,
} from "lucide-react";

import { roleMeta } from "@/components/pragati/AppShell";
import { PrototypeTag } from "@/components/pragati/primitives";
import { useAuth } from "@/lib/AuthProvider";
import { DEMO_ACCOUNTS } from "@/lib/authService";
import type { Role } from "@/lib/pragati/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Demo Access · PRAGATI" },
      { name: "description", content: "Prototype demo login for PRAGATI disaster response dashboards." },
    ],
  }),
  component: LoginPage,
});

const portalCards: { role: Role; title: string; description: string; icon: typeof Users }[] = [
  {
    role: "citizen",
    title: "Citizen Portal",
    description: "Request help, find hospitals, plan safe routes and locate relief centres.",
    icon: Users,
  },
  {
    role: "government",
    title: "Government Command Center",
    description: "Monitor incidents, allocate resources and coordinate the city response.",
    icon: ShieldCheck,
  },
];

const additionalRoles: { role: Role; label: string; icon: typeof Users }[] = [
  { role: "responder", label: "Emergency Responder", icon: ClipboardList },
  { role: "hospital", label: "Hospital", icon: Building2 },
  { role: "relief", label: "Relief Center", icon: Tent },
];

function LoginPage() {
  const { user, ready, login, loginAsDemoRole, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role>(user?.role === "government" ? "government" : "citizen");
  const [email, setEmail] = useState("citizen@pragati.demo");
  const [password, setPassword] = useState("Citizen@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const enter = (role: Role) => {
    const signedIn = loginAsDemoRole(role);
    if (signedIn) {
      void navigate({ to: roleMeta[signedIn.role].home });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const signedIn = login(email, password);
    if (!signedIn) {
      setError("Demo credentials did not match. Use one of the accounts shown below.");
      return;
    }
    setError("");
    void navigate({ to: roleMeta[signedIn.role].home });
  };

  const chooseRole = (role: Role) => {
    setSelectedRole(role);
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
    if (account) {
      setEmail(account.email);
      setPassword(account.password);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-between border-b border-border px-5 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
          <div>
            <div className="flex items-center gap-3">
              <Emblem />
              <div>
                <p className="text-xl font-bold tracking-[0.2em]">PRAGATI</p>
                <p className="text-xs text-muted-foreground">Disaster Response & Coordination Platform</p>
              </div>
            </div>
            <div className="mt-14 max-w-lg">
              <PrototypeTag />
              <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
                Choose your access portal.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                A unified operating picture for citizens, Bengaluru administration and emergency partners.
                This SIH evaluation environment uses simulated data.
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground lg:mt-0">
            <p className="font-semibold text-foreground">Prototype-only demo environment</p>
            <p className="mt-1">No live government, hospital or emergency-service systems are connected.</p>
          </div>
        </section>

        <section className="px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="mx-auto max-w-xl">
            {ready && user && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-forest" />
                  <span className="truncate">Signed in as {user.name}</span>
                </div>
                <button type="button" onClick={logout} className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <LogOut className="size-3.5" /> Reset Demo Session
                </button>
              </div>
            )}

            <div className="mb-6">
              <p className="label-eyebrow">Demo Access</p>
              <h2 className="mt-1 text-2xl font-semibold">Enter PRAGATI</h2>
              <p className="mt-2 text-sm text-muted-foreground">Demo accounts are intentionally visible for SIH judges.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {portalCards.map((portal) => {
                const Icon = portal.icon;
                const active = selectedRole === portal.role;
                return (
                  <button
                    key={portal.role}
                    type="button"
                    onClick={() => chooseRole(portal.role)}
                    className={`text-left rounded-lg border p-4 transition-colors ${active ? "border-primary/60 bg-primary/8" : "border-border bg-surface-1 hover:border-primary/40"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{roleMeta[portal.role].short}</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold">{portal.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{portal.description}</p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-border bg-surface-1 p-5">
              <div>
                <label htmlFor="demo-email" className="label-eyebrow">Email</label>
                <input
                  id="demo-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label htmlFor="demo-password" className="label-eyebrow">Password</label>
                <div className="relative mt-2">
                  <input
                    id="demo-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-primary"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-critical">{error}</p>}
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <KeyRound className="size-4" /> Sign in to {roleMeta[selectedRole].label}
                <ArrowRight className="size-4" />
              </button>
            </form>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => enter("citizen")} className="rounded-md border border-forest/35 bg-forest/10 px-3 py-2.5 text-xs font-semibold text-forest hover:bg-forest/15">
                Use Demo Citizen Account
              </button>
              <button type="button" onClick={() => enter("government")} className="rounded-md border border-saffron/40 bg-saffron/10 px-3 py-2.5 text-xs font-semibold text-saffron hover:bg-saffron/15">
                Use Demo Admin Account
              </button>
            </div>

            <div className="mt-7 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="label-eyebrow">Additional demo roles</p>
                <span className="text-[11px] text-muted-foreground">Extensible prototype access</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {additionalRoles.map(({ role, label, icon: Icon }) => (
                  <button key={role} type="button" onClick={() => enter(role)} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
                    <Icon className="size-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <DemoCredentials />
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoCredentials() {
  return (
    <section className="mt-7 rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        <UserRound className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Demo credentials for SIH evaluation</h3>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        {DEMO_ACCOUNTS.map((account) => (
          <div key={account.email} className="rounded-md border border-border/70 bg-background px-3 py-2.5">
            <p className="font-semibold text-foreground">{roleMeta[account.role].label}</p>
            <p className="mt-1 text-muted-foreground">Email: <span className="font-mono text-foreground">{account.email}</span></p>
            <p className="text-muted-foreground">Password: <span className="font-mono text-foreground">{account.password}</span></p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Emblem() {
  return (
    <span className="relative flex size-11 items-center justify-center rounded-xl border border-border bg-surface-2">
      <span className="absolute inset-x-2 top-2 h-1 rounded-full bg-saffron" />
      <span className="absolute inset-x-2 bottom-2 h-1 rounded-full bg-forest" />
      <span className="size-3 rounded-full border-2 border-primary" />
    </span>
  );
}
