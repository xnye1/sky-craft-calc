import { createFileRoute } from "@tanstack/react-router";
import { PerformanceTab } from "@/components/efb/PerformanceTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "이착륙 성능 계산기 — EFB" },
      {
        name: "description",
        content: "기압고도·밀도고도·바람 성분과 이착륙 필요거리를 계산하는 파일럿용 EFB. 시뮬레이터·학습용.",
      },
      { property: "og:title", content: "이착륙 성능 계산기 — EFB" },
      {
        property: "og:description",
        content: "기압고도·밀도고도·바람 성분과 이착륙 필요거리를 계산하는 파일럿용 EFB. 시뮬레이터·학습용.",
      },
    ],
  }),
  component: PerformanceTab,
});
