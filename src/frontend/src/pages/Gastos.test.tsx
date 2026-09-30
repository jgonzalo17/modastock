import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Gasto } from "@/lib/types";
import { crearMockDb, reiniciarAlmacenes } from "@/test/memoria";

vi.mock("@/lib/db", () => crearMockDb());

import { useTienda } from "@/lib/store";
import { Gastos } from "@/pages/Gastos";

function sembrar(gastos: Gasto[] = []) {
  reiniciarAlmacenes({ gastos });
  useTienda.setState({
    cargado: true,
    error: null,
    productos: [],
    ventas: [],
    gastos,
  });
}

beforeEach(() => {
  sembrar();
});

describe("Gastos", () => {
  it("registra un gasto y lo muestra en la tabla con fecha, concepto y monto", async () => {
    const usuario = userEvent.setup();
    render(<Gastos />);

    await usuario.click(screen.getByTestId("gastos.open_modal_button"));
    await usuario.type(screen.getByTestId("gastos.concepto.input"), "Alquiler");
    await usuario.type(screen.getByTestId("gastos.monto.input"), "500");
    await usuario.click(screen.getByTestId("gastos.save_button"));

    await waitFor(() =>
      expect(screen.getByTestId("gastos.table")).toBeInTheDocument(),
    );
    const fila = screen.getByTestId("gastos.row.1");
    expect(within(fila).getByText("Alquiler")).toBeInTheDocument();
    expect(within(fila).getByText(/500\.00/)).toBeInTheDocument();
    expect(useTienda.getState().gastos).toHaveLength(1);
  });

  it("rellena el concepto con una sugerencia", async () => {
    const usuario = userEvent.setup();
    render(<Gastos />);
    await usuario.click(screen.getByTestId("gastos.open_modal_button"));
    await usuario.click(screen.getByTestId("gastos.sugerencia.transporte"));
    expect(screen.getByTestId("gastos.concepto.input")).toHaveValue(
      "Transporte",
    );
  });

  it("no guarda un gasto sin concepto o con monto cero", async () => {
    const usuario = userEvent.setup();
    render(<Gastos />);
    await usuario.click(screen.getByTestId("gastos.open_modal_button"));
    await usuario.type(screen.getByTestId("gastos.monto.input"), "0");
    await usuario.click(screen.getByTestId("gastos.save_button"));
    expect(useTienda.getState().gastos).toHaveLength(0);
  });

  it("elimina un gasto tras confirmar", async () => {
    sembrar([
      {
        id: "g1",
        descripcion: "Alquiler",
        categoria: "Alquiler",
        monto: 500,
        fecha: Date.now(),
      },
    ]);
    const usuario = userEvent.setup();
    render(<Gastos />);
    await usuario.click(screen.getByTestId("gastos.delete_button.1"));
    const modal = screen.getByTestId("gastos.delete_modal");
    await usuario.click(
      within(modal).getByTestId("gastos.delete_confirm_button"),
    );
    await waitFor(() => expect(useTienda.getState().gastos).toHaveLength(0));
  });
});
