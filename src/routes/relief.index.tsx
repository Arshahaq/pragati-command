import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/relief/")({
  head: () => ({
    meta: [
      { title: "Relief Centre Overview · PRAGATI" },
      { name: "description", content: "Relief centre console: capacity, occupancy and supply status." },
      { property: "og:title", content: "Relief Centre Overview · PRAGATI" },
      { property: "og:description", content: "Relief centre console: capacity, occupancy and supply status." },
    ],
  }),
  component: ReliefHome,
});

function ReliefHome() {
  return (
    <AppShell role="relief" title="Relief Centre Overview">
      <S.ReliefConsole view="overview" />
    </AppShell>
  );
}
