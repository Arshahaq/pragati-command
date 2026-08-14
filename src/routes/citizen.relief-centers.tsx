import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/citizen/relief-centers")({
  head: () => ({
    meta: [
      { title: "Find a Relief Center · PRAGATI" },
      { name: "description", content: "Open relief centres with live simulated occupancy, food, water and medical support." },
      { property: "og:title", content: "Find a Relief Center · PRAGATI" },
      { property: "og:description", content: "Open relief centres with live simulated occupancy, food, water and medical support." },
    ],
  }),
  component: CitizenRelief,
});

function CitizenRelief() {
  return (
    <AppShell role="citizen" title="Find a Relief Center">
      <S.ReliefView />
    </AppShell>
  );
}
