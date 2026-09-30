import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MonthSummary } from "@/components/MonthSummary";

describe("MonthSummary", () => {
  it("muestra ventas, gastos y ganancia en soles", () => {
    render(
      <MonthSummary
        resumen={{ ventas: 1000, gastos: 400, ganancia: 600 }}
        mes="Septiembre 2026"
      />,
    );
    expect(screen.getByLabelText("Resumen del mes")).toBeInTheDocument();
    expect(screen.getByText("Septiembre 2026")).toBeInTheDocument();
    expect(screen.getByTestId("summary.ventas")).toHaveTextContent("1,000.00");
    expect(screen.getByTestId("summary.gastos")).toHaveTextContent("400.00");
    expect(screen.getByTestId("summary.ganancia")).toHaveTextContent("600.00");
  });

  it("pinta la ganancia en rojo cuando es negativa", () => {
    render(
      <MonthSummary
        resumen={{ ventas: 100, gastos: 400, ganancia: -300 }}
        mes="Septiembre 2026"
      />,
    );
    const ganancia = screen.getByTestId("summary.ganancia");
    expect(ganancia).toHaveTextContent("300.00");
    expect(ganancia.className).toContain("text-red-300");
  });

  it("no usa rojo cuando la ganancia es positiva", () => {
    render(
      <MonthSummary
        resumen={{ ventas: 500, gastos: 100, ganancia: 400 }}
        mes="Septiembre 2026"
      />,
    );
    expect(screen.getByTestId("summary.ganancia").className).not.toContain(
      "text-red-300",
    );
  });
});
