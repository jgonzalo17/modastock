import { cn } from "@/lib/utils";
import { Package, Receipt, ShoppingCart, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type Pestana = "inventario" | "ventas" | "gastos" | "asistente";

interface ItemPestana {
  id: Pestana;
  etiqueta: string;
  Icono: typeof Package;
}

const PESTANAS: ItemPestana[] = [
  { id: "inventario", etiqueta: "Inventario", Icono: Package },
  { id: "ventas", etiqueta: "Ventas", Icono: ShoppingCart },
  { id: "gastos", etiqueta: "Gastos", Icono: Receipt },
  { id: "asistente", etiqueta: "Asistente", Icono: Sparkles },
];

interface AppShellProps {
  activa: Pestana;
  onCambiar: (pestana: Pestana) => void;
  children: ReactNode;
}

export function AppShell({ activa, onCambiar, children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-md pb-28">{children}</main>

      <nav
        aria-label="Navegación principal"
        data-ocid="nav.tabbar"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-tabbar pb-safe"
      >
        <ul className="mx-auto flex w-full max-w-md items-stretch">
          {PESTANAS.map(({ id, etiqueta, Icono }) => {
            const seleccionada = activa === id;
            return (
              <li key={id} className="flex-1">
                <button
                  type="button"
                  data-ocid={`nav.tab.${id}`}
                  aria-current={seleccionada ? "page" : undefined}
                  onClick={() => onCambiar(id)}
                  className={cn(
                    "relative flex h-16 w-full flex-col items-center justify-center gap-1 transition-smooth active:scale-[0.97]",
                    seleccionada
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icono
                    className="size-6"
                    strokeWidth={seleccionada ? 2.4 : 1.9}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-xs",
                      seleccionada ? "font-semibold" : "font-medium",
                    )}
                  >
                    {etiqueta}
                  </span>
                  {seleccionada && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 size-1.5 rounded-full bg-accent"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
