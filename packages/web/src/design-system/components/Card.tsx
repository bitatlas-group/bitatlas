"use client";
import * as React from "react";
import { cn } from "../utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  dark?: boolean;
}

export function Card({ dark = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-6 transition-colors",
        dark
          ? "bg-ink-900 text-white border border-ink-800"
          : "bg-white text-ink-900 border border-ink-100 shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; tone?: "success" | "danger" };
  caption?: string;
  className?: string;
}

export function StatCard({ label, value, delta, caption, className }: StatCardProps) {
  return (
    <Card className={className}>
      <div className="text-label uppercase text-ink-400">{label}</div>
      <div className="mt-2.5 text-[44px] font-semibold tracking-tight leading-none text-ink-900">{value}</div>
      {(delta || caption) && (
        <div className="mt-2 flex items-center gap-2 text-[13px]">
          {delta && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset",
              delta.tone === "danger"
                ? "bg-red-50 text-red-700 ring-red-100"
                : "bg-emerald-50 text-emerald-700 ring-emerald-100",
            )}>
              {delta.tone === "danger" ? "▼" : "▲"} {delta.value}
            </span>
          )}
          {caption && <span className="text-ink-400">{caption}</span>}
        </div>
      )}
    </Card>
  );
}

export interface FeatureCardProps {
  icon: React.ReactNode;
  label?: string;
  title: string;
  body: string;
  className?: string;
}

export function FeatureCard({ icon, label, title, body, className }: FeatureCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="w-[52px] h-[52px] rounded-md bg-brand-50 border border-brand-100 text-brand-500 flex items-center justify-center">
        {icon}
      </div>
      {label && <div className="mt-6 text-label uppercase text-ink-400">{label}</div>}
      <div className="mt-2 text-h3 text-ink-900">{title}</div>
      <div className="mt-3 text-[15px] text-ink-500 leading-relaxed">{body}</div>
    </Card>
  );
}
