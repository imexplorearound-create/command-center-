import { describe, it, expect } from "vitest";

vi.mock("server-only", () => ({}));
import { vi } from "vitest";

import {
  buildBriefingSystemPrompt,
  serializeBriefingData,
  buildBriefingUserMessage,
} from "../prompt";
import type { BriefingData } from "../data-collector";

const sample: BriefingData = {
  user: { id: "u1", role: "admin", name: "Miguel", personId: "p1" },
  tenant: { id: "t1", name: "Demo", locale: "pt-PT", timezone: "Europe/Lisbon" },
  overdueTasks: [
    {
      id: "t-over",
      title: "Setup CI",
      projectSlug: "aura",
      projectName: "Aura PMS",
      deadline: "2026-04-25",
      daysLate: 2,
      priority: "alta",
    },
  ],
  dueSoonTasks: [],
  pendingValidations: [
    { id: "v1", kind: "task", title: "TOC Online", createdAt: "2026-04-26T08:00:00Z" },
  ],
  recentChanges: { tasksCreated: 2, tasksCompleted: 1, feedbackItemsNew: 0, decisionsResolved: 0 },
  trustDeltas: [{ extractionType: "tarefa", delta: 4 }],
};

describe("buildBriefingSystemPrompt", () => {
  it("é em PT-PT por defeito", () => {
    const prompt = buildBriefingSystemPrompt("pt-PT", "Demo Lda");
    expect(prompt).toContain("Demo Lda");
    expect(prompt).toContain("PT-PT");
    expect(prompt).toContain("🔴");
    expect(prompt).toContain("🟡");
    expect(prompt).toContain("Prioridades de hoje");
  });

  it("é em inglês quando locale começa por en", () => {
    const prompt = buildBriefingSystemPrompt("en", "Demo Co");
    expect(prompt).toContain("Demo Co");
    expect(prompt).toContain("Maestro");
    expect(prompt).toMatch(/markdown/i);
  });

  it("instrui o modelo a não usar tools nem inventar dados", () => {
    const prompt = buildBriefingSystemPrompt("pt-PT", "X");
    expect(prompt).toMatch(/NÃO uses ferramentas/);
    expect(prompt).toMatch(/NÃO inventes/);
  });
});

describe("serializeBriefingData", () => {
  it("produz JSON estável (snapshot)", () => {
    const json = serializeBriefingData(sample);
    expect(JSON.parse(json)).toEqual({
      user: { name: "Miguel", role: "admin" },
      tenant: { name: "Demo", locale: "pt-PT" },
      overdueTasks: [
        {
          title: "Setup CI",
          project: "Aura PMS",
          deadline: "2026-04-25",
          daysLate: 2,
          priority: "alta",
        },
      ],
      dueSoonTasks: [],
      pendingValidations: [{ title: "TOC Online", kind: "task" }],
      recentChanges: { tasksCreated: 2, tasksCompleted: 1, feedbackItemsNew: 0, decisionsResolved: 0 },
      trustDeltas: [{ extractionType: "tarefa", delta: 4 }],
    });
  });

  it("não vaza personId, ids ou createdAt", () => {
    const json = serializeBriefingData(sample);
    expect(json).not.toContain("p1");
    expect(json).not.toContain("u1");
    expect(json).not.toContain("createdAt");
  });
});

describe("buildBriefingUserMessage", () => {
  it("envolve o JSON em fence ```json", () => {
    const msg = buildBriefingUserMessage(sample);
    expect(msg).toContain("```json");
    expect(msg).toMatch(/Gera o briefing\.\s*$/);
  });
});
