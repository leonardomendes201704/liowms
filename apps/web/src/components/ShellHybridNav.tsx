import { useEffect, useId, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ShellNavItem } from "../shell-nav";
import {
  defaultShellFavoriteItems,
  routeSegment,
  shellNavGroups,
  type ShellNavGroupId,
} from "../shell-nav-groups";
import {
  readShellNavRailExpanded,
  writeShellNavRailExpanded,
} from "../shell-nav-rail-storage";
import {
  shellNavFavoriteIcon,
  shellNavGroupIcon,
  ShellNavIconCollapse,
  ShellNavIconExpand,
  ShellNavIconStar,
} from "../shell-nav-icons";
import logoRailLarge from "../assets/brand/lio-logo-rail-large.png";
import logoRailSmall from "../assets/brand/lio-logo-rail-small.png";
import styles from "./shell-hybrid-nav.module.css";

type Props = {
  items: ShellNavItem[];
};

export function ShellHybridNav({ items }: Props) {
  const location = useLocation();
  const flyoutTitleId = useId();
  const groups = useMemo(() => shellNavGroups(items), [items]);
  const favorites = useMemo(() => defaultShellFavoriteItems(items), [items]);
  const [openGroupId, setOpenGroupId] = useState<ShellNavGroupId | null>(null);
  const [railExpanded, setRailExpanded] = useState(readShellNavRailExpanded);

  const pathname = location.pathname;

  useEffect(() => {
    setOpenGroupId(null);
  }, [pathname]);

  useEffect(() => {
    const active = groups.find((g) =>
      g.items.some(
        (i) => pathname === i.to || pathname.startsWith(`${i.to}/`),
      ),
    );
    if (active) {
      setOpenGroupId(active.id);
    }
  }, [groups, pathname]);

  function isActive(to: string): boolean {
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  function groupHasActive(groupId: ShellNavGroupId): boolean {
    const group = groups.find((g) => g.id === groupId);
    return group?.items.some((i) => isActive(i.to)) ?? false;
  }

  function toggleRailExpanded() {
    setRailExpanded((prev) => {
      const next = !prev;
      writeShellNavRailExpanded(next);
      return next;
    });
  }

  const openGroup = openGroupId
    ? groups.find((g) => g.id === openGroupId)
    : undefined;

  const flyoutOpen = Boolean(openGroup);

  return (
    <nav
      className={styles.navRoot}
      data-flyout-open={flyoutOpen ? "true" : "false"}
      data-rail-expanded={railExpanded ? "true" : "false"}
      aria-label="Navegação principal"
    >
      {flyoutOpen ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Fechar menu"
          onClick={() => setOpenGroupId(null)}
        />
      ) : null}
      <div className={styles.railColumn}>
        <div className={styles.brandRail}>
          <img
            src={logoRailSmall}
            alt=""
            className={styles.brandLogoSmall}
            width={36}
            height={36}
            decoding="async"
          />
          <img
            src={logoRailLarge}
            alt="LioWMS"
            className={styles.brandLogoLarge}
            width={80}
            height={40}
            decoding="async"
          />
        </div>
        <div className={styles.railScroll}>
        <div className={styles.favorites} aria-label="Favoritos">
          <span className={styles.favoritesLabel} title="Favoritos">
            <ShellNavIconStar className={styles.railIcon} />
          </span>
          {favorites.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`${styles.railButton} ${styles.railButtonFavorite}`}
              data-active={isActive(item.to)}
              title={item.label}
              aria-current={isActive(item.to) ? "page" : undefined}
            >
              {shellNavFavoriteIcon(
                routeSegment(item.to),
                styles.railIcon,
              )}
              <span className={styles.railButtonHint}>
                {item.label.replace(/\s*\([^)]*\)\s*$/, "").trim()}
              </span>
            </Link>
          ))}
        </div>
        <div className={styles.groups}>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={styles.railButton}
              data-active={groupHasActive(group.id)}
              aria-expanded={openGroupId === group.id}
              aria-controls={
                openGroupId === group.id ? flyoutTitleId : undefined
              }
              title={group.title}
              aria-label={group.title}
              onClick={() =>
                setOpenGroupId((prev) =>
                  prev === group.id ? null : group.id,
                )
              }
            >
              {shellNavGroupIcon(group.id, styles.railIcon)}
              <span className={styles.railButtonHint}>{group.title}</span>
            </button>
          ))}
        </div>
        </div>
        <div className={styles.railFooter}>
        <button
          type="button"
          className={styles.railToggle}
          aria-expanded={railExpanded}
          aria-label={railExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
          title={railExpanded ? "Recolher menu" : "Expandir menu"}
          onClick={toggleRailExpanded}
        >
          {railExpanded ? (
            <ShellNavIconCollapse className={styles.railIcon} />
          ) : (
            <ShellNavIconExpand className={styles.railIcon} />
          )}
          <span className={styles.railButtonHint}>
            {railExpanded ? "Recolher" : "Expandir"}
          </span>
        </button>
        </div>
      </div>
      {openGroup ? (
        <div
          className={styles.flyout}
          role="region"
          aria-labelledby={flyoutTitleId}
        >
          <h2 className={styles.flyoutTitle} id={flyoutTitleId}>
            {openGroup.title}
          </h2>
          <ul className={styles.flyoutList}>
            {openGroup.items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={styles.flyoutLink}
                  data-active={isActive(item.to)}
                  aria-current={isActive(item.to) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}
