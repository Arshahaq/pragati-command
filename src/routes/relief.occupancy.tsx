import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/relief/occupancy")({
  head: () => ({
    meta: [
      { title: "Occupancy & Supplies · PRAGATI" },
      { name: "description", content: "Update occupancy, food, water and medical support availability." },
      { property: "og:title", content: "Occupancy & Supplies · PRAGATI" },
      { property: "og:description", content: "Update occupancy, food, water and medical support availability." },
    ],
  }),
  component: ReliefOccupancy,
});

function ReliefOccupancy() {
  return (
    <AppShell role="relief" title="Occupancy & Supplies">
      <S.ReliefConsole view="occupancy" />
    </AppShell>
  );
}
