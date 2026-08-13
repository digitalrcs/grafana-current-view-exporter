#!/usr/bin/env python3
"""Create a Grafana review ZIP with the required top-level plugin directory."""

from pathlib import Path
import hashlib
import json
import zipfile


PLUGIN_ID = "digitalrcs-currentviewexporter-app"
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
ARTIFACTS = ROOT / "artifacts"
OUTPUT = ARTIFACTS / f"{PLUGIN_ID}-{VERSION}.zip"
CHECKSUM = OUTPUT.with_suffix(".zip.sha1")


def main() -> None:
    if not (DIST / "plugin.json").is_file():
        raise SystemExit("dist/plugin.json is missing; run npm run build first")

    ARTIFACTS.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(path for path in DIST.rglob("*") if path.is_file()):
            relative = Path(PLUGIN_ID) / source.relative_to(DIST)
            info = zipfile.ZipInfo.from_file(source, relative.as_posix())
            archive.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)

    sha1 = hashlib.sha1(OUTPUT.read_bytes()).hexdigest()
    CHECKSUM.write_text(f"{sha1}  {OUTPUT.name}\n", encoding="ascii")
    print(OUTPUT)
    print(CHECKSUM)
    print(f"SHA1: {sha1}")


if __name__ == "__main__":
    main()
