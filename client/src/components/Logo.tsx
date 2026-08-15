import React from "react";
import { Link } from "wouter";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeMap = {
    sm: "h-7 text-base",
    md: "h-9 text-lg",
    lg: "h-12 text-2xl",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary via-orange-600 to-amber-600 p-1.5 shadow-md shadow-primary/25 group-hover:scale-105 transition-transform ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-white"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`font-display font-extrabold text-white tracking-wider uppercase leading-none ${sizeMap[size]}`}>
          MOTO<span className="text-primary text-glow-orange">GUARD</span>
        </span>
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
          Türkiye Moto Ağı
        </span>
      </div>
    </Link>
  );
}
