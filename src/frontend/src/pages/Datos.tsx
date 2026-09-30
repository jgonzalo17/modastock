import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { crearRespaldo, leerRespaldo } from "@/lib/backup";
import {
  descargarBlob,
  descargarCsv,
  gastosACsv,
  productosACsv,
  ventasACsv,
} from "@/lib/csv";
import { usoAlmacenamiento } from "@/lib/db";
import { useTienda } from "@/lib/store";
import {
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function formatearBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const unidades = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    unidades.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
}

export function Datos() {
  const productos = useTienda((s) => s.productos);
  const ventas = useTienda((s) => s.ventas);
  const gastos = useTienda((s) => s.gastos);
  const reemplazarTodo = useTienda((s) => s.reemplazarTodo);
  const borrarTodo = useTienda((s) => s.borrarTodo);

  const [uso, setUso] = useState<{ usado: number; disponible: number } | null>(
    null,
  );
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const inputImportar = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void usoAlmacenamiento().then(setUso);
  }, []);

  function exportarRespaldo() {
    const respaldo = crearRespaldo({ productos, ventas, gastos });
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], {
      type: "application/json",
    });
    descargarBlob(
      `respaldo-tienda-${new Date().toISOString().slice(0, 10)}.json`,
      blob,
    );
    toast.success("Respaldo descargado.");
  }

  async function importarRespaldo(archivo: File | undefined) {
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = leerRespaldo(texto);
      await reemplazarTodo(datos);
      toast.success("Respaldo restaurado correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo importar el respaldo.",
      );
    } finally {
      if (inputImportar.current) inputImportar.current.value = "";
    }
  }

  async function confirmarBorrar() {
    try {
      await borrarTodo();
      toast.success("Todos los datos fueron eliminados.");
    } catch {
      toast.error("No se pudieron eliminar los datos.");
    } finally {
      setConfirmarBorrado(false);
    }
  }

  const porcentaje =
    uso && uso.disponible > 0
      ? Math.min(100, Math.round((uso.usado / uso.disponible) * 100))
      : 0;

  return (
    <div data-ocid="datos.page" className="space-y-5 px-4 pt-4">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Datos y respaldo
        </h1>
        <p className="text-sm text-muted-foreground">
          Todo se guarda en tu celular. Exporta un respaldo para no perder nada.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"
          >
            <HardDrive className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-foreground">
              Almacenamiento del dispositivo
            </h2>
            <p className="text-xs text-muted-foreground">
              {uso
                ? `${formatearBytes(uso.usado)} usados de ${formatearBytes(uso.disponible)}`
                : "Calculando espacio disponible…"}
            </p>
          </div>
        </div>
        {uso && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-primary transition-smooth"
              style={{ width: `${Math.max(2, porcentaje)}%` }}
            />
          </div>
        )}
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted px-2 py-2">
            <dt className="text-xs text-muted-foreground">Productos</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-foreground">
              {productos.length}
            </dd>
          </div>
          <div className="rounded-xl bg-muted px-2 py-2">
            <dt className="text-xs text-muted-foreground">Ventas</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-foreground">
              {ventas.length}
            </dd>
          </div>
          <div className="rounded-xl bg-muted px-2 py-2">
            <dt className="text-xs text-muted-foreground">Gastos</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-foreground">
              {gastos.length}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Respaldo completo
        </h2>
        <p className="text-sm text-muted-foreground">
          Guarda un archivo con todos tus productos, ventas y gastos, o restaura
          uno existente.
        </p>
        <div className="grid gap-3">
          <Button
            type="button"
            data-ocid="datos.export_button"
            onClick={exportarRespaldo}
            className="h-14 rounded-xl bg-gradient-primary text-base font-semibold active:scale-[0.98]"
          >
            <Download className="size-5" aria-hidden="true" />
            Descargar respaldo
          </Button>
          <input
            ref={inputImportar}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => void importarRespaldo(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            data-ocid="datos.import_button"
            onClick={() => inputImportar.current?.click()}
            className="h-14 rounded-xl border-accent text-base font-semibold text-foreground active:scale-[0.98]"
          >
            <Upload className="size-5" aria-hidden="true" />
            Restaurar respaldo
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Exportar a Excel
        </h2>
        <p className="text-sm text-muted-foreground">
          Descarga tus datos en formato CSV para abrirlos en Excel o Google
          Sheets.
        </p>
        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            data-ocid="datos.export_productos_button"
            disabled={productos.length === 0}
            onClick={() => {
              descargarCsv("productos.csv", productosACsv(productos));
              toast.success("Productos exportados.");
            }}
            className="h-12 justify-start rounded-xl"
          >
            <Database className="size-5" aria-hidden="true" />
            Productos ({productos.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            data-ocid="datos.export_ventas_button"
            disabled={ventas.length === 0}
            onClick={() => {
              descargarCsv("ventas.csv", ventasACsv(ventas));
              toast.success("Ventas exportadas.");
            }}
            className="h-12 justify-start rounded-xl"
          >
            <Database className="size-5" aria-hidden="true" />
            Ventas ({ventas.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            data-ocid="datos.export_gastos_button"
            disabled={gastos.length === 0}
            onClick={() => {
              descargarCsv("gastos.csv", gastosACsv(gastos));
              toast.success("Gastos exportados.");
            }}
            className="h-12 justify-start rounded-xl"
          >
            <Database className="size-5" aria-hidden="true" />
            Gastos ({gastos.length})
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="size-5 text-destructive"
            aria-hidden="true"
          />
          <h2 className="font-display text-base font-semibold text-foreground">
            Zona de riesgo
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Elimina permanentemente todos los productos, ventas y gastos de este
          dispositivo. Descarga un respaldo antes de continuar.
        </p>
        <Button
          type="button"
          variant="destructive"
          data-ocid="datos.delete_all_button"
          onClick={() => setConfirmarBorrado(true)}
          className="h-12 w-full rounded-xl font-semibold"
        >
          <Trash2 className="size-5" aria-hidden="true" />
          Borrar todos los datos
        </Button>
      </section>

      <Dialog open={confirmarBorrado} onOpenChange={setConfirmarBorrado}>
        <DialogContent
          data-ocid="datos.delete_modal"
          className="rounded-2xl sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              ¿Borrar todos los datos?
            </DialogTitle>
            <DialogDescription>
              Se eliminarán {productos.length} producto(s), {ventas.length}{" "}
              venta(s) y {gastos.length} gasto(s). Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-ocid="datos.delete_cancel_button"
              onClick={() => setConfirmarBorrado(false)}
              className="h-12 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="datos.delete_confirm_button"
              onClick={() => void confirmarBorrar()}
              className="h-12 rounded-xl font-semibold"
            >
              Sí, borrar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
