import { create } from "zustand";
import {
  ALMACENES,
  ErrorAlmacenamiento,
  cargarTodo,
  eliminar,
  guardar,
  guardarVarios,
  vaciar,
} from "./db";
import { inicioMesActual, nuevoId } from "./format";
import {
  type Gasto,
  type Producto,
  type ResumenMes,
  type Venta,
  normalizarProducto,
  stockDeTalla,
} from "./types";

export interface NuevoProducto {
  nombre: string;
  sku: string;
  categoria: string;
  tallas: Producto["tallas"];
  precio: number;
  costo: number;
  stockPorTalla: Record<string, number>;
  stockMinimo: number;
  foto?: string;
}

export interface NuevaVenta {
  productoId: string;
  cantidad: number;
  talla: Venta["talla"];
  metodoPago: Venta["metodoPago"];
  captura?: string;
}

export interface NuevoGasto {
  descripcion: string;
  categoria: string;
  monto: number;
}

interface EstadoTienda {
  cargado: boolean;
  error: string | null;
  productos: Producto[];
  ventas: Venta[];
  gastos: Gasto[];
  cargar: () => Promise<void>;
  limpiarError: () => void;
  agregarProducto: (datos: NuevoProducto) => Promise<void>;
  actualizarProducto: (id: string, datos: NuevoProducto) => Promise<void>;
  eliminarProducto: (id: string) => Promise<void>;
  registrarVenta: (datos: NuevaVenta) => Promise<void>;
  anularVenta: (id: string) => Promise<void>;
  eliminarVenta: (id: string) => Promise<void>;
  agregarGasto: (datos: NuevoGasto) => Promise<void>;
  eliminarGasto: (id: string) => Promise<void>;
  reemplazarTodo: (datos: {
    productos: Producto[];
    ventas: Venta[];
    gastos: Gasto[];
  }) => Promise<void>;
  borrarTodo: () => Promise<void>;
}

function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorAlmacenamiento) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

