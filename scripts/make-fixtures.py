"""Write layout-review fixtures to content-fixtures/posts (never shipped).

    python scripts/make-fixtures.py
    NUVOXSAGA_CONTENT_DIR=content-fixtures npx next dev

Every fixture is labelled "Sample" so it cannot be mistaken for reporting. A production
build refuses NUVOXSAGA_CONTENT_DIR (lib/content.ts).

lib/content.ts only builds stories that carry a fact-check record, so every fixture has a
placeholder `checkedClaims`. Three in four fixtures get a desk section image
(public/media/sections, tracked) so layouts are reviewed with and without photos.
"""
import json
import os
import shutil
from datetime import datetime, timedelta, timezone

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content-fixtures", "posts")

DESKS = {
    "nuvox_ai": ["models", "research", "business", "policy", "tools"],
    "nuvox_space": ["launch", "missions", "science", "industry", "policy"],
    "nuvox_world": ["asia", "americas", "europe", "middle-east-africa", "health-climate"],
}
HEADLINES = [
    "Sample: a lab releases a smaller model that matches last year's flagship on coding tests",
    "Sample: agency confirms second launch window for its lunar lander after a sensor swap",
    "Sample: regional bloc agrees a framework on cross-border power trading",
    "Sample: researchers publish a method that halves the memory needed for long documents",
    "Sample: telescope team reports water vapour signal from a warm sub-Neptune",
    "Sample: health body updates guidance on heat illness as record temperatures persist",
    "Sample: chipmaker outlines a new accelerator for data centres, shipping next year",
    "Sample: reusable booster flies for the twentieth time",
    "Sample: UN report tracks the number of people displaced by floods this season",
    "Sample: open-source toolkit adds evaluation suite for agents",
]
TAGS = [["Open models", "Benchmarks"], ["Moon", "Landers"], ["Energy"], ["Research"], ["Exoplanets", "JWST"],
        ["Heat", "Health"], ["Chips"], ["Reusability", "Launch"], ["Floods", "Climate"], ["Agents", "Open models"]]


def main() -> None:
    shutil.rmtree(ROOT, ignore_errors=True)
    now = datetime.now(timezone.utc)
    i = 0
    for brand, sections in DESKS.items():
        os.makedirs(os.path.join(ROOT, brand), exist_ok=True)
    for n in range(42):
        brand = list(DESKS)[n % 3]
        sections = DESKS[brand]
        kind = "feature" if n % 5 == 0 else "brief"
        slug = f"sample-story-{n + 1}"
        post = {
            "slug": slug,
            "brand": brand,
            "status": "published",
            "kind": kind,
            "section": sections[n % len(sections)],
            "featured": n in (0, 7),
            "title": HEADLINES[n % len(HEADLINES)],
            "excerpt": "Sample story for layout review. This deck runs about as long as a real one, two lines on a phone.",
            "bodyHtml": "<p>Sample body text for layout review. It is not a news report.</p>" * 6,
            "publishedAt": (now - timedelta(hours=n * 2 + 1, minutes=n * 7)).isoformat().replace("+00:00", "Z"),
            "readingTimeMin": 6 if kind == "feature" else 1,
            "tags": TAGS[n % len(TAGS)],
        }
        post["checkedClaims"] = [{"claim": "Sample claim for layout review", "source": "https://example.com/sample"}]
        if n % 4 != 3:
            desk = brand.split("_", 1)[1]
            section = post["section"]
            post["image"] = {
                "src": f"/media/sections/{desk}-{section}-{n % 3 + 1}.webp",
                "alt": f"Illustration for a sample {desk} {section} story",
                "credit": "AI illustration",
            }
        if kind == "brief":
            post["source"] = {"name": "Sample source", "url": "https://example.com/sample"}
        with open(os.path.join(ROOT, brand, f"{slug}.json"), "w", encoding="utf-8") as f:
            json.dump(post, f, indent=2)
        i += 1
    print(f"wrote {i} fixtures to {ROOT}")


if __name__ == "__main__":
    main()
