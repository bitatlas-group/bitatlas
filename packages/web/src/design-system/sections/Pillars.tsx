"use client";
import * as React from "react";
import { FeatureCard } from "../components/Card";
import { IconGlobe, IconChart, IconShield } from "../icons";

export interface Pillar {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
}

export interface PillarsProps {
  eyebrow?: string;
  heading?: string;
  body?: string;
  pillars?: Pillar[];
}

const DEFAULT: Pillar[] = [
  { icon: <IconGlobe size={24} />,  label: "GLOBAL INSIGHTS",    title: "Explore data from anywhere.",           body: "Zoom from aggregate trends down to row-level detail without leaving context." },
  { icon: <IconChart size={24} />,  label: "SMARTER DECISIONS",  title: "Turn data into direction.",             body: "Signals, forecasts, and anomaly alerts — routed to the teams that move them." },
  { icon: <IconShield size={24} />, label: "TRUSTED PERSPECTIVE", title: "Built on accuracy and transparency.", body: "Lineage, provenance and audit baked into every view. SOC 2 and ISO 27001." },
];

export function Pillars({
  eyebrow = "PLATFORM",
  heading = "One atlas. Every layer of your data.",
  body = "Built for teams that need to see the terrain and the tile in the same glance.",
  pillars = DEFAULT,
}: PillarsProps) {
  return (
    <section className="px-16 py-24">
      <div className="flex items-end justify-between mb-12 gap-10">
        <div>
          <div className="text-label uppercase text-brand-500">{eyebrow}</div>
          <h2 className="mt-3 max-w-[720px] text-[48px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink-900">
            {heading}
          </h2>
        </div>
        <p className="max-w-[360px] text-[15px] leading-relaxed text-ink-500">{body}</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {pillars.map((p) => (
          <FeatureCard key={p.label} icon={p.icon} label={p.label} title={p.title} body={p.body} />
        ))}
      </div>
    </section>
  );
}
