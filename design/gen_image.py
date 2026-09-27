"""Generate design images with Cloudflare Workers AI (FLUX.2 klein 4B) at $0.

Cost: ~26 neurons per 512x512 output tile (1024x1024 ≈ 104 neurons). The free
allocation is 10,000 neurons/day on every plan, so ~90 images/day stay free.

Auth: reuses the local `wrangler login` OAuth token (read here, never printed or saved).

    python design/gen_image.py <out.png> <width> <height> "<prompt>"
"""
import base64
import json
import os
import re
import sys
import urllib.request
import uuid

ACCOUNT = "6c7c41910e02b4c1f9bb306eca648e1f"
MODEL = "@cf/black-forest-labs/flux-2-klein-4b"


def token() -> str:
    cfg = open(os.path.expandvars(r"%APPDATA%\xdg.config\.wrangler\config\default.toml")).read()
    return re.search(r'oauth_token\s*=\s*"([^"]+)"', cfg).group(1)


def generate(out: str, width: int, height: int, prompt: str) -> None:
    boundary = uuid.uuid4().hex
    fields = {"prompt": prompt, "width": str(width), "height": str(height)}
    body = b"".join(
        f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        for k, v in fields.items()
    ) + f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{MODEL}",
        data=body,
        headers={"Authorization": f"Bearer {token()}",
                 "Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    data = json.load(urllib.request.urlopen(req, timeout=180))
    if not data.get("success"):
        raise SystemExit(f"generation failed: {data.get('errors')}")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "wb") as f:
        f.write(base64.b64decode(data["result"]["image"]))
    print(f"wrote {out} ({width}x{height})")


if __name__ == "__main__":
    generate(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4])
