import { MonthSummary } from "@/components/MonthSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { responder } from "@/lib/assistant";
import { nombreMesActual, nuevoId, soles } from "@/lib/format";
import { calcularResumen, useTienda } from "@/lib/store";
import type { Gasto, MensajeAsistente, Producto, Talla } from "@/lib/types";
import { CATEGORIAS_GASTO, TALLAS, stockDeTalla } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, PackagePlus, Receipt, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const SUGERENCIAS = [
  "¿Nos queda talla 32 del jean azul?",
  "¿Qué tallas se están acabando?",
  "¿Cuál es mi ganancia del mes?",
  "¿Cuánto vale mi inventario?",
];

const SALUDO: MensajeAsistente = {
  id: "bienvenida",
  autor: "asistente",
  texto:
    "¡Hola! Soy tu asistente de tienda. Pregúntame por el stock de un producto y talla, tus ventas, gastos o ganancia. También puedo ajustar stock (por ejemplo «agrega 5 polos M») o anotar un gasto. Siempre te pediré confirmación antes de cambiar algo. Funciono sin internet y tus datos nunca salen del celular.",
  fecha: 0,
};

type TipoAccion = "stock" | "gasto";

interface AccionPendiente {
  id: string;
  tipo: TipoAccion;
  resumen: string;
  detalle: string;
  productoId?: string;
  cantidad?: number;
  talla?: Talla;
  gasto?: Gasto;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function coincideProducto(producto: Producto, texto: string): boolean {
  const nombre = normalizar(producto.nombre);
  const sku = normalizar(producto.sku);
  if (sku && texto.includes(sku)) return true;
  const palabras = nombre.split(/\s+/).filter((p) => p.length >= 3);
  if (palabras.length === 0) return nombre.length > 0 && texto.includes(nombre);
  return palabras.every((palabra) => texto.includes(palabra));
}

function detectarTalla(texto: string): Talla | null {
  for (const talla of TALLAS) {
    const clave = normalizar(talla);
    if (clave === "unica") {
      if (texto.includes("unica") || texto.includes("unico")) return talla;
      continue;
    }
    const patron = new RegExp(`(^|[^a-z0-9])${clave}([^a-z0-9]|$)`);
    if (patron.test(texto)) return talla;
  }
  return null;
}

function buscarProducto(productos: Producto[], texto: string): Producto | null {
  const candidatos = productos.filter((p) => coincideProducto(p, texto));
  if (candidatos.length === 0) return null;
  return candidatos.sort((a, b) => b.nombre.length - a.nombre.length)[0];
}

function extraerCantidad(texto: string): number | null {
  const numeros = texto.match(/\d+/g);
  if (!numeros) return null;
  const valor = Number.parseInt(numeros[0], 10);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function extraerMonto(texto: string): number | null {
  const coincidencia = texto.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!coincidencia) return null;
  const valor = Number.parseFloat(coincidencia[1].replace(",", "."));
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function categoriaGasto(texto: string): string {
  for (const categoria of CATEGORIAS_GASTO) {
    if (texto.includes(normalizar(categoria))) return categoria;
  }
  return "Otros";
}

function descripcionGasto(original: string): string {
  const limpio = original
    .replace(
      /^(anota|anotar|registra|registrar|agrega|agregar|apunta|apuntar)\s+/i,
      "",
    )
    .replace(/^(un|una|el|la|los|las)\s+/i, "")
    .replace(/\b(gasto|gastos)\b/gi, "")
    .replace(/\bde\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return limpio.length > 0 ? limpio : "Gasto registrado";
}

/** Detecta una acción de escritura (ajuste de stock o gasto) que requiere confirmación. */
function detectarAccion(
  pregunta: string,
  productos: Producto[],
): AccionPendiente | null {
  const texto = normalizar(pregunta);

  const verboStock =
    /(agrega|agregar|suma|sumar|anade|anadir|ingresa|ingresar|repone|reponer|aumenta|aumentar|quita|quitar|resta|restar|descuenta|descontar|vende|vender|retira|retirar)/.test(
      texto,
    );
  const verboGasto =
    /(anota|anotar|registra|registrar|apunta|apuntar|gaste|gasto de|pague|pagar)/.test(
      texto,
    );

  if (verboGasto && !verboStock) {
    const monto = extraerMonto(texto);
    if (monto !== null) {
      const categoria = categoriaGasto(texto);
      const descripcion = descripcionGasto(pregunta);
      const gasto: Gasto = {
        id: nuevoId(),
        descripcion,
        categoria,
        monto,
        fecha: Date.now(),
      };
      return {
        id: nuevoId(),
        tipo: "gasto",
        resumen: `Anotar gasto de ${soles(monto)}`,
        detalle: `${descripcion} · ${categoria}`,
        gasto,
      };
    }
  }

  if (verboStock) {
    const producto = buscarProducto(productos, texto);
    const cantidad = extraerCantidad(texto);
    if (producto && cantidad !== null) {
      const esResta =
        /(quita|quitar|resta|restar|descuenta|descontar|vende|vender|retira|retirar)/.test(
          texto,
        );
      const delta = esResta ? -cantidad : cantidad;
      const talla = detectarTalla(texto);
      if (!talla) {
        return null;
      }
      const actual = stockDeTalla(producto, talla);
      const nuevoStock = actual + delta;
      if (nuevoStock < 0) {
        return null;
      }
      const signo = delta >= 0 ? "+" : "−";
      return {
        id: nuevoId(),
        tipo: "stock",
        resumen: `${signo}${cantidad} a ${producto.nombre} (talla ${talla})`,
        detalle: `Stock talla ${talla}: ${actual} → ${nuevoStock}`,
        productoId: producto.id,
        cantidad: delta,
        talla,
      };
    }
  }

  return null;
}

export function Asistente() {
  const productos = useTienda((s) => s.productos);
  const ventas = useTienda((s) => s.ventas);
  const gastos = useTienda((s) => s.gastos);
  const actualizarProducto = useTienda((s) => s.actualizarProducto);
  const agregarGasto = useTienda((s) => s.agregarGasto);

  const [mensajes, setMensajes] = useState<MensajeAsistente[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [pendiente, setPendiente] = useState<AccionPendiente | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  const contexto = useMemo(
    () => ({ productos, ventas, gastos }),
    [productos, ventas, gastos],
  );

  const resumen = useMemo(
    () => calcularResumen(ventas, gastos),
    [ventas, gastos],
  );

  useEffect(() => {
    if (mensajes.length === 0) return;
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  function agregarMensaje(autor: MensajeAsistente["autor"], contenido: string) {
    setMensajes((prev) => [
      ...prev,
      { id: nuevoId(), autor, texto: contenido, fecha: Date.now() },
    ]);
  }

  function enviar(pregunta: string) {
    const limpio = pregunta.trim();
    if (!limpio) return;
    setTexto("");
    agregarMensaje("usuario", limpio);

    const accion = detectarAccion(limpio, productos);
    if (accion) {
      setPendiente(accion);
      agregarMensaje(
        "asistente",
        `Entendí: ${accion.resumen}. ${accion.detalle}. ¿Confirmas que lo aplique?`,
      );
      return;
    }

    agregarMensaje("asistente", responder(limpio, contexto));
  }

  async function confirmar() {
    if (!pendiente || aplicando) return;
    setAplicando(true);
    try {
      if (
        pendiente.tipo === "stock" &&
        pendiente.productoId &&
        pendiente.talla
      ) {
        const producto = productos.find((p) => p.id === pendiente.productoId);
        if (!producto) {
          agregarMensaje("asistente", "Ese producto ya no existe.");
          setPendiente(null);
          return;
        }
        const talla = pendiente.talla;
        const nuevoStock =
          stockDeTalla(producto, talla) + (pendiente.cantidad ?? 0);
        await actualizarProducto(producto.id, {
          nombre: producto.nombre,
          sku: producto.sku,
          categoria: producto.categoria,
          tallas: producto.tallas,
          precio: producto.precio,
          costo: producto.costo,
          stockPorTalla: { ...producto.stockPorTalla, [talla]: nuevoStock },
          stockMinimo: producto.stockMinimo,
          foto: producto.foto,
        });
        agregarMensaje(
          "asistente",
          `Listo. ${producto.nombre} talla ${talla} ahora tiene ${nuevoStock} unidades en stock.`,
        );
        toast.success("Stock actualizado");
      } else if (pendiente.tipo === "gasto" && pendiente.gasto) {
        await agregarGasto({
          descripcion: pendiente.gasto.descripcion,
          categoria: pendiente.gasto.categoria,
          monto: pendiente.gasto.monto,
        });
        agregarMensaje(
          "asistente",
          `Listo. Anoté el gasto "${pendiente.gasto.descripcion}" por ${soles(
            pendiente.gasto.monto,
          )}.`,
        );
        toast.success("Gasto registrado");
      }
      setPendiente(null);
    } catch {
      agregarMensaje(
        "asistente",
        "No pude aplicar el cambio. Inténtalo de nuevo.",
      );
      toast.error("No se pudo aplicar el cambio");
    } finally {
      setAplicando(false);
    }
  }

  function cancelar() {
    if (!pendiente) return;
    agregarMensaje("asistente", "De acuerdo, no hice ningún cambio.");
    setPendiente(null);
  }

  return (
    <div
      data-ocid="asistente.page"
      className="flex min-h-[calc(100dvh-7rem)] flex-col px-4 pt-4"
    >
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground">
          <Sparkles className="size-6 text-accent" aria-hidden="true" />
          Asistente
        </h1>
        <p className="text-sm text-muted-foreground">
          Consulta tu negocio en lenguaje natural. Todo funciona en tu
          dispositivo.
        </p>
      </header>

      <MonthSummary resumen={resumen} mes={nombreMesActual()} />

      <div
        data-ocid="asistente.list"
        className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4"
        aria-live="polite"
      >
        {mensajes.map((mensaje) => (
          <div
            key={mensaje.id}
            data-ocid={`asistente.mensaje.${mensaje.autor}`}
            className={cn(
              "animate-fade-up flex",
              mensaje.autor === "usuario" ? "justify-end" : "justify-start",
            )}
          >
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                mensaje.autor === "usuario"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border bg-card text-card-foreground shadow-card",
              )}
            >
              {mensaje.texto}
            </p>
          </div>
        ))}

        {pendiente && (
          <div
            data-ocid="asistente.confirmacion.card"
            className="animate-pop-in rounded-2xl border-2 border-accent/60 bg-accent/10 p-4"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"
              >
                {pendiente.tipo === "stock" ? (
                  <PackagePlus className="size-5" />
                ) : (
                  <Receipt className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-foreground">
                  {pendiente.resumen}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pendiente.detalle}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                data-ocid="asistente.confirmar_button"
                onClick={() => void confirmar()}
                disabled={aplicando}
                className="h-12 flex-1 rounded-xl bg-gradient-primary text-base font-semibold active:scale-[0.98]"
              >
                <Check className="size-5" aria-hidden="true" />
                {aplicando ? "Aplicando…" : "Confirmar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                data-ocid="asistente.cancelar_button"
                onClick={cancelar}
                disabled={aplicando}
                className="h-12 flex-1 rounded-xl text-base font-semibold active:scale-[0.98]"
              >
                <X className="size-5" aria-hidden="true" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div ref={finRef} />
      </div>

      <div className="sticky bottom-24 space-y-3 bg-background pt-2">
        <div className="flex flex-wrap gap-2">
          {SUGERENCIAS.map((sugerencia) => (
            <button
              key={sugerencia}
              type="button"
              data-ocid="asistente.sugerencia.button"
              onClick={() => enviar(sugerencia)}
              className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-smooth hover:border-primary hover:text-primary active:scale-[0.97]"
            >
              {sugerencia}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <Input
            data-ocid="asistente.input"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta…"
            aria-label="Pregunta al asistente"
            className="h-14 flex-1 rounded-xl text-base"
          />
          <Button
            type="submit"
            data-ocid="asistente.send_button"
            aria-label="Enviar pregunta"
            disabled={texto.trim().length === 0}
            className="size-14 shrink-0 rounded-xl bg-gradient-primary active:scale-[0.98]"
          >
            <Send className="size-5" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
}
