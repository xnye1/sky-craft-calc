/** 상단 탭 목록. 탭을 추가하려면 여기에 항목 하나 추가 + src/routes/<path>.tsx 파일 생성 */
export interface EfbTab {
  path: "/" | "/e6b" | "/planning" | "/physics";
  label: string;
  short: string;
  comingSoon?: boolean;
}

export const EFB_TABS: EfbTab[] = [
  { path: "/", label: "이착륙 성능", short: "PERF" },
  { path: "/e6b", label: "E6B", short: "E6B", comingSoon: true },
  { path: "/planning", label: "플래닝", short: "PLAN", comingSoon: true },
  { path: "/physics", label: "비행 물리", short: "PHYS", comingSoon: true },
];
