import { EmptyState } from "@/components/EmptyState";
import { MonthSummary } from "@/components/MonthSummary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fechaCorta, nombreMesActual, parsearMonto, soles } from "@/lib/format";
import { calcularResumen, useTienda } from "@/lib/store";
import type { Gasto } from "@/lib/types";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/** Conceptos frecuentes de una tienda de ropa. */
const SUGERENCIAS_CONCEPTO = [
  "Mercadería",
  "Transporte",
  "Alquiler",
  "Bolsas y empaques",
  "Publicidad",
] as const;

export function Gastos() {
  const ventas = useTienda((s) => s.ventas);
  const gastos = useTienda((s) => s.gastos);
  const agregarGasto = useTienda((s) => s.agregarGasto);
  const eliminarGasto = useTienda((s) => s.eliminarGasto);

  const [abierto, setAbierto] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Gasto | null>(null);

  const resumen = useMemo(
    () => calcularResumen(ventas, gastos),
    [ventas, gastos],
  );
  const ordenados = useMemo(
    () => [...gastos].sort((a, b) => b.fecha - a.fecha),
    [gastos],
  );

  function abrirNuevo() {
    setConcepto("");
    setMonto("");
    setAbierto(true);
  }

  async function guardar() {
    const texto = concepto.trim();
    if (!texto) {
      toast.error("Escribe el concepto del gasto.");
      return;
    }
    const valor = parsearMonto(monto);
    if (valor <= 0) {
      toast.error("El monto debe ser mayor a cero.");
      return;
    }
    setGuardando(true);
    try {
      await agregarGasto({
        descripcion: texto,
        categoria: texto,
        monto: valor,
      });
      toast.success("Gasto registrado.");
      setAbierto(false);
    } catch {
      toast.error("No se pudo guardar el gasto.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    try {
      await eliminarGasto(aEliminar.id);
      toast.success("Gasto eliminado.");
    } catch {
      toast.error("No se pudo eliminar el gasto.");
    } finally {
      setAEliminar(null);
    }
  }

  return (
    <div data-ocid="gastos.page" className="space-y-5 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Gastos
        </h1>
        <p className="text-sm text-muted-foreground">
          Anota todo lo que sale de la caja para conocer tu ganancia real.
        </p>
      </header>

      <MonthSummary resumen={resumen} mes={nombreMesActual()} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Registro
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {ordenados.length}
          </span>
        </h2>
        <Button
          type="button"
          data-ocid="gastos.open_modal_button"
          onClick={abrirNuevo}
          className="h-11 shrink-0 rounded-xl bg-gradient-primary px-4 font-semibold active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden="true" />
          Nuevo gasto
        </Button>
      </div>

      {ordenados.length === 0 ? (
        <EmptyState
          ocid="gastos.empty_state"
          Icono={Receipt}
          titulo="Sin gastos registrados"
          descripcion="Registra tus gastos del mes para saber cuánto ganas de verdad."
          accion={
            <Button
              type="button"
              data-ocid="gastos.empty_state.primary_button"
              onClick={abrirNuevo}
              className="h-14 w-full rounded-xl bg-gradient-primary text-base font-semibold active:scale-[0.98]"
            >
              <Plus className="size-5" aria-hidden="true" />
              Registrar gasto
            </Button>
          }
        />
      ) : (
        <div
          data-ocid="gastos.table"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fecha
                </TableHead>
                <TableHead className="h-11 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Concepto
                </TableHead>
                <TableHead className="h-11 px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monto
                </TableHead>
                <TableHead className="h-11 w-14 px-3">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenados.map((gasto, indice) => (
                <TableRow
                  key={gasto.id}
                  data-ocid={`gastos.row.${indice + 1}`}
                  className="border-border"
                >
                  <TableCell className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                    {fechaCorta(gasto.fecha)}
                  </TableCell>
                  <TableCell className="max-w-[10rem] px-3 py-3">
                    <span className="block truncate font-medium text-foreground">
                      {gasto.descripcion}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-right font-display font-bold tabular-nums text-destructive">
                    −{soles(gasto.monto)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      data-ocid={`gastos.delete_button.${indice + 1}`}
                      aria-label={`Eliminar gasto ${gasto.descripcion}`}
                      onClick={() => setAEliminar(gasto)}
                      className="size-11 rounded-xl text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent
          data-ocid="gastos.modal"
          className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Nuevo gasto
            </DialogTitle>
            <DialogDescription>
              Escribe el concepto y el monto en soles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gasto-concepto">Concepto</Label>
              <Input
                id="gasto-concepto"
                data-ocid="gastos.concepto.input"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Compra de tela denim"
                className="h-12 rounded-xl text-base"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGERENCIAS_CONCEPTO.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    type="button"
                    data-ocid={`gastos.sugerencia.${sugerencia
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "_")
                      .replace(/^_|_$/g, "")}`}
                    onClick={() => setConcepto(sugerencia)}
                    className="rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-smooth hover:border-accent hover:bg-accent/20 active:scale-[0.97]"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gasto-monto">Monto (S/)</Label>
              <Input
                id="gasto-monto"
                data-ocid="gastos.monto.input"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="120.00"
                className="h-12 rounded-xl text-base tabular-nums"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="gastos.cancel_button"
              onClick={() => setAbierto(false)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              data-ocid="gastos.save_button"
              onClick={() => void guardar()}
              disabled={guardando}
              className="h-12 rounded-xl bg-gradient-primary font-semibold active:scale-[0.98]"
            >
              {guardando ? "Guardando…" : "Registrar gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent
          data-ocid="gastos.delete_modal"
          className="rounded-2xl sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              ¿Eliminar gasto?
            </DialogTitle>
            <DialogDescription>
              Se quitará «{aEliminar?.descripcion}» de tu registro de gastos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="gastos.delete_cancel_button"
              onClick={() => setAEliminar(null)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="gastos.delete_confirm_button"
              onClick={() => void confirmarEliminar()}
              className="h-12 rounded-xl font-semibold"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
