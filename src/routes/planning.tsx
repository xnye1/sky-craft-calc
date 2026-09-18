import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/efb/ComingSoon";

export const Route = createFileRoute("/planning")({
  head: () => ({
    meta: [
      { title: "비행 플래닝 — EFB" },
      { name: "description", content: "항로·연료·중량 균형 플래닝. 준비 중입니다." },
      { property: "og:title", content: "비행 플래닝 — EFB" },
      { property: "og:description", content: "항로·연료·중량 균형 플래닝. 준비 중입니다." },
    ],
  }),
  component: () => (
    <ComingSoon title="플래닝" description="항로, 연료 계획, 중량·균형(W&B) 계산이 들어올 자리입니다." />
  ),
});
