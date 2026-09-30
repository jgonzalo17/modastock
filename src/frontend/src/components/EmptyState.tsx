import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  Icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
  ocid?: string;
}

export function EmptyState({
  Icono,
  titulo,
  descripcion,
  accion,
  ocid = "empty_state",
}: EmptyStateProps) {
  return (
    <div
      data-ocid={ocid}
      className="animate-fade-up flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center"
    >
      <span
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        <Icono className="size-7" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        {titulo}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {descripcion}
      </p>
      {accion && <div className="mt-5 w-full max-w-xs">{accion}</div>}
    </div>
  );
}
