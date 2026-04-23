// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { FeedPill, HIGHLIGHT_EVENT } from "../FeedPills";

let listener: ReturnType<typeof vi.fn> & EventListener;

beforeEach(() => {
  listener = vi.fn() as typeof listener;
  window.addEventListener(HIGHLIGHT_EVENT, listener);
});

afterEach(() => {
  window.removeEventListener(HIGHLIGHT_EVENT, listener);
  cleanup();
});

describe("FeedPill", () => {
  it("exporta o nome de evento que o DecisionsHighlighter escuta", () => {
    // Contrato partilhado entre FeedPills (emissor) e DecisionsHighlighter (listener).
    expect(HIGHLIGHT_EVENT).toBe("cc:highlight-decision");
  });

  it("emite CustomEvent com o decisionId ao clicar (kind clicável)", () => {
    render(<FeedPill kind="decide" decisionId="dec-123" />);
    fireEvent.click(screen.getByRole("button"));

    expect(listener).toHaveBeenCalledOnce();
    const ev = listener.mock.calls[0]![0] as CustomEvent;
    expect(ev.type).toBe(HIGHLIGHT_EVENT);
    expect(ev.detail).toEqual({ decisionId: "dec-123" });
  });

  it("não emite evento quando kind='feito' (histórico, não accionável)", () => {
    render(<FeedPill kind="feito" decisionId="dec-123" />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);

    expect(listener).not.toHaveBeenCalled();
  });

  it("não emite evento quando decisionId é null (evento sem decisão linkada)", () => {
    render(<FeedPill kind="decide" decisionId={null} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);

    expect(listener).not.toHaveBeenCalled();
  });

  it("renderiza o label correcto em PT por kind", () => {
    const { rerender } = render(<FeedPill kind="decide" decisionId="x" />);
    expect(screen.getByRole("button")).toHaveTextContent("decide");
    rerender(<FeedPill kind="reve" decisionId="x" />);
    expect(screen.getByRole("button")).toHaveTextContent("revê");
    rerender(<FeedPill kind="feito" decisionId={null} />);
    expect(screen.getByRole("button")).toHaveTextContent("feito");
  });
});
