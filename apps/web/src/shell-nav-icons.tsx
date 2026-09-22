import type { ReactNode } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faAnglesLeft,
  faAnglesRight,
  faBoxesStacked,
  faCartShopping,
  faCogs,
  faDolly,
  faHouse,
  faReceipt,
  faStar,
  faTruck,
  faUserGear,
} from "@fortawesome/free-solid-svg-icons";
import type { ShellNavGroupId } from "./shell-nav-groups";

type IconProps = { className?: string };

function FaIcon({
  className,
  icon,
}: IconProps & { icon: IconDefinition }) {
  return (
    <FontAwesomeIcon
      className={className}
      icon={icon}
      fixedWidth
      aria-hidden
    />
  );
}

export function ShellNavIconHome({ className }: IconProps) {
  return <FaIcon className={className} icon={faHouse} />;
}

export function ShellNavIconInbound({ className }: IconProps) {
  return <FaIcon className={className} icon={faDownload} />;
}

export function ShellNavIconOperations({ className }: IconProps) {
  return <FaIcon className={className} icon={faCogs} />;
}

export function ShellNavIconInventory({ className }: IconProps) {
  return <FaIcon className={className} icon={faBoxesStacked} />;
}

export function ShellNavIconAdmin({ className }: IconProps) {
  return <FaIcon className={className} icon={faUserGear} />;
}

export function ShellNavIconStar({ className }: IconProps) {
  return <FaIcon className={className} icon={faStar} />;
}

export function ShellNavIconReceipt({ className }: IconProps) {
  return <FaIcon className={className} icon={faReceipt} />;
}

export function ShellNavIconPutaway({ className }: IconProps) {
  return <FaIcon className={className} icon={faDolly} />;
}

export function ShellNavIconPicking({ className }: IconProps) {
  return <FaIcon className={className} icon={faCartShopping} />;
}

export function ShellNavIconShipping({ className }: IconProps) {
  return <FaIcon className={className} icon={faTruck} />;
}

export function ShellNavIconCollapse({ className }: IconProps) {
  return <FaIcon className={className} icon={faAnglesLeft} />;
}

export function ShellNavIconExpand({ className }: IconProps) {
  return <FaIcon className={className} icon={faAnglesRight} />;
}

export function shellNavGroupIcon(
  groupId: ShellNavGroupId,
  className?: string,
): ReactNode {
  switch (groupId) {
    case "home":
      return <ShellNavIconHome className={className} />;
    case "inbound":
      return <ShellNavIconInbound className={className} />;
    case "operations":
      return <ShellNavIconOperations className={className} />;
    case "inventory":
      return <ShellNavIconInventory className={className} />;
    case "admin":
      return <ShellNavIconAdmin className={className} />;
  }
}

export function shellNavFavoriteIcon(
  segment: string,
  className?: string,
): ReactNode {
  switch (segment) {
    case "receipt":
      return <ShellNavIconReceipt className={className} />;
    case "putaway":
      return <ShellNavIconPutaway className={className} />;
    case "picking":
      return <ShellNavIconPicking className={className} />;
    case "shipping":
      return <ShellNavIconShipping className={className} />;
    default:
      return <ShellNavIconStar className={className} />;
  }
}
