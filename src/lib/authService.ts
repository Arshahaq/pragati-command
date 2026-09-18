import type { Role } from "@/lib/pragati/types";

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
  demo: true;
}

interface DemoAccount extends AuthUser {
  password: string;
}

const STORAGE_KEY = "pragati.demo.session";
const AUTH_EVENT = "pragati-auth-change";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "citizen@pragati.demo", password: "Citizen@123", name: "Demo Citizen", role: "citizen", demo: true },
  { email: "admin@pragati.demo", password: "Admin@123", name: "Demo Government Admin", role: "government", demo: true },
  { email: "responder@pragati.demo", password: "Responder@123", name: "Demo Emergency Responder", role: "responder", demo: true },
  { email: "hospital@pragati.demo", password: "Hospital@123", name: "Demo Hospital Administrator", role: "hospital", demo: true },
  { email: "relief@pragati.demo", password: "Relief@123", name: "Demo Relief Coordinator", role: "relief", demo: true },
];

function emitAuthChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

function withoutPassword(account: DemoAccount): AuthUser {
  const { password: _password, ...user } = account;
  return user;
}

export function login(email: string, password: string): AuthUser | null {
  const account = DEMO_ACCOUNTS.find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password,
  );
  if (!account || typeof window === "undefined") return null;

  const user = withoutPassword(account);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  emitAuthChange();
  return user;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitAuthChange();
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed.demo === true && typeof parsed.email === "string" && typeof parsed.role === "string" ? parsed : null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}

export function getCurrentRole(): Role | null {
  return getCurrentUser()?.role ?? null;
}

export function loginAsDemoCitizen() {
  return login("citizen@pragati.demo", "Citizen@123");
}

export function loginAsDemoAdmin() {
  return login("admin@pragati.demo", "Admin@123");
}

export function loginAsDemoRole(role: Role) {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
  return account ? login(account.email, account.password) : null;
}

export function authEventName() {
  return AUTH_EVENT;
}
