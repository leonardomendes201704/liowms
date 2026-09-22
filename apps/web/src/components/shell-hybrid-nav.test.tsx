/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shellNavItems } from "../shell-nav";
import { ShellHybridNav } from "./ShellHybridNav";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function renderNav(path = "/app/t/" + tenantId + "/plants") {
  const user = { roles: ["operator"], tenantIds: [tenantId] };
  const items = shellNavItems(user);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellHybridNav items={items} />
    </MemoryRouter>,
  );
}

describe("ShellHybridNav concept C (PAP-266)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Font Awesome icons on rail groups and favorites", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav");
    expect(nav?.querySelectorAll("svg[data-icon]").length).toBeGreaterThanOrEqual(
      5,
    );
    expect(
      nav?.querySelector('svg[data-icon="angles-right"]'),
    ).toBeTruthy();
    expect(screen.getByAltText("LioWMS")).toBeTruthy();
    expect(screen.getByRole("navigation").querySelector("img")).toBeTruthy();
    expect(screen.getByTitle("Entrada")).toBeTruthy();
    expect(screen.getByTitle("Recebimento (W5)")).toBeTruthy();
  });

  it("expands flyout when a rail group is clicked", () => {
    const { container } = renderNav("/app/t/" + tenantId + "/receipt");
    const nav = container.querySelector("nav")!;
    const rail = within(nav);
    fireEvent.click(rail.getByTitle("Operação"));
    expect(nav.getAttribute("data-flyout-open")).toBe("true");
    expect(within(nav).getByRole("region").textContent).toContain(
      "Picking (W10)",
    );
    expect(rail.getByTitle("Operação").getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("toggles flyout closed when the same rail group is clicked again", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav")!;
    const operacao = within(nav).getByTitle("Operação");
    fireEvent.click(operacao);
    fireEvent.click(operacao);
    expect(within(nav).queryByRole("region")).toBeNull();
  });

  it("flyout links remain clickable while scrim is visible", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav")!;
    fireEvent.click(within(nav).getByTitle("Operação"));
    expect(
      within(nav).getByRole("button", { name: "Fechar menu" }),
    ).toBeTruthy();
    const picking = within(nav).getByRole("link", { name: "Picking (W10)" });
    fireEvent.click(picking);
    expect(picking).toBeTruthy();
  });

  it("pins expand/collapse in rail footer with scrollable nav body (PAP-272)", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav")!;
    expect(nav.querySelector('[class*="railScroll"]')).toBeTruthy();
    expect(nav.querySelector('[class*="railFooter"]')).toBeTruthy();
    const toggle = within(nav).getByRole("button", {
      name: "Expandir menu lateral",
    });
    expect(toggle.closest('[class*="railFooter"]')).toBeTruthy();
    expect(toggle.closest('[class*="railScroll"]')).toBeNull();
  });

  it("persists rail expand/collapse via explicit toggle", () => {
    const { container, unmount } = renderNav();
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("data-rail-expanded")).toBe("false");
    fireEvent.click(
      within(nav).getByRole("button", { name: "Expandir menu lateral" }),
    );
    expect(nav.getAttribute("data-rail-expanded")).toBe("true");
    expect(localStorage.getItem("liowms.shellNav.railExpanded")).toBe("true");
    unmount();
    const { container: c2 } = renderNav();
    expect(c2.querySelector("nav")?.getAttribute("data-rail-expanded")).toBe(
      "true",
    );
  });
});
