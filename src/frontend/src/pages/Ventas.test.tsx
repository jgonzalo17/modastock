import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Producto } from "@/lib/types";
import { crearMockDb, reiniciarAlmacenes } from "@/test/memoria";

vi.mock("@/lib/db", () => crearMockDb());

import { useTienda } from "@/lib/store";
import { Ventas } from "@/pages/Ventas";

function producto(parcial: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    nombre: "Jean azul",
    sku: "JEA-001",
    categoria: "Pantalones",
    tallas: ["30", "32"],
    precio: 100,
    costo: 50,
    stockPorTalla: { "30": 5, "32": 1 },
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

async function elegirProducto(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByTestId("ventas.producto.select"));
  const opcion = await screen.findByRole("option", { name: /Jean azul/ });
  await usuario.click(opcion);
}

describe("Ventas", () => {
  it("registra una venta, descuenta el stock y la muestra en la tabla", async () => {
    const usuario = userEvent.setup();
    render(<Ventas />);

    await usuario.click(screen.getByTestId("ventas.open_modal_button"));
    await elegirProducto(usuario);
    await usuario.click(screen.getByTestId("ventas.talla.toggle.30"));
    await usuario.click(screen.getByTestId("ventas.cantidad_mas_button"));
    await usuario.click(screen.getByTestId("ventas.save_button"));

    await waitFor(() =>
      expect(screen.getByTestId("ventas.table")).toBeInTheDocument(),
    );
    const fila = screen.getByTestId("ventas.row.1");
    expect(within(fila).getByText("Jean azul")).toBeInTheDocument();
    expect(within(fila).getByText("30")).toBeInTheDocument();
    expect(within(fila).getByText("2")).toBeInTheDocument();
    expect(within(fila).getByText("Yape")).toBeInTheDocument();

    const estado = useTienda.getState();
    expect(estado.ventas).toHaveLength(1);
    expect(estado.productos[0].stockPorTalla["30"]).toBe(3);
  });

  it("avisa cuántas unidades quedan y no guarda si no alcanza el stock", async () => {
    const usuario = userEvent.setup();
    render(<Ventas />);

    await usuario.click(screen.getByTestId("ventas.open_modal_button"));
    await elegirProducto(usuario);
    // La talla 32 solo tiene 1 unidad; el botón + no permite superarla.
    await usuario.click(screen.getByTestId("ventas.talla.toggle.32"));
    await usuario.click(screen.getByTestId("ventas.cantidad_mas_button"));
    expect(screen.getByTestId("ventas.cantidad_valor")).toHaveTextContent("1");
    expect(
      screen.getByText(/Disponibles en talla 32: 1 unidades/),
    ).toBeInTheDocument();

    await usuario.click(screen.getByTestId("ventas.save_button"));
    await waitFor(() => expect(useTienda.getState().ventas).toHaveLength(1));
    // Solo se registró una unidad, nunca más que el stock.
    expect(useTienda.getState().ventas[0].cantidad).toBe(1);
    expect(useTienda.getState().productos[0].stockPorTalla["32"]).toBe(0);
  });

  it("anula una venta, devuelve el stock y deja la fila tachada", async () => {
    const usuario = userEvent.setup();
    render(<Ventas />);

    await usuario.click(screen.getByTestId("ventas.open_modal_button"));
    await elegirProducto(usuario);
    await usuario.click(screen.getByTestId("ventas.talla.toggle.30"));
    await usuario.click(screen.getByTestId("ventas.save_button"));
    await waitFor(() =>
      expect(screen.getByTestId("ventas.table")).toBeInTheDocument(),
    );
    expect(useTienda.getState().productos[0].stockPorTalla["30"]).toBe(4);

    await usuario.click(screen.getByTestId("ventas.anular_button.1"));
    const modal = screen.getByTestId("ventas.anular_modal");
    await usuario.click(
      within(modal).getByTestId("ventas.anular_confirm_button"),
    );

    await waitFor(() =>
      expect(useTienda.getState().ventas[0].anulada).toBe(true),
    );
    expect(useTienda.getState().productos[0].stockPorTalla["30"]).toBe(5);
    expect(screen.getByText("Anulada")).toBeInTheDocument();
  });

  it("muestra los totales de hoy y general", async () => {
    const usuario = userEvent.setup();
    render(<Ventas />);
    await usuario.click(screen.getByTestId("ventas.open_modal_button"));
    await elegirProducto(usuario);
    await usuario.click(screen.getByTestId("ventas.talla.toggle.30"));
    await usuario.click(screen.getByTestId("ventas.save_button"));

    await waitFor(() =>
      expect(screen.getByTestId("ventas.total_hoy")).toHaveTextContent(
        "100.00",
      ),
    );
    expect(screen.getByTestId("ventas.total_general")).toHaveTextContent(
      "100.00",
    );
  });
});
