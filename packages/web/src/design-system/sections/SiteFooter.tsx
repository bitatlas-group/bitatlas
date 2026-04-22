"use client";
import * as React from "react";
import Link from "next/link";
import { BitatlasLogo } from "../logo/BitatlasLogo";

const COLUMNS = [
  { title: "PRODUCT",    links: ["Platform", "Explorer", "Insights", "Pricing"] },
  { title: "SOLUTIONS",  links: ["Finance", "Ops", "Research", "Security"] },
  { title: "RESOURCES",  links: ["Docs", "Guides", "API", "Changelog"] },
  { title: "COMPANY",    links: ["About", "Careers", "Press", "Contact"] },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink-900 text-white px-16 pt-16 pb-10">
      <div className="grid gap-10 grid-cols-[2fr_repeat(4,1fr)]">
        <div>
          <BitatlasLogo size={28} color="#3B82F6" wordColor="#FFFFFF" />
          <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-ink-300">
            Map the digital world. Data, insights, perspective — for teams that need all three.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <div className="text-label uppercase text-brand-400">{c.title}</div>
            <ul className="mt-4 flex flex-col gap-2.5 text-[14px] text-ink-200">
              {c.links.map((l) => (
                <li key={l}><Link href="#" className="hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-12 flex justify-between border-t border-ink-800 pt-6 font-mono text-[13px] text-ink-400">
        <span>© {new Date().getFullYear()} Bitatlas, Inc.</span>
        <span>bitatlas.com</span>
      </div>
    </footer>
  );
}
