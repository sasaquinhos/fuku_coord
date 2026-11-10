/**
 * fuku_coord - メインアプリケーションロジック (app.js)
 * Googleスプレッドシート 双方向CRUD同期対応版
 */

(function () {
  "use strict";

  // --- ストレージキー ---
  const STORAGE_KEY_GEMINI = "fuku_coord_gemini_key";
  const STORAGE_KEY_GAS = "fuku_coord_gas_url";
  const STORAGE_KEY_CLOTHES = "fuku_coord_clothes_data";

  // --- 状態管理 ---
  let user = window.DEFAULT_USER || {};
  let clothes = [];
  let currentCoord = null;
  let activeListFilter = "all";

  // サブ分類 (タイプ) のプリセット
  const SUBCAT_PRESETS = {
    "アウター": ["Gジャン", "カバーオール", "ミリタリー", "ダウン/ベスト", "レザージャケット", "コート"],
    "トップス": ["Tシャツ", "ワークシャツ", "スウェット", "サーマル", "ニット", "カットソー"],
    "ボトムス": ["ワークパンツ", "軍パン/カーゴ", "ペインター", "チノパン", "デニム/ジーンズ", "スラックス"],
    "シューズ": ["ブーツ", "スニーカー", "短靴/ローファー"]
  };

  // DOM要素
  const dom = {
    // フォーム
    form: document.getElementById("coord-form"),
    selectUser: document.getElementById("select-user"),
    tempRange: document.getElementById("input-temp-range"),
    tempDisplay: document.getElementById("temp-display"),
    tempPresets: document.getElementById("temp-presets"),
    weather: document.getElementById("select-weather"),
    destination: document.getElementById("input-destination"),
    destinationTags: document.getElementById("destination-tags"),
    note: document.getElementById("input-note"),
    btnSubmit: document.getElementById("btn-submit"),
    btnOmakase: document.getElementById("btn-omakase"),
    btnReroll: document.getElementById("btn-reroll"),

    // 結果
    emptyState: document.getElementById("empty-state"),
    loadingBox: document.getElementById("loading-box"),
    loadingDesc: document.getElementById("loading-desc"),
    resultBox: document.getElementById("result-box"),
    stylistMessage: document.getElementById("stylist-message"),
    rackContainer: document.getElementById("coord-rack-container"),

    // 要約カウント & 同期ステータス
    sumOuter: document.getElementById("sum-outer"),
    sumTop: document.getElementById("sum-top"),
    sumBtm: document.getElementById("sum-btm"),
    sumShoe: document.getElementById("sum-shoe"),
    headerCount: document.getElementById("header-closet-count"),
    tabClosetCount: document.getElementById("tab-closet-count"),
    headerSyncStatus: document.getElementById("header-sync-status"),
    gasTestStatus: document.getElementById("gas-test-status"),

    // クローゼット管理モーダル (サブ画面)
    modalCloset: document.getElementById("modal-closet"),
    btnOpenCloset: document.getElementById("btn-open-closet"),
    btnCloseCloset: document.getElementById("btn-close-closet"),
    tabBtnForm: document.getElementById("tab-btn-form"),
    tabBtnList: document.getElementById("tab-btn-list"),
    tabPaneForm: document.getElementById("tab-pane-form"),
    tabPaneList: document.getElementById("tab-pane-list"),

    // 服登録・編集フォーム
    formManageClothes: document.getElementById("form-manage-clothes"),
    clothesEditId: document.getElementById("clothes-edit-id"),
    formModeBadge: document.getElementById("form-mode-badge"),
    btnCancelEdit: document.getElementById("btn-cancel-edit"),
    pillCategoryGroup: document.getElementById("pill-category-group"),
    pillSubcatGroup: document.getElementById("pill-subcat-group"),
    clothesSubcat: document.getElementById("clothes-subcat"),
    clothesName: document.getElementById("clothes-name"),
    clothesBrand: document.getElementById("clothes-brand"),
    clothesColor: document.getElementById("clothes-color"),
    clothesFit: document.getElementById("clothes-fit"),
    clothesTempMin: document.getElementById("clothes-temp-min"),
    clothesTempMax: document.getElementById("clothes-temp-max"),
    labelTempMin: document.getElementById("label-temp-min"),
    labelTempMax: document.getElementById("label-temp-max"),
    clothesTags: document.getElementById("clothes-tags"),
    clothesDesc: document.getElementById("clothes-desc"),
    btnSaveClothesText: document.getElementById("btn-save-clothes-text"),

    // 登録済み一覧
    listFilterGroup: document.getElementById("list-filter-group"),
    manageClothesList: document.getElementById("manage-clothes-list"),
    btnResetDefault: document.getElementById("btn-reset-default"),
    btnSyncToSheet: document.getElementById("btn-sync-to-sheet"),

    // 設定モーダル
    modalSettings: document.getElementById("modal-settings"),
    btnOpenSettings: document.getElementById("btn-open-settings"),
    btnCloseSettings: document.getElementById("btn-close-settings"),
    inputGeminiKey: document.getElementById("setting-gemini-key"),
    inputGasUrl: document.getElementById("setting-gas-url"),
    btnSaveSettings: document.getElementById("btn-save-settings")
  };

  // --- 初期化 ---
  async function init() {
    loadClothesData();
    loadSettings();
    updateClosetSummary();
    renderManageClothesList();
    renderSubcatPills("アウター");
    bindEvents();

    // スプレッドシート連携が設定されていれば最新データをシートから取得
    await fetchClothesFromGoogleSheet();
  }

  // --- データのロードとローカル保存 ---
  function loadClothesData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CLOTHES);
      if (stored) {
        clothes = JSON.parse(stored);
      } else {
        clothes = JSON.parse(JSON.stringify(window.DEFAULT_CLOTHES || []));
        saveClothesDataLocal();
      }
    } catch (e) {
      console.error("Failed to load clothes data from localStorage", e);
      clothes = JSON.parse(JSON.stringify(window.DEFAULT_CLOTHES || []));
    }
  }

  function saveClothesDataLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_CLOTHES, JSON.stringify(clothes));
    } catch (e) {
      console.error("Failed to save clothes data", e);
    }
    updateClosetSummary();
    renderManageClothesList();
  }

  // --- Googleスプレッドシート (GAS) との通信処理 ---
  function getGasUrl() {
    return localStorage.getItem(STORAGE_KEY_GAS) || "";
  }

  // 1. スプレッドシートから服一覧を取得 (GET)
  async function fetchClothesFromGoogleSheet() {
    const gasUrl = getGasUrl();
    if (!gasUrl) {
      updateSyncStatusUI("未接続", "#64748b");
      return;
    }

    updateSyncStatusUI("シート通信中...", "#d97706");
    try {
      const res = await fetch(gasUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();

      if (json.status === "success" && Array.isArray(json.clothes) && json.clothes.length > 0) {
        clothes = json.clothes;
        saveClothesDataLocal();
        updateSyncStatusUI("シート連携中 (OK)", "#059669");
        console.log("Synced clothes from Google Sheets:", clothes.length);
      } else {
        updateSyncStatusUI("シート接続済", "#059669");
      }
    } catch (err) {
      console.warn("GAS fetch failed (using local cache):", err.message);
      updateSyncStatusUI("オフライン/キャッシュ", "#d97706");
    }
  }

  // 2. スプレッドシートへ変更を反映 (POST)
  async function postToGAS(action, payload) {
    const gasUrl = getGasUrl();
    if (!gasUrl) return; // 未設定時は何もしない

    try {
      await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // GASのCORS制約対策
        body: JSON.stringify({ action, ...payload })
      });
      console.log(`GAS POST [${action}] succeeded`);
    } catch (err) {
      console.error(`GAS POST [${action}] failed:`, err);
    }
  }

  function updateSyncStatusUI(text, color) {
    if (dom.headerSyncStatus) {
      dom.headerSyncStatus.textContent = text;
      dom.headerSyncStatus.style.background = color ? `${color}33` : "rgba(0,0,0,0.2)";
      dom.headerSyncStatus.style.color = color || "white";
    }
    if (dom.gasTestStatus) {
      dom.gasTestStatus.textContent = text;
      dom.gasTestStatus.style.color = color || "#047857";
    }
  }

  // --- イベントバインド ---
  function bindEvents() {
    // 気温スライダー
    dom.tempRange.addEventListener("input", (e) => {
      const val = e.target.value;
      dom.tempDisplay.textContent = `${val}℃`;
      updateTempPresetActive(val);
    });

    // 気温プリセットボタン
    dom.tempPresets.addEventListener("click", (e) => {
      const btn = e.target.closest(".tag-btn");
      if (!btn) return;
      const t = btn.getAttribute("data-temp");
      dom.tempRange.value = t;
      dom.tempDisplay.textContent = `${t}℃`;
      updateTempPresetActive(t);
    });

    // 目的地タグ
    dom.destinationTags.addEventListener("click", (e) => {
      const btn = e.target.closest(".tag-btn");
      if (!btn) return;
      dom.destination.value = btn.textContent;
    });

    // コーデ提案フォーム送信
    dom.form.addEventListener("submit", (e) => {
      e.preventDefault();
      runCoordination(false);
    });

    // おまかせボタン
    dom.btnOmakase.addEventListener("click", () => {
      dom.destination.value = "";
      dom.note.value = "";
      runCoordination(true);
    });

    // 別のパターン提案
    dom.btnReroll.addEventListener("click", () => {
      runCoordination(false, true);
    });

    // --- クローゼット管理モーダル 操作 ---
    dom.btnOpenCloset.addEventListener("click", () => {
      dom.modalCloset.classList.add("active");
    });
    dom.btnCloseCloset.addEventListener("click", () => {
      dom.modalCloset.classList.remove("active");
    });

    // サブ画面 タブ切り替え
    dom.tabBtnForm.addEventListener("click", () => switchClosetTab("form"));
    dom.tabBtnList.addEventListener("click", () => switchClosetTab("list"));

    // 服登録フォーム カテゴリピル選択
    dom.pillCategoryGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-pill");
      if (!btn) return;
      dom.pillCategoryGroup.querySelectorAll(".type-pill").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.getAttribute("data-cat");
      renderSubcatPills(cat);
    });

    // サブ分類ピル選択
    dom.pillSubcatGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-pill");
      if (!btn) return;
      dom.clothesSubcat.value = btn.textContent;
    });

    // 適正気温スライダー変更
    dom.clothesTempMin.addEventListener("input", (e) => {
      dom.labelTempMin.textContent = `${e.target.value}℃`;
    });
    dom.clothesTempMax.addEventListener("input", (e) => {
      dom.labelTempMax.textContent = `${e.target.value}℃`;
    });

    // 編集キャンセル
    dom.btnCancelEdit.addEventListener("click", resetManageForm);

    // 服登録・更新の保存
    dom.formManageClothes.addEventListener("submit", handleSaveClothes);

    // 一覧タブ カテゴリフィルター
    dom.listFilterGroup.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-pill");
      if (!btn) return;
      dom.listFilterGroup.querySelectorAll(".type-pill").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      activeListFilter = btn.getAttribute("data-filter");
      renderManageClothesList();
    });

    // スプレッドシートに全データを一括転送
    dom.btnSyncToSheet.addEventListener("click", async () => {
      const gasUrl = getGasUrl();
      if (!gasUrl) {
        alert("設定画面でGoogleスプレッドシート(GAS)のURLを設定してください。");
        dom.modalSettings.classList.add("active");
        return;
      }
      if (confirm(`現在クローゼットにある ${clothes.length} 着の服データを、スプレッドシートに一括転送（同期）しますか？\n※スプレッドシートの内容は上書きされます。`)) {
        dom.btnSyncToSheet.textContent = "転送中...";
        await postToGAS("syncAll", { clothes });
        dom.btnSyncToSheet.textContent = "📊 シートに全データを転送";
        alert("スプレッドシートへの転送が完了しました！");
      }
    });

    // 初期データリセット
    dom.btnResetDefault.addEventListener("click", () => {
      if (confirm("登録した服をリセットし、初期データ（18着）に戻しますか？\n※追加したデータは失われます。")) {
        clothes = JSON.parse(JSON.stringify(window.DEFAULT_CLOTHES || []));
        saveClothesDataLocal();
        resetManageForm();
        postToGAS("syncAll", { clothes });
        alert("初期データに戻しました。");
      }
    });

    // --- 設定モーダル ---
    dom.btnOpenSettings.addEventListener("click", () => dom.modalSettings.classList.add("active"));
    dom.btnCloseSettings.addEventListener("click", () => dom.modalSettings.classList.remove("active"));
    dom.btnSaveSettings.addEventListener("click", saveSettings);

    // モーダル外クリックで閉じる
    window.addEventListener("click", (e) => {
      if (e.target === dom.modalCloset) dom.modalCloset.classList.remove("active");
      if (e.target === dom.modalSettings) dom.modalSettings.classList.remove("active");
    });
  }

  // --- サブ画面のタブ切り替え ---
  function switchClosetTab(tabName) {
    if (tabName === "form") {
      dom.tabBtnForm.classList.add("active");
      dom.tabBtnList.classList.remove("active");
      dom.tabPaneForm.classList.add("active");
      dom.tabPaneList.classList.remove("active");
    } else {
      dom.tabBtnList.classList.add("active");
      dom.tabBtnForm.classList.remove("active");
      dom.tabPaneList.classList.add("active");
      dom.tabPaneForm.classList.remove("active");
      renderManageClothesList();
    }
  }

  // カテゴリに応じたサブ分類ピルの描画
  function renderSubcatPills(cat) {
    const list = SUBCAT_PRESETS[cat] || [];
    dom.pillSubcatGroup.innerHTML = list
      .map(item => `<button type="button" class="type-pill">${escapeHtml(item)}</button>`)
      .join("");
  }

  // --- 服の登録・編集保存処理 (スプレッドシート連携連動) ---
  async function handleSaveClothes(e) {
    e.preventDefault();

    const editId = dom.clothesEditId.value.trim();
    const activeCatBtn = dom.pillCategoryGroup.querySelector(".type-pill.active");
    const category = activeCatBtn ? activeCatBtn.getAttribute("data-cat") : "アウター";
    const subcategory = dom.clothesSubcat.value.trim() || category;
    const name = dom.clothesName.value.trim();
    const brand = dom.clothesBrand.value.trim() || "不明";
    const color = dom.clothesColor.value.trim() || "未設定";
    const fit = dom.clothesFit.value.trim() || "レギュラー";
    const tempMin = parseInt(dom.clothesTempMin.value, 10);
    const tempMax = parseInt(dom.clothesTempMax.value, 10);
    const tagsStr = dom.clothesTags.value.trim();
    const tags = tagsStr ? tagsStr.split(/[,、]/).map(t => t.trim()).filter(Boolean) : [];
    const description = dom.clothesDesc.value.trim();

    if (!name) {
      alert("アイテム名を入力してください。");
      return;
    }

    let savedItem;

    if (editId) {
      // 既存編集
      const idx = clothes.findIndex(c => c.id === editId);
      if (idx !== -1) {
        savedItem = {
          ...clothes[idx],
          category,
          subcategory,
          name,
          brand,
          color,
          fit,
          tempMin,
          tempMax,
          tags,
          description
        };
        clothes[idx] = savedItem;
        alert(`「${name}」を更新しました！` + (getGasUrl() ? "（スプレッドシートにも即時反映中）" : ""));
      }
    } else {
      // 新規登録
      const newId = "item-" + Date.now();
      savedItem = {
        id: newId,
        category,
        subcategory,
        name,
        brand,
        color,
        fit,
        tempMin,
        tempMax,
        tags,
        description
      };
      clothes.unshift(savedItem);
      alert(`「${name}」をクローゼットに追加しました！` + (getGasUrl() ? "（スプレッドシートにも自動登録中）" : ""));
    }

    // 1. ローカル保存
    saveClothesDataLocal();
    resetManageForm();
    switchClosetTab("list");

    // 2. Googleスプレッドシートへ自動POST送信
    if (savedItem && getGasUrl()) {
      await postToGAS("save", { item: savedItem });
    }
  }

  // フォームのリセット
  function resetManageForm() {
    dom.clothesEditId.value = "";
    dom.clothesName.value = "";
    dom.clothesBrand.value = "";
    dom.clothesColor.value = "";
    dom.clothesFit.value = "";
    dom.clothesSubcat.value = "";
    dom.clothesTags.value = "";
    dom.clothesDesc.value = "";
    dom.clothesTempMin.value = 12;
    dom.clothesTempMax.value = 22;
    dom.labelTempMin.textContent = "12℃";
    dom.labelTempMax.textContent = "22℃";

    dom.formModeBadge.querySelector("span").textContent = "✨ 新しい服を登録";
    dom.btnCancelEdit.style.display = "none";
    dom.btnSaveClothesText.textContent = "💾 この服を登録する (スプレッドシートへ即時同期)";

    dom.pillCategoryGroup.querySelectorAll(".type-pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-cat") === "アウター");
    });
    renderSubcatPills("アウター");
  }

  // 編集モードに入る
  function startEditClothes(id) {
    const item = clothes.find(c => c.id === id);
    if (!item) return;

    dom.clothesEditId.value = item.id;
    dom.clothesName.value = item.name;
    dom.clothesBrand.value = item.brand || "";
    dom.clothesColor.value = item.color || "";
    dom.clothesFit.value = item.fit || "";
    dom.clothesSubcat.value = item.subcategory || "";
    dom.clothesTags.value = (item.tags || []).join(", ");
    dom.clothesDesc.value = item.description || "";
    dom.clothesTempMin.value = item.tempMin !== undefined ? item.tempMin : 12;
    dom.clothesTempMax.value = item.tempMax !== undefined ? item.tempMax : 22;
    dom.labelTempMin.textContent = `${dom.clothesTempMin.value}℃`;
    dom.labelTempMax.textContent = `${dom.clothesTempMax.value}℃`;

    dom.formModeBadge.querySelector("span").textContent = `✏️ 「${item.name}」を編集中`;
    dom.btnCancelEdit.style.display = "inline";
    dom.btnSaveClothesText.textContent = "💾 変更を保存する (スプレッドシートへ即時同期)";

    dom.pillCategoryGroup.querySelectorAll(".type-pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-cat") === item.category);
    });
    renderSubcatPills(item.category);

    switchClosetTab("form");
  }

  // 削除処理 (スプレッドシート連携連動)
  async function deleteClothes(id) {
    const item = clothes.find(c => c.id === id);
    if (!item) return;

    if (confirm(`「${item.name}」をクローゼットから削除しますか？` + (getGasUrl() ? "\n※スプレッドシートからも削除されます。" : ""))) {
      clothes = clothes.filter(c => c.id !== id);
      saveClothesDataLocal();
      if (dom.clothesEditId.value === id) {
        resetManageForm();
      }
      if (getGasUrl()) {
        await postToGAS("delete", { item: { id } });
      }
    }
  }

  // --- 管理用アイテム一覧の描画 ---
  function renderManageClothesList() {
    const filtered = activeListFilter === "all" 
      ? clothes 
      : clothes.filter(c => c.category === activeListFilter);

    if (filtered.length === 0) {
      dom.manageClothesList.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">
          登録されている服がありません。「➕ 服を登録・編集」タブから追加してください。
        </div>
      `;
      return;
    }

    dom.manageClothesList.innerHTML = filtered.map(c => {
      let badgeClass = "cat-outer";
      if (c.category === "トップス") badgeClass = "cat-top";
      if (c.category === "ボトムス") badgeClass = "cat-btm";
      if (c.category === "シューズ") badgeClass = "cat-shoe";

      return `
        <div class="manage-item-card" data-id="${c.id}">
          <div class="manage-item-info">
            <div class="manage-item-title">
              <span class="item-category-badge ${badgeClass}">${c.category} / ${escapeHtml(c.subcategory || "")}</span>
              <span>${escapeHtml(c.name)}</span>
              <small style="color: var(--text-muted); font-weight: normal;">(${escapeHtml(c.brand || "")})</small>
            </div>
            <div class="manage-item-sub">
              🎨 ${escapeHtml(c.color || "未設定")} ｜ 📐 ${escapeHtml(c.fit || "レギュラー")} ｜ 🌡️ ${c.tempMin}℃〜${c.tempMax}℃
            </div>
            ${c.description ? `<div style="font-size: 11px; color: var(--secondary); margin-top: 2px;">💬 ${escapeHtml(c.description)}</div>` : ""}
          </div>
          <div class="manage-item-actions">
            <button type="button" class="btn-action edit" onclick="window.fukuApp.editItem('${c.id}')">
              ✏️ 編集
            </button>
            <button type="button" class="btn-action delete" onclick="window.fukuApp.deleteItem('${c.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // --- クローゼット要約の更新 ---
  function updateClosetSummary() {
    const outers = clothes.filter((c) => c.category === "アウター");
    const tops = clothes.filter((c) => c.category === "トップス");
    const btms = clothes.filter((c) => c.category === "ボトムス");
    const shoes = clothes.filter((c) => c.category === "シューズ");

    dom.sumOuter.textContent = outers.length;
    dom.sumTop.textContent = tops.length;
    dom.sumBtm.textContent = btms.length;
    dom.sumShoe.textContent = shoes.length;
    dom.headerCount.textContent = `${clothes.length}着`;
    if (dom.tabClosetCount) dom.tabClosetCount.textContent = clothes.length;
  }

  function updateTempPresetActive(val) {
    const btns = dom.tempPresets.querySelectorAll(".tag-btn");
    btns.forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-temp") === String(val));
    });
  }

  // --- 設定管理 ---
  function loadSettings() {
    const key = localStorage.getItem(STORAGE_KEY_GEMINI) || "";
    const gas = localStorage.getItem(STORAGE_KEY_GAS) || "";
    if (dom.inputGeminiKey) dom.inputGeminiKey.value = key;
    if (dom.inputGasUrl) dom.inputGasUrl.value = gas;
    if (gas) {
      updateSyncStatusUI("シート接続済", "#059669");
    } else {
      updateSyncStatusUI("未接続", "#64748b");
    }
  }

  async function saveSettings() {
    const key = dom.inputGeminiKey.value.trim();
    const gas = dom.inputGasUrl.value.trim();
    localStorage.setItem(STORAGE_KEY_GEMINI, key);
    localStorage.setItem(STORAGE_KEY_GAS, gas);
    dom.modalSettings.classList.remove("active");

    alert("設定を保存しました！");
    if (gas) {
      await fetchClothesFromGoogleSheet();
    } else {
      updateSyncStatusUI("未接続", "#64748b");
    }
  }

  // --- 気温による一次足切りフィルター ---
  function filterByTemperature(currentTemp) {
    const tolerance = 4;
    return clothes.filter((item) => {
      if (item.category === "シューズ") return true;
      const min = (item.tempMin !== undefined ? item.tempMin : 10) - tolerance;
      const max = (item.tempMax !== undefined ? item.tempMax : 25) + tolerance;
      return currentTemp >= min && currentTemp <= max;
    });
  }

  // --- コーディネート実行 ---
  async function runCoordination(isOmakase = false, isReroll = false) {
    const currentTemp = parseInt(dom.tempRange.value, 10);
    const weather = dom.weather.value;
    const dest = dom.destination.value.trim() || (isOmakase ? "おまかせの休日お出かけ" : "街歩き・お出かけ");
    const note = dom.note.value.trim();

    if (clothes.length === 0) {
      alert("クローゼットに服が登録されていません。まずは服を登録してください。");
      return;
    }

    dom.emptyState.style.display = "none";
    dom.resultBox.style.display = "none";
    dom.loadingBox.style.display = "block";
    if (dom.loadingDesc) {
      dom.loadingDesc.textContent = `気温${currentTemp}℃・「${dest}」に合わせて、手持ち服(${clothes.length}着)から最適な組み合わせを厳選しています`;
    }

    let filteredCandidates = filterByTemperature(currentTemp);

    const hasOuter = filteredCandidates.some((c) => c.category === "アウター");
    const hasTop = filteredCandidates.some((c) => c.category === "トップス");
    const hasBtm = filteredCandidates.some((c) => c.category === "ボトムス");
    if (!hasOuter || !hasTop || !hasBtm) {
      filteredCandidates = [...clothes];
    }

    const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI) || "";

    try {
      let result;
      if (apiKey) {
        result = await fetchGeminiStylist(apiKey, {
          user,
          temp: currentTemp,
          weather,
          destination: dest,
          note,
          candidates: filteredCandidates,
          excludeIds: isReroll && currentCoord ? currentCoord.selectedIds : []
        });
      } else {
        await new Promise((r) => setTimeout(r, 600));
        result = generateMockStylistCoordination({
          user,
          temp: currentTemp,
          weather,
          destination: dest,
          note,
          candidates: filteredCandidates,
          isReroll
        });
      }

      currentCoord = result;
      renderResult(result);
    } catch (err) {
      console.error(err);
      alert("AI提案の生成中にエラーが発生しました。内蔵モックで再試行します。\n詳細: " + err.message);
      const fallback = generateMockStylistCoordination({
        user,
        temp: currentTemp,
        weather,
        destination: dest,
        note,
        candidates: filteredCandidates,
        isReroll
      });
      renderResult(fallback);
    } finally {
      dom.loadingBox.style.display = "none";
      dom.resultBox.style.display = "block";
    }
  }

  // --- 結果描画 ---
  function renderResult(result) {
    dom.stylistMessage.textContent = result.comment;

    dom.rackContainer.innerHTML = result.items
      .map((item) => {
        let badgeClass = "cat-outer";
        if (item.category === "トップス") badgeClass = "cat-top";
        if (item.category === "ボトムス") badgeClass = "cat-btm";
        if (item.category === "シューズ") badgeClass = "cat-shoe";

        return `
        <div class="item-card">
          <span class="item-category-badge ${badgeClass}">${item.category} / ${escapeHtml(item.subcategory || "")}</span>
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-brand">${escapeHtml(item.brand || "")}</div>
          <div class="item-spec-list">
            <div>🎨 <strong>カラー:</strong> ${escapeHtml(item.color || "未設定")}</div>
            <div>📐 <strong>シルエット:</strong> ${escapeHtml(item.fit || "レギュラー")}</div>
            ${item.description ? `<div>💡 ${escapeHtml(item.description)}</div>` : ""}
          </div>
          <div class="item-tags">
            ${(item.tags || []).map((t) => `<span class="item-tag">#${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
      `;
      })
      .join("");
  }

  // --- 内蔵スマートモックAI ---
  function generateMockStylistCoordination({ user, temp, weather, destination, note, candidates, isReroll }) {
    const outers = candidates.filter((c) => c.category === "アウター");
    const tops = candidates.filter((c) => c.category === "トップス");
    const btms = candidates.filter((c) => c.category === "ボトムス");
    const shoes = candidates.filter((c) => c.category === "シューズ");

    const fallbackItem = (cat) => ({ id: `dummy-${cat}`, category: cat, name: `${cat} (候補なし)`, brand: "-", color: "-", tags: [] });

    const safeOuters = outers.length > 0 ? outers : [fallbackItem("アウター")];
    const safeTops = tops.length > 0 ? tops : [fallbackItem("トップス")];
    const safeBtms = btms.length > 0 ? btms : [fallbackItem("ボトムス")];
    const safeShoes = shoes.length > 0 ? shoes : [fallbackItem("シューズ")];

    let selOuter = safeOuters[Math.floor(Math.random() * safeOuters.length)];
    let selBtm = safeBtms[Math.floor(Math.random() * safeBtms.length)];
    let selTop = safeTops[Math.floor(Math.random() * safeTops.length)];
    let selShoe = safeShoes[Math.floor(Math.random() * safeShoes.length)];

    let comment = `【本日のスタイリング提案：${destination}】\n\n`;
    comment += `本日は気温${temp}℃・天候${weather}の予報です。お出かけ先の「${destination}」に合わせて、手持ち服から最適なアイテムをセレクトしました。\n\n`;
    comment += `主役の『${selOuter.name}』に対し、ボトムスに『${selBtm.name}』を合わせています。`;
    if (selOuter.subcategory === "Gジャン" && selBtm.subcategory?.includes("ワーク")) {
      comment += `短丈のGジャンとワイドなワークパンツのメリハリが効いた、美しいAラインの王道アメカジシルエットです。\n\n`;
    } else {
      comment += `全体のカラーバランスとシルエットの収まりを考慮して組み合わせました。\n\n`;
    }

    comment += `【着こなしのコツ】\n`;
    comment += `・インナーの『${selTop.name}』で程よい抜け感を演出し、足元の『${selShoe.name}』で全体のバランスを引き締めています。`;

    if (note) {
      comment += `\n・ご要望の「${note}」のニュアンスも取り入れています！`;
    }

    return {
      comment: comment,
      selectedIds: [selOuter.id, selTop.id, selBtm.id, selShoe.id],
      items: [selOuter, selTop, selBtm, selShoe]
    };
  }

  // --- Gemini API (Google AI Studio) 呼び出し ---
  async function fetchGeminiStylist(apiKey, ctx) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
あなたはアメカジ・ワーク・ヴィンテージファッションに精通した一流のパーソナルスタイリストです。
ユーザー情報と手持ちの服リスト、本日の環境条件から、最高のトータルコーディネート（アウター・トップス・ボトムス・シューズの各1点）を選出し、選定理由と着こなしのアドバイスを記述してください。

【ユーザー情報】
身長: ${ctx.user.height}cm, 体重: ${ctx.user.weight}kg, 好みの系統: ${ctx.user.preferredStyle}
こだわり: ${ctx.user.note}

【本日の環境・条件】
気温: ${ctx.temp}℃, 天気: ${ctx.weather}, 目的地・シチュエーション: ${ctx.destination}
ユーザーからの特別な希望: ${ctx.note || "特になし（スタイリストのおまかせ）"}

【手持ち服の候補リスト (JSON)】
${JSON.stringify(ctx.candidates.map((c) => ({ id: c.id, category: c.category, name: c.name, brand: c.brand, color: c.color, fit: c.fit, tags: c.tags })))}

${ctx.excludeIds && ctx.excludeIds.length > 0 ? `※ 直前の提案と被らないよう、可能であれば次のIDは除外してください: ${ctx.excludeIds.join(", ")}` : ""}

【出力フォーマット】
以下のキーを持つ厳密なJSONのみを出力してください（Markdownのバッククォート不要、純粋なJSON文字列）：
{
  "outerId": "選んだアウターのid",
  "topId": "選んだトップスのid",
  "bottomId": "選んだボトムスのid",
  "shoeId": "選んだシューズのid",
  "comment": "本日のスタイリングの狙い、シルエットのバランス、着こなしのコツについてのプロの解説文（200〜400文字程度）"
}
`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`Gemini APIエラー (${res.status}): ${errJson.error ? errJson.error.message : res.statusText}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error("Geminiからの応答が空でした。");

    const parsed = JSON.parse(candidateText.trim());

    const selOuter = clothes.find((c) => c.id === parsed.outerId) || clothes.find((c) => c.category === "アウター");
    const selTop = clothes.find((c) => c.id === parsed.topId) || clothes.find((c) => c.category === "トップス");
    const selBtm = clothes.find((c) => c.id === parsed.bottomId) || clothes.find((c) => c.category === "ボトムス");
    const selShoe = clothes.find((c) => c.id === parsed.shoeId) || clothes.find((c) => c.category === "シューズ");

    return {
      comment: parsed.comment,
      selectedIds: [selOuter.id, selTop.id, selBtm.id, selShoe.id],
      items: [selOuter, selTop, selBtm, selShoe]
    };
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // グローバル公開
  window.fukuApp = {
    editItem: startEditClothes,
    deleteItem: deleteClothes
  };

  // 起動
  document.addEventListener("DOMContentLoaded", init);
})();