import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pragati/AppShell";
import * as S from "@/components/pragati/sections";
import { AiPanel } from "@/components/pragati/AiPanel";
import { MapCanvas } from "@/components/pragati/MapCanvas";

export const Route = createFileRoute("/hospital/")({
  head: () => ({
    meta: [
      { title: "Hospital Status · PRAGATI" },
      { name: "description", content: "Hospital console: publish operational status and access-road conditions." },
      { property: "og:title", content: "Hospital Status · PRAGATI" },
      { property: "og:description", content: "Hospital console: publish operational status and access-road conditions." },
    ],
  }),
  component: HospitalHome,
});

function HospitalHome() {
  return (
    <AppShell role="hospital" title="Hospital Status">
      <S.HospitalConsole view="status" />
    </AppShell>
  );
}
