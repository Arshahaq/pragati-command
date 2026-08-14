import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/hospital/updates")({
  head: () => ({
    meta: [
      { title: "Updates · PRAGATI" },
      { name: "description", content: "Platform alerts relevant to this hospital." },
      { property: "og:title", content: "Updates · PRAGATI" },
      { property: "og:description", content: "Platform alerts relevant to this hospital." },
    ],
  }),
  component: HospitalUpdates,
});

function HospitalUpdates() {
  return (
    <AppShell role="hospital" title="Updates">
      <S.HospitalConsole view="updates" />
    </AppShell>
  );
}