export const useTienda = create<EstadoTienda>((set, get) => ({
  cargado: false,
  error: null,
  productos: [],
  ventas: [],
  gastos: [],

  cargar: async () => {
    try {
      const datos = await cargarTodo();
      set({ ...datos, cargado: true, error: null });
    } catch (error) {
      set({ cargado: true, error: mensajeDeError(error) });
    }
  },

  limpiarError: () => set({ error: null }),

  agregarProducto: async (datos) => {
    const ahora = Date.now();
    const producto: Producto = normalizarProducto({
      id: nuevoId(),
      ...datos,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    try {
      await guardar(ALMACENES.productos, producto);
      set((s) => ({ productos: [producto, ...s.productos], error: null }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  actualizarProducto: async (id, datos) => {
    const actual = get().productos.find((p) => p.id === id);
    if (!actual) return;
    const producto: Producto = normalizarProducto({
      ...actual,
      ...datos,
      id,
      actualizadoEn: Date.now(),
    });
    try {
      await guardar(ALMACENES.productos, producto);
      set((s) => ({
        productos: s.productos.map((p) => (p.id === id ? producto : p)),
        error: null,
      }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  eliminarProducto: async (id) => {
    try {
      await eliminar(ALMACENES.productos, id);
      set((s) => ({
        productos: s.productos.filter((p) => p.id !== id),
        error: null,
      }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  registrarVenta: async ({
    productoId,
    cantidad,
    talla,
    metodoPago,
    captura,
  }) => {
    const producto = get().productos.find((p) => p.id === productoId);
    if (!producto) {
      set({ error: "El producto ya no existe." });
      throw new Error("Producto no encontrado");
    }
    const disponible = stockDeTalla(producto, talla);
    if (cantidad > disponible) {
      set({ error: "No hay suficiente stock para esta talla." });
      throw new Error("Stock insuficiente");
    }
    const venta: Venta = {
      id: nuevoId(),
      productoId,
      productoNombre: producto.nombre,
      cantidad,
      talla,
      precioUnitario: producto.precio,
      total: producto.precio * cantidad,
      metodoPago,
      captura,
      fecha: Date.now(),
    };
    const productoActualizado: Producto = {
      ...producto,
      stockPorTalla: {
        ...producto.stockPorTalla,
        [talla]: disponible - cantidad,
      },
      actualizadoEn: Date.now(),
    };
    try {
      await guardarVarios(ALMACENES.ventas, [venta]);
      await guardar(ALMACENES.productos, productoActualizado);
      set((s) => ({
        ventas: [venta, ...s.ventas],
        productos: s.productos.map((p) =>
          p.id === productoId ? productoActualizado : p,
        ),
        error: null,
      }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  anularVenta: async (id) => {
    const venta = get().ventas.find((v) => v.id === id);
    if (!venta || venta.anulada) return;
    const producto = get().productos.find((p) => p.id === venta.productoId);
    const ventaAnulada: Venta = { ...venta, anulada: true };
    try {
      await guardar(ALMACENES.ventas, ventaAnulada);
      let productos = get().productos;
      if (producto) {
        const restaurado: Producto = {
          ...producto,
          stockPorTalla: {
            ...producto.stockPorTalla,
            [venta.talla]: stockDeTalla(producto, venta.talla) + venta.cantidad,
          },
          actualizadoEn: Date.now(),
        };
        await guardar(ALMACENES.productos, restaurado);
        productos = productos.map((p) =>
          p.id === restaurado.id ? restaurado : p,
        );
      }
      set((s) => ({
        ventas: s.ventas.map((v) => (v.id === id ? ventaAnulada : v)),
        productos,
        error: null,
      }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  eliminarVenta: async (id) => {
    const venta = get().ventas.find((v) => v.id === id);
    if (!venta) return;
    const producto = venta.anulada
      ? undefined
      : get().productos.find((p) => p.id === venta.productoId);
    try {
      await eliminar(ALMACENES.ventas, id);
      let productos = get().productos;
      if (producto) {
        const restaurado: Producto = {
          ...producto,
          stockPorTalla: {
            ...producto.stockPorTalla,
            [venta.talla]: stockDeTalla(producto, venta.talla) + venta.cantidad,
          },
          actualizadoEn: Date.now(),
        };
        await guardar(ALMACENES.productos, restaurado);
        productos = productos.map((p) =>
          p.id === restaurado.id ? restaurado : p,
        );
      }
      set((s) => ({
        ventas: s.ventas.filter((v) => v.id !== id),
        productos,
        error: null,
      }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  agregarGasto: async (datos) => {
    const gasto: Gasto = { id: nuevoId(), ...datos, fecha: Date.now() };
    try {
      await guardar(ALMACENES.gastos, gasto);
      set((s) => ({ gastos: [gasto, ...s.gastos], error: null }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  eliminarGasto: async (id) => {
    try {
      await eliminar(ALMACENES.gastos, id);
      set((s) => ({
        gastos: s.gastos.filter((g) => g.id !== id),
        error: null,
      }));
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  reemplazarTodo: async (datos) => {
    try {
      await vaciar(ALMACENES.productos);
      await vaciar(ALMACENES.ventas);
      await vaciar(ALMACENES.gastos);
      await guardarVarios(ALMACENES.productos, datos.productos);
      await guardarVarios(ALMACENES.ventas, datos.ventas);
      await guardarVarios(ALMACENES.gastos, datos.gastos);
      set({ ...datos, error: null });
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },

  borrarTodo: async () => {
    try {
      await vaciar(ALMACENES.productos);
      await vaciar(ALMACENES.ventas);
      await vaciar(ALMACENES.gastos);
      set({ productos: [], ventas: [], gastos: [], error: null });
    } catch (error) {
      set({ error: mensajeDeError(error) });
      throw error;
    }
  },
}));

/** Calcula el resumen del mes en curso a partir del estado. */
export function calcularResumen(ventas: Venta[], gastos: Gasto[]): ResumenMes {
  const inicio = inicioMesActual();
  const ventasMes = ventas
    .filter((v) => v.fecha >= inicio && !v.anulada)
    .reduce((suma, v) => suma + v.total, 0);
  const gastosMes = gastos
    .filter((g) => g.fecha >= inicio)
    .reduce((suma, g) => suma + g.monto, 0);
  return {
    ventas: ventasMes,
    gastos: gastosMes,
    ganancia: ventasMes - gastosMes,
  };
}
