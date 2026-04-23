// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

// decision-actions.ts importa `next/cache` + `server-only` via cadeia —
// mock antes de importar qualquer coisa que puxe DecisionResolveButton.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn(),
  getTenantId: vi.fn(),
}));
vi.mock("@/lib/auth/dal", () => ({
  requireWriter: vi.fn(),
  getAuthUser: vi.fn(),
}));

import { render, cleanup, screen } from "@testing-library/react";
import { DecisionsColumn } from "../DecisionsColumn";
import type { OpenDecisionData, ResolvedDecisionData } from "@/lib/types";

afterEach(cleanup);

const DEC: OpenDecisionData = {
  id: "dec-1",
  title: "Decidir preço final da proposta",
  context: "Cliente pediu desconto > 20%",
  kind: "budget",
  severity: "warn",
  crewRoleSlug: "pipeline",
  deadline: null,
};

const RESOLVED: ResolvedDecisionData = {
  ...DEC,
  id: "dec-r",
  title: "Nome da release decidido",
  resolvedAt: new Date().toISOString(),
  resolvedByName: "Miguel",
  resolutionNote: "Release ficou 'Phoenix'",
};

describe("DecisionsColumn — readOnly mode", () => {
  it("não renderiza o botão de resolver quando readOnly=true", () => {
    render(<DecisionsColumn decisions={[DEC]} readOnly />);
    expect(screen.queryByRole("button", { name: /marcar resolvido/i })).toBeNull();
  });

  it("não renderiza o toggle abertas/resolvidas quando readOnly=true", () => {
    render(<DecisionsColumn decisions={[DEC]} readOnly />);
    // O toggle interactivo usa <nav aria-label="vista das decisões">
    expect(screen.queryByRole("navigation", { name: /vista das decis/i })).toBeNull();
  });

  it("mostra contador estático 'abertas · N' em readOnly", () => {
    render(<DecisionsColumn decisions={[DEC, { ...DEC, id: "dec-2" }]} readOnly />);
    expect(screen.getByText(/abertas · 2/i)).toBeTruthy();
  });

  it("rende o título e contexto da decisão em readOnly", () => {
    render(<DecisionsColumn decisions={[DEC]} readOnly />);
    expect(screen.getByText("Decidir preço final da proposta")).toBeTruthy();
    expect(screen.getByText("Cliente pediu desconto > 20%")).toBeTruthy();
  });

  it("mostra empty state amigável quando não há decisões abertas", () => {
    render(<DecisionsColumn decisions={[]} readOnly />);
    expect(screen.getByText(/nada a decidir agora/i)).toBeTruthy();
  });

  it("ignora `resolved` e `viewing` quando readOnly=true (nunca mostra lista resolvida)", () => {
    render(
      <DecisionsColumn decisions={[DEC]} resolved={[RESOLVED]} viewing="resolved" readOnly />,
    );
    // A decisão aberta aparece; a resolvida NÃO, porque readOnly força vista open.
    expect(screen.getByText(DEC.title)).toBeTruthy();
    expect(screen.queryByText(RESOLVED.title)).toBeNull();
  });
});

describe("DecisionsColumn — modo interactivo (default)", () => {
  it("mostra toggle nav com links para abertas/resolvidas", () => {
    render(<DecisionsColumn decisions={[DEC]} resolved={[]} viewing="open" />);
    const nav = screen.getByRole("navigation", { name: /vista das decis/i });
    expect(nav).toBeTruthy();
    // Pelo menos 2 links (abertas, resolvidas)
    const links = nav.querySelectorAll("a");
    expect(links.length).toBe(2);
  });

  it("em viewing='resolved' sem resolvidas mostra mensagem vazia apropriada", () => {
    render(<DecisionsColumn decisions={[]} resolved={[]} viewing="resolved" />);
    expect(screen.getByText(/nenhuma decisão resolvida/i)).toBeTruthy();
  });

  it("em viewing='resolved' lista decisões resolvidas com título riscado", () => {
    render(<DecisionsColumn decisions={[]} resolved={[RESOLVED]} viewing="resolved" />);
    expect(screen.getByText(RESOLVED.title)).toBeTruthy();
    expect(screen.getByText(/Miguel/)).toBeTruthy();
  });
});

describe("DecisionsColumn — toggle de ordenação (DB3)", () => {
  it("mostra toggle 'maestro · recentes' quando viewing='open'", () => {
    render(<DecisionsColumn decisions={[DEC]} viewing="open" sort="maestro" />);
    const nav = screen.getByRole("navigation", { name: /ordenação das decis/i });
    const links = nav.querySelectorAll("a");
    expect(links.length).toBe(2);
    expect(nav.textContent).toContain("maestro");
    expect(nav.textContent).toContain("recentes");
  });

  it("esconde o toggle de ordenação em viewing='resolved'", () => {
    render(<DecisionsColumn decisions={[]} resolved={[RESOLVED]} viewing="resolved" />);
    expect(screen.queryByRole("navigation", { name: /ordenação/i })).toBeNull();
  });

  it("esconde o toggle de ordenação em readOnly", () => {
    render(<DecisionsColumn decisions={[DEC]} readOnly />);
    expect(screen.queryByRole("navigation", { name: /ordenação/i })).toBeNull();
  });

  it("link 'recentes' aponta para ?sort=recent (shareable)", () => {
    render(<DecisionsColumn decisions={[DEC]} viewing="open" sort="maestro" />);
    const nav = screen.getByRole("navigation", { name: /ordenação/i });
    const recentLink = Array.from(nav.querySelectorAll("a")).find(
      (a) => a.textContent?.includes("recentes"),
    );
    expect(recentLink?.getAttribute("href")).toBe("/?sort=recent");
  });

  it("link 'maestro' aponta para / (reset para default)", () => {
    render(<DecisionsColumn decisions={[DEC]} viewing="open" sort="recent" />);
    const nav = screen.getByRole("navigation", { name: /ordenação/i });
    const maestroLink = Array.from(nav.querySelectorAll("a")).find(
      (a) => a.textContent?.includes("maestro"),
    );
    expect(maestroLink?.getAttribute("href")).toBe("/");
  });
});
