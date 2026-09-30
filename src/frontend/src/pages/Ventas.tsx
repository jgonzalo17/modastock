import { EmptyState } from "@/components/EmptyState";
import { MonthSummary } from "@/components/MonthSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fechaHora, nombreMesActual, soles } from "@/lib/format";
import { comprimirFoto } from "@/lib/image";
import { calcularResumen, useTienda } from "@/lib/store";
import {
  METODOS_PAGO,
  type MetodoPago,
  type Talla,
  type Venta,
  stockDeTalla,
  stockTotal,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Ban,
  Camera,
  ImageOff,
  Minus,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const METODO_ESTILO: Record<MetodoPago, string> = {
  Yape: "bg-accent text-accent-foreground",
  Plin: "bg-secondary text-secondary-foreground",
  Transferencia: "bg-primary text-primary-foreground",
  Efectivo: "bg-muted text-foreground",
};

export function Ventas() {
  const productos = useTienda((s) => s.productos);
  const ventas = useTienda((s) => s.ventas);
  const gastos = useTienda((s) => s.gastos);
  const registrarVenta = useTienda((s) => s.registrarVenta);
  const anularVenta = useTienda((s) => s.anularVenta);

  const [abierto, setAbierto] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [talla, setTalla] = useState<Talla | "">("");
  const [cantidad, setCantidad] = useState(1);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("Yape");
  const [captura, setCaptura] = useState<string | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);
  const [aAnular, setAAnular] = useState<Venta | null>(null);
  const [capturaAmpliada, setCapturaAmpliada] = useState<Venta | null>(null);
  const inputCaptura = useRef<HTMLInputElement>(null);

  const resumen = useMemo(
    () => calcularResumen(ventas, gastos),
    [ventas, gastos],
  );
  const disponibles = useMemo(
    () => productos.filter((p) => stockTotal(p) > 0),
    [productos],
  );
  const productoSeleccionado = useMemo(
    () => productos.find((p) => p.id === productoId) ?? null,
    [productos, productoId],
  );
  const stockTallaSeleccionada = useMemo(
    () =>
      productoSeleccionado && talla
        ? stockDeTalla(productoSeleccionado, talla)
        : 0,
    [productoSeleccionado, talla],
  );
  const ordenadas = useMemo(
    () => [...ventas].sort((a, b) => b.fecha - a.fecha),
    [ventas],
  );

  const inicioHoy = useMemo(() => {
    const ahora = new Date();
    return new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    ).getTime();
  }, []);
  const ventasHoy = useMemo(
    () =>
      ventas
        .filter((v) => v.fecha >= inicioHoy && !v.anulada)
        .reduce((suma, v) => suma + v.total, 0),
    [ventas, inicioHoy],
  );
  const totalGeneral = useMemo(
    () =>
      ventas.filter((v) => !v.anulada).reduce((suma, v) => suma + v.total, 0),
    [ventas],
  );

  const totalEstimado = productoSeleccionado
    ? productoSeleccionado.precio * cantidad
    : 0;

  function abrirNueva() {
    setProductoId("");
    setTalla("");
    setCantidad(1);
    setMetodoPago("Yape");
    setCaptura(undefined);
    setAbierto(true);
  }

  function elegirProducto(id: string) {
    setProductoId(id);
    const producto = productos.find((p) => p.id === id);
    setTalla(
      producto && producto.tallas.length === 1 ? producto.tallas[0] : "",
    );
    setCantidad(1);
  }

  async function manejarCaptura(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const comprimida = await comprimirFoto(archivo);
      setCaptura(comprimida);
    } catch {
      toast.error("No se pudo procesar la captura.");
    }
  }

  async function guardar() {
    if (!productoSeleccionado) {
      toast.error("Elige un producto.");
      return;
    }
    if (!talla) {
      toast.error("Elige una talla.");
      return;
    }
    if (cantidad < 1) {
      toast.error("La cantidad debe ser al menos 1.");
      return;
    }
    if (cantidad > stockTallaSeleccionada) {
      toast.error(
        `Solo quedan ${stockTallaSeleccionada} unidades de ${productoSeleccionado.nombre} en talla ${talla}.`,
      );
      return;
    }
    setGuardando(true);
    try {
      await registrarVenta({
        productoId: productoSeleccionado.id,
        cantidad,
        talla,
        metodoPago,
        captura,
      });
      toast.success("Venta registrada.");
      setAbierto(false);
    } catch {
      toast.error("No se pudo registrar la venta.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarAnular() {
    if (!aAnular) return;
    try {
      await anularVenta(aAnular.id);
      toast.success("Venta anulada y stock restaurado.");
    } catch {
      toast.error("No se pudo anular la venta.");
    } finally {
      setAAnular(null);
    }
  }

  return (
    <div data-ocid="ventas.page" className="space-y-5 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Ventas
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra cada venta y el stock se descuenta solo.
        </p>
      </header>

      <MonthSummary resumen={resumen} mes={nombreMesActual()} />

      <section
        data-ocid="ventas.totales.card"
        aria-label="Totales de ventas"
        className="grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ventas de hoy
          </p>
          <p
            data-ocid="ventas.total_hoy"
            className="mt-1 font-display text-xl font-bold tabular-nums text-foreground"
          >
            {soles(ventasHoy)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total general
          </p>
          <p
            data-ocid="ventas.total_general"
            className="mt-1 font-display text-xl font-bold tabular-nums text-foreground"
          >
            {soles(totalGeneral)}
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Historial
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {ordenadas.length}
          </span>
        </h2>
        <Button
          type="button"
          data-ocid="ventas.open_modal_button"
          onClick={abrirNueva}
          disabled={disponibles.length === 0}
          className="h-11 rounded-xl bg-gradient-accent px-4 font-semibold text-accent-foreground shadow-fab active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden="true" />
          Nueva venta
        </Button>
      </div>

      {ordenadas.length === 0 ? (
        <EmptyState
          ocid="ventas.empty_state"
          Icono={ShoppingCart}
          titulo="Aún no hay ventas"
          descripcion={
            disponibles.length === 0
              ? "Primero agrega productos con stock en la pestaña Inventario."
              : "Registra tu primera venta del día y verás aquí el historial completo."
          }
          accion={
            disponibles.length > 0 && (
              <Button
                type="button"
                data-ocid="ventas.empty_state.primary_button"
                onClick={abrirNueva}
                className="h-14 w-full rounded-xl bg-gradient-primary text-base font-semibold active:scale-[0.98]"
              >
                <Plus className="size-5" aria-hidden="true" />
                Registrar venta
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table
            data-ocid="ventas.table"
            className="w-full border-collapse text-left text-sm"
          >
            <caption className="sr-only">
              Historial de ventas registradas
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th
                  scope="col"
                  className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Fecha
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Producto
                </th>
                <th
                  scope="col"
                  className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Talla
                </th>
                <th
                  scope="col"
                  className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Cant.
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Total
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Pago
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Captura
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((venta, indice) => (
                <tr
                  key={venta.id}
                  data-ocid={`ventas.row.${indice + 1}`}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    venta.anulada && "opacity-60",
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-muted-foreground">
                    {fechaHora(venta.fecha)}
                  </td>
                  <td className="max-w-[9rem] px-3 py-3 align-middle">
                    <span
                      className={cn(
                        "block truncate font-medium text-foreground",
                        venta.anulada && "line-through",
                      )}
                    >
                      {venta.productoNombre}
                    </span>
                    {venta.anulada && (
                      <span className="text-xs font-semibold text-destructive">
                        Anulada
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center align-middle">
                    <span
                      className={cn(
                        "inline-block rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground",
                        venta.anulada && "line-through",
                      )}
                    >
                      {venta.talla}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-2 py-3 text-center align-middle font-mono tabular-nums text-foreground",
                      venta.anulada && "line-through",
                    )}
                  >
                    {venta.cantidad}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-right align-middle font-display font-bold tabular-nums text-foreground",
                      venta.anulada && "line-through",
                    )}
                  >
                    {soles(venta.total)}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-transparent px-2.5 py-1 text-xs font-semibold",
                        METODO_ESTILO[venta.metodoPago],
                      )}
                    >
                      {venta.metodoPago}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    {venta.captura ? (
                      <button
                        type="button"
                        data-ocid={`ventas.captura_button.${indice + 1}`}
                        aria-label={`Ver captura del pago de ${venta.productoNombre}`}
                        onClick={() => setCapturaAmpliada(venta)}
                        className="mx-auto block size-11 overflow-hidden rounded-lg border border-border transition-smooth active:scale-[0.96]"
                      >
                        <img
                          src={venta.captura}
                          alt={`Captura del pago de ${venta.productoNombre}`}
                          className="size-full object-cover"
                        />
                      </button>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="mx-auto grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground"
                      >
                        <ImageOff className="size-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    {venta.anulada ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        —
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        data-ocid={`ventas.anular_button.${indice + 1}`}
                        aria-label={`Anular venta de ${venta.productoNombre}`}
                        onClick={() => setAAnular(venta)}
                        className="h-11 rounded-xl px-3 text-muted-foreground hover:text-destructive"
                      >
                        <Ban className="size-4" aria-hidden="true" />
                        Anular
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent
          data-ocid="ventas.modal"
          className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Nueva venta
            </DialogTitle>
            <DialogDescription>
              Elige la prenda, la talla, la cantidad y el método de pago.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venta-producto">Producto</Label>
              <Select value={productoId} onValueChange={elegirProducto}>
                <SelectTrigger
                  id="venta-producto"
                  data-ocid="ventas.producto.select"
                  className="h-12 w-full rounded-xl text-base"
                >
                  <SelectValue placeholder="Elige un producto" />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} · {stockTotal(p)} disp.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {productoSeleccionado && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  Talla
                </legend>
                <div className="flex flex-wrap gap-2">
                  {productoSeleccionado.tallas.map((t) => {
                    const disponible = stockDeTalla(productoSeleccionado, t);
                    const sinStock = disponible <= 0;
                    return (
                      <button
                        key={t}
                        type="button"
                        data-ocid={`ventas.talla.toggle.${t}`}
                        aria-pressed={talla === t}
                        disabled={sinStock}
                        onClick={() => {
                          setTalla(t);
                          setCantidad((c) =>
                            Math.min(c, Math.max(1, disponible)),
                          );
                        }}
                        className={cn(
                          "flex h-11 min-w-11 flex-col items-center justify-center rounded-xl border px-3 font-mono text-sm font-semibold transition-smooth active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
                          talla === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background text-foreground",
                        )}
                      >
                        <span>{t}</span>
                        <span className="text-[10px] font-normal opacity-80">
                          {disponible} disp.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="space-y-2">
              <Label>Cantidad</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-ocid="ventas.cantidad_menos_button"
                  aria-label="Quitar una unidad"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  className="size-12 rounded-xl"
                >
                  <Minus className="size-5" aria-hidden="true" />
                </Button>
                <span
                  data-ocid="ventas.cantidad_valor"
                  className="min-w-12 text-center font-display text-2xl font-bold tabular-nums text-foreground"
                >
                  {cantidad}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-ocid="ventas.cantidad_mas_button"
                  aria-label="Agregar una unidad"
                  onClick={() =>
                    setCantidad((c) =>
                      talla
                        ? Math.min(Math.max(1, stockTallaSeleccionada), c + 1)
                        : c + 1,
                    )
                  }
                  className="size-12 rounded-xl"
                >
                  <Plus className="size-5" aria-hidden="true" />
                </Button>
              </div>
              {productoSeleccionado && (
                <p className="text-xs text-muted-foreground">
                  {talla
                    ? `Disponibles en talla ${talla}: ${stockTallaSeleccionada} unidades.`
                    : "Elige una talla para ver el stock disponible."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venta-metodo">Método de pago</Label>
              <Select
                value={metodoPago}
                onValueChange={(v) => setMetodoPago(v as MetodoPago)}
              >
                <SelectTrigger
                  id="venta-metodo"
                  data-ocid="ventas.metodo.select"
                  className="h-12 w-full rounded-xl text-base"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Captura del pago (opcional)</Label>
              <div className="flex items-center gap-3">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
                  {captura ? (
                    <img
                      src={captura}
                      alt="Vista previa de la captura del pago"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Camera
                      className="size-6 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <input
                  ref={inputCaptura}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => void manejarCaptura(e.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    data-ocid="ventas.upload_button"
                    onClick={() => inputCaptura.current?.click()}
                    className="h-11 rounded-xl"
                  >
                    <Camera className="size-4" aria-hidden="true" />
                    {captura ? "Cambiar captura" : "Adjuntar captura"}
                  </Button>
                  {captura && (
                    <Button
                      type="button"
                      variant="ghost"
                      data-ocid="ventas.quitar_captura_button"
                      onClick={() => setCaptura(undefined)}
                      className="h-11 rounded-xl text-muted-foreground"
                    >
                      <X className="size-4" aria-hidden="true" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">
                Total
              </span>
              <span
                data-ocid="ventas.total_estimado"
                className="font-display text-xl font-bold tabular-nums text-foreground"
              >
                {soles(totalEstimado)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="ventas.cancel_button"
              onClick={() => setAbierto(false)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              data-ocid="ventas.save_button"
              onClick={() => void guardar()}
              disabled={guardando}
              className="h-12 rounded-xl bg-gradient-primary font-semibold active:scale-[0.98]"
            >
              {guardando ? "Registrando…" : "Registrar venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aAnular !== null}
        onOpenChange={(v) => !v && setAAnular(null)}
      >
        <DialogContent
          data-ocid="ventas.anular_modal"
          className="rounded-2xl sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              ¿Anular venta?
            </DialogTitle>
            <DialogDescription>
              Se marcará como anulada la venta de «{aAnular?.productoNombre}» y
              el stock volverá al inventario.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="ventas.anular_cancel_button"
              onClick={() => setAAnular(null)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="ventas.anular_confirm_button"
              onClick={() => void confirmarAnular()}
              className="h-12 rounded-xl font-semibold"
            >
              Anular venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={capturaAmpliada !== null}
        onOpenChange={(v) => !v && setCapturaAmpliada(null)}
      >
        <DialogContent
          data-ocid="ventas.captura_modal"
          className="rounded-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Captura del pago
            </DialogTitle>
            <DialogDescription>
              {capturaAmpliada?.productoNombre} ·{" "}
              {capturaAmpliada ? soles(capturaAmpliada.total) : ""}
            </DialogDescription>
          </DialogHeader>
          {capturaAmpliada?.captura && (
            <img
              src={capturaAmpliada.captura}
              alt={`Captura del pago de ${capturaAmpliada.productoNombre}`}
              className="max-h-[60dvh] w-full rounded-xl border border-border object-contain"
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-ocid="ventas.captura_close_button"
              onClick={() => setCapturaAmpliada(null)}
              className="h-12 w-full rounded-xl"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
