#!/usr/bin/env python3
"""Generate LioWMS rail logo PNGs (PAP-272). Stdlib only."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ACCENT = (41, 76, 152)  # #294c98
ACCENT_LIGHT = (120, 150, 210)
PRIMARY = (1, 46, 90)


def _png_rgb(path: Path, width: int, height: int, pixels: list[tuple[int, int, int]]) -> None:
    assert len(pixels) == width * height
    def row_bytes(y: int) -> bytes:
        row = pixels[y * width : (y + 1) * width]
        return b"\x00" + b"".join(bytes((r, g, b)) for r, g, b in row)

    raw = b"".join(row_bytes(y) for y in range(height))
    compressed = zlib.compress(raw, 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    out = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(out)


def _lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def _gradient_icon(size: int) -> list[tuple[int, int, int]]:
    cx = cy = (size - 1) / 2
    radius = size * 0.48
    pixels: list[tuple[int, int, int]] = []
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = (dx * dx + dy * dy) ** 0.5
            if dist > radius:
                pixels.append(PRIMARY)
                continue
            t = (x + y) / (2 * (size - 1))
            r = _lerp(ACCENT[0], ACCENT_LIGHT[0], t)
            g = _lerp(ACCENT[1], ACCENT_LIGHT[1], t)
            b = _lerp(ACCENT[2], ACCENT_LIGHT[2], t)
            # soften corners
            edge = max(0.0, min(1.0, (radius - dist) / 2.5))
            bg = PRIMARY
            r = _lerp(bg[0], r, edge)
            g = _lerp(bg[1], g, edge)
            b = _lerp(bg[2], b, edge)
            pixels.append((r, g, b))
    return pixels


def _large_wordmark(width: int, height: int) -> list[tuple[int, int, int]]:
    pixels = [PRIMARY for _ in range(width * height)]
    # left icon block
    icon = 32
    for y in range(height):
        for x in range(icon + 4):
            if x < icon and y >= (height - icon) // 2 and y < (height + icon) // 2:
                ix = x
                iy = y - (height - icon) // 2
                sub = _gradient_icon(icon)
                pixels[y * width + x] = sub[iy * icon + ix]
    # simple bars suggesting "LioWMS" text area
    text_y0 = height // 2 - 6
    for bar_y in range(text_y0, text_y0 + 12):
        for x in range(icon + 10, width - 6):
            if bar_y in (text_y0, text_y0 + 5, text_y0 + 11):
                pixels[bar_y * width + x] = (255, 255, 255)
            elif x == icon + 10 and text_y0 < bar_y < text_y0 + 11:
                pixels[bar_y * width + x] = (255, 255, 255)
    return pixels


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "src" / "assets" / "brand"
    _png_rgb(root / "lio-logo-rail-small.png", 36, 36, _gradient_icon(36))
    _png_rgb(root / "lio-logo-rail-large.png", 80, 40, _large_wordmark(80, 40))
    print("wrote", root)


if __name__ == "__main__":
    main()
