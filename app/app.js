/**
 * fuku_coord - メインアプリケーションロジック (app.js)
 * 気温範囲の入力撤廃 & AI自律判断対応版
 */

(function () {
  "use strict";

  // ★ 固定のGoogleスプレッドシート(GAS)ウェブアプリURL
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwWMu6FSKMoxT4VSF16hBLVv1bbF6CwYNOKQSOYBTZ5Y4-c3jgGMStBw1TFEp3k_BWI/exec";

  // --- ストレージキー ---
  const STORAGE_KEY_GEMINI = "fuku_coord_gemini_key";
  const STORAGE_KEY_CLOTHES = "fuku_coord_clothes_data";
  const STORAGE_KEY_USER = "fuku_coord_user_data";

  // --- 状態管理 ---
  let user = {};
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
    selectUserOption: document.getElementById("select-user-option"),
    btnEditUser: document.getElementById("btn-edit-user"),
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

    // 要約カウント
    sumOuter: document.getElementById("sum-outer"),
    sumTop: document.getElementById("sum-top"),
    sumBtm: document.getElementById("sum-btm"),
    sumShoe: document.getElementById("sum-shoe"),
    headerCount: document.getElementById("header-closet-count"),
    tabClosetCount: document.getElementById("tab-closet-count"),
    headerSyncStatus: document.getElementById("header-sync-status"),

    // ユーザープロフィールモーダル
    modalUser: document.getElementById("modal-user"),
    btnCloseUser: document.getElementById("btn-close-user"),
    formUserProfile: document.getElementById("form-user-profile"),
    userName: document.getElementById("user-name"),
    userHeight: document.getElementById("user-height"),
    userWeight: document.getElementById("user-weight"),
    userHair: document.getElementById("user-hair"),
    userColor: document.getElementById("user-color"),
    userStyle: document.getElementById("user-style"),
    userNote: document.getElementById("user-note"),

    // クローゼット管理モーダル (サブ画面)
    modalCloset: document.getElementById("modal-closet"),
    btnOpenCloset: document.getElementById("btn-open-closet"),
    btnCloseCloset: document.getElementById("btn-close-closet"),
    tabBtnForm: document.getElementById("tab-btn-form"),
    tabBtnList: document.getElementById("tab-btn-list"),
    tabPaneForm: document.getElementById("tab-pane-form"),
    tabPaneList: document.getElementById("tab-pane-list"),

    // 服登録・編集フォーム (※気温スライダーは廃止)
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
    clothesTags: document.getElementById("clothes-tags"),
    clothesDesc: document.getElementById("clothes-desc"),
    btnSaveClothesText: document.getElementById("btn-save-clothes-text"),
    inputClothesPhoto: document.getElementById("input-clothes-photo"),
    photoAnalyzingBox: document.getElementById("photo-analyzing-box"),
    photoAnalyzingText: document.getElementById("photo-analyzing-text"),

    // 登録済み一覧
    listFilterGroup: document.getElementById("list-filter-group"),
    manageClothesList: document.getElementById("manage-clothes-list"),
    btnReloadSheet: document.getElementById("btn-reload-sheet"),
    btnSyncToSheet: document.getElementById("btn-sync-to-sheet"),

    // 設定モーダル
    modalSettings: document.getElementById("modal-settings"),
    btnOpenSettings: document.getElementById("btn-open-settings"),
    btnCloseSettings: document.getElementById("btn-close-settings"),
    inputGeminiKey: document.getElementById("setting-gemini-key"),
    btnSaveSettings: document.getElementById("btn-save-settings")
  };

  // --- 初期化 ---
  async function init() {
    loadUserData();
    loadClothesData();
    loadSettings();
    updateUserSelectDisplay();
    updateClosetSummary();
    renderManageClothesList();
    renderSubcatPills("アウター");
    bindEvents();

    // 起動時に固定GAS_URLからスプレッドシートの服データを自動取得
    await fetchClothesFromGoogleSheet();
  }

  // --- ユーザープロフィールのロードと保存 ---
  function loadUserData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        user = JSON.parse(stored);
      } else {
        user = {};
        saveUserDataLocal();
      }
    } catch (e) {
      console.error("Failed to load user data", e);
      user = {};
    }
  }

  function saveUserDataLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save user data", e);
    }
    updateUserSelectDisplay();
  }

  function updateUserSelectDisplay() {
    if (dom.selectUserOption) {
      dom.selectUserOption.textContent = `${user.name || "自分"} (${user.height || 175}cm/${user.weight || 85}kg・${user.preferredStyle || "アメカジ・ワーク"})`;
    }
  }

  // --- 服データのロードと保存 ---
  function loadClothesData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CLOTHES);
      if (stored) {
        clothes = JSON.parse(stored);
      } else {
        clothes = [];
        saveClothesDataLocal();
      }
    } catch (e) {
      console.error("Failed to load clothes data from localStorage", e);
      clothes = [];
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

  // --- Googleスプレッドシート (GAS) との自動通信 ---
  async function fetchClothesFromGoogleSheet() {
    updateSyncStatusUI("同期中...", "#d97706");
    try {
      const res = await fetch(DEFAULT_GAS_URL);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();

      if (json.status === "success") {
        // 服一覧の同期
        if (Array.isArray(json.clothes) && json.clothes.length > 0) {
          clothes = json.clothes;
          saveClothesDataLocal();
        }
        // ユーザープロフィールの同期
        if (json.user && json.user.name) {
          user = {
            ...user,
            ...json.user,
            height: Number(json.user.height || user.height || 175),
            weight: Number(json.user.weight || user.weight || 85)
          };
          saveUserDataLocal();
        }
        updateSyncStatusUI("シート同期中 (OK)", "#059669");
      } else {
        updateSyncStatusUI("シート接続済", "#059669");
      }
    } catch (err) {
      console.warn("GAS fetch failed (using local cache):", err.message);
      updateSyncStatusUI("オフライン/キャッシュ", "#d97706");
    }
  }

  async function postToGAS(action, payload) {
    try {
      await fetch(DEFAULT_GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
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
  }

  // --- イベントバインド ---
  function bindEvents() {
    // 👤 プロフィール編集モーダル開閉
    dom.btnEditUser.addEventListener("click", openUserProfileModal);
    dom.btnCloseUser.addEventListener("click", () => dom.modalUser.classList.remove("active"));
    dom.formUserProfile.addEventListener("submit", handleSaveUserProfile);

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

    // 編集キャンセル
    dom.btnCancelEdit.addEventListener("click", resetManageForm);

    // 写真からAI自動入力
    if (dom.inputClothesPhoto) {
      dom.inputClothesPhoto.addEventListener("change", handlePhotoUpload);
    }

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
      if (confirm(`現在クローゼットにある ${clothes.length} 着の服データを、スプレッドシートに一括転送（同期）しますか？\n※スプレッドシートの内容は上書きされます。`)) {
        dom.btnSyncToSheet.textContent = "転送中...";
        await postToGAS("syncAll", { clothes });
        dom.btnSyncToSheet.textContent = "📊 シートに全データを転送";
        alert("スプレッドシートへの転送が完了しました！");
      }
    });

    // シートから再読込
    if (dom.btnReloadSheet) {
      dom.btnReloadSheet.addEventListener("click", async () => {
        dom.btnReloadSheet.textContent = "読込中...";
        await fetchClothesFromGoogleSheet();
        dom.btnReloadSheet.textContent = "🔄 シートから再読込";
      });
    }

    // --- 設定モーダル ---
    dom.btnOpenSettings.addEventListener("click", () => dom.modalSettings.classList.add("active"));
    dom.btnCloseSettings.addEventListener("click", () => dom.modalSettings.classList.remove("active"));
    dom.btnSaveSettings.addEventListener("click", saveSettings);

    // モーダル外クリックで閉じる
    window.addEventListener("click", (e) => {
      if (e.target === dom.modalUser) dom.modalUser.classList.remove("active");
      if (e.target === dom.modalCloset) dom.modalCloset.classList.remove("active");
      if (e.target === dom.modalSettings) dom.modalSettings.classList.remove("active");
    });
  }

  // --- 👤 ユーザープロフィールの編集・保存 ---
  function openUserProfileModal() {
    dom.userName.value = user.name || "自分";
    dom.userHeight.value = user.height || 175;
    dom.userWeight.value = user.weight || 85;
    dom.userHair.value = user.hairStyle || "";
    dom.userColor.value = user.personalColor || "不明";
    dom.userStyle.value = user.preferredStyle || "";
    dom.userNote.value = user.note || "";
    dom.modalUser.classList.add("active");
  }

  async function handleSaveUserProfile(e) {
    e.preventDefault();

    user = {
      id: user.id || "user-1",
      name: dom.userName.value.trim() || "自分",
      height: parseInt(dom.userHeight.value, 10) || 175,
      weight: parseInt(dom.userWeight.value, 10) || 85,
      hairStyle: dom.userHair.value.trim() || "ナチュラル",
      personalColor: dom.userColor.value,
      preferredStyle: dom.userStyle.value.trim() || "アメカジ・ワーク",
      note: dom.userNote.value.trim()
    };

    saveUserDataLocal();
    dom.modalUser.classList.remove("active");
    alert("プロフィールを更新しました！AIスタイリストがこの体型・好みに合わせて提案するようになります。");

    await postToGAS("saveUser", { user });
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

  // --- 服の登録・編集保存処理 (※気温範囲は不要) ---
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
    const tagsStr = dom.clothesTags.value.trim();
    const tags = tagsStr ? tagsStr.split(/[,、]/).map(t => t.trim()).filter(Boolean) : [];
    const description = dom.clothesDesc.value.trim();

    if (!name) {
      alert("アイテム名を入力してください。");
      return;
    }

    let savedItem;

    if (editId) {
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
          tags,
          description
        };
        clothes[idx] = savedItem;
        alert(`「${name}」を更新しました！（スプレッドシートへ自動反映中）`);
      }
    } else {
      const newId = "item-" + Date.now();
      savedItem = {
        id: newId,
        category,
        subcategory,
        name,
        brand,
        color,
        fit,
        tags,
        description
      };
      clothes.unshift(savedItem);
      alert(`「${name}」を登録しました！（スプレッドシートへ自動登録中）`);
    }

    saveClothesDataLocal();
    resetManageForm();
    switchClosetTab("list");

    if (savedItem) {
      await postToGAS("save", { item: savedItem });
    }
  }

  // --- 📷 写真から服情報をAI解析してフォームへ自動入力 ---
  async function handlePhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
    if (!apiKey) {
      alert("写真から服の情報を読み取るには、Gemini APIキーが必要です。\n右上の「⚙️ AI設定」からキーを入力してください（Google AI Studioで無料取得できます）。");
      dom.inputClothesPhoto.value = "";
      dom.modalSettings.classList.add("active");
      return;
    }

    try {
      if (dom.photoAnalyzingBox) {
        dom.photoAnalyzingBox.style.display = "flex";
        if (dom.photoAnalyzingText) dom.photoAnalyzingText.textContent = "📷 写真を最適化中...";
      }

      // スマホ写真を軽量なJPEGに自動リサイズ・圧縮（爆速通信化）
      const base64Data = await compressImageToJpegBase64(file, 1024, 0.8);
      const mimeType = "image/jpeg";

      if (dom.photoAnalyzingText) {
        dom.photoAnalyzingText.textContent = "🤖 AIが服の形・色・特徴を分析中（数秒お待ちください）...";
      }

      // Gemini Visionで高速解析
      const analyzed = await analyzeClothesPhotoWithGemini(apiKey, base64Data, mimeType);

      if (analyzed) {
        // フォームへ自動反映
        if (analyzed.category) {
          dom.pillCategoryGroup.querySelectorAll(".type-pill").forEach(p => {
            p.classList.toggle("active", p.getAttribute("data-cat") === analyzed.category);
          });
          renderSubcatPills(analyzed.category);
        }

        if (analyzed.name) dom.clothesName.value = analyzed.name;
        if (analyzed.subcategory) dom.clothesSubcat.value = analyzed.subcategory;
        if (analyzed.brand) dom.clothesBrand.value = analyzed.brand;
        if (analyzed.color) dom.clothesColor.value = analyzed.color;
        if (analyzed.fit) dom.clothesFit.value = analyzed.fit;
        if (analyzed.tags) {
          dom.clothesTags.value = Array.isArray(analyzed.tags) ? analyzed.tags.join(", ") : analyzed.tags;
        }
        if (analyzed.description) dom.clothesDesc.value = analyzed.description;

        alert(`✨ AIが写真から服の特徴を下書きしました！\n\n【アイテム名】: ${analyzed.name}\n【分類】: ${analyzed.category} / ${analyzed.subcategory || ""}\n【色】: ${analyzed.color || ""}\n【シルエット】: ${analyzed.fit || ""}\n\n内容を確認・微調整の上、一番下の「この服を登録する」ボタンを押してください。`);
      }
    } catch (err) {
      console.error("Photo analysis failed:", err);
      alert("写真のAI分析に失敗しました。\nエラー詳細: " + err.message);
    } finally {
      if (dom.photoAnalyzingBox) dom.photoAnalyzingBox.style.display = "none";
      dom.inputClothesPhoto.value = "";
    }
  }

  // スマホ写真をブラウザ上で最大1024pxのJPEGに自動縮小・軽量化
  function compressImageToJpegBase64(file, maxDimension = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const base64 = dataUrl.split(",")[1];
          resolve(base64);
        };
        img.onerror = () => reject(new Error("画像の読み込みに失敗しました。対応していない画像形式の可能性があります。"));
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- Gemini API 共通呼び出し（安全・高速なモデルフォールバック） ---
  async function callGeminiGenerateContent(apiKey, payload) {
    // 試行するモデル候補（画像認識とテキストに対応した公式主力モデル順）
    const targetModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-1.5-pro"
    ];

    let lastError = null;
    for (const model of targetModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒タイムアウト

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return data;
        }

        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error ? errJson.error.message : res.statusText;
        lastError = new Error(`Gemini APIエラー (${res.status} [${model}]): ${msg}`);

        // 404（存在しない）または 400（モダリティ非対応等）は次候補モデルへスキップ
        if (res.status === 404 || res.status === 400) {
          console.warn(`[${model}] (${res.status}) エラーのため、次の候補モデルを試します...`);
          continue;
        }

        // 認証エラー（401/403等）は即座に通知
        throw lastError;
      } catch (err) {
        if (err.name === "AbortError") {
          console.warn(`[${model}] タイムアウトのため次モデルを試します...`);
          continue;
        }
        if (err.message && (err.message.includes("404") || err.message.includes("400"))) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error("利用可能なGeminiモデルが見つかりませんでした。APIキーを確認してください。");
  }

  // Gemini応答から思考(thought)やマークダウンを除去してJSONを抽出
  function extractJsonFromGeminiResponse(data) {
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("Geminiからの応答データが空でした。");
    }

    const parts = candidate.content.parts;
    let rawText = "";
    // thoughtではないテキストを探す
    for (const part of parts) {
      if (part.text && !part.thought) {
        rawText = part.text;
        break;
      }
    }
    if (!rawText && parts.length > 0) {
      rawText = parts[parts.length - 1].text || "";
    }

    // { ... } のJSONブロックを正規表現で抽出
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AIの応答からJSONを解析できませんでした:\n" + rawText.slice(0, 150));
    }

    return JSON.parse(jsonMatch[0]);
  }

  async function analyzeClothesPhotoWithGemini(apiKey, base64Data, mimeType) {
    const promptText = `
あなたはアメカジ・ワーク・ミリタリー・ヴィンテージファッションに精通したアパレル専門家です。
提供された服の写真画像を観察し、カタログ登録用の情報を以下の厳密なJSON形式のみで出力してください。

【出力するJSONフォーマット】
{
  "category": "アウター" | "トップス" | "ボトムス" | "シューズ" のいずれか1つ,
  "subcategory": "アイテムの具体的なタイプ（例: Gジャン, カバーオール, Tシャツ, ワークシャツ, スウェット, ワークパンツ, 軍パン/カーゴ, デニム/ジーンズ, ブーツ, スニーカー など）",
  "name": "魅力的なアイテム名（例: 濃紺 1stタイプ Tバック Gジャン, オリーブ M-47 フランス軍カーゴパンツ, ヘビーウェイト ポケットTシャツ など）",
  "brand": "ロゴやタグ・特徴から推測されるブランド名（不明なら空文字 \"\"）",
  "color": "色合い（例: 濃紺(インディゴ), オリーブ, スミ黒, キャメル, 生成り など）",
  "fit": "シルエットや着用感（例: ボックス短丈, ワイドストレート, リラックスフィット, テーパード など）",
  "tags": ["特徴や季節感タグの配列。例: 短丈, デニム, リジッド, 春秋用, 肉厚 など 3〜5個"],
  "description": "着こなしの特徴やアピールポイント（20〜50文字程度。例: ワイドパンツと好相性なボックスシルエットのGジャン。）"
}

※純粋なJSONオブジェクトのみを出力してください。
`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    const data = await callGeminiGenerateContent(apiKey, payload);
    return extractJsonFromGeminiResponse(data);
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

    dom.formModeBadge.querySelector("span").textContent = "✨ 新しい服を登録";
    dom.btnCancelEdit.style.display = "none";
    dom.btnSaveClothesText.textContent = "💾 この服を登録する";

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

    dom.formModeBadge.querySelector("span").textContent = `✏️ 「${item.name}」を編集中`;
    dom.btnCancelEdit.style.display = "inline";
    dom.btnSaveClothesText.textContent = "💾 変更を保存する";

    dom.pillCategoryGroup.querySelectorAll(".type-pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-cat") === item.category);
    });
    renderSubcatPills(item.category);

    switchClosetTab("form");
  }

  // 削除処理
  async function deleteClothes(id) {
    const item = clothes.find(c => c.id === id);
    if (!item) return;

    if (confirm(`「${item.name}」をクローゼットから削除しますか？\n※スプレッドシートからも自動削除されます。`)) {
      clothes = clothes.filter(c => c.id !== id);
      saveClothesDataLocal();
      if (dom.clothesEditId.value === id) {
        resetManageForm();
      }
      await postToGAS("delete", { item: { id } });
    }
  }

  // --- 管理用アイテム一覧の描画 (※気温表示を削除) ---
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
              🎨 ${escapeHtml(c.color || "未設定")} ｜ 📐 ${escapeHtml(c.fit || "レギュラー")}
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

  // --- 設定管理 (Gemini API用) ---
  function loadSettings() {
    const key = localStorage.getItem(STORAGE_KEY_GEMINI) || "";
    if (dom.inputGeminiKey) dom.inputGeminiKey.value = key;
  }

  function saveSettings() {
    const key = dom.inputGeminiKey.value.trim();
    localStorage.setItem(STORAGE_KEY_GEMINI, key);
    dom.modalSettings.classList.remove("active");
    alert("設定を保存しました！" + (key ? "（Gemini API連携が有効化されました）" : "（内蔵スマートモックAIで動作します）"));
  }

  // --- コーディネート実行 (※機械的な気温足切りは廃止、全服をAIに渡す) ---
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
      dom.loadingDesc.textContent = `気温${currentTemp}℃・「${dest}」に合わせて、${user.name || "あなた"}の体型(${user.height || 175}cm/${user.weight || 85}kg)に最適な組み合わせをAIが厳選中...`;
    }

    // 機械的な足切りをせず、全手持ち服をAIに渡して賢く選ばせる
    const candidates = [...clothes];

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
          candidates: candidates,
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
          candidates: candidates,
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
        candidates: candidates,
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

  // --- 内蔵スマートモックAI (気温・体型・アイテム特性から自律判断) ---
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

    // 気温に応じたアウター＆トップスの選定
    let selOuter, selTop;

    if (temp <= 12) {
      // 寒い日：M-65ミリタリーまたはダウンベスト、肉厚スウェット/ニット
      selOuter = safeOuters.find(o => o.subcategory === "ミリタリー" || o.name.includes("M-65") || o.subcategory === "ベスト") || safeOuters[0];
      selTop = safeTops.find(t => t.subcategory === "スウェット" || t.subcategory === "ニット" || t.name.includes("リバースウィーブ")) || safeTops[0];
    } else if (temp <= 20) {
      // 春秋 (13〜20℃)：Gジャンが最も映える気温帯！
      selOuter = safeOuters.find(o => o.subcategory === "Gジャン" || o.name.includes("Gジャン")) || safeOuters[0];
      selTop = safeTops.find(t => t.subcategory === "Tシャツ" || t.subcategory === "サーマル" || t.subcategory === "シャツ") || safeTops[0];
    } else {
      // 初夏・暖かい日 (21℃以上)：軽めの色落ちGジャンやカバーオール、インナーは白T
      selOuter = safeOuters.find(o => o.name.includes("2nd") || o.subcategory === "カバーオール") || safeOuters[0];
      selTop = safeTops.find(t => t.subcategory === "Tシャツ" || t.subcategory === "カットソー") || safeTops[0];
    }

    if (isReroll) {
      selOuter = safeOuters[Math.floor(Math.random() * safeOuters.length)];
      selTop = safeTops[Math.floor(Math.random() * safeTops.length)];
    }

    let selBtm = safeBtms[Math.floor(Math.random() * safeBtms.length)];
    let selShoe = safeShoes[Math.floor(Math.random() * safeShoes.length)];

    let comment = `【${user.name || "あなた"}様（身長${user.height || 175}cm / ${user.weight || 85}kg）へのスタイリング提案：${destination}】\n\n`;
    comment += `本日の気温${temp}℃・天候${weather}を考慮し、体温調節しやすく快適に過ごせるアイテム構成をセレクトしました。\n\n`;
    comment += `主役の『${selOuter.name}』に対し、ボトムスに『${selBtm.name}』をセット。`;
    if (selOuter.subcategory === "Gジャン" && selBtm.subcategory?.includes("ワーク")) {
      comment += `短丈のGジャンとワイドなワークパンツのメリハリが効いた、美しいAラインの王道アメカジシルエットです。がっしりした体型（${user.weight || 85}kg）に最高の男らしい収まりになります。\n\n`;
    } else {
      comment += `全体のカラーバランスとシルエットの収まりを考慮して組み合わせました。\n\n`;
    }

    comment += `【着こなしのコツ】\n`;
    comment += `・インナーの『${selTop.name}』は気温${temp}℃にちょうど良い厚みで、前を開けた時の抜け感も抜群です。足元は『${selShoe.name}』でしっかり引き締めています。`;

    if (user.note) {
      comment += `\n・こだわりメモ「${user.note}」を意識したスタイリングです。`;
    }
    if (note) {
      comment += `\n・本日のご要望「${note}」もしっかり反映しています！`;
    }

    return {
      comment: comment,
      selectedIds: [selOuter.id, selTop.id, selBtm.id, selShoe.id],
      items: [selOuter, selTop, selBtm, selShoe]
    };
  }

  // --- Gemini API (Google AI Studio) 呼び出し ---
  async function fetchGeminiStylist(apiKey, ctx) {
    const promptText = `
あなたはアメカジ・ワーク・ヴィンテージファッションに精通した一流のパーソナルスタイリストです。
以下のユーザー情報と手持ち服リスト、本日の環境条件から、最高のトータルコーディネート（アウター・トップス・ボトムス・シューズの各1点）を選出し、選定理由と着こなしのアドバイスを記述してください。

★重要：服のデータには気温範囲を登録していません。あなたが各アイテムの名称・ブランド・素材・厚み・特徴タグから、本日の気温（${ctx.temp}℃）に本当に快適で季節感にマッチするかを自律的に判断してセレクトしてください。

【ユーザー情報】
お名前: ${ctx.user.name || "自分"}
身長: ${ctx.user.height}cm, 体重: ${ctx.user.weight}kg, 髪型: ${ctx.user.hairStyle || "ナチュラル"}
パーソナルカラー: ${ctx.user.personalColor || "未設定"}
好みの系統: ${ctx.user.preferredStyle || "アメカジ・ワーク・ミリタリー"}
こだわりメモ: ${ctx.user.note || "特になし"}

【本日の環境・条件】
気温: ${ctx.temp}℃, 天気: ${ctx.weather}, 目的地・シチュエーション: ${ctx.destination}
ユーザーからの特別な希望: ${ctx.note || "特になし（スタイリストのおまかせ）"}

【手持ち服の候補リスト (JSON)】
${JSON.stringify(ctx.candidates.map((c) => ({ id: c.id, category: c.category, name: c.name, brand: c.brand, color: c.color, fit: c.fit, tags: c.tags, description: c.description })))}

${ctx.excludeIds && ctx.excludeIds.length > 0 ? `※ 直前の提案と被らないよう、可能であれば次のIDは除外してください: ${ctx.excludeIds.join(", ")}` : ""}

【出力フォーマット】
以下のキーを持つ厳密なJSONのみを出力してください（Markdownのバッククォート不要、純粋なJSON文字列）：
{
  "outerId": "選んだアウターのid",
  "topId": "選んだトップスのid",
  "bottomId": "選んだボトムスのid",
  "shoeId": "選んだシューズのid",
  "comment": "本日の気温${ctx.temp}℃に対する寒暖の配慮、ユーザーの体型やこだわりに対するシルエットのアドバイス、着こなしのコツについてのプロの解説文（200〜400文字程度）"
}
`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    };

    const data = await callGeminiGenerateContent(apiKey, payload);
    const parsed = extractJsonFromGeminiResponse(data);

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
