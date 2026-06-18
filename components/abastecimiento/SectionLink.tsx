"use client";
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

interface Props {
  href: string;
  icon: LucideIcon;
  label: string;
  value?: string | number;
  color?: "blue" | "emerald" | "amber" | "red" | "orange";
  subtle?: boolean;
}

const COLORS = {
  indigo:  { bg: "bg-olive-50",  text: "text-olive-600",  icon: "text-olive-500",  border: "border-olive-200",  hover: "hover:bg-olive-100"  },
  blue:    { bg: "bg-olive-50",  text: "text-olive-600",  icon: "text-olive-500",  border: "border-olive-200",  hover: "hover:bg-olive-100"  },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", border: "border-emerald-200", hover: "hover:bg-emerald-100" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   icon: "text-amber-500",   border: "border-amber-200",   hover: "hover:bg-amber-100"   },
  red:     { bg: "bg-red-50",     text: "text-red-700",     icon: "text-red-500",     border: "border-red-200",     hover: "hover:bg-red-100"     },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  icon: "text-orange-500",  border: "border-orange-200",  hover: "hover:bg-orange-100"  },
};

export default function SectionLink({ href, icon: Icon, label, value, color = "blue", subtle }: Props) {
  const c = COLORS[color];
  if (subtle) {
    return (
      <Link href={href}
        className="inline-flex items-center gap-1.5 text-xs text-olive-600 hover:text-olive-700 font-medium transition-colors group">
        <Icon size={12} className="shrink-0" />
        <span>{label}{value !== undefined ? ` (${value})` : ""}</span>
        <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    );
  }
  return (
    <Link href={href}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${c.bg} ${c.border} ${c.hover} transition-colors group`}>
      <Icon size={13} className={c.icon} />
      <span className={`text-xs font-semibold ${c.text}`}>{label}</span>
      {value !== undefined && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-white border ${c.border} ${c.text}`}>{value}</span>
      )}
      <ChevronRight size={11} className={`${c.icon} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </Link>
  );
}
