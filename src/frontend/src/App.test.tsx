import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Producto } from "@/lib/types";
import { crearMockDb, reiniciarAlmacenes } from "@/test/memoria";

vi.mock("@/lib/db", () => crearMockDb());

import App from "@/App";

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
    creadoEn: 1,
    actualizadoEn: 1,
    ...parcial,
  };
}

beforeEach(() => {
  reiniciarAlmacenes({ productos: [producto()] });
});

describe("App", () => {
  it("carga sin pantalla en blanco y muestra las cuatro pestañas", async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("nav.tabbar")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /Inventario/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ventas/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gastos/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Asistente/ }),
    ).toBeInTheDocument();
  });

  it("mantiene el resumen del mes visible en Inventario, Ventas y Gastos", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("summary.card")).toBeInTheDocument(),
    );

    await usuario.click(screen.getByRole("button", { name: /Ventas/ }));
    expect(screen.getByTestId("summary.card")).toBeInTheDocument();
    expect(screen.getByTestId("ventas.page")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Gastos/ }));
    expect(screen.getByTestId("summary.card")).toBeInTheDocument();
    expect(screen.getByTestId("gastos.page")).toBeInTheDocument();
  });

  it("mantiene el resumen del mes visible en la pestaña Asistente", async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("summary.card")).toBeInTheDocument(),
    );

    await usuario.click(screen.getByRole("button", { name: /Asistente/ }));
    expect(screen.getByTestId("asistente.page")).toBeInTheDocument();
    expect(screen.getByTestId("summary.card")).toBeInTheDocument();
  });

  it("abre la pestaña de Inventario por defecto", async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId("inventario.page")).toBeInTheDocument(),
    );
  });
});
