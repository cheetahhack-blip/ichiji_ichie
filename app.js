(() => {
  const MODES = { Easy: 6, Normal: 7, Hard: 8, Expert: 9, Hell: 10 };
  const ROW_COUNT = 10;

  const STORAGE = {
    myWords: "ichiji_my_words",
    best: "ichiji_best_times",
    dictVer: "ichiji_dict_version",
  };

  const DICT_VERSION = "2026-01-18_v4";

  const APP_VERSION = "0.1.0"; // ←更新したらここを上げる（PWAの更新にも使う）

  // Licenses
  const licensesBtn = document.getElementById("licensesBtn");
  const licBackdrop = document.getElementById("licBackdrop");
  const licModal = document.getElementById("licModal");
  const closeLicBtn = document.getElementById("closeLicBtn");
  const licText = document.getElementById("licText");

  const BAD_START = new Set([
    "ー","ぁ","ぃ","ぅ","ぇ","ぉ","ゃ","ゅ","ょ","っ","ゎ","ゕ","ゖ"
  ]);

  function isBadStartChar(ch) {
    return BAD_START.has(ch);
  }

  function hasDuplicateChars(word) {
    const chars = [...word];
    return new Set(chars).size !== chars.length;
  }

  // 辞書登録・マイ辞書登録に使う検査
  function isAcceptableWord(word) {
    // word は normalizeWord 済み前提
    if (!word) return false;
    const chars = [...word];

    // 1〜10
    if (chars.length < 1 || chars.length > 10) return false;

    // 許可文字：ひらがな（ぁ-ゖ）と ー のみ
    for (const ch of chars) {
      if (!(/[ぁ-ゖー]/.test(ch))) return false;
    }

    // 語頭禁止
    if (isBadStartChar(chars[0])) return false;

    // ゲーム仕様に合わせて、語内重複は弾く（推奨）
    if (hasDuplicateChars(word)) return false;

    return true;
  }

  // 五十音表：列（横）＝（左右反転）わ ら や ま は な た さ か あ
  // 行（縦）＝あいうえお（※この「あいうえお列」が一番右に来る）
  const SEION_COLS = ["わ","ら","や","ま","は","な","た","さ","か","あ"];
  const SEION = {
    // 「わ　　　を」を「わをん　　」に：わ列を [わ, を, ん, "", ""] にする
    "わ": ["わ","を","ん","",""],
    "ら": ["ら","り","る","れ","ろ"],
    "や": ["や","","ゆ","","よ"],
    "ま": ["ま","み","む","め","も"],
    "は": ["は","ひ","ふ","へ","ほ"],
    "な": ["な","に","ぬ","ね","の"],
    "た": ["た","ち","つ","て","と"],
    "さ": ["さ","し","す","せ","そ"],
    "か": ["か","き","く","け","こ"],
    "あ": ["あ","い","う","え","お"],
  };

  // 下の表も左右反転相当
  // ぁぃぅぇぉ / ゃ ゅ ょ / っ ー を追加する
  // 10列に揃える：わ ら や ま は (特殊) ぱ ば だ ざ が みたいに見える並び
  // ※濁音が一番右へ、という意味で「が」が右端になる
  const OTHER_COLS = ["ー","", "ゃ", "ぱ", "ば", "っ", "だ", "ざ", "が", "ぁ"].slice(-10);

  // 上の slice(-10) で 10列にしているので、実際の並びは
  // ["ー", "ゃ", "ぱ", "ば", "っ", "だ", "ざ", "が", "ぁ"] + "ー"の右の空で計10列 になる想定
  // （空欄は点線枠で表示される）
  const OTHER = {
    "ぁ": ["ぁ","ぃ","ぅ","ぇ","ぉ"],
    "が": ["が","ぎ","ぐ","げ","ご"],
    "ざ": ["ざ","じ","ず","ぜ","ぞ"],
    "だ": ["だ","ぢ","づ","で","ど"],
    "っ": ["","","っ","",""],
    "ば": ["ば","び","ぶ","べ","ぼ"],
    "ぱ": ["ぱ","ぴ","ぷ","ぺ","ぽ"],
    "ゃ": ["ゃ","","ゅ","","ょ"],
    "ー": ["ー","","","",""],
  };

  // ---- DOM（タイトル）----
  const screenTitle = document.getElementById("screenTitle");
  const screenGame = document.getElementById("screenGame");
  const modeSelect = document.getElementById("modeSelect");
  const goPlayBtn = document.getElementById("goPlayBtn");
  const titleWarn = document.getElementById("titleWarn");
  const dictStatus = document.getElementById("dictStatus");
  const bestTime = document.getElementById("bestTime");

  // ---- DOM（ゲーム）----
  const modeLabel = document.getElementById("modeLabel");
  const toTitleBtn = document.getElementById("toTitleBtn");
  const restartBtn = document.getElementById("restartBtn");
  const timerEl = document.getElementById("timer");
  const bestTime2 = document.getElementById("bestTime2");
  const dictStatus2 = document.getElementById("dictStatus2");
  const rowsEl = document.getElementById("rows");
  const globalWarnEl = document.getElementById("globalWarn");

  const clearBackdrop = document.getElementById("clearBackdrop");
  const clearModal = document.getElementById("clearModal");
  const closeClearBtn = document.getElementById("closeClearBtn");
  const clearTimeText = document.getElementById("clearTimeText");
  const clearBestText = document.getElementById("clearBestText");
  const clearRestartBtn = document.getElementById("clearRestartBtn");
  const clearToTitleBtn = document.getElementById("clearToTitleBtn");

  // キーボード（表）
  const kbdSeionEl = document.getElementById("kbdSeion");
  const kbdOtherEl = document.getElementById("kbdOther");

  // 直接入力
  const directRowSelect = document.getElementById("directRowSelect");
  const directInput = document.getElementById("directInput");
  const directBackspace = document.getElementById("directBackspace");
  const directClear = document.getElementById("directClear");
  const directJudge = document.getElementById("directJudge");

  // マイ辞書
  const myDictBtn = document.getElementById("myDictBtn");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const myDictModal = document.getElementById("myDictModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const myWordInput = document.getElementById("myWordInput");
  const addMyWordBtn = document.getElementById("addMyWordBtn");
  const myDictMsg = document.getElementById("myDictMsg");
  const myDictList = document.getElementById("myDictList");

  // ---- 状態 ----
  let mode = modeSelect.value;
  let activeRowCount = MODES[mode];
  let selectedRow = 0;

  let dictReady = false;
  let dictSet = new Set();
  let baseSet = new Set();

  let timer = { running: false, startMs: 0, raf: 0, endMs: 0 };

  function rowCap(i) { return i + 1; } // 1行目=1マス, 2行目=2マス…
  function isActiveRow(i) { return i < activeRowCount; }

  function makeRows() {
    return Array.from({ length: ROW_COUNT }, (_, i) => ({
      cells: Array(rowCap(i)).fill(""),
      judged: "none", // "none" | "ok" | "ng"
    }));
  }
  let rows = makeRows();

  // ---- 正規化 ----
  function toHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }
  function normalizeWord(str) { return toHiragana((str || "").trim()); }

  function filterHiraganaLike(str) {
    const s = normalizeWord(str);
    const chars = [...s].filter(ch => /[ぁ-ゖー]/.test(ch));
    return chars.join("");
  }

  function rowText(i) { return rows[i].cells.join(""); }
  function rowFilled(i) { return rows[i].cells.every(c => c !== ""); }

  function rowHasDup(i) {
    const chars = rows[i].cells.filter(Boolean);
    return new Set(chars).size !== chars.length;
  }

  function globalCharCount() {
    const m = new Map();
    for (let i = 0; i < activeRowCount; i++) {
      for (const ch of rows[i].cells) {
        if (!ch) continue;
        m.set(ch, (m.get(ch) || 0) + 1);
      }
    }
    return m;
  }

  function rowHasCrossDup(i, counts) {
    for (const ch of rows[i].cells) {
      if (!ch) continue;
      if ((counts.get(ch) || 0) >= 2) return true;
    }
    return false;
  }

  // ---- タイマー ----
  function formatTime(ms) {
    const total = ms / 1000;
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(Math.floor(s)).padStart(2, "0");
    const d = Math.floor((s - Math.floor(s)) * 10);
    return `${mm}:${ss}.${d}`;
  }
  function timerNowMs() {
    return timer.running ? (performance.now() - timer.startMs) : (timer.endMs - timer.startMs);
  }
  function tick() {
    timerEl.textContent = formatTime(timerNowMs());
    if (timer.running) timer.raf = requestAnimationFrame(tick);
  }
  function startTimer() {
    cancelAnimationFrame(timer.raf);
    timer.running = true;
    timer.startMs = performance.now();
    timer.endMs = timer.startMs;
    timerEl.textContent = "00:00.0";
    timer.raf = requestAnimationFrame(tick);
  }
  function stopTimer() {
    if (!timer.running) return;
    timer.running = false;
    timer.endMs = performance.now();
    cancelAnimationFrame(timer.raf);
    timerEl.textContent = formatTime(timerNowMs());
  }

  // ---- ベスト ----
  function loadBestTimes() {
    try { return JSON.parse(localStorage.getItem(STORAGE.best) || "{}"); } catch { return {}; }
  }
  function saveBestTimes(obj) { localStorage.setItem(STORAGE.best, JSON.stringify(obj)); }
  function updateBestTimeUI() {
    const best = loadBestTimes();
    const ms = best[mode];
    const text = (typeof ms === "number") ? formatTime(ms) : "--";
    bestTime.textContent = text;
    bestTime2.textContent = text;
  }
  function maybeUpdateBest(ms) {
    const best = loadBestTimes();
    const cur = best[mode];
    if (typeof cur !== "number" || ms < cur) {
      best[mode] = ms;
      saveBestTimes(best);
      updateBestTimeUI();
      return true;
    }
    return false;
  }

  // ---- マイ辞書 ----
  function loadMyWords() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE.myWords) || "[]");
      if (!Array.isArray(arr)) return [];
      return arr.map(normalizeWord).filter(Boolean);
    } catch {
      return [];
    }
  }
  function saveMyWords(arr) { localStorage.setItem(STORAGE.myWords, JSON.stringify(arr)); }

  function refreshMyDictUI() {
    const words = loadMyWords();
    myDictList.innerHTML = "";
    for (const w of words) {
      const li = document.createElement("li");
      const left = document.createElement("span");
      left.textContent = w;
      const del = document.createElement("button");
      del.textContent = "削除";
      del.className = "ghost";
      del.addEventListener("click", () => {
        const next = loadMyWords().filter(x => x !== w);
        saveMyWords(next);
        rebuildDictSet();
        refreshMyDictUI();
      });
      li.appendChild(left);
      li.appendChild(del);
      myDictList.appendChild(li);
    }
  }

  function showMyDictMsg(msg) { myDictMsg.textContent = msg || ""; }

  function addMyWord(wordRaw) {
    const w = normalizeWord(wordRaw);
    if (!isAcceptableWord(w)) {
    return { ok: false, msg: "登録できない形式（語頭や文字種、重複、長さ）" };
    }

    if (!w) return { ok: false, msg: "空は登録できない。" };

    const len = [...w].length;
    if (len < 1 || len > 10) return { ok: false, msg: "1〜10文字のみ。" };

    const chars = [...w];
    if (new Set(chars).size !== chars.length) return { ok: false, msg: "語内の文字重複があるので登録できない。" };

    if (dictSet.has(w)) return { ok: false, msg: "既存辞書にある語は登録できない。" };

    const cur = loadMyWords();
    if (cur.length >= 200) return { ok: false, msg: "マイ辞書は最大200語。" };
    if (cur.includes(w)) return { ok: false, msg: "すでに登録済み。" };

    cur.push(w);
    saveMyWords(cur);
    rebuildDictSet();
    refreshMyDictUI();
    return { ok: true, msg: "登録した。" };
  }

  // ---- 辞書 ----
  async function loadTxtWords(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} の読込に失敗`);
    const text = await res.text();

    const out = [];
    for (const raw of text.split(/\r?\n/)) {
      const t = normalizeWord(raw);
      if (!t) continue;
      if (t.startsWith("#")) continue;

      // おかしい語は自動で弾く
      if (!isAcceptableWord(t)) continue;

      out.push(t);
    }
    return out;
  }

  function rebuildDictSet() {
    dictSet = new Set([...baseSet]);
    for (const w of loadMyWords()) dictSet.add(w);
  }

  async function initDict() {
    dictReady = false;
    dictStatus.textContent = "辞書：読込中…";
    dictStatus2.textContent = "辞書：読込中…";
    try {
      const [base, extra, deny] = await Promise.all([
        loadTxtWords("./dict/base_words.txt"),
        loadTxtWords("./dict/extra_words.txt"),
        loadTxtWords("./dict/deny_words.txt").catch(() => []), // 無ければ空
      ]);

      baseSet = new Set([...base, ...extra]);

      // deny を差し引く
      for (const w of deny) baseSet.delete(w);

      rebuildDictSet();

      dictReady = true;

      dictStatus.textContent = `辞書：OK（${DICT_VERSION}）`;
      dictStatus2.textContent = `辞書：OK（${DICT_VERSION}）`;
      titleWarn.textContent = "";

      const prev = localStorage.getItem(STORAGE.dictVer);
      if (prev && prev !== DICT_VERSION) alert("辞書が更新されました");
      localStorage.setItem(STORAGE.dictVer, DICT_VERSION);

      renderAll();
    } catch (e) {
      dictStatus.textContent = "辞書：エラー（ローカルサーバで開いている？）";
      dictStatus2.textContent = "辞書：エラー（ローカルサーバで開いている？）";
      titleWarn.textContent = String(e?.message || e);
    }
  }

  // ---- 画面 ----
  function showTitle() {
    screenTitle.classList.remove("hidden");
    screenGame.classList.add("hidden");
  }
  function showGame() {
    screenTitle.classList.add("hidden");
    screenGame.classList.remove("hidden");
  }

  // ---- 直接入力 & 行選択 ----
  function rebuildDirectRowOptions() {
    directRowSelect.innerHTML = "";
    for (let i = 0; i < activeRowCount; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i + 1);
      directRowSelect.appendChild(opt);
    }
    directRowSelect.value = String(Math.min(selectedRow, activeRowCount - 1));
  }

  function syncDirectInput(force = false) {
    if (!isActiveRow(selectedRow)) return;
    if (!force && document.activeElement === directInput) return;
    directInput.value = rowText(selectedRow);
    directRowSelect.value = String(selectedRow);
  }

  function setSelectedRow(i) {
    selectedRow = i;
    syncDirectInput(true);
    renderAll();
  }

  function setRowFromText(i, text, { resetJudge = true } = {}) {
    const cap = rowCap(i);
    const t = filterHiraganaLike(text).slice(0, cap);
    const chars = [...t];
    const next = Array(cap).fill("");
    for (let k = 0; k < cap; k++) next[k] = chars[k] || "";

    const before = rows[i].cells.join("");
    rows[i].cells = next;

    const after = rows[i].cells.join("");
    if (resetJudge && before !== after && rows[i].judged !== "none") rows[i].judged = "none";
  }

  function insertChar(ch) {
    if (!isActiveRow(selectedRow)) return;
    const cap = rowCap(selectedRow);
    const cur = rowText(selectedRow);
    if ([...cur].length >= cap) return;

    setRowFromText(selectedRow, cur + ch);
    syncDirectInput(true);
    renderAll();
  }

  function backspaceSelected() {
    if (!isActiveRow(selectedRow)) return;
    const cur = rowText(selectedRow);
    if (!cur) return;
    const chars = [...cur];
    chars.pop();
    setRowFromText(selectedRow, chars.join(""));
    syncDirectInput(true);
    renderAll();
  }

  function clearSelected() {
    if (!isActiveRow(selectedRow)) return;
    setRowFromText(selectedRow, "");
    syncDirectInput(true);
    renderAll();
  }

  // ---- 判定（他行重複なら押せない）----
  function canJudgeRow(i, counts) {
    if (!dictReady) return false;
    if (!isActiveRow(i)) return false;
    if (!rowFilled(i)) return false;
    if (rowHasDup(i)) return false;
    if (rowHasCrossDup(i, counts)) return false; // ★追加
    const first = rows[i].cells[0] || "";
    if (first && isBadStartChar(first)) return false;
    return true;
  }

  function judgeRow(i) {
    const counts = globalCharCount();
    if (!canJudgeRow(i, counts)) return;
    const word = normalizeWord(rowText(i));
    rows[i].judged = dictSet.has(word) ? "ok" : "ng";
    renderAll();
    checkClear();
  }

  function checkClear() {
    const counts = globalCharCount();
    for (let i = 0; i < activeRowCount; i++) {
      if (rows[i].judged !== "ok") return;
      if (rowHasDup(i)) return;
      if (rowHasCrossDup(i, counts)) return;
    }
    stopTimer();
    const ms = timerNowMs();
    const updated = maybeUpdateBest(ms);
    openClearModal(ms, updated);
  }

  // ---- 描画（未使用行は描画しない）----
  function renderRows() {
    rowsEl.innerHTML = "";
    const counts = globalCharCount();

    for (let i = 0; i < activeRowCount; i++) {
      const r = rows[i];

      const dup = rowHasDup(i);
      const cross = rowHasCrossDup(i, counts);
      const word = rowText(i);

      const first = r.cells[0] || "";
        const badStart = first && isBadStartChar(first);

      // 行DOM
      const row = document.createElement("div");
      row.className = "row";
      if (i === selectedRow) row.classList.add("selected");

      // 赤条件（語頭不可 / 同一行重複 / 他行重複 / 辞書NG）
      const isErr = badStart || dup || cross || (r.judged === "ng" && word);
      if (isErr) row.classList.add("err");
      else if (r.judged === "ok") row.classList.add("ok");

      // 左：行番号
      const idx = document.createElement("div");
      idx.className = "rowIndex";
      idx.textContent = String(i + 1);

      // 中：マス
      const wrap = document.createElement("div");
      wrap.className = "cellsWrap";

      const cells = document.createElement("div");
      cells.className = "cells";
      for (const ch of r.cells) {
        const c = document.createElement("div");
        c.className = "cell";
        if (!ch) c.classList.add("empty");
        c.textContent = ch || " ";
        cells.appendChild(c);
      }
      wrap.appendChild(cells);

      // 右：操作
      const controls = document.createElement("div");
      controls.className = "controls";

      // ★ここで tag を必ず作る（これが無いと落ちる）
      const tag = document.createElement("span");
      tag.className = "tag";

      if (badStart) {
        tag.textContent = "語頭不可";
        tag.classList.add("alert");
      } else if (dup) {
        tag.textContent = "同一行重複";
        tag.classList.add("alert");
      } else if (cross) {
        tag.textContent = "他行と重複";
        tag.classList.add("alert");
      } else if (r.judged === "ng" && word) {
        tag.textContent = "辞書にない";
        tag.classList.add("alert");
      } else {
        tag.textContent = " ";
        tag.style.borderColor = "transparent";
        tag.style.background = "transparent";
      }

      const delBtn = document.createElement("button");
      delBtn.className = "smallBtn";
      delBtn.textContent = "⌫";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedRow(i);
        backspaceSelected();
      });

      const clrBtn = document.createElement("button");
      clrBtn.className = "smallBtn";
      clrBtn.textContent = "✖";
      clrBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedRow(i);
        clearSelected();
      });

      const judgeBtn = document.createElement("button");
      judgeBtn.className = "btnPrimary";
      judgeBtn.textContent = "判定";
      judgeBtn.disabled = !canJudgeRow(i, counts);
      judgeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        judgeRow(i);
      });

      controls.appendChild(tag);
      controls.appendChild(delBtn);
      controls.appendChild(clrBtn);
      controls.appendChild(judgeBtn);

      row.appendChild(idx);
      row.appendChild(wrap);
      row.appendChild(controls);

      row.addEventListener("click", () => setSelectedRow(i));

      rowsEl.appendChild(row);
    }
  }

  // ---- 五十音表の描画（縦に母音）----
  function renderKanaGrid(container, cols, table, counts, rowDupChars) {
    container.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "kbdGridWrap";

    const grid = document.createElement("div");
    grid.className = "kbdGrid";

    // rows: 0..4 = あいうえお
    for (let row = 0; row < 5; row++) {
      for (let c = 0; c < cols.length; c++) {
        const colKey = cols[c];
        const arr = table[colKey] || ["","","","",""];
        const ch = arr[row] || "";

        const key = document.createElement("div");
        key.className = "key";

        if (!ch) {
          key.classList.add("blank");
          key.textContent = " ";
        } else {
          key.textContent = ch;
          if ((counts.get(ch) || 0) >= 1) key.classList.add("used");
          if (rowDupChars.has(ch)) key.classList.add("rowdup");
          key.addEventListener("click", () => insertChar(ch));
        }

        grid.appendChild(key);
      }
    }

    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  function renderKeyboard() {
    const counts = globalCharCount();

    // 選択行内の重複文字（同一行重複の可視化）
    const cur = rows[selectedRow]?.cells || [];
    const seen = new Set();
    const dupSet = new Set();
    for (const ch of cur) {
      if (!ch) continue;
      if (seen.has(ch)) dupSet.add(ch);
      seen.add(ch);
    }

    renderKanaGrid(kbdSeionEl, SEION_COLS, SEION, counts, dupSet);
    renderKanaGrid(kbdOtherEl, OTHER_COLS, OTHER, counts, dupSet);
  }

  function renderGlobalWarn() {
    const counts = globalCharCount();

    let used = 0;
    for (const [, v] of counts) if (v >= 1) used++;

    let crossRows = 0;
    for (let i = 0; i < activeRowCount; i++) {
      if (rowHasCrossDup(i, counts)) crossRows++;
    }

    globalWarnEl.textContent = (crossRows > 0)
      ? `使用済み ${used}字／他行重複の行 ${crossRows}（判定不可）`
      : `使用済み ${used}字`;
  }

  function renderAll() {
    modeLabel.textContent = mode;
    renderRows();
    renderKeyboard();
    renderGlobalWarn();
  }

  // ---- モーダル ----
  function openModal() {
    modalBackdrop.classList.remove("hidden");
    myDictModal.classList.remove("hidden");
    showMyDictMsg("");
    refreshMyDictUI();
    myWordInput.value = "";
    myWordInput.focus();
  }
  function closeModal() {
    modalBackdrop.classList.add("hidden");
    myDictModal.classList.add("hidden");
  }

  function openClearModal(ms, updated) {
    clearTimeText.textContent = formatTime(ms);
    clearBestText.textContent = updated ? "ベスト：更新！" : `ベスト：${bestTime2.textContent}`;
    clearBackdrop.classList.remove("hidden");
    clearModal.classList.remove("hidden");
  }

  function closeClearModal() {
    clearBackdrop.classList.add("hidden");
    clearModal.classList.add("hidden");
  }

  async function openLicenses() {
    licBackdrop.classList.remove("hidden");
    licModal.classList.remove("hidden");

    // 既に読んでいるなら再取得しない（必要なら毎回fetchにしてもOK）
    if (licText.dataset.loaded === "1") return;

    try {
      const res = await fetch("./docs/THIRD_PARTY_NOTICES.txt", { cache: "no-store" });
      if (!res.ok) throw new Error("failed to load notices");
      const text = await res.text();
      licText.textContent = text;
      licText.dataset.loaded = "1";
    } catch {
      licText.textContent = "Failed to load THIRD_PARTY_NOTICES.txt";
    }
  }

  function closeLicenses() {
    licBackdrop.classList.add("hidden");
    licModal.classList.add("hidden");
  }

  // ---- モード＆ゲーム ----
  function applyMode(nextMode) {
    mode = nextMode;
    activeRowCount = MODES[mode];
    rows = makeRows();
    selectedRow = 0;
    updateBestTimeUI();
    rebuildDirectRowOptions();
    syncDirectInput(true);
    renderAll();
  }

  function resetGame() {
    rows = makeRows();
    selectedRow = 0;
    startTimer();
    rebuildDirectRowOptions();
    syncDirectInput(true);
    renderAll();
  }

  // ---- イベント ----
  modeSelect.addEventListener("change", () => applyMode(modeSelect.value));

  goPlayBtn.addEventListener("click", () => {
    if (!dictReady) {
      titleWarn.textContent = "辞書の読み込みが終わっていない。少し待って。";
      return;
    }
    showGame();
    resetGame();
  });

  toTitleBtn.addEventListener("click", () => {
    stopTimer();
    showTitle();
    updateBestTimeUI();
  });

  restartBtn.addEventListener("click", resetGame);

  directRowSelect.addEventListener("change", () => {
    const i = Number(directRowSelect.value);
    if (Number.isFinite(i)) setSelectedRow(i);
  });

  directInput.addEventListener("input", () => {
    if (!isActiveRow(selectedRow)) return;
    setRowFromText(selectedRow, directInput.value);
    renderAll();
  });

  directInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      judgeRow(selectedRow);
    }
  });

  directBackspace.addEventListener("click", backspaceSelected);
  directClear.addEventListener("click", clearSelected);
  directJudge.addEventListener("click", () => judgeRow(selectedRow));

  closeClearBtn.addEventListener("click", closeClearModal);
  clearBackdrop.addEventListener("click", closeClearModal);

  clearRestartBtn.addEventListener("click", () => {
    closeClearModal();
    resetGame();
  });

  clearToTitleBtn.addEventListener("click", () => {
    closeClearModal();
    stopTimer();
    showTitle();
    updateBestTimeUI();
  });

  licensesBtn.addEventListener("click", openLicenses);
  closeLicBtn.addEventListener("click", closeLicenses);
  licBackdrop.addEventListener("click", closeLicenses);

  // マイ辞書
  myDictBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  addMyWordBtn.addEventListener("click", () => {
    const res = addMyWord(myWordInput.value);
    showMyDictMsg(res.msg);
    if (res.ok) myWordInput.value = "";
  });

  myWordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addMyWordBtn.click();
  });

  // ---- 起動 ----
  function init() {
    applyMode(modeSelect.value);
    updateBestTimeUI();
    initDict();
    showTitle();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js");
    }

  }

  init();
})();
