import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/hospital/ambulances")({
  head: () => ({
    meta: [
      { title: "Ambulances · PRAGATI" },
      { name: "description", content: "Facility ambulance fleet status and current missions." },
      { property: "og:title", content: "Ambulances · PRAGATI" },
      { property: "og:description", content: "Facility ambulance fleet status and current missions." },
    ],
  }),
  component: HospitalAmb,
});

function HospitalAmb() {
  return (
    <AppShell role="hospital" title="Ambulances">
      <S.HospitalConsole view="ambulances" />
    </AppShell>
  );
}
