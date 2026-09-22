import type { ShellNavItem } from "./shell-nav";

export type ShellNavGroupId =
  | "home"
  | "inbound"
  | "operations"
  | "inventory"
  | "admin";

export type ShellNavGroup = {
  id: ShellNavGroupId;
  title: string;
  shortLabel: string;
  items: ShellNavItem[];
};

const GROUP_ORDER: ShellNavGroupId[] = [
  "home",
  "inbound",
  "operations",
  "inventory",
  "admin",
];

const GROUP_META: Record<
  ShellNavGroupId,
  { title: string; shortLabel: string }
> = {
  home: { title: "Início", shortLabel: "In" },
  inbound: { title: "Entrada", shortLabel: "En" },
  operations: { title: "Operação", shortLabel: "Op" },
  inventory: { title: "Estoque", shortLabel: "Es" },
  admin: { title: "Administração", shortLabel: "Ad" },
};

export function routeSegment(to: string): string {
  const parts = to.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function groupIdForSegment(segment: string): ShellNavGroupId {
  switch (segment) {
    case "plants":
      return "home";
    case "receipt":
    case "putaway":
      return "inbound";
    case "hold":
    case "production":
    case "picking":
    case "shipping":
    case "genealogy":
      return "operations";
    case "inventory":
    case "ledger":
      return "inventory";
    default:
      return "admin";
  }
}

/** Concept C — rail groups; every `shellNavItems` entry lands in exactly one flyout. */
export function shellNavGroups(items: ShellNavItem[]): ShellNavGroup[] {
  const buckets = new Map<ShellNavGroupId, ShellNavItem[]>();
  for (const id of GROUP_ORDER) {
    buckets.set(id, []);
  }

  for (const item of items) {
    const id = groupIdForSegment(routeSegment(item.to));
    buckets.get(id)!.push(item);
  }

  return GROUP_ORDER
    .map((id) => ({
      id,
      ...GROUP_META[id],
      items: buckets.get(id) ?? [],
    }))
    .filter((g) => g.items.length > 0);
}

/** Default floor favorites: receipt, putaway, picking, shipping (W5/W6/W10/W16). */
export const DEFAULT_FAVORITE_SEGMENTS = [
  "receipt",
  "putaway",
  "picking",
  "shipping",
] as const;

export function defaultShellFavoriteItems(items: ShellNavItem[]): ShellNavItem[] {
  const bySegment = new Map(items.map((i) => [routeSegment(i.to), i]));
  const favorites: ShellNavItem[] = [];
  for (const seg of DEFAULT_FAVORITE_SEGMENTS) {
    const item = bySegment.get(seg);
    if (item) {
      favorites.push(item);
    }
  }
  return favorites;
}

export function favoriteShortLabel(label: string): string {
  const match = label.match(/^([^(]+)/);
  const word = (match?.[1] ?? label).trim();
  const parts = word.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  }
  return word.slice(0, 2).toUpperCase();
}

export function shellNavItemsReachableViaGroups(
  items: ShellNavItem[],
  groups: ShellNavGroup[],
): boolean {
  const inGroups = new Set(groups.flatMap((g) => g.items.map((i) => i.to)));
  return items.every((i) => inGroups.has(i.to));
}
