// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { CrewColumn } from "../CrewColumn";
import { OPEN_MAESTRO_EVENT } from "../InlineActionButton";
import type { CrewRoleCardData, AutonomyData } from "@/lib/types";

const AUTONOMY: AutonomyData = {
  percent: 42,
  totalTasks: 10,
  aiTasks: 4,
  windowDays: 7,
};

function role(overrides: Partial<CrewRoleCardData> = {}): CrewRoleCardData {
  return {
    roleId: "r1",
    slug: "pipeline",
    name: "Pipeline",
    description: "Trata do pipeline comercial.",
    color: "#c8a35e",
    glyphKey: "pipeline",
    state: "idle",
    executor: { id: null, kind: "manual", name: "—", note: null },
    lastLine: null,
    load: 0,
    ...overrides,
  };
}

let maestroListener: ReturnType<typeof vi.fn> & EventListener;

beforeEach(() => {
  maestroListener = vi.fn() as typeof maestroListener;
  window.addEventListener(OPEN_MAESTRO_EVENT, maestroListener);
});

afterEach(() => {
  window.removeEventListener(OPEN_MAESTRO_EVENT, maestroListener);
  cleanup();
});

describe("CrewColumn — lastLine interactivity (F3 Passo F)", () => {
  it("em state='pending' com lastLine, torna a frase clicável", () => {
    render(
      <CrewColumn
        crew={[role({ state: "pending", lastLine: "3 decisões à espera de ti" })]}
        autonomy={AUTONOMY}
      />,
    );
    const btn = screen.getByRole("button", { name: /Abrir Maestro sobre Pipeline/i });
    expect(btn.textContent).toBe("3 decisões à espera de ti");
  });

  it("clicar na lastLine em 'pending' despacha cc:open-maestro com crewRoleSlug", () => {
    render(
      <CrewColumn
        crew={[role({ state: "pending", lastLine: "alguma coisa" })]}
        autonomy={AUTONOMY}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Abrir Maestro/i }));

    expect(maestroListener).toHaveBeenCalledOnce();
    const ev = maestroListener.mock.calls[0]![0] as CustomEvent;
    expect(ev.detail).toEqual({ crewRoleSlug: "pipeline" });
  });

  it("em state='live' não torna a lastLine clicável (passivo)", () => {
    render(
      <CrewColumn
        crew={[role({ state: "live", lastLine: "a processar Portiqa" })]}
        autonomy={AUTONOMY}
      />,
    );
    expect(screen.getByText("a processar Portiqa")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Maestro/i })).toBeNull();
  });

  it("em readOnly (TV), lastLine nunca é clicável mesmo em 'pending'", () => {
    render(
      <CrewColumn
        crew={[role({ state: "pending", lastLine: "algo" })]}
        autonomy={AUTONOMY}
        readOnly
      />,
    );
    expect(screen.queryByRole("button", { name: /Maestro/i })).toBeNull();
  });

  it("lastLine null não renderiza parágrafo", () => {
    const { container } = render(
      <CrewColumn
        crew={[role({ state: "pending", lastLine: null })]}
        autonomy={AUTONOMY}
      />,
    );
    // Card existe, mas sem <p> de lastLine
    expect(container.querySelectorAll("p.meta").length).toBe(0);
  });
});
