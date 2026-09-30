import {
  type Gasto,
  type Producto,
  type Venta,
  stockDeTalla,
  stockTotal,
} from "./types";

function escapar(valor: string | number): string {
  const texto = String(valor ?? "");
  if (/[",\n;]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function aCsv(encabezados: string[], filas: (string | number)[][]): string {
  const lineas = [encabezados.join(",")];
  for (const fila of filas) lineas.push(fila.map(escapar).join(","));
  return lineas.join("\n");
}

export function productosACsv(productos: Producto[]): string {
  return aCsv(
    [
      "Nombre",
      "SKU",
      "Categoría",
      "Tallas",
      "Precio",
      "Costo",
      "Stock total",
      "Stock por talla",
      "Stock mínimo",
    ],
    productos.map((p) => [
      p.nombre,
      p.sku,
      p.categoria,
      p.tallas.join(" "),
      p.precio.toFixed(2),
      p.costo.toFixed(2),
      stockTotal(p),
      p.tallas.map((t) => `${t}:${stockDeTalla(p, t)}`).join(" "),
      p.stockMinimo,
    ]),
  );
}

export function ventasACsv(ventas: Venta[]): string {
  return aCsv(
    ["Fecha", "Producto", "Talla", "Cantidad", "Precio unitario", "Total"],
    ventas.map((v) => [
      new Date(v.fecha).toISOString(),
      v.productoNombre,
      v.talla,
      v.cantidad,
      v.precioUnitario.toFixed(2),
      v.total.toFixed(2),
    ]),
  );
}

export function gastosACsv(gastos: Gasto[]): string {
  return aCsv(
    ["Fecha", "Descripción", "Categoría", "Monto"],
    gastos.map((g) => [
      new Date(g.fecha).toISOString(),
      g.descripcion,
      g.categoria,
      g.monto.toFixed(2),
    ]),
  );
}

export function descargarCsv(nombreArchivo: string, contenido: string): void {
  const blob = new Blob([`\uFEFF${contenido}`], {
    type: "text/csv;charset=utf-8;",
  });
  descargarBlob(nombreArchivo, blob);
}

export function descargarBlob(nombreArchivo: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
