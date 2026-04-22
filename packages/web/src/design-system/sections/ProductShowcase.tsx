"use client";
import * as React from "react";
import { DottedGlobe } from "../patterns/DottedGlobe";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { IconArrow } from "../icons";

export interface ProductShowcaseProps {
  badge?: string;
  title?: string;
  body?: string;
  ctaLabel?: string;
}

export function ProductShowcase({
  badge = "Atlas Explorer",
  title = "See the whole terrain, then drill into a single bit.",
  body = "A live map of every dataset you own, every pipeline that feeds it, and every decision it powers.",
  ctaLabel = "Open the explorer",
}: ProductShowcaseProps) {
  return (
    <section className="px-16 pb-24">
      <div className="relative overflow-hidden rounded-xl border border-ink-100 bg-ink-25 p-10">
        <div className="absolute -right-16 -top-16 opacity-40">
          <DottedGlobe size={520} color="#2563EB" dim="#1D4ED8" />
        </div>
        <div className="relative grid grid-cols-[1fr_1.4fr] items-center gap-12">
          <div>
            <Badge tone="brand">{badge}</Badge>
            <h2 className="mt-5 text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-900">{title}</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-500">{body}</p>
            <Button variant="primary" className="mt-6" iconRight={<IconArrow size={16} />}>{ctaLabel}</Button>
          </div>
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}

function MockDashboard() {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <span className="ml-3 font-mono text-[12px] text-ink-400">atlas.bitatlas.com/explorer</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        <MiniStat label="ACTIVE NODES" value="12,847" delta="▲ 4.2%" />
        <MiniStat label="COVERAGE" value="98.4%" delta="▲ 0.3%" />
        <div className="col-span-2 relative h-40 overflow-hidden rounded-md bg-ink-900">
          <div className="absolute left-4 top-3.5 text-[10px] font-semibold tracking-[0.2em] text-brand-400">LIVE MAP</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <DottedGlobe size={200} color="#3B82F6" dim="#1D4ED8" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-md bg-ink-25 p-3.5">
      <div className="text-[10px] font-semibold tracking-[0.2em] text-ink-400">{label}</div>
      <div className="mt-1.5 text-[26px] font-semibold text-ink-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-emerald-600">{delta}</div>
    </div>
  );
}
