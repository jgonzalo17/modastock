import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Gasto, Producto, Venta } from "@/lib/types";

// Almacén en memoria que reemplaza IndexedDB para probar la lógica del store.
const almacenes: Record<string, Map<string, unknown>> = {
  productos: new Map(),
  ventas: new Map(),
  gastos: new Map(),
};

vi.mock("@/lib/db", () => {
  class ErrorAlmacenamiento extends Error {
    constructor(
      message: string,
      readonly causa: "cuota" | "desconocido" = "desconocido",
    ) {
      super(message);
      this.name = "ErrorAlmacenamiento";
    }
  }
  return {
    ErrorAlmacenamiento,
    ALMACENES: {
      productos: "productos",
      ventas: "ventas",
      gastos: "gastos",
    },
    listar: async (nombre: string) => [...almacenes[nombre].values()],
    guardar: async (nombre: string, valor: { id: string }) => {
      almacenes[nombre].set(valor.id, valor);
      return valor;
    },
    guardarVarios: async (nombre: string, valores: { id: string }[]) => {
      for (const valor of valores) almacenes[nombre].set(valor.id, valor);
    },
    eliminar: async (nombre: string, id: string) => {
      almacenes[nombre].delete(id);
    },
    vaciar: async (nombre: string) => {
      almacenes[nombre].clear();
    },
    cargarTodo: async () => ({
      productos: [...almacenes.productos.values()],
      ventas: [...almacenes.ventas.values()],
      gastos: [...almacenes.gastos.values()],
    }),
    usoAlmacenamiento: async () => null,
  };
});

import { calcularResumen, useTienda } from "@/lib/store";

function producto(parcial: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    nombre: "Jean azul",
    sku: "JEA-001",
    categoria: "Pantalones",
    tallas: ["30", "32"],
    precio: 100,
    costo: 50,
    stockPorTalla: { "30": 5, "32": 2 },
    stockMinimo: 2,
    creadoEn: 0,
    actualizadoEn: 0,
    ...parcial,
  };
}

function reiniciarEstado(productos: Producto[] = []) {
  for (const mapa of Object.values(almacenes)) mapa.clear();
  for (const p of productos) almacenes.productos.set(p.id, p);
  useTienda.setState({
    cargado: true,
    error: null,
    productos,
    ventas: [],
    gastos: [],
  });
}

beforeEach(() => {
  reiniciarEstado();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("calcularResumen", () => {
  it("suma ventas y gastos del mes y calcula la ganancia", () => {
    const ahora = Date.now();
    const ventas: Venta[] = [
      {
        id: "v1",
        productoId: "p1",
        productoNombre: "Jean azul",
        cantidad: 1,
        talla: "30",
        precioUnitario: 100,
        total: 100,
        metodoPago: "Yape",
        fecha: ahora,
      },
    ];
    const gastos: Gasto[] = [
      {
        id: "g1",
        descripcion: "Alquiler",
        categoria: "Alquiler",
        monto: 40,
        fecha: ahora,
      },
    ];
    expect(calcularResumen(ventas, gastos)).toEqual({
      ventas: 100,
      gastos: 40,
      ganancia: 60,
    });
  });

  it("ignora las ventas anuladas", () => {
    const ahora = Date.now();
    const ventas: Venta[] = [
      {
        id: "v1",
        productoId: "p1",
        productoNombre: "Jean azul",
        cantidad: 1,
        talla: "30",
        precioUnitario: 100,
        total: 100,
        metodoPago: "Yape",
        fecha: ahora,
        anulada: true,
      },
    ];
    expect(calcularResumen(ventas, []).ventas).toBe(0);
  });

  it("excluye movimientos de meses anteriores", () => {
    const mesPasado = new Date(2020, 0, 15).getTime();
    const ventas: Venta[] = [
      {
        id: "v1",
        productoId: "p1",
        productoNombre: "Jean azul",
        cantidad: 1,
        talla: "30",
        precioUnitario: 100,
        total: 100,
        metodoPago: "Yape",
        fecha: mesPasado,
      },
    ];
    expect(calcularResumen(ventas, []).ventas).toBe(0);
  });
});

describe("registrarVenta", () => {
  it("descuenta el stock de la talla elegida y registra la venta", async () => {
    reiniciarEstado([producto()]);
    await useTienda.getState().registrarVenta({
      productoId: "p1",
      cantidad: 2,
      talla: "30",
      metodoPago: "Yape",
    });
    const estado = useTienda.getState();
    expect(estado.ventas).toHaveLength(1);
    expect(estado.ventas[0].total).toBe(200);
    expect(estado.productos[0].stockPorTalla["30"]).toBe(3);
    // La otra talla no se toca.
    expect(estado.productos[0].stockPorTalla["32"]).toBe(2);
  });

  it("no guarda la venta cuando no alcanza el stock", async () => {
    reiniciarEstado([producto()]);
    await expect(
      useTienda.getState().registrarVenta({
        productoId: "p1",
        cantidad: 99,
        talla: "30",
        metodoPago: "Yape",
      }),
    ).rejects.toThrow("Stock insuficiente");
    const estado = useTienda.getState();
    expect(estado.ventas).toHaveLength(0);
    expect(estado.productos[0].stockPorTalla["30"]).toBe(5);
    expect(estado.error).toBe("No hay suficiente stock para esta talla.");
  });
});

describe("anularVenta", () => {
  it("devuelve el stock y marca la venta como anulada", async () => {
    reiniciarEstado([producto()]);
    await useTienda.getState().registrarVenta({
      productoId: "p1",
      cantidad: 3,
      talla: "30",
      metodoPago: "Yape",
    });
    const ventaId = useTienda.getState().ventas[0].id;
    await useTienda.getState().anularVenta(ventaId);
    const estado = useTienda.getState();
    expect(estado.ventas[0].anulada).toBe(true);
    expect(estado.productos[0].stockPorTalla["30"]).toBe(5);
  });
});

describe("agregarGasto / eliminarGasto", () => {
  it("registra y elimina un gasto", async () => {
    reiniciarEstado();
    await useTienda.getState().agregarGasto({
      descripcion: "Alquiler",
      categoria: "Alquiler",
      monto: 500,
    });
    expect(useTienda.getState().gastos).toHaveLength(1);
    const id = useTienda.getState().gastos[0].id;
    await useTienda.getState().eliminarGasto(id);
    expect(useTienda.getState().gastos).toHaveLength(0);
  });
});
