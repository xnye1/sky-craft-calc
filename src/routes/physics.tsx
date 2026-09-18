import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/efb/ComingSoon";

export const Route = createFileRoute("/physics")({
  head: () => ({
    meta: [
      { title: "비행 물리 — EFB" },
      { name: "description", content: "양력·항력·선회 등 비행 물리 시각화. 준비 중입니다." },
      { property: "og:title", content: "비행 물리 — EFB" },
      { property: "og:description", content: "양력·항력·선회 등 비행 물리 시각화. 준비 중입니다." },
    ],
  }),
  component: () => (
    <ComingSoon title="비행 물리" description="양력·항력, 선회 반경, 하중배수 등 비행 물리 시각화가 들어올 자리입니다." />
  ),
});
