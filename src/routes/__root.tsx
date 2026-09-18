import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Plane, TriangleAlert } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { EFB_TABS } from "../lib/tabs";
import { UnitsProvider } from "../lib/units-context";
import { UnitToggles } from "../components/efb/UnitToggles";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="readout text-7xl">404</h1>
        <h2 className="mt-4 text-xl font-semibold">페이지를 찾을 수 없습니다</h2>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">페이지를 불러오지 못했습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">다시 시도하거나 홈으로 돌아가세요.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "EFB" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-panel-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Plane className="size-5 text-primary" />
            <span className="font-mono text-sm font-bold tracking-[0.2em] text-primary">EFB</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">Electronic Flight Bag · v0.1</span>
          </div>
          <UnitToggles />
        </div>
        <nav className="-mx-3 flex gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0" aria-label="탭">
          {EFB_TABS.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex shrink-0 items-center gap-2 rounded-t-md border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "border-primary text-foreground font-semibold" }}
              activeOptions={{ exact: true }}
            >
              <span className="font-mono text-[0.65rem] tracking-widest opacity-70">{tab.short}</span>
              {tab.label}
              {tab.comingSoon && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] uppercase text-muted-foreground">
                  soon
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Disclaimer() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-caution/40 bg-background/95 backdrop-blur">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-3 py-2 text-center text-xs font-medium text-caution">
        <TriangleAlert className="size-4 shrink-0" />
        시뮬레이터·학습용. 실제 비행에 사용 금지 — 근사식이며 POH 성능표를 대체하지 않습니다.
      </p>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <UnitsProvider>
        <div className="flex min-h-screen flex-col pb-14">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </main>
          <Disclaimer />
        </div>
      </UnitsProvider>
    </QueryClientProvider>
  );
}
