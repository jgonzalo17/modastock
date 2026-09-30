import {
  type Gasto,
  type Producto,
  type Venta,
  normalizarProducto,
} from "./types";

export interface Respaldo {
  app: "tienda-denim";
  version: 1;
  exportadoEn: string;
  productos: Producto[];
  ventas: Venta[];
  gastos: Gasto[];
}

export function crearRespaldo(datos: {
  productos: Producto[];
  ventas: Venta[];
  gastos: Gasto[];
}): Respaldo {
  return {
    app: "tienda-denim",
    version: 1,
    exportadoEn: new Date().toISOString(),
    ...datos,
  };
}

function esArrayDe<T>(valor: unknown): valor is T[] {
  return Array.isArray(valor);
}

/** Valida y normaliza un respaldo importado. Lanza si el formato es inválido. */
export function leerRespaldo(texto: string): {
  productos: Producto[];
  ventas: Venta[];
  gastos: Gasto[];
} {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no es un respaldo válido.");
  }
  if (typeof datos !== "object" || datos === null) {
    throw new Error("El archivo no es un respaldo válido.");
  }
  const obj = datos as Partial<Respaldo>;
  if (obj.app !== "tienda-denim") {
    throw new Error("El archivo no pertenece a esta aplicación.");
  }
  if (
    !esArrayDe<Producto>(obj.productos) ||
    !esArrayDe<Venta>(obj.ventas) ||
    !esArrayDe<Gasto>(obj.gastos)
  ) {
    throw new Error("El respaldo está incompleto o dañado.");
  }
  return {
    productos: obj.productos.map(normalizarProducto),
    ventas: obj.ventas,
    gastos: obj.gastos,
  };
}
