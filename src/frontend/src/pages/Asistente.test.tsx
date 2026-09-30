import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Producto } from "@/lib/types";
import { crearMockDb, reiniciarAlmacenes } from "@/test/memoria";

vi.mock("@/lib/db", () => crearMockDb());

import { useTienda } from "@/lib/store";
import { Asistente } from "@/pages/Asistente";

function producto(parcial: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    nombre: "Jean azul",
    sku: "JEA-001",
    categoria: "Pantalones",
    tallas: ["30", "32"],
    precio: 100,
    costo: 50,
    stockPorTalla: { "30": 1, "32": 1 },
    stockMinimo: 2,
    creadoEn: 1,
    actualizadoEn: 1,
    ...parcial,
  };
}

function sembrar(productos: Producto[]) {
  reiniciarAlmacenes({ productos });
  useTienda.setState({
    cargado: true,
    error: null,
    productos,
    ventas: [],
    gastos: [],
  });
}

beforeEach(() => {
  sembrar([producto()]);
});

describe("Asistente", () => {
  it("muestra el saludo y ofrece preguntas rápidas", () => {
    render(<Asistente />);
    expect(screen.getByTestId("asistente.page")).toBeInTheDocument();
    expect(screen.getByText(/Soy tu asistente de tienda/)).toBeInTheDocument();
    expect(
      screen.getAllByTestId("asistente.sugerencia.button").length,
    ).toBeGreaterThan(0);
  });

  it("responde una consulta de stock en lenguaje natural con datos reales", async () => {
    const usuario = userEvent.setup();
    render(<Asistente />);
    await usuario.type(
      screen.getByTestId("asistente.input"),
      "¿qué productos tienen stock bajo?",
    );
    await usuario.click(screen.getByTestId("asistente.send_button"));

    await waitFor(() =>
      expect(screen.getByText(/Jean azul/)).toBeInTheDocument(),
    );
  });

  it("pide confirmación antes de ajustar stock y solo lo aplica al confirmar", async () => {
    const usuario = userEvent.setup();
    render(<Asistente />);
    await usuario.type(
      screen.getByTestId("asistente.input"),
      "agrega 3 al jean azul talla 30",
    );
    await usuario.click(screen.getByTestId("asistente.send_button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("asistente.confirmacion.card"),
      ).toBeInTheDocument(),
    );
    // Aún no se aplicó nada.
    expect(useTienda.getState().productos[0].stockPorTalla["30"]).toBe(1);

    await usuario.click(screen.getByTestId("asistente.confirmar_button"));
    await waitFor(() =>
      expect(useTienda.getState().productos[0].stockPorTalla["30"]).toBe(4),
    );
  });

  it("no aplica el ajuste si se cancela", async () => {
    const usuario = userEvent.setup();
    render(<Asistente />);
    await usuario.type(
      screen.getByTestId("asistente.input"),
      "agrega 3 al jean azul talla 30",
    );
    await usuario.click(screen.getByTestId("asistente.send_button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("asistente.confirmacion.card"),
      ).toBeInTheDocument(),
    );

    await usuario.click(screen.getByTestId("asistente.cancelar_button"));
    await waitFor(() =>
      expect(
        screen.queryByTestId("asistente.confirmacion.card"),
      ).not.toBeInTheDocument(),
    );
    expect(useTienda.getState().productos[0].stockPorTalla["30"]).toBe(1);
  });

  it("pide confirmación antes de anotar un gasto y lo aplica al confirmar", async () => {
    const usuario = userEvent.setup();
    render(<Asistente />);
    await usuario.type(
      screen.getByTestId("asistente.input"),
      "anota un gasto de 50 de transporte",
    );
    await usuario.click(screen.getByTestId("asistente.send_button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("asistente.confirmacion.card"),
      ).toBeInTheDocument(),
    );
    expect(useTienda.getState().gastos).toHaveLength(0);

    await usuario.click(screen.getByTestId("asistente.confirmar_button"));
    await waitFor(() => expect(useTienda.getState().gastos).toHaveLength(1));
    expect(useTienda.getState().gastos[0].monto).toBe(50);
  });
});
