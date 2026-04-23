import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TV_DIR = join(__dirname, "..");

function read(file: string): string {
  return readFileSync(join(TV_DIR, file), "utf8");
}

describe("/tv route", () => {
  it("layout does not mount chat (MaestroMount) or chrome (TopNav)", () => {
    const layout = read("layout.tsx");
    expect(layout).not.toContain("MaestroMount");
    expect(layout).not.toContain("TopNav");
  });

  it("layout sets meta refresh to 60 seconds", () => {
    const layout = read("layout.tsx");
    expect(layout).toMatch(/httpEquiv=["']refresh["']/);
    expect(layout).toMatch(/content=["']60["']/);
  });

  it("layout requires auth (redirects unauthenticated users)", () => {
    const layout = read("layout.tsx");
    expect(layout).toContain("getAuthUser");
    expect(layout).toContain('redirect("/login")');
  });

  it("page renders DecisionsColumn in readOnly mode (no resolve buttons)", () => {
    const page = read("page.tsx");
    expect(page).toMatch(/<DecisionsColumn[^/]*readOnly/);
  });

  it("page does not import the TvCard (the `open in TV` CTA itself)", () => {
    const page = read("page.tsx");
    expect(page).not.toContain("TvCard");
  });

  it("page applies the .tv scale class on the dashboard wrapper", () => {
    const page = read("page.tsx");
    expect(page).toMatch(/className=["'][^"']*\btv\b/);
  });
});
