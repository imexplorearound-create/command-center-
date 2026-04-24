import { describe, it, expect } from "vitest";
import { canApproveFeedback, canVerifyFeedback } from "../roles";
import type { AuthUser } from "../dal";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_TENANT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PROJECT_A = "11111111-1111-1111-1111-111111111111";
const PROJECT_B = "22222222-2222-2222-2222-222222222222";

function user(role: AuthUser["role"], projectIds: string[] = []): AuthUser {
  return {
    userId: "u1",
    personId: "p1",
    email: "x@y",
    name: "x",
    role,
    tenantId: TENANT,
    projectIds,
  };
}

describe("canApproveFeedback", () => {
  const scope = { tenantId: TENANT, projectId: PROJECT_A };

  it("admin pode aprovar qualquer projecto do seu tenant", () => {
    expect(canApproveFeedback(user("admin"), scope)).toBe(true);
  });

  it("manager pode aprovar sem restrição de projecto", () => {
    expect(canApproveFeedback(user("manager"), scope)).toBe(true);
  });

  it("membro pode aprovar sem restrição de projecto", () => {
    expect(canApproveFeedback(user("membro"), scope)).toBe(true);
  });

  it("cliente aprova apenas se o projectId está nos seus projectIds", () => {
    expect(canApproveFeedback(user("cliente", [PROJECT_A]), scope)).toBe(true);
  });

  it("cliente NÃO aprova projecto fora dos seus projectIds", () => {
    expect(canApproveFeedback(user("cliente", [PROJECT_B]), scope)).toBe(false);
  });

  it("cliente sem projectIds não aprova nada", () => {
    expect(canApproveFeedback(user("cliente", []), scope)).toBe(false);
  });

  it("bloqueia cross-tenant mesmo para admin (belt+braces)", () => {
    const admin = user("admin");
    expect(canApproveFeedback(admin, { tenantId: OTHER_TENANT, projectId: PROJECT_A })).toBe(
      false,
    );
  });
});

describe("canVerifyFeedback", () => {
  it("mesma matriz de permissões que canApproveFeedback", () => {
    const scope = { tenantId: TENANT, projectId: PROJECT_A };
    expect(canVerifyFeedback(user("admin"), scope)).toBe(true);
    expect(canVerifyFeedback(user("cliente", [PROJECT_A]), scope)).toBe(true);
    expect(canVerifyFeedback(user("cliente", []), scope)).toBe(false);
  });
});
