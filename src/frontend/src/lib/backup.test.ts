import { describe, expect, it } from "vitest";

import { crearRespaldo, leerRespaldo } from "@/lib/backup";
import type { Gasto, Producto, Venta } from "@/lib/types";

const producto: Producto = {
  id: "p1",
  nombre: "Polo básico",
  sku: "POL-001",
  categoria: "Polos",
  tallas: ["S", "M"],
  precio: 39.9,
  costo: 18,
  stockPorTalla: { S: 2, M: 5 },
  stockMinimo: 2,
  creadoEn: 0,
  actualizadoEn: 0,
};

const venta: Venta = {
  id: "v1",
  productoId: "p1",
  productoNombre: "Polo básico",
  cantidad: 1,
  talla: "S",
  precioUnitario: 39.9,
  total: 39.9,
  metodoPago: "Efectivo",
  fecha: 1,
};

const gasto: Gasto = {
  id: "g1",
  descripcion: "Alquiler",
  categoria: "Alquiler",
  monto: 500,
  fecha: 1,
};

describe("crearRespaldo", () => {
  it("marca el respaldo con la app y la versión", () => {
    const respaldo = crearRespaldo({
      productos: [producto],
      ventas: [venta],
      gastos: [gasto],
    });
    expect(respaldo.app).toBe("tienda-denim");
    expect(respaldo.version).toBe(1);
    expect(respaldo.productos).toHaveLength(1);
    expect(respaldo.ventas).toHaveLength(1);
    expect(respaldo.gastos).toHaveLength(1);
  });
});

describe("leerRespaldo", () => {
  it("restaura un respaldo válido", () => {
    const texto = JSON.stringify(
      crearRespaldo({
        productos: [producto],
        ventas: [venta],
        gastos: [gasto],
      }),
    );
    const datos = leerRespaldo(texto);
    expect(datos.productos[0].nombre).toBe("Polo básico");
    expect(datos.ventas[0].total).toBe(39.9);
    expect(datos.gastos[0].monto).toBe(500);
  });

  it("rechaza un JSON inválido", () => {
    expect(() => leerRespaldo("no es json")).toThrow(
      "El archivo no es un respaldo válido.",
    );
  });

  it("rechaza un archivo de otra aplicación", () => {
    const texto = JSON.stringify({
      app: "otra-app",
      productos: [],
      ventas: [],
      gastos: [],
    });
    expect(() => leerRespaldo(texto)).toThrow(
      "El archivo no pertenece a esta aplicación.",
    );
  });

  it("rechaza un respaldo incompleto", () => {
    const texto = JSON.stringify({ app: "tienda-denim", productos: [] });
    expect(() => leerRespaldo(texto)).toThrow(
      "El respaldo está incompleto o dañado.",
    );
  });
});
