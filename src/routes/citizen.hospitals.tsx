import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/hospitals")({
  head: () => ({
    meta: [
      { title: "Find a Safe Hospital · PRAGATI" },
      { name: "description", content: "Hospitals ranked by access safety and emergency capacity, not distance alone." },
      { property: "og:title", content: "Find a Safe Hospital · PRAGATI" },
      { property: "og:description", content: "Hospitals ranked by access safety and emergency capacity, not distance alone." },
    ],
  }),
  component: CitizenHospitals,
});

function CitizenHospitals() {
  return (
    <AppShell role="citizen" title="Find a Safe Hospital">
      <S.SafeHospitalList />
    </AppShell>
  );
}
