import { describe, expect, it } from "vitest";

import { gastosACsv, productosACsv, ventasACsv } from "@/lib/csv";
import type { Gasto, Producto, Venta } from "@/lib/types";

const producto: Producto = {
  id: "p1",
  nombre: "Pantalón clásico",
  sku: "PAN-001",
  categoria: "Pantalones",
  tallas: ["28", "30"],
  precio: 89.9,
  costo: 45,
  stockPorTalla: { "28": 3, "30": 1 },
  stockMinimo: 2,
  creadoEn: 0,
  actualizadoEn: 0,
};

const venta: Venta = {
  id: "v1",
  productoId: "p1",
  productoNombre: "Pantalón clásico",
  cantidad: 2,
  talla: "28",
  precioUnitario: 89.9,
  total: 179.8,
  metodoPago: "Yape",
  fecha: new Date(2026, 8, 12, 10, 30).getTime(),
};

const gasto: Gasto = {
  id: "g1",
  descripcion: "Compra de tela",
  categoria: "Mercadería",
  monto: 120,
  fecha: new Date(2026, 8, 12).getTime(),
};

describe("productosACsv", () => {
  it("incluye encabezados con tildes correctas", () => {
    const csv = productosACsv([producto]);
    expect(csv.split("\n")[0]).toBe(
      "Nombre,SKU,Categoría,Tallas,Precio,Costo,Stock total,Stock por talla,Stock mínimo",
    );
  });

  it("exporta el stock por talla y el total", () => {
    const csv = productosACsv([producto]);
    expect(csv).toContain("Pantalón clásico");
    expect(csv).toContain("28:3 30:1");
    expect(csv).toContain("4");
  });
});

describe("ventasACsv", () => {
  it("exporta fecha, producto, talla, cantidad y total", () => {
    const csv = ventasACsv([venta]);
    expect(csv.split("\n")[0]).toBe(
      "Fecha,Producto,Talla,Cantidad,Precio unitario,Total",
    );
    expect(csv).toContain("Pantalón clásico");
    expect(csv).toContain("179.80");
  });
});

describe("gastosACsv", () => {
  it("exporta descripción y monto con tildes correctas", () => {
    const csv = gastosACsv([gasto]);
    expect(csv.split("\n")[0]).toBe("Fecha,Descripción,Categoría,Monto");
    expect(csv).toContain("Compra de tela");
    expect(csv).toContain("120.00");
  });

  it("escapa valores que contienen comas", () => {
    const csv = gastosACsv([{ ...gasto, descripcion: "Tela, hilo y botones" }]);
    expect(csv).toContain('"Tela, hilo y botones"');
  });
});
