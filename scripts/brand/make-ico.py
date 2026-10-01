"""Pack scripts/brand/out/mark-{16,32,48}.png into app/favicon.ico, one hand-rendered image per
size (Pillow's ICO writer would scale a single image down instead). PNG-compressed ICO
entries are supported by every current browser.

    python scripts/brand/make-ico.py
"""
import os
import struct

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SIZES = (16, 32, 48)

images = []
for s in SIZES:
    with open(os.path.join(ROOT, "scripts", "brand", "out", f"mark-{s}.png"), "rb") as f:
        images.append((s, f.read()))

header = struct.pack("<HHH", 0, 1, len(images))  # reserved, type 1 = icon, count
offset = 6 + 16 * len(images)
entries, blobs = b"", b""
for size, data in images:
    # width, height, colours, reserved, planes, bits per pixel, bytes, offset
    entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
    blobs += data
    offset += len(data)

out = os.path.join(ROOT, "app", "favicon.ico")
with open(out, "wb") as f:
    f.write(header + entries + blobs)
print(f"app/favicon.ico: {', '.join(f'{s}px' for s in SIZES)} ({os.path.getsize(out)} bytes)")
