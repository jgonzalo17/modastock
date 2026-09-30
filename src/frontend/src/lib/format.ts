const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto en soles: S/ 1,234.50 */
export function soles(monto: number): string {
  return formatoSoles.format(Number.isFinite(monto) ? monto : 0);
}

/** Formatea una fecha corta en español: 12 set 2026 */
export function fechaCorta(timestamp: number): string {
  const fecha = new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Formatea fecha y hora: 12 set, 14:30 */
export function fechaHora(timestamp: number): string {
  const fecha = new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-PE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Nombre del mes actual capitalizado: Septiembre 2026 */
export function nombreMesActual(): string {
  const texto = new Date().toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Convierte un texto de monto a número, tolerando comas. */
export function parsearMonto(texto: string): number {
  const limpio = texto.replace(/[^\d.,-]/g, "").replace(",", ".");
  const valor = Number.parseFloat(limpio);
  return Number.isFinite(valor) ? valor : 0;
}

/** Genera un identificador único local. */
export function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Inicio del mes actual en milisegundos. */
export function inicioMesActual(): number {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
}
