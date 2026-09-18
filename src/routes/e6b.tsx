import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/efb/ComingSoon";

export const Route = createFileRoute("/e6b")({
  head: () => ({
    meta: [
      { title: "E6B 계산기 — EFB" },
      { name: "description", content: "비행 컴퓨터(E6B) 계산기. 준비 중입니다." },
      { property: "og:title", content: "E6B 계산기 — EFB" },
      { property: "og:description", content: "비행 컴퓨터(E6B) 계산기. 준비 중입니다." },
    ],
  }),
  component: () => (
    <ComingSoon title="E6B" description="진대기속도, 풍향 삼각형, 연료·시간 계산 등 비행 컴퓨터 기능이 들어올 자리입니다." />
  ),
});
