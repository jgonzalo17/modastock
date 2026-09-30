import {
  type Gasto,
  type Producto,
  type Venta,
  normalizarProducto,
} from "./types";

const NOMBRE_DB = "tienda-denim";
const VERSION_DB = 1;

export const ALMACENES = {
  productos: "productos",
  ventas: "ventas",
  gastos: "gastos",
} as const;

export type NombreAlmacen = (typeof ALMACENES)[keyof typeof ALMACENES];

export class ErrorAlmacenamiento extends Error {
  constructor(
    message: string,
    readonly causa: "cuota" | "desconocido" = "desconocido",
  ) {
    super(message);
    this.name = "ErrorAlmacenamiento";
  }
}

let promesaDb: Promise<IDBDatabase> | null = null;

function abrirDb(): Promise<IDBDatabase> {
  if (promesaDb) return promesaDb;
  promesaDb = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new ErrorAlmacenamiento(
          "Este dispositivo no permite guardar datos localmente.",
        ),
      );
      return;
    }
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(ALMACENES.productos)) {
        db.createObjectStore(ALMACENES.productos, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ALMACENES.ventas)) {
        const store = db.createObjectStore(ALMACENES.ventas, { keyPath: "id" });
        store.createIndex("fecha", "fecha");
      }
      if (!db.objectStoreNames.contains(ALMACENES.gastos)) {
        const store = db.createObjectStore(ALMACENES.gastos, { keyPath: "id" });
        store.createIndex("fecha", "fecha");
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () =>
      reject(
        new ErrorAlmacenamiento(
          "No se pudo abrir el almacenamiento del dispositivo.",
        ),
      );
  });
  return promesaDb;
}

function esErrorCuota(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED"
  );
}

function envolverError(error: unknown): ErrorAlmacenamiento {
  if (error instanceof ErrorAlmacenamiento) return error;
  if (esErrorCuota(error)) {
    return new ErrorAlmacenamiento(
      "El almacenamiento del dispositivo está lleno. Libera espacio o elimina fotos antiguas.",
      "cuota",
    );
  }
  return new ErrorAlmacenamiento(
    "No se pudieron guardar los datos en el dispositivo.",
  );
}

async function conAlmacen<T>(
  nombre: NombreAlmacen,
  modo: IDBTransactionMode,
  operacion: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  try {
    const db = await abrirDb();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(nombre, modo);
      const store = tx.objectStore(nombre);
      const solicitud = operacion(store);
      solicitud.onsuccess = () => resolve(solicitud.result);
      solicitud.onerror = () => reject(solicitud.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    throw envolverError(error);
  }
}

export async function listar<T>(nombre: NombreAlmacen): Promise<T[]> {
  const filas = await conAlmacen<T[]>(
    nombre,
    "readonly",
    (store) => store.getAll() as IDBRequest<T[]>,
  );
  return filas;
}

export async function guardar<T>(nombre: NombreAlmacen, valor: T): Promise<T> {
  await conAlmacen(nombre, "readwrite", (store) => store.put(valor));
  return valor;
}

export async function guardarVarios<T>(
  nombre: NombreAlmacen,
  valores: T[],
): Promise<void> {
  if (valores.length === 0) return;
  try {
    const db = await abrirDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(nombre, "readwrite");
      const store = tx.objectStore(nombre);
      for (const valor of valores) store.put(valor);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    throw envolverError(error);
  }
}

export async function eliminar(
  nombre: NombreAlmacen,
  id: string,
): Promise<void> {
  await conAlmacen(nombre, "readwrite", (store) => store.delete(id));
}

export async function vaciar(nombre: NombreAlmacen): Promise<void> {
  await conAlmacen(nombre, "readwrite", (store) => store.clear());
}

export async function cargarTodo(): Promise<{
  productos: Producto[];
  ventas: Venta[];
  gastos: Gasto[];
}> {
  const [productos, ventas, gastos] = await Promise.all([
    listar<Producto>(ALMACENES.productos),
    listar<Venta>(ALMACENES.ventas),
    listar<Gasto>(ALMACENES.gastos),
  ]);
  return { productos: productos.map(normalizarProducto), ventas, gastos };
}

/** Estima el espacio usado por la app en el dispositivo. */
export async function usoAlmacenamiento(): Promise<{
  usado: number;
  disponible: number;
} | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const estimado = await navigator.storage.estimate();
    return {
      usado: estimado.usage ?? 0,
      disponible: estimado.quota ?? 0,
    };
  } catch {
    return null;
  }
}
