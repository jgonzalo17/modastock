import { AppShell, type Pestana } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useTienda } from "@/lib/store";
import { Asistente } from "@/pages/Asistente";
import { Datos } from "@/pages/Datos";
import { Gastos } from "@/pages/Gastos";
import { Inventario } from "@/pages/Inventario";
import { Ventas } from "@/pages/Ventas";
import { AlertTriangle, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export default function App() {
  const cargar = useTienda((s) => s.cargar);
  const cargado = useTienda((s) => s.cargado);
  const error = useTienda((s) => s.error);
  const limpiarError = useTienda((s) => s.limpiarError);

  const [pestana, setPestana] = useState<Pestana>("inventario");
  const [verDatos, setVerDatos] = useState(false);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    document.title = "Tienda Denim · Inventario";
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const registrar = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // La app sigue funcionando sin caché offline.
      });
    };
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return (
    <>
      <AppShell
        activa={pestana}
        onCambiar={(nueva) => {
          setPestana(nueva);
          setVerDatos(false);
        }}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-xl bg-gradient-primary font-display text-sm font-bold text-primary-foreground"
              >
                TD
              </span>
              <div className="leading-tight">
                <p className="font-display text-sm font-bold text-foreground">
                  Tienda Denim
                </p>
                <p className="text-xs text-muted-foreground">
                  Gestión de tienda de ropa
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              data-ocid="app.datos_button"
              aria-label="Datos y respaldo"
              aria-pressed={verDatos}
              onClick={() => setVerDatos((v) => !v)}
              className="size-11 rounded-xl text-muted-foreground hover:text-primary"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <div
            className="stitch-line h-px w-full opacity-60"
            aria-hidden="true"
          />
        </header>

        {error && (
          <div
            data-ocid="app.error_state"
            role="alert"
            className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3"
          >
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="flex-1 text-sm text-foreground">{error}</p>
            <button
              type="button"
              data-ocid="app.error_dismiss_button"
              aria-label="Cerrar aviso"
              onClick={limpiarError}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {!cargado ? (
          <div
            data-ocid="app.loading_state"
            className="space-y-4 px-4 pt-4"
            aria-busy="true"
            aria-label="Cargando datos"
          >
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
            <div className="h-12 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : verDatos ? (
          <Datos />
        ) : (
          <>
            {pestana === "inventario" && <Inventario />}
            {pestana === "ventas" && <Ventas />}
            {pestana === "gastos" && <Gastos />}
            {pestana === "asistente" && <Asistente />}
          </>
        )}

        <footer className="px-4 pb-4 pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </AppShell>

      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
