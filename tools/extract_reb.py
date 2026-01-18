import argparse
import gzip
import re
from pathlib import Path

REB_RE = re.compile(r"<reb>([^<]+)</reb>")

def iter_reb_from_gz(gz_path: Path):
    # DTD問題を避けるためXMLパーサではなく、ストリーム正規表現で抜く
    buf = ""
    with gzip.open(gz_path, "rt", encoding="utf-8", errors="ignore") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            buf += chunk
            # 末尾にタグが跨る可能性があるので少し残す
            if len(buf) > 2_000_000:
                keep = buf[-10_000:]
                body = buf[:-10_000]
                for m in REB_RE.finditer(body):
                    yield m.group(1).strip()
                buf = keep

    for m in REB_RE.finditer(buf):
        yield m.group(1).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", dest="out", required=True)
    args = ap.parse_args()

    inp = Path(args.inp)
    out = Path(args.out)

    out.parent.mkdir(parents=True, exist_ok=True)

    seen = set()
    with out.open("w", encoding="utf-8", newline="\n") as w:
        for reb in iter_reb_from_gz(inp):
            if not reb:
                continue
            # 重複は後工程でも消えるが、ここで減らしておく
            if reb in seen:
                continue
            seen.add(reb)
            w.write(reb + "\n")

    print(f"OK: {len(seen)} readings -> {out}")

if __name__ == "__main__":
    main()
