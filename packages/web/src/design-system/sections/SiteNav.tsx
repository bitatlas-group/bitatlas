"use client";
import * as React from "react";
import Link from "next/link";
import { BitatlasLogo } from "../logo/BitatlasLogo";
import { Button } from "../components/Button";

const NAV = [
  { href: "/platform",  label: "Platform" },
  { href: "/data",      label: "Data" },
  { href: "/solutions", label: "Solutions" },
  { href: "/resources", label: "Resources" },
  { href: "/about",     label: "About" },
];

export function SiteNav() {
  return (
    <header className="flex items-center justify-between px-16 py-5 border-b border-ink-100 bg-white">
      <Link href="/" aria-label="Bitatlas home">
        <BitatlasLogo size={32} color="#2563EB" wordColor="#081220" />
      </Link>
      <nav className="flex gap-8 text-[14px] font-medium text-ink-600">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="hover:text-ink-900 transition-colors">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2.5">
        <Button variant="ghost" size="sm">Sign in</Button>
        <Button variant="primary" size="sm">Get Started</Button>
      </div>
    </header>
  );
}
