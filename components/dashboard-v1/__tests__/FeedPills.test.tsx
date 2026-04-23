// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { FeedPill, HIGHLIGHT_EVENT } from "../FeedPills";

afterEach(cleanup);

describe("FeedPill", () => {
  it("exporta o nome de evento que o DecisionsHighlighter escuta", () => {
    // Contrato partilhado entre FeedPills (emissor) e DecisionsHighlighter (listener).
    expect(HIGHLIGHT_EVENT).toBe("cc:highlight-decision");
  });

  it("emite CustomEvent com o decisionId ao clicar (kind clicável)", () => {
    const listener = vi.fn();
    window.addEventListener(HIGHLIGHT_EVENT, listener);

    render(<FeedPill kind="decide" decisionId="dec-123" />);
    fireEvent.click(screen.getByRole("button"));

    window.removeEventListener(HIGHLIGHT_EVENT, listener);
    expect(listener).toHaveBeenCalledOnce();
    const ev = listener.mock.calls[0]![0] as CustomEvent;
    expect(ev.type).toBe(HIGHLIGHT_EVENT);
    expect(ev.detail).toEqual({ decisionId: "dec-123" });
  });

  it("não emite evento quando kind='feito' (histórico, não accionável)", () => {
    const listener = vi.fn();
    window.addEventListener(HIGHLIGHT_EVENT, listener);

    render(<FeedPill kind="feito" decisionId="dec-123" />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);

    window.removeEventListener(HIGHLIGHT_EVENT, listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it("não emite evento quando decisionId é null (evento sem decisão linkada)", () => {
    const listener = vi.fn();
    window.addEventListener(HIGHLIGHT_EVENT, listener);

    render(<FeedPill kind="decide" decisionId={null} />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);

    window.removeEventListener(HIGHLIGHT_EVENT, listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it("renderiza o label correcto em PT por kind", () => {
    const { rerender } = render(<FeedPill kind="decide" decisionId="x" />);
    expect(screen.getByRole("button").textContent).toBe("decide");
    rerender(<FeedPill kind="reve" decisionId="x" />);
    expect(screen.getByRole("button").textContent).toBe("revê");
    rerender(<FeedPill kind="feito" decisionId={null} />);
    expect(screen.getByRole("button").textContent).toBe("feito");
  });
});
