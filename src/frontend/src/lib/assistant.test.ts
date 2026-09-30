import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { responder } from "@/lib/assistant";
import type { Gasto, Producto, Venta } from "@/lib/types";

const AHORA = new Date(2026, 8, 15, 12, 0, 0).getTime();

function producto(parcial: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    nombre: "Jean azul",
    sku: "JEA-001",
    categoria: "Pantalones",
    tallas: ["30", "32"],
    precio: 100,
    costo: 50,
    stockPorTalla: { "30": 4, "32": 1 },
    stockMinimo: 2,
    creadoEn: AHORA,
    actualizadoEn: AHORA,
    ...parcial,
  };
}

const venta: Venta = {
  id: "v1",
  productoId: "p1",
  productoNombre: "Jean azul",
  cantidad: 1,
  talla: "30",
  precioUnitario: 100,
  total: 100,
  metodoPago: "Yape",
  fecha: AHORA,
};

const gasto: Gasto = {
  id: "g1",
  descripcion: "Alquiler",
  categoria: "Alquiler",
  monto: 40,
  fecha: AHORA,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("responder", () => {
  it("responde una consulta de stock bajo con los datos reales", () => {
    const respuesta = responder("¿qué productos tienen stock bajo?", {
      productos: [producto({ stockPorTalla: { "30": 1, "32": 1 } })],
      ventas: [],
      gastos: [],
    });
    expect(respuesta).toContain("Jean azul");
    expect(respuesta).toContain("stock bajo");
  });

  it("responde la ganancia del mes con ventas y gastos reales", () => {
    const respuesta = responder("¿cuál es mi ganancia del mes?", {
      productos: [],
      ventas: [venta],
      gastos: [gasto],
    });
    expect(respuesta).toContain("ganancia");
    expect(respuesta).toContain("100.00");
    expect(respuesta).toContain("40.00");
  });

  it("informa una pérdida cuando los gastos superan las ventas", () => {
    const respuesta = responder("ganancia", {
      productos: [],
      ventas: [],
      gastos: [gasto],
    });
    expect(respuesta).toContain("pérdida");
  });

  it("responde el valor del inventario", () => {
    const respuesta = responder("¿cuánto vale mi capital?", {
      productos: [producto()],
      ventas: [],
      gastos: [],
    });
    expect(respuesta).toContain("500.00");
    expect(respuesta).toContain("250.00");
  });

  it("pide una pregunta cuando el texto está vacío", () => {
    expect(
      responder("   ", { productos: [], ventas: [], gastos: [] }),
    ).toContain("Escribe una pregunta");
  });

  it("ofrece ayuda ante una pregunta desconocida", () => {
    const respuesta = responder("xyzzy", {
      productos: [],
      ventas: [],
      gastos: [],
    });
    expect(respuesta).toContain("No estoy seguro");
  });
});
