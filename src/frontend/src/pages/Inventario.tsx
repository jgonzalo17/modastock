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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nombreMesActual, parsearMonto, soles } from "@/lib/format";
import { comprimirFoto } from "@/lib/image";
import { calcularResumen, useTienda } from "@/lib/store";
import {
  CATEGORIAS_PRODUCTO,
  type Producto,
  TALLAS,
  type Talla,
  stockDeTalla,
  stockTotal,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Camera,
  ImageOff,
  Images,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/** Tallas fijas por categoría; el resto usa el catálogo general. */
const TALLAS_POR_CATEGORIA: Record<string, Talla[]> = {
  Pantalones: ["28", "30", "32", "34"],
  Polos: ["S", "M", "L"],
};

const UMBRAL_STOCK_BAJO = 2;

function tallasDeCategoria(categoria: string): Talla[] {
  return TALLAS_POR_CATEGORIA[categoria] ?? TALLAS;
}

interface FormularioProducto {
  nombre: string;
  sku: string;
  categoria: string;
  tallas: Talla[];
  precio: string;
  costo: string;
  /** Stock por talla, en texto para permitir edición libre. */
  stockPorTalla: Record<string, string>;
  stockMinimo: string;
  foto?: string;
}

const FORM_VACIO: FormularioProducto = {
  nombre: "",
  sku: "",
  categoria: CATEGORIAS_PRODUCTO[0],
  tallas: [],
  precio: "",
  costo: "",
  stockPorTalla: {},
  stockMinimo: String(UMBRAL_STOCK_BAJO),
};

export function Inventario() {
  const productos = useTienda((s) => s.productos);
  const ventas = useTienda((s) => s.ventas);
  const gastos = useTienda((s) => s.gastos);
  const agregarProducto = useTienda((s) => s.agregarProducto);
  const actualizarProducto = useTienda((s) => s.actualizarProducto);
  const eliminarProducto = useTienda((s) => s.eliminarProducto);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormularioProducto>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Producto | null>(null);
  const inputCamara = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);

  const resumen = useMemo(
    () => calcularResumen(ventas, gastos),
    [ventas, gastos],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const orden = [...productos].sort(
      (a, b) => b.actualizadoEn - a.actualizadoEn,
    );
    return orden.filter((p) => {
      const coincideCategoria =
        categoriaFiltro === "todas" || p.categoria === categoriaFiltro;
      if (!coincideCategoria) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    });
  }, [productos, busqueda, categoriaFiltro]);

  const tallasDisponibles = tallasDeCategoria(form.categoria);

  function abrirNuevo() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setAbierto(true);
  }

  function abrirEditar(producto: Producto) {
    setEditandoId(producto.id);
    const stockPorTalla: Record<string, string> = {};
    for (const talla of producto.tallas) {
      stockPorTalla[talla] = String(stockDeTalla(producto, talla));
    }
    setForm({
      nombre: producto.nombre,
      sku: producto.sku,
      categoria: producto.categoria,
      tallas: producto.tallas,
      precio: String(producto.precio),
      costo: String(producto.costo),
      stockPorTalla,
      stockMinimo: String(producto.stockMinimo),
      foto: producto.foto,
    });
    setAbierto(true);
  }

  function cambiarCategoria(categoria: string) {
    setForm((f) => {
      const permitidas = tallasDeCategoria(categoria);
      const tallas = f.tallas.filter((t) => permitidas.includes(t));
      const stockPorTalla: Record<string, string> = {};
      for (const talla of tallas) {
        stockPorTalla[talla] = f.stockPorTalla[talla] ?? "0";
      }
      return { ...f, categoria, tallas, stockPorTalla };
    });
  }

  function alternarTalla(talla: Talla) {
    setForm((f) => {
      const activa = f.tallas.includes(talla);
      const tallas = activa
        ? f.tallas.filter((t) => t !== talla)
        : [...f.tallas, talla];
      const stockPorTalla = { ...f.stockPorTalla };
      if (activa) {
        delete stockPorTalla[talla];
      } else if (stockPorTalla[talla] === undefined) {
        stockPorTalla[talla] = "0";
      }
      return { ...f, tallas, stockPorTalla };
    });
  }

  function ajustarStockTalla(talla: Talla, delta: number) {
    setForm((f) => {
      const actual = Math.max(
        0,
        Math.round(parsearMonto(f.stockPorTalla[talla] ?? "0")),
      );
      return {
        ...f,
        stockPorTalla: {
          ...f.stockPorTalla,
          [talla]: String(Math.max(0, actual + delta)),
        },
      };
    });
  }

  function cambiarStockTalla(talla: Talla, valor: string) {
    setForm((f) => ({
      ...f,
      stockPorTalla: { ...f.stockPorTalla, [talla]: valor },
    }));
  }

  async function manejarFoto(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const comprimida = await comprimirFoto(archivo);
      setForm((f) => ({ ...f, foto: comprimida }));
    } catch {
      toast.error("No se pudo procesar la foto.");
    }
  }

  async function guardar() {
    const nombre = form.nombre.trim();
    if (!nombre) {
      toast.error("Escribe el nombre del producto.");
      return;
    }
    const precio = parsearMonto(form.precio);
    if (precio <= 0) {
      toast.error("El precio de venta debe ser mayor a cero.");
      return;
    }
    const tallas =
      form.tallas.length > 0 ? form.tallas : (["Única"] as Talla[]);
    const stockPorTalla: Record<string, number> = {};
    for (const talla of tallas) {
      stockPorTalla[talla] = Math.max(
        0,
        Math.round(parsearMonto(form.stockPorTalla[talla] ?? "0")),
      );
    }
    const datos = {
      nombre,
      sku: form.sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`,
      categoria: form.categoria,
      tallas,
      precio,
      costo: parsearMonto(form.costo),
      stockPorTalla,
      stockMinimo: Math.max(0, Math.round(parsearMonto(form.stockMinimo))),
      foto: form.foto,
    };
    setGuardando(true);
    try {
      if (editandoId) {
        await actualizarProducto(editandoId, datos);
        toast.success("Producto actualizado.");
      } else {
        await agregarProducto(datos);
        toast.success("Producto agregado al inventario.");
      }
      setAbierto(false);
      setForm(FORM_VACIO);
      setEditandoId(null);
    } catch {
      toast.error("No se pudo guardar. Revisa el espacio del dispositivo.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return;
    try {
      await eliminarProducto(aEliminar.id);
      toast.success("Producto eliminado.");
    } catch {
      toast.error("No se pudo eliminar el producto.");
    } finally {
      setAEliminar(null);
    }
  }

  return (
    <div data-ocid="inventario.page" className="space-y-5 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Inventario
        </h1>
        <p className="text-sm text-muted-foreground">
          Controla tus prendas, tallas y stock desde el celular.
        </p>
      </header>

      <MonthSummary resumen={resumen} mes={nombreMesActual()} />

      <div className="space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            data-ocid="inventario.search_input"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, SKU o categoría"
            aria-label="Buscar productos"
            className="h-12 rounded-xl pl-10 text-base"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <FiltroCategoria
            activa={categoriaFiltro === "todas"}
            onClick={() => setCategoriaFiltro("todas")}
            ocid="inventario.filter.todas"
          >
            Todas
          </FiltroCategoria>
          {CATEGORIAS_PRODUCTO.map((c) => (
            <FiltroCategoria
              key={c}
              activa={categoriaFiltro === c}
              onClick={() => setCategoriaFiltro(c)}
              ocid={`inventario.filter.${c.toLowerCase()}`}
            >
              {c}
            </FiltroCategoria>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Productos
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {filtrados.length}
          </span>
        </h2>
        <Button
          type="button"
          data-ocid="inventario.open_modal_button"
          onClick={abrirNuevo}
          className="h-11 shrink-0 rounded-xl bg-gradient-accent px-4 font-semibold text-accent-foreground shadow-fab active:scale-[0.98]"
        >
          <Plus className="size-5" aria-hidden="true" />
          Nuevo
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          ocid="inventario.empty_state"
          Icono={Package}
          titulo={
            busqueda || categoriaFiltro !== "todas"
              ? "Sin resultados"
              : "Tu inventario está vacío"
          }
          descripcion={
            busqueda || categoriaFiltro !== "todas"
              ? "No encontramos productos con ese filtro. Prueba con otro nombre, SKU o categoría."
              : "Agrega tu primera prenda para empezar a controlar tallas, precios y stock."
          }
          accion={
            !busqueda &&
            categoriaFiltro === "todas" && (
              <Button
                type="button"
                data-ocid="inventario.empty_state.primary_button"
                onClick={abrirNuevo}
                className="h-14 w-full rounded-xl bg-gradient-primary text-base font-semibold active:scale-[0.98]"
              >
                <Plus className="size-5" aria-hidden="true" />
                Agregar producto
              </Button>
            )
          }
        />
      ) : (
        <ul data-ocid="inventario.list" className="space-y-3">
          {filtrados.map((producto, indice) => (
            <li
              key={producto.id}
              data-ocid={`inventario.item.${indice + 1}`}
              className="animate-fade-up rounded-2xl border border-border bg-card p-3 shadow-card"
              style={{ animationDelay: `${Math.min(indice, 8) * 40}ms` }}
            >
              <div className="flex gap-3">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {producto.foto ? (
                    <img
                      src={producto.foto}
                      alt={`Foto de ${producto.nombre}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageOff
                      className="size-6 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-semibold text-foreground">
                        {producto.nombre}
                      </h3>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {producto.sku} · {producto.categoria}
                      </p>
                    </div>
                    <BadgeStock producto={producto} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {producto.tallas.map((talla) => {
                      const cantidad = stockDeTalla(producto, talla);
                      const alerta = cantidad <= UMBRAL_STOCK_BAJO;
                      return (
                        <span
                          key={talla}
                          data-ocid={`inventario.talla_stock.${talla}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-medium",
                            alerta
                              ? "border-destructive/40 bg-destructive/15 text-destructive"
                              : "border-border bg-muted text-foreground",
                          )}
                        >
                          {talla}
                          <span className="tabular-nums">· {cantidad}</span>
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-display text-lg font-bold tabular-nums text-foreground">
                      {soles(producto.precio)}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`inventario.edit_button.${indice + 1}`}
                        aria-label={`Editar ${producto.nombre}`}
                        onClick={() => abrirEditar(producto)}
                        className="size-11 rounded-xl text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="size-5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`inventario.delete_button.${indice + 1}`}
                        aria-label={`Eliminar ${producto.nombre}`}
                        onClick={() => setAEliminar(producto)}
                        className="size-11 rounded-xl text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent
          data-ocid="inventario.modal"
          className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editandoId ? "Editar producto" : "Nuevo producto"}
            </DialogTitle>
            <DialogDescription>
              Completa los datos de la prenda. Todo se guarda en tu dispositivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-nombre">Nombre</Label>
              <Input
                id="prod-nombre"
                data-ocid="inventario.nombre.input"
                value={form.nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                }
                placeholder="Pantalón denim clásico"
                className="h-12 rounded-xl text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prod-sku">SKU (opcional)</Label>
                <Input
                  id="prod-sku"
                  data-ocid="inventario.sku.input"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  placeholder="PAN-001"
                  className="h-12 rounded-xl font-mono text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-categoria">Categoría</Label>
                <Select value={form.categoria} onValueChange={cambiarCategoria}>
                  <SelectTrigger
                    id="prod-categoria"
                    data-ocid="inventario.categoria.select"
                    className="h-12 w-full rounded-xl text-base"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_PRODUCTO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                Tallas disponibles
              </legend>
              <div className="flex flex-wrap gap-2">
                {tallasDisponibles.map((talla) => {
                  const activa = form.tallas.includes(talla);
                  return (
                    <button
                      key={talla}
                      type="button"
                      data-ocid={`inventario.talla.toggle.${talla}`}
                      aria-pressed={activa}
                      onClick={() => alternarTalla(talla)}
                      className={cn(
                        "h-11 min-w-11 rounded-xl border px-3 font-mono text-sm font-semibold transition-smooth active:scale-[0.97]",
                        activa
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-foreground",
                      )}
                    >
                      {talla}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.tallas.length === 0
                  ? "Sin tallas seleccionadas se guardará como talla Única."
                  : `Seleccionadas: ${form.tallas.join(", ")}`}
              </p>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prod-precio">Precio de venta (S/)</Label>
                <Input
                  id="prod-precio"
                  data-ocid="inventario.precio.input"
                  inputMode="decimal"
                  value={form.precio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, precio: e.target.value }))
                  }
                  placeholder="89.90"
                  className="h-12 rounded-xl text-base tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-costo">Precio de compra (S/)</Label>
                <Input
                  id="prod-costo"
                  data-ocid="inventario.costo.input"
                  inputMode="decimal"
                  value={form.costo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, costo: e.target.value }))
                  }
                  placeholder="45.00"
                  className="h-12 rounded-xl text-base tabular-nums"
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                Stock por talla
              </legend>
              {form.tallas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/50 px-3 py-3 text-xs text-muted-foreground">
                  Elige al menos una talla para asignar su stock. Sin tallas se
                  guardará como talla Única.
                </p>
              ) : (
                <ul className="space-y-2">
                  {form.tallas.map((talla) => {
                    const cantidad = Math.max(
                      0,
                      Math.round(
                        parsearMonto(form.stockPorTalla[talla] ?? "0"),
                      ),
                    );
                    const alerta = cantidad <= UMBRAL_STOCK_BAJO;
                    return (
                      <li
                        key={talla}
                        className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
                      >
                        <span
                          className={cn(
                            "grid size-11 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold",
                            alerta
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {talla}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          data-ocid={`inventario.stock_menos_button.${talla}`}
                          aria-label={`Quitar una unidad de la talla ${talla}`}
                          onClick={() => ajustarStockTalla(talla, -1)}
                          className="size-11 shrink-0 rounded-xl"
                        >
                          <Minus className="size-5" aria-hidden="true" />
                        </Button>
                        <Input
                          id={`prod-stock-${talla}`}
                          data-ocid={`inventario.stock.input.${talla}`}
                          inputMode="numeric"
                          aria-label={`Stock de la talla ${talla}`}
                          value={form.stockPorTalla[talla] ?? ""}
                          onChange={(e) =>
                            cambiarStockTalla(talla, e.target.value)
                          }
                          placeholder="0"
                          className="h-11 flex-1 rounded-xl text-center text-base tabular-nums"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          data-ocid={`inventario.stock_mas_button.${talla}`}
                          aria-label={`Agregar una unidad a la talla ${talla}`}
                          onClick={() => ajustarStockTalla(talla, 1)}
                          className="size-11 shrink-0 rounded-xl"
                        >
                          <Plus className="size-5" aria-hidden="true" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Se marca en rojo la talla cuyo stock quede en{" "}
                {UMBRAL_STOCK_BAJO} o menos.
              </p>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="prod-minimo">Alerta de stock bajo</Label>
              <Input
                id="prod-minimo"
                data-ocid="inventario.stock_minimo.input"
                inputMode="numeric"
                value={form.stockMinimo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stockMinimo: e.target.value }))
                }
                placeholder="2"
                className="h-12 rounded-xl text-base tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Se marca en rojo cuando el stock queda en este número o menos.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Foto (opcional)</Label>
              <div className="flex items-center gap-3">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
                  {form.foto ? (
                    <img
                      src={form.foto}
                      alt="Vista previa de la prenda"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Camera
                      className="size-6 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={inputCamara}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      void manejarFoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={inputGaleria}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      void manejarFoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    data-ocid="inventario.upload_button"
                    onClick={() => inputCamara.current?.click()}
                    className="h-11 rounded-xl"
                  >
                    <Camera className="size-4" aria-hidden="true" />
                    Tomar foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-ocid="inventario.galeria_button"
                    onClick={() => inputGaleria.current?.click()}
                    className="h-11 rounded-xl"
                  >
                    <Images className="size-4" aria-hidden="true" />
                    Galería
                  </Button>
                  {form.foto && (
                    <Button
                      type="button"
                      variant="ghost"
                      data-ocid="inventario.quitar_foto_button"
                      onClick={() =>
                        setForm((f) => ({ ...f, foto: undefined }))
                      }
                      className="h-11 rounded-xl text-muted-foreground"
                    >
                      <X className="size-4" aria-hidden="true" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="inventario.cancel_button"
              onClick={() => setAbierto(false)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              data-ocid="inventario.save_button"
              onClick={() => void guardar()}
              disabled={guardando}
              className="h-12 rounded-xl bg-gradient-primary font-semibold active:scale-[0.98]"
            >
              {guardando
                ? "Guardando…"
                : editandoId
                  ? "Guardar cambios"
                  : "Agregar producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent
          data-ocid="inventario.delete_modal"
          className="rounded-2xl sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              ¿Eliminar producto?
            </DialogTitle>
            <DialogDescription>
              Se quitará «{aEliminar?.nombre}» de tu inventario. Esta acción no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="inventario.delete_cancel_button"
              onClick={() => setAEliminar(null)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="inventario.delete_confirm_button"
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

function FiltroCategoria({
  activa,
  onClick,
  ocid,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  ocid: string;
  children: string;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition-smooth active:scale-[0.97]",
        activa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function BadgeStock({ producto }: { producto: Producto }) {
  const total = stockTotal(producto);
  const agotado = total <= 0;
  const bajo = !agotado && total <= producto.stockMinimo;
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 rounded-full border-transparent px-2.5 py-1 text-xs font-semibold",
        agotado && "bg-destructive text-destructive-foreground",
        bajo && "bg-destructive/15 text-destructive",
        !agotado && !bajo && "bg-secondary text-secondary-foreground",
      )}
    >
      {agotado ? "Agotado" : `${total} en stock`}
    </Badge>
  );
}
