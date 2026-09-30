import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Producto } from "@/lib/types";
import { crearMockDb, reiniciarAlmacenes } from "@/test/memoria";

vi.mock("@/lib/db", () => crearMockDb());

import { useTienda } from "@/lib/store";
import { Inventario } from "@/pages/Inventario";

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

describe("Inventario", () => {
  it("muestra el resumen del mes y la lista de productos", () => {
    render(<Inventario />);
    expect(screen.getByTestId("summary.card")).toBeInTheDocument();
    expect(screen.getByText("Jean azul")).toBeInTheDocument();
  });

  it("marca en rojo una talla con 2 o menos unidades", () => {
    render(<Inventario />);
    const tallaBaja = screen.getByTestId("inventario.talla_stock.32");
    expect(tallaBaja).toHaveTextContent("1");
    expect(tallaBaja.className).toContain("text-destructive");

    const tallaAlta = screen.getByTestId("inventario.talla_stock.30");
    expect(tallaAlta.className).not.toContain("text-destructive");
  });

  it("filtra la lista con el buscador", async () => {
    sembrar([
      producto(),
      producto({
        id: "p2",
        nombre: "Polo blanco",
        sku: "POL-001",
        categoria: "Polos",
        tallas: ["S"],
        stockPorTalla: { S: 10 },
      }),
    ]);
    const usuario = userEvent.setup();
    render(<Inventario />);
    expect(screen.getByText("Polo blanco")).toBeInTheDocument();

    await usuario.type(screen.getByTestId("inventario.search_input"), "jean");
    await waitFor(() =>
      expect(screen.queryByText("Polo blanco")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Jean azul")).toBeInTheDocument();
  });

  it("filtra la lista por categoría", async () => {
    sembrar([
      producto(),
      producto({
        id: "p2",
        nombre: "Polo blanco",
        sku: "POL-001",
        categoria: "Polos",
        tallas: ["S"],
        stockPorTalla: { S: 10 },
      }),
    ]);
    const usuario = userEvent.setup();
    render(<Inventario />);

    await usuario.click(screen.getByTestId("inventario.filter.polos"));
    await waitFor(() =>
      expect(screen.queryByText("Jean azul")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Polo blanco")).toBeInTheDocument();
  });

  it("ajusta el stock de una talla con + y − en el formulario", async () => {
    const usuario = userEvent.setup();
    render(<Inventario />);

    await usuario.click(screen.getByTestId("inventario.open_modal_button"));
    await usuario.type(screen.getByTestId("inventario.nombre.input"), "Short");
    await usuario.type(screen.getByTestId("inventario.precio.input"), "50");
    await usuario.click(screen.getByTestId("inventario.talla.toggle.S"));

    const input = screen.getByTestId("inventario.stock.input.S");
    expect(input).toHaveValue("0");

    await usuario.click(screen.getByTestId("inventario.stock_mas_button.S"));
    expect(input).toHaveValue("1");
    await usuario.click(screen.getByTestId("inventario.stock_mas_button.S"));
    expect(input).toHaveValue("2");

    await usuario.click(screen.getByTestId("inventario.stock_menos_button.S"));
    expect(input).toHaveValue("1");
  });

  it("no permite bajar el stock por debajo de cero", async () => {
    const usuario = userEvent.setup();
    render(<Inventario />);
    await usuario.click(screen.getByTestId("inventario.open_modal_button"));
    await usuario.click(screen.getByTestId("inventario.talla.toggle.S"));
    await usuario.click(screen.getByTestId("inventario.stock_menos_button.S"));
    expect(screen.getByTestId("inventario.stock.input.S")).toHaveValue("0");
  });

  it("guarda un producto nuevo con nombre, categoría, precios y stock", async () => {
    const usuario = userEvent.setup();
    render(<Inventario />);
    await usuario.click(screen.getByTestId("inventario.open_modal_button"));
    await usuario.type(screen.getByTestId("inventario.nombre.input"), "Casaca");
    await usuario.type(screen.getByTestId("inventario.precio.input"), "150");
    await usuario.type(screen.getByTestId("inventario.costo.input"), "80");
    await usuario.click(screen.getByTestId("inventario.talla.toggle.S"));
    await usuario.click(screen.getByTestId("inventario.stock_mas_button.S"));
    await usuario.click(screen.getByTestId("inventario.save_button"));

    await waitFor(() => expect(screen.getByText("Casaca")).toBeInTheDocument());
    const guardado = useTienda
      .getState()
      .productos.find((p) => p.nombre === "Casaca");
    expect(guardado?.precio).toBe(150);
    expect(guardado?.stockPorTalla.S).toBe(1);
  });

  it("elimina un producto tras confirmar", async () => {
    const usuario = userEvent.setup();
    render(<Inventario />);
    await usuario.click(screen.getByTestId("inventario.delete_button.1"));
    const modal = screen.getByTestId("inventario.delete_modal");
    await usuario.click(
      within(modal).getByTestId("inventario.delete_confirm_button"),
    );
    await waitFor(() =>
      expect(screen.queryByText("Jean azul")).not.toBeInTheDocument(),
    );
  });
});
