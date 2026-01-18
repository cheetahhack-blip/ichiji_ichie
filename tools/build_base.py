import argparse
import csv
import re
from pathlib import Path
from collections import Counter

# ---- ルール（ゲーム側と合わせる）----
BAD_START = set(["ー", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゃ", "ゅ", "ょ", "っ", "ゎ", "ゕ", "ゖ"])

HIRAGANA_RE = re.compile(r"^[ぁ-ゖー]+$")

def kata_to_hira(s: str) -> str:
    # カタカナ(ァ-ヶ)をひらがなへ
    out = []
    for ch in s:
        code = ord(ch)
        if 0x30A1 <= code <= 0x30F6:
            out.append(chr(code - 0x60))
        else:
            out.append(ch)
    return "".join(out)

def normalize(s: str) -> str:
    s = s.strip()
    s = kata_to_hira(s)
    # よくある空白/全角スペース除去
    s = s.replace("　", "").replace(" ", "")
    return s

def has_duplicate_chars(word: str) -> bool:
    chars = list(word)
    return len(set(chars)) != len(chars)

def is_acceptable_word(word: str) -> bool:
    # normalize済み前提
    if not word:
        return False
    chars = list(word)
    if len(chars) < 1 or len(chars) > 10:
        return False
    if not HIRAGANA_RE.match(word):
        return False
    if chars[0] in BAD_START:
        return False
    if has_duplicate_chars(word):
        return False
    return True

def detect_sep(path: Path) -> str:
    # ざっくり推定
    sample = path.read_text(encoding="utf-8", errors="ignore")[:2000]
    if "\t" in sample and sample.count("\t") >= sample.count(","):
        return "\t"
    return ","

def iter_lines_plain(path: Path):
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        t = raw.strip()
        if not t or t.startswith("#"):
            continue
        yield t

def iter_tsv_csv(path: Path, sep: str, col: int):
    # quotingが混ざる場合に備えてcsvで読む
    with path.open("r", encoding="utf-8", errors="ignore", newline="") as f:
        reader = csv.reader(f, delimiter=sep)
        for row in reader:
            if not row:
                continue
            # コメント行
            if row[0].startswith("#"):
                continue
            if col >= len(row):
                continue
            val = row[col]
            if val is None:
                continue
            val = str(val).strip()
            if not val:
                continue
            yield val

def main():
    p = argparse.ArgumentParser(
        description="外部辞書から読み(かな)を抽出し、ゲーム用 base_words.txt を生成する"
    )
    p.add_argument("--input", "-i", action="append", required=True,
                   help="入力ファイル（複数指定可）: --input a.txt --input b.tsv")
    p.add_argument("--out", "-o", default="dict/base_words.txt",
                   help="出力先（上書き）")
    p.add_argument("--mode", choices=["plain", "tsv", "csv"], default="plain",
                   help="plain=1行1語(かな想定) / tsv,csv=列指定で抽出")
    p.add_argument("--col", type=int, default=0,
                   help="tsv/csvのとき、読みが入っている列(0始まり)")
    p.add_argument("--sep", default="auto",
                   help="tsv/csvの区切り文字。auto なら推定（tsv優先）")
    p.add_argument("--deny", default="dict/deny_words.txt",
                   help="deny_words.txt（存在しなければ無視）")
    p.add_argument("--report", default="tools/build_report.txt",
                   help="処理レポートの出力先")
    args = p.parse_args()

    inputs = [Path(x) for x in args.input]
    out_path = Path(args.out)
    deny_path = Path(args.deny)
    report_path = Path(args.report)

    deny_set = set()
    if deny_path.exists():
        for s in iter_lines_plain(deny_path):
            w = normalize(s)
            if w:
                deny_set.add(w)

    accepted = set()
    reasons = Counter()
    total_seen = 0

    for path in inputs:
        if not path.exists():
            raise SystemExit(f"入力が見つからない: {path}")

        if args.mode == "plain":
            it = iter_lines_plain(path)
        else:
            sep = args.sep
            if sep == "auto":
                sep = detect_sep(path)
            sep = "\t" if sep == "\\t" else sep
            it = iter_tsv_csv(path, sep=sep, col=args.col)

        for raw in it:
            total_seen += 1
            w = normalize(raw)
            if not w:
                reasons["empty"] += 1
                continue
            if w in deny_set:
                reasons["denied"] += 1
                continue
            if not is_acceptable_word(w):
                # 分解して理由を少しだけ分類
                if not HIRAGANA_RE.match(w):
                    reasons["bad_charset"] += 1
                elif len(w) < 1 or len(w) > 10:
                    reasons["bad_length"] += 1
                elif w[0] in BAD_START:
                    reasons["bad_start"] += 1
                elif has_duplicate_chars(w):
                    reasons["dup_char"] += 1
                else:
                    reasons["rejected_other"] += 1
                continue

            accepted.add(w)

    # ソート（長さ→辞書順）
    out_list = sorted(accepted, key=lambda x: (len(x), x))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(out_list) + ("\n" if out_list else ""),
                        encoding="utf-8")

    # レポート
    report_path.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    lines.append("=== build_base report ===")
    lines.append(f"inputs: {', '.join(str(p) for p in inputs)}")
    lines.append(f"mode: {args.mode} col: {args.col} sep: {args.sep}")
    lines.append(f"deny: {deny_path} (loaded {len(deny_set)})")
    lines.append(f"seen: {total_seen}")
    lines.append(f"accepted(unique): {len(accepted)}")
    lines.append("")
    lines.append("rejected breakdown:")
    for k, v in reasons.most_common():
        lines.append(f"  {k}: {v}")
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"OK: wrote {len(out_list)} words -> {out_path}")
    print(f"report -> {report_path}")

if __name__ == "__main__":
    main()
