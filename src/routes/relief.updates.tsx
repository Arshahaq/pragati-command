import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/relief/updates")({
  head: () => ({
    meta: [
      { title: "Updates · PRAGATI" },
      { name: "description", content: "Alerts and updates for relief operations." },
      { property: "og:title", content: "Updates · PRAGATI" },
      { property: "og:description", content: "Alerts and updates for relief operations." },
    ],
  }),
  component: ReliefUpdates,
});

function ReliefUpdates() {
  return (
    <AppShell role="relief" title="Updates">
      <S.ReliefConsole view="updates" />
    </AppShell>
  );
}
