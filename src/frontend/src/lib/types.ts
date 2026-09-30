export type Talla =
  | "XS"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "XXL"
  | "28"
  | "30"
  | "32"
  | "34"
  | "Única";

export const TALLAS: Talla[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "28",
  "30",
  "32",
  "34",
  "Única",
];

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  categoria: string;
  tallas: Talla[];
  precio: number;
  costo: number;
  /** Stock independiente por talla. La clave es la talla. */
  stockPorTalla: Record<string, number>;
  stockMinimo: number;
  foto?: string;
  creadoEn: number;
  actualizadoEn: number;
}

/** Stock disponible de una talla concreta (0 si no está registrada). */
export function stockDeTalla(producto: Producto, talla: Talla): number {
  const valor = producto.stockPorTalla?.[talla];
  return Number.isFinite(valor) ? Math.max(0, valor) : 0;
}

/** Suma del stock de todas las tallas del producto. */
export function stockTotal(producto: Producto): number {
  return Object.values(producto.stockPorTalla ?? {}).reduce(
    (suma, valor) => suma + (Number.isFinite(valor) ? Math.max(0, valor) : 0),
    0,
  );
}

/**
 * Normaliza un producto leído del almacenamiento. Los registros antiguos solo
 * tenían un `stock` escalar: en ese caso se reparte entre sus tallas para no
 * perder datos al migrar.
 */
export function normalizarProducto(producto: Producto): Producto {
  const tallas = producto.tallas?.length
    ? producto.tallas
    : (["Única"] as Talla[]);
  const existente = producto.stockPorTalla;
  if (existente && typeof existente === "object") {
    const stockPorTalla: Record<string, number> = {};
    for (const talla of tallas) {
      const valor = existente[talla];
      stockPorTalla[talla] = Number.isFinite(valor) ? Math.max(0, valor) : 0;
    }
    return { ...producto, tallas, stockPorTalla };
  }
  // Registros antiguos: solo tenían un `stock` escalar.
  const legadoCrudo = (producto as Producto & { stock?: unknown }).stock;
  const legado =
    typeof legadoCrudo === "number" && Number.isFinite(legadoCrudo)
      ? Math.max(0, legadoCrudo)
      : 0;
  const stockPorTalla: Record<string, number> = {};
  for (const talla of tallas) stockPorTalla[talla] = legado;
  return { ...producto, tallas, stockPorTalla };
}

export type MetodoPago = "Yape" | "Plin" | "Transferencia" | "Efectivo";

export const METODOS_PAGO: MetodoPago[] = [
  "Yape",
  "Plin",
  "Transferencia",
  "Efectivo",
];

export interface Venta {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  talla: Talla;
  precioUnitario: number;
  total: number;
  metodoPago: MetodoPago;
  captura?: string;
  anulada?: boolean;
  fecha: number;
}

export interface Gasto {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  fecha: number;
}

export interface ResumenMes {
  ventas: number;
  gastos: number;
  ganancia: number;
}

export interface MensajeAsistente {
  id: string;
  autor: "usuario" | "asistente";
  texto: string;
  fecha: number;
}

export const CATEGORIAS_PRODUCTO = [
  "Polos",
  "Pantalones",
  "Camisas",
  "Vestidos",
  "Casacas",
  "Faldas",
  "Shorts",
  "Accesorios",
  "Otros",
] as const;

export const CATEGORIAS_GASTO = [
  "Compra de mercadería",
  "Alquiler",
  "Servicios",
  "Transporte",
  "Sueldos",
  "Marketing",
  "Otros",
] as const;
