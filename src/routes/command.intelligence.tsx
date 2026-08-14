import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/command/intelligence")({
  head: () => ({
    meta: [
      { title: "AI Disaster Intelligence · PRAGATI" },
      { name: "description", content: "Rule-based decision support: recommendations with reason, severity and suggested action." },
      { property: "og:title", content: "AI Disaster Intelligence · PRAGATI" },
      { property: "og:description", content: "Rule-based decision support: recommendations with reason, severity and suggested action." },
    ],
  }),
  component: CommandAi,
});

function CommandAi() {
  return (
    <AppShell role="government" title="AI Disaster Intelligence">
      <div className="grid gap-4 xl:grid-cols-2"><AiPanel /><S.PriorityQueue /></div>
    </AppShell>
  );
}
