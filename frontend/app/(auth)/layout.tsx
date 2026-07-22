import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/12 blur-[80px] -top-[120px] -right-[80px] pointer-events-none animate-[float1_10s_ease-in-out_infinite]" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-amber-500/8 blur-[80px] -bottom-[80px] -left-[60px] pointer-events-none animate-[float2_12s_ease-in-out_infinite_reverse]" />
      <div className="absolute w-[250px] h-[250px] rounded-full bg-emerald-500/6 blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-[float3_15s_ease-in-out_infinite]" />

      {/* Mesh grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md p-2">
        {children}
      </div>
    </div>
  );
}
