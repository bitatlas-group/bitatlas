"use client";
import * as React from "react";
import { DottedGlobe } from "../patterns/DottedGlobe";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { IconArrow } from "../icons";

export interface HeroProps {
  eyebrow?: string;
  title?: React.ReactNode;
  body?: string;
  primaryCta?: { label: string; href?: string; onClick?: () => void };
  secondaryCta?: { label: string; href?: string; onClick?: () => void };
  stats?: string[];
}

export function Hero({
  eyebrow = "● New — Atlas Insights 2.0",
  title = (<>Map the<br />digital world.</>),
  body = "Bitatlas turns sprawling data into a readable map — every dataset charted, every connection visible, every decision in context.",
  primaryCta = { label: "Start mapping" },
  secondaryCta = { label: "Book a demo" },
  stats = ["4.28M datasets", "182 countries", "99.99% SLA"],
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-ink-900 text-white px-16 pt-24 pb-20">
      <div className="absolute -right-28 -top-10 opacity-50">
        <DottedGlobe size={820} color="#3B82F6" dim="#1D4ED8" />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 15% 60%, rgba(8,18,32,0) 0%, rgba(8,18,32,0.75) 65%)" }}
      />
      <div className="relative max-w-[720px]">
        <Badge tone="dark">{eyebrow}</Badge>
        <h1 className="mt-7 text-[84px] font-semibold leading-[1.02] tracking-[-0.035em]">{title}</h1>
        <p className="mt-6 max-w-[520px] text-[20px] leading-relaxed text-ink-200">{body}</p>
        <div className="mt-9 flex gap-3">
          <Button variant="primary" size="lg" iconRight={<IconArrow size={16} />}>
            {primaryCta.label}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="bg-transparent text-white border-ink-600 hover:bg-ink-800"
          >
            {secondaryCta.label}
          </Button>
        </div>
        <div className="mt-14 flex gap-9 font-mono text-[13px] text-ink-300">
          {stats.flatMap((s, i) => i === 0 ? [<span key={s}>{s}</span>] : [<span key={`d${i}`}>·</span>, <span key={s}>{s}</span>])}
        </div>
      </div>
    </section>
  );
}
