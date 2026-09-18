import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel mx-auto mt-8 flex max-w-xl flex-col items-center gap-4 px-6 py-14 text-center">
      <Construction className="size-10 text-primary" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <span className="readout-amber font-mono text-xs tracking-[0.3em]">COMING SOON</span>
    </div>
  );
}
