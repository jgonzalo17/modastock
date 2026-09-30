import { describe, expect, it } from "vitest";

import { fechaCorta, inicioMesActual, parsearMonto, soles } from "@/lib/format";

describe("soles", () => {
  it("formatea montos en soles peruanos", () => {
    // Intl usa un espacio no separable entre S/ y el número.
    expect(soles(1234.5).replace(/\u00a0/g, " ")).toBe("S/ 1,234.50");
    expect(soles(0).replace(/\u00a0/g, " ")).toBe("S/ 0.00");
  });

  it("trata valores no finitos como cero", () => {
    expect(soles(Number.NaN).replace(/\u00a0/g, " ")).toBe("S/ 0.00");
  });
});

describe("parsearMonto", () => {
  it("acepta punto decimal", () => {
    expect(parsearMonto("89.90")).toBeCloseTo(89.9);
  });

  it("acepta coma decimal", () => {
    expect(parsearMonto("120,50")).toBeCloseTo(120.5);
  });

  it("ignora símbolos de moneda", () => {
    expect(parsearMonto("S/ 45")).toBe(45);
  });

  it("devuelve 0 para texto vacío o inválido", () => {
    expect(parsearMonto("")).toBe(0);
    expect(parsearMonto("abc")).toBe(0);
  });
});

describe("fechaCorta", () => {
  it("devuelve un guion para fechas inválidas", () => {
    expect(fechaCorta(Number.NaN)).toBe("—");
  });

  it("formatea una fecha válida en español", () => {
    const texto = fechaCorta(new Date(2026, 8, 12).getTime());
    expect(texto).toContain("2026");
    expect(texto).toContain("12");
  });
});

describe("inicioMesActual", () => {
  it("cae en el primer día del mes a medianoche", () => {
    const inicio = new Date(inicioMesActual());
    const ahora = new Date();
    expect(inicio.getFullYear()).toBe(ahora.getFullYear());
    expect(inicio.getMonth()).toBe(ahora.getMonth());
    expect(inicio.getDate()).toBe(1);
    expect(inicio.getHours()).toBe(0);
    expect(inicio.getMinutes()).toBe(0);
  });
});
