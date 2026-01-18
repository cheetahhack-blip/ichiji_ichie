# 一字一会 辞書運用メモ

## ファイル構成
- dict/base_words.txt
  - 外部辞書由来の語（大量）
  - tools/build_base.py で生成する（手編集しない）
- dict/extra_words.txt
  - 採用語・イベント用・身内用の追加語（手動編集）
- dict/deny_words.txt
  - 無効化したい語（手動編集）
  - base/extra にあっても deny に書けば無効

## 書式（3ファイル共通）
- 1行1語
- 空行OK
- # から始まる行はコメント
- 文字：ひらがな（小文字含む）＋「ー」だけ
- 長さ：1〜10
- 禁止：語頭が「ー」または小文字（ぁぃぅぇぉゃゅょっゎ等）
- 禁止：同一語内の同一文字の重複

※違反語がファイル内にあっても、読み込み時に自動で弾かれる。

## 更新手順
### extra/deny を編集したとき
1. dict/extra_words.txt または dict/deny_words.txt を編集
2. ブラウザを再読み込み

注意：PWA（Service Worker）が辞書をキャッシュしている場合、編集が反映されないことがある。
その場合は以下のどちらかを行う：
- service-worker.js の CACHE_NAME を更新して再読み込み
- DevTools → Application → Storage → Clear site data（または Service Worker の Unregister）

### base を更新したいとき（外部辞書の再取り込み）
1. dict_raw/ に元データ（読みのリストなど）を置く
2. tools/build_base.py を実行して dict/base_words.txt を生成
3. 再読み込み（キャッシュ注意は同じ）

## 例
### extra_words.txt
# イベント語
ばすてぃーゆ
けんちく

### deny_words.txt
# 雰囲気に合わない/簡単すぎる等
ああ
てすと
