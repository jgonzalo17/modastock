import { describe, expect, it } from "vitest";

import {
  type Producto,
  normalizarProducto,
  stockDeTalla,
  stockTotal,
} from "@/lib/types";

function producto(parcial: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    nombre: "Pantalón denim",
    sku: "PAN-001",
    categoria: "Pantalones",
    tallas: ["28", "30"],
    precio: 89.9,
    costo: 45,
    stockPorTalla: { "28": 3, "30": 0 },
    stockMinimo: 2,
    creadoEn: 0,
    actualizadoEn: 0,
    ...parcial,
  };
}

describe("stockDeTalla", () => {
  it("devuelve el stock de la talla indicada", () => {
    expect(stockDeTalla(producto(), "28")).toBe(3);
  });

  it("devuelve 0 para una talla no registrada", () => {
    expect(stockDeTalla(producto(), "XL")).toBe(0);
  });

  it("nunca devuelve negativos", () => {
    expect(stockDeTalla(producto({ stockPorTalla: { "28": -5 } }), "28")).toBe(
      0,
    );
  });
});

describe("stockTotal", () => {
  it("suma el stock de todas las tallas", () => {
    expect(stockTotal(producto())).toBe(3);
  });

  it("devuelve 0 sin tallas registradas", () => {
    expect(stockTotal(producto({ stockPorTalla: {} }))).toBe(0);
  });
});

describe("normalizarProducto", () => {
  it("conserva el stock por talla existente y lo limita a las tallas", () => {
    const normalizado = normalizarProducto(
      producto({ stockPorTalla: { "28": 4, "30": 2, XL: 9 } }),
    );
    expect(normalizado.stockPorTalla).toEqual({ "28": 4, "30": 2 });
  });

  it("migra un stock escalar antiguo repartiéndolo entre las tallas", () => {
    const base = producto();
    const antiguo = {
      ...base,
      stockPorTalla: undefined,
      stock: 5,
    } as unknown as Producto & { stock: number };
    const normalizado = normalizarProducto(antiguo);
    expect(normalizado.stockPorTalla).toEqual({ "28": 5, "30": 5 });
  });

  it("usa la talla Única cuando no hay tallas", () => {
    const normalizado = normalizarProducto(
      producto({ tallas: [], stockPorTalla: {} }),
    );
    expect(normalizado.tallas).toEqual(["Única"]);
    expect(normalizado.stockPorTalla).toEqual({ Única: 0 });
  });
});
