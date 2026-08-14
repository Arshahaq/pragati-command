import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/relief-centers")({
  head: () => ({
    meta: [
      { title: "Relief Centers · PRAGATI" },
      { name: "description", content: "Relief centre capacity, occupancy, food, water and medical support status." },
      { property: "og:title", content: "Relief Centers · PRAGATI" },
      { property: "og:description", content: "Relief centre capacity, occupancy, food, water and medical support status." },
    ],
  }),
  component: CommandRelief,
});

function CommandRelief() {
  return (
    <AppShell role="government" title="Relief Centers">
      <S.ReliefView />
    </AppShell>
  );
}
