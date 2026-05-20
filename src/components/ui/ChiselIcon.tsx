/**
 * ChiselIcon — the primary brand mark for the Chisel application.
 *
 * A stylized chisel in profile view: rounded handle, ferrule (metal collar),
 * tapered blade, and a sharp cutting edge. The cutting edge uses an amber accent
 * so the "point of impact" reads distinctly at any size.
 *
 * Usage:
 *   <ChiselIcon size={24} />                   — single-color (inherits currentColor)
 *   <ChiselIcon size={32} accent="#f59e0b" />  — handle + blade + amber tip
 */

interface ChiselIconProps {
  size?: number;
  className?: string;
  /** Cutting-edge accent color. Defaults to amber-400. Pass 'currentColor' to match parent. */
  accent?: string;
}

export function ChiselIcon({ size = 24, className = '', accent = '#f59e0b' }: ChiselIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Handle — rounded grip at the top */}
      <rect x="8" y="1" width="8" height="9" rx="2" fill="currentColor" />

      {/* Ferrule — metal collar that reinforces the handle-to-blade joint */}
      <rect x="7" y="10" width="10" height="2.5" rx="1" fill="currentColor" fillOpacity="0.85" />

      {/* Blade — symmetric taper from ferrule toward cutting edge */}
      <path d="M7 12.5 L17 12.5 L14.5 20.5 L9.5 20.5 Z" fill="currentColor" fillOpacity="0.65" />

      {/* Cutting edge — the sharp tip; amber accent signals the "bite" point */}
      <path d="M9.5 20.5 L14.5 20.5 L12 23.5 Z" fill={accent} />
    </svg>
  );
}
