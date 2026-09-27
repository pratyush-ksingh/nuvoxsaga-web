"""One-time pool of section illustrations for news briefs (Workers AI FLUX.2 klein, $0).

    python design/gen_section_images.py            # generate missing images only
    python design/gen_section_images.py --force    # regenerate all

Writes public/media/sections/<desk>-<section>-<n>.webp (1200 wide, 16:9) plus a -480
sibling for list thumbnails. The brief pipeline picks one per story by section and
labels it "AI illustration" (DESIGN.md §9). Prompts are deliberately generic and
symbolic: no real people, logos, flags, text or identifiable events, so an image can
never pass for a photo of the story it sits on.
"""
import io
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from gen_image import generate  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "media", "sections")
STYLE = ("editorial photographic illustration, cinematic low-key lighting, deep charcoal background, "
         "restrained color, shallow depth of field, no text, no letters, no logos, no flags, no people's faces")

POOL = {
    "ai-models": ["macro view of a glowing processor die with fine copper traces",
                  "abstract lattice of softly glowing nodes and connections floating in dark space",
                  "rows of server racks with small blue status lights in a dark data hall"],
    "ai-research": ["laboratory bench with a glass flask catching cool blue light beside a circuit board",
                    "abstract visualization of branching light paths like a neural network",
                    "close-up of a notebook with hand-drawn diagrams next to a glowing laptop, faceless"],
    "ai-business": ["modern glass office tower at dusk with lit windows",
                    "stacked silicon wafers reflecting cool light on a dark table",
                    "abstract rising bar shapes made of light on a dark surface"],
    "ai-policy": ["classical government building columns at night with soft light",
                  "wooden gavel on a desk next to a glowing microchip",
                  "empty conference table with microphones in a dim hall"],
    "ai-tools": ["close-up of a mechanical keyboard lit by a monitor glow",
                 "abstract floating code-like light lines without readable characters",
                 "developer desk with two monitors glowing in a dark room, no people"],
    "space-launch": ["unbranded rocket on a launch pad at night lit by floodlights",
                     "rocket exhaust plume rising into a twilight sky, seen from far away",
                     "empty launch tower silhouetted against dawn clouds"],
    "space-missions": ["unbranded spacecraft with solar panels orbiting above Earth's night side",
                       "lunar surface with long shadows and Earth rising on the horizon",
                       "space station module silhouette against the sun's glare"],
    "space-science": ["colorful nebula with dense star fields",
                      "spiral galaxy seen at an angle in deep space",
                      "large radio telescope dishes under a starry night sky"],
    "space-industry": ["satellite on an assembly stand in a clean room, workers out of frame",
                       "rows of small satellites in a factory under white light",
                       "rocket engine nozzle close-up in a test facility"],
    "space-policy": ["Earth from orbit with thin atmosphere glow at the horizon",
                     "conference hall with a large screen showing a starfield, empty seats",
                     "classical columns at night under a clear starry sky"],
    "world-asia": ["aerial view of a river winding through green mountains at dawn",
                   "busy harbor with container cranes at dusk, seen from above",
                   "terraced hillside fields in soft morning mist"],
    "world-americas": ["long highway through a desert under a dramatic sky",
                       "aerial view of a large river through dense rainforest",
                       "city skyline across a bay at blue hour, unrecognizable"],
    "world-europe": ["cobbled old town square at night with warm lamps, empty",
                     "river crossing an old city with stone bridges at dusk, unrecognizable",
                     "wind turbines on rolling green hills under clouds"],
    "world-middle-east-africa": ["desert dunes at sunset with long shadows",
                                 "acacia trees on a savanna at golden hour",
                                 "aerial view of a port city by a turquoise sea, unrecognizable"],
    "world-health-climate": ["laboratory test tubes in a rack under cool light",
                             "cracked dry earth under a hazy sun",
                             "storm clouds gathering over the ocean seen from above"],
}


def main(force: bool) -> None:
    os.makedirs(ROOT, exist_ok=True)
    manifest = {}
    for key, prompts in POOL.items():
        for i, subject in enumerate(prompts, 1):
            name = f"{key}-{i}"
            big = os.path.join(ROOT, f"{name}.webp")
            manifest[name] = {"alt": f"Illustration: {subject}"}
            if os.path.exists(big) and not force:
                continue
            tmp = os.path.join(ROOT, f"{name}.png")
            generate(tmp, 1024, 576, f"{subject}, {STYLE}")
            img = Image.open(tmp).convert("RGB")
            img.resize((1200, 675), Image.LANCZOS).save(big, "WEBP", quality=80)
            img.resize((480, 270), Image.LANCZOS).save(os.path.join(ROOT, f"{name}-480.webp"), "WEBP", quality=78)
            os.remove(tmp)
    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"{len(manifest)} section illustrations in {ROOT}")


if __name__ == "__main__":
    main("--force" in sys.argv)
