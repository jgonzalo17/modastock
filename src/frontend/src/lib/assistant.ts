import { soles } from "./format";
import { type Gasto, type Producto, type Venta, stockTotal } from "./types";

export interface ContextoAsistente {
  productos: Producto[];
  ventas: Venta[];
  gastos: Gasto[];
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function inicioMes(): number {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
}

function inicioDia(): number {
  const ahora = new Date();
  return new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  ).getTime();
}

function contiene(texto: string, ...claves: string[]): boolean {
  return claves.some((clave) => texto.includes(clave));
}

/**
 * Asistente local: responde en español usando solo los datos guardados en el
 * dispositivo. Funciona sin conexión y no envía información a ningún servidor.
 */
export function responder(pregunta: string, ctx: ContextoAsistente): string {
  const texto = normalizar(pregunta);
  if (!texto) {
    return "Escribe una pregunta sobre tu inventario, ventas o gastos.";
  }

  const { productos, ventas, gastos } = ctx;
  const desdeMes = inicioMes();
  const ventasMes = ventas.filter((v) => v.fecha >= desdeMes);
  const gastosMes = gastos.filter((g) => g.fecha >= desdeMes);
  const totalVentasMes = ventasMes.reduce((s, v) => s + v.total, 0);
  const totalGastosMes = gastosMes.reduce((s, g) => s + g.monto, 0);
  const gananciaMes = totalVentasMes - totalGastosMes;

  if (contiene(texto, "hola", "buenas", "buenos dias", "que puedes")) {
    return "¡Hola! Soy tu asistente de tienda. Puedo decirte cuánto vendiste, cuánto gastaste, cuál es tu ganancia del mes, qué productos tienen poco stock o cuánto vale tu inventario. ¿Qué necesitas saber?";
  }

  if (contiene(texto, "ganancia", "utilidad", "gane", "ganancia del mes")) {
    const signo = gananciaMes < 0 ? "una pérdida" : "una ganancia";
    return `Este mes llevas ${soles(totalVentasMes)} en ventas y ${soles(totalGastosMes)} en gastos, es decir ${signo} de ${soles(Math.abs(gananciaMes))}.`;
  }

  if (contiene(texto, "gasto", "gaste", "egreso")) {
    if (gastosMes.length === 0) {
      return "Todavía no registraste gastos este mes.";
    }
    const mayor = [...gastosMes].sort((a, b) => b.monto - a.monto)[0];
    return `Este mes registraste ${gastosMes.length} gasto(s) por un total de ${soles(totalGastosMes)}. El mayor fue "${mayor.descripcion}" con ${soles(mayor.monto)}.`;
  }

  if (contiene(texto, "venta", "vendi", "ingreso", "factur")) {
    if (ventasMes.length === 0) {
      return "Todavía no registraste ventas este mes.";
    }
    const hoy = ventas.filter((v) => v.fecha >= inicioDia());
    const totalHoy = hoy.reduce((s, v) => s + v.total, 0);
    return `Este mes llevas ${soles(totalVentasMes)} en ${ventasMes.length} venta(s). Hoy vendiste ${soles(totalHoy)}.`;
  }

  if (
    contiene(texto, "stock bajo", "poco stock", "agotar", "reponer", "minimo")
  ) {
    const bajos = productos.filter((p) => stockTotal(p) <= p.stockMinimo);
    if (bajos.length === 0) {
      return "Ningún producto está por debajo de su stock mínimo. Todo en orden.";
    }
    const lista = bajos
      .slice(0, 5)
      .map((p) => `${p.nombre} (${stockTotal(p)})`)
      .join(", ");
    return `Tienes ${bajos.length} producto(s) con stock bajo: ${lista}. Conviene reponerlos pronto.`;
  }

  if (contiene(texto, "agotado", "sin stock", "no hay")) {
    const agotados = productos.filter((p) => stockTotal(p) <= 0);
    if (agotados.length === 0) {
      return "No tienes productos agotados por ahora.";
    }
    return `Tienes ${agotados.length} producto(s) agotado(s): ${agotados
      .slice(0, 5)
      .map((p) => p.nombre)
      .join(", ")}.`;
  }

  if (contiene(texto, "inventario", "valor", "cuanto vale", "capital")) {
    const valorVenta = productos.reduce(
      (s, p) => s + p.precio * stockTotal(p),
      0,
    );
    const valorCosto = productos.reduce(
      (s, p) => s + p.costo * stockTotal(p),
      0,
    );
    return `Tu inventario tiene ${productos.length} producto(s). Valor a precio de venta: ${soles(valorVenta)}. Valor a costo: ${soles(valorCosto)}.`;
  }

  if (
    contiene(texto, "cuantos productos", "productos tengo", "total productos")
  ) {
    return `Tienes ${productos.length} producto(s) registrado(s) en tu inventario.`;
  }

  if (contiene(texto, "mas vendido", "top", "mejor vendido", "popular")) {
    if (ventas.length === 0) {
      return "Aún no hay ventas registradas para calcular tus productos más vendidos.";
    }
    const conteo = new Map<string, number>();
    for (const v of ventas) {
      conteo.set(
        v.productoNombre,
        (conteo.get(v.productoNombre) ?? 0) + v.cantidad,
      );
    }
    const orden = [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `Tus productos más vendidos son: ${orden
      .map(([nombre, cantidad]) => `${nombre} (${cantidad} unidades)`)
      .join(", ")}.`;
  }

  if (contiene(texto, "ayuda", "que hago", "opciones", "puedes hacer")) {
    return "Puedo ayudarte con: ganancia del mes, total de ventas, total de gastos, productos con stock bajo, productos agotados, valor del inventario y tus productos más vendidos.";
  }

  return 'No estoy seguro de esa pregunta. Prueba con: "¿cuál es mi ganancia del mes?", "¿qué productos tienen stock bajo?" o "¿cuánto vale mi inventario?".';
}
