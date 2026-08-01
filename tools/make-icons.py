#!/usr/bin/env python3
"""
Genera los iconos de la app: la dona del dashboard sobre el morado de marca.

Sin dependencias — escribe el PNG a mano con zlib. Se dibuja con supermuestreo
3x3 para que el borde del anillo salga suave a cualquier tamaño.

    python3 tools/make-icons.py

Reescribe public/apple-touch-icon.png, icon-192.png e icon-512.png.
"""

import math
import struct
import zlib

GROUND = (0x7A, 0x6C, 0xC4)  # --color-accent del tema claro: la identidad de la app

# La dona, en vueltas. Empieza arriba y gira en el sentido del reloj, igual que
# el conic-gradient del dashboard.
SEGMENTS = [
    (0.55, (0xF5, 0xF4, 0xFF)),  # accent-100, casi blanco: el trozo que da el golpe de vista
    (0.30, (0xD2, 0xCE, 0xFD)),  # accent-300
    (0.15, (0x2B, 0x27, 0x41)),  # accent-900, para que el anillo cierre con definición
]

R_OUTER = 0.34  # del lado. 68% de diámetro deja margen para el recorte de Android
R_INNER = 0.19
SS = 3  # muestras por eje


def segment_color(turn: float):
    acc = 0.0
    for span, color in SEGMENTS:
        acc += span
        if turn < acc:
            return color
    return SEGMENTS[-1][1]


def render(size: int) -> bytes:
    cx = cy = size / 2.0
    r_out, r_in = R_OUTER * size, R_INNER * size
    rows = []
    step = 1.0 / SS
    offsets = [(i + 0.5) * step for i in range(SS)]

    for y in range(size):
        row = bytearray()
        for x in range(size):
            r = g = b = 0
            for dy in offsets:
                py = y + dy - cy
                for dx in offsets:
                    px = x + dx - cx
                    dist = math.hypot(px, py)
                    if r_in <= dist <= r_out:
                        # atan2 medido desde arriba, en el sentido del reloj
                        turn = (math.atan2(px, -py) / (2 * math.pi)) % 1.0
                        c = segment_color(turn)
                    else:
                        c = GROUND
                    r += c[0]
                    g += c[1]
                    b += c[2]
            n = SS * SS
            row += bytes((r // n, g // n, b // n))
        rows.append(bytes(row))

    raw = b''.join(b'\x00' + r for r in rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


if __name__ == '__main__':
    for path, size in [
        ('public/apple-touch-icon.png', 180),
        ('public/icon-192.png', 192),
        ('public/icon-512.png', 512),
    ]:
        with open(path, 'wb') as fh:
            fh.write(render(size))
        print(f'{path}  {size}x{size}')
