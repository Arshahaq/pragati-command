import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/hospital/capacity")({
  head: () => ({
    meta: [
      { title: "Capacity Management · PRAGATI" },
      { name: "description", content: "Update emergency beds, ICU, oxygen, blood and ambulance availability." },
      { property: "og:title", content: "Capacity Management · PRAGATI" },
      { property: "og:description", content: "Update emergency beds, ICU, oxygen, blood and ambulance availability." },
    ],
  }),
  component: HospitalCapacity,
});

function HospitalCapacity() {
  return (
    <AppShell role="hospital" title="Capacity Management">
      <S.HospitalConsole view="capacity" />
    </AppShell>
  );
}
