"""Compare the frozen PNG pairs; requires Pillow, never starts an app."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops

before, after, output = map(Path, sys.argv[1:])
left, right = json.loads(before.read_text()), json.loads(after.read_text())
assert not left["errors"] and not right["errors"]
rows = []
for a, b in zip(left["images"], right["images"], strict=True):
    assert a["name"] == b["name"]
    x = Image.open(before.parent / a["file"]).convert("RGBA")
    y = Image.open(after.parent / b["file"]).convert("RGBA")
    assert x.size == y.size
    delta = ImageChops.difference(x, y)
    maximum = max(v[1] for v in delta.getextrema())
    raw = delta.tobytes()
    changed = sum(any(raw[i:i + 4]) for i in range(0, len(raw), 4))
    rows.append({"name": a["name"], "size": list(x.size), "maxChannelDifference": maximum, "changedPixels": changed,
                 "before": a["file"], "after": b["file"]})
output.write_text(json.dumps(rows, indent=2) + "\n")
print(json.dumps(rows, indent=2))
sys.exit(any(r["maxChannelDifference"] for r in rows))
