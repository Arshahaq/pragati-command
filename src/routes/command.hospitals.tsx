import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/hospitals")({
  head: () => ({
    meta: [
      { title: "Hospital Network · PRAGATI" },
      { name: "description", content: "Hospital status, emergency capacity, ICU, oxygen and access-road conditions." },
      { property: "og:title", content: "Hospital Network · PRAGATI" },
      { property: "og:description", content: "Hospital status, emergency capacity, ICU, oxygen and access-road conditions." },
    ],
  }),
  component: CommandHospitals,
});

function CommandHospitals() {
  return (
    <AppShell role="government" title="Hospital Network">
      <S.HospitalsView />
    </AppShell>
  );
}
