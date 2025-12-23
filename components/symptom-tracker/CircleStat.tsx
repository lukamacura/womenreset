"use client";

interface CircleStatProps {
  value: number | string;
  label: string;
  sublabel?: string;
  color?: "rose" | "sage" | "amber";
  size?: "sm" | "md" | "lg";
}

export default function CircleStat({
  value,
  label,
  sublabel,
  color = "rose",
  size = "md",
}: CircleStatProps) {
  const colorClasses = {
    rose: "bg-[#D4A5A5]/20 text-[#D4A5A5]",
    sage: "bg-[#9DBEBB]/20 text-[#9DBEBB]",
    amber: "bg-[#E8B86D]/20 text-[#8B7E74]",
  };

  const sizeClasses = {
    sm: "w-20 h-20 text-xl",
    md: "w-28 h-28 text-3xl",
    lg: "w-36 h-36 text-4xl",
  };

  return (
    <div className="flex flex-col items-center">
      {/* Circle */}
      <div
        className={`
          ${sizeClasses[size]}
          ${colorClasses[color]}
          rounded-full
          flex items-center justify-center
          font-bold
          mb-3
        `}
      >
        {value}
      </div>

      {/* Label */}
      <span className="text-[#3D3D3D] font-medium text-center text-sm">
        {label}
      </span>

      {/* Sublabel */}
      {sublabel && (
        <span className="text-[#9A9A9A] text-xs text-center mt-1">
          {sublabel}
        </span>
      )}
    </div>
  );
}

