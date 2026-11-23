import base64
import concurrent.futures
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
from urllib.parse import quote

base = "https://myeonghun-game-portfolio.maek47115.chatgpt.site/"
out = Path("public")
prefix = "/" + os.environ["GITHUB_REPOSITORY"].split("/")[1]
with gzip.open("portfolio-transfer.json.gz") as handle:
    main, manifest = json.load(handle)

def fetch(key):
    return subprocess.check_output(["curl", "-fsSL", "--retry", "4", "--max-time", "160", base + quote(key)])

def validate(data, digest):
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError("File integrity mismatch")

def write(key, data):
    path = out / key
    if not path.resolve().is_relative_to(out.resolve()):
        raise ValueError(key)
    if path.suffix in (".html", ".js", ".css"):
        data = data.replace(b"/read/", prefix.encode() + b"/read/").replace(b'"/#ai"', b'"' + prefix.encode() + b'/#ai"')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)

def main_file(item):
    key, (digest, inline) = item
    data = base64.b64decode(inline) if inline is not None else fetch(key)
    validate(data, digest)
    write(key, data)

groups = {}
for key, info in manifest.items():
    if key.startswith("read/"):
        groups.setdefault(info[3], []).append((key, info))

def document_pack(item):
    digest, files = item
    data = fetch("packs/" + digest + ".bin")
    validate(data, digest)
    for key, (file_hash, size, mime, _, start) in files:
        content = data[start:start+size]
        validate(content, file_hash)
        write(key, content)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(main_file, main.items()))
    list(pool.map(document_pack, groups.items()))
for name in ("gate", "tavern", "raid", "journal"):
    assert (out/"read"/name/"index.html").is_file()
