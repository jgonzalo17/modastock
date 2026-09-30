import { soles } from "@/lib/format";
import type { ResumenMes } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface MonthSummaryProps {
  resumen: ResumenMes;
  mes: string;
}

export function MonthSummary({ resumen, mes }: MonthSummaryProps) {
  const negativa = resumen.ganancia < 0;

  return (
    <section
      data-ocid="summary.card"
      aria-label="Resumen del mes"
      className="overflow-hidden rounded-2xl bg-gradient-primary text-primary-foreground shadow-card"
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
            Resumen mensual
          </p>
          <p className="font-display text-sm font-medium text-primary-foreground/90">
            {mes}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-full bg-primary-foreground/15"
        >
          <Wallet className="size-5" />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px bg-primary-foreground/15">
        <div className="px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/75">
            <TrendingUp className="size-3.5" aria-hidden="true" />
            Ventas
          </p>
          <p
            data-ocid="summary.ventas"
            className="mt-1 font-display text-xl font-bold tabular-nums"
          >
            {soles(resumen.ventas)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary-foreground/75">
            <TrendingDown className="size-3.5" aria-hidden="true" />
            Gastos
          </p>
          <p
            data-ocid="summary.gastos"
            className="mt-1 font-display text-xl font-bold tabular-nums"
          >
            {soles(resumen.gastos)}
          </p>
        </div>
      </div>

      <div className="stitch-line h-px w-full opacity-70" aria-hidden="true" />

      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/75">
          Ganancia
        </p>
        <p
          data-ocid="summary.ganancia"
          className={cn(
            "font-display text-2xl font-bold tabular-nums",
            negativa ? "text-red-300" : "text-accent",
          )}
        >
          {soles(resumen.ganancia)}
        </p>
      </div>
    </section>
  );
}
