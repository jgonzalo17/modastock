import type { Gasto, Producto, Venta } from "@/lib/types";

/**
 * Almacén en memoria que reemplaza IndexedDB en las pruebas de componentes.
 * Cada archivo de prueba llama a `vi.mock("@/lib/db", ...)` con `crearMockDb`.
 */
export const almacenes: Record<string, Map<string, unknown>> = {
  productos: new Map(),
  ventas: new Map(),
  gastos: new Map(),
};

export function reiniciarAlmacenes(
  datos: {
    productos?: Producto[];
    ventas?: Venta[];
    gastos?: Gasto[];
  } = {},
): void {
  for (const mapa of Object.values(almacenes)) mapa.clear();
  for (const p of datos.productos ?? []) almacenes.productos.set(p.id, p);
  for (const v of datos.ventas ?? []) almacenes.ventas.set(v.id, v);
  for (const g of datos.gastos ?? []) almacenes.gastos.set(g.id, g);
}

export function crearMockDb() {
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
}
