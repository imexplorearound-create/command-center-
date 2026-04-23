// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import {
  InlineActionButton,
  FOCUS_DECISIONS_EVENT,
  OPEN_MAESTRO_EVENT,
} from "../InlineActionButton";

let focusListener: ReturnType<typeof vi.fn> & EventListener;
let maestroListener: ReturnType<typeof vi.fn> & EventListener;

beforeEach(() => {
  focusListener = vi.fn() as typeof focusListener;
  maestroListener = vi.fn() as typeof maestroListener;
  window.addEventListener(FOCUS_DECISIONS_EVENT, focusListener);
  window.addEventListener(OPEN_MAESTRO_EVENT, maestroListener);
});

afterEach(() => {
  window.removeEventListener(FOCUS_DECISIONS_EVENT, focusListener);
  window.removeEventListener(OPEN_MAESTRO_EVENT, maestroListener);
  cleanup();
});

describe("InlineActionButton", () => {
  it("despacha cc:focus-decisions sem detalhe para action 'focus-decisions'", () => {
    render(
      <InlineActionButton action={{ kind: "focus-decisions" }}>saltar</InlineActionButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "saltar" }));

    expect(focusListener).toHaveBeenCalledOnce();
    expect(maestroListener).not.toHaveBeenCalled();
  });

  it("despacha cc:open-maestro com crewRoleSlug no detail", () => {
    render(
      <InlineActionButton
        action={{ kind: "open-maestro", context: { crewRoleSlug: "pipeline" } }}
      >
        abrir Maestro
      </InlineActionButton>,
    );
    fireEvent.click(screen.getByRole("button"));

    expect(maestroListener).toHaveBeenCalledOnce();
    const ev = maestroListener.mock.calls[0]![0] as CustomEvent;
    expect(ev.type).toBe(OPEN_MAESTRO_EVENT);
    expect(ev.detail).toEqual({ crewRoleSlug: "pipeline" });
    expect(focusListener).not.toHaveBeenCalled();
  });

  it("context opcional — detail vazio se não passado", () => {
    render(
      <InlineActionButton action={{ kind: "open-maestro" }}>x</InlineActionButton>,
    );
    fireEvent.click(screen.getByRole("button"));

    const ev = maestroListener.mock.calls[0]![0] as CustomEvent;
    expect(ev.detail).toEqual({});
  });

  it("propaga aria-label para acessibilidade", () => {
    render(
      <InlineActionButton
        action={{ kind: "focus-decisions" }}
        aria-label="Saltar para decisões"
      >
        visual
      </InlineActionButton>,
    );
    expect(screen.getByLabelText("Saltar para decisões")).toBeInTheDocument();
  });

  it("renderiza como <button> nativo (teclado acessível)", () => {
    render(
      <InlineActionButton action={{ kind: "focus-decisions" }}>x</InlineActionButton>,
    );
    const btn = screen.getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("type")).toBe("button");
  });
});

describe("FOCUS_DECISIONS_EVENT / OPEN_MAESTRO_EVENT (contratos públicos)", () => {
  it("têm os nomes esperados pelo ecossistema (DecisionsHighlighter, MaestroProvider)", () => {
    expect(FOCUS_DECISIONS_EVENT).toBe("cc:focus-decisions");
    expect(OPEN_MAESTRO_EVENT).toBe("cc:open-maestro");
  });
});
