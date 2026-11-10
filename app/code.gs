// ========================================
// fuku_coord 用 Google Apps Script (code.gs)
// ========================================
// 画面から登録・編集・削除した服を、Googleスプレッドシートに自動反映します。
//
// 【必要なスプレッドシートの構成】
// 1行目に以下のヘッダー（列名）を作成してください：
// A列: id
// B列: category
// C列: subcategory
// D列: name
// E列: brand
// F列: color
// G列: fit
// H列: tempMin
// I列: tempMax
// J列: tags
// K列: description
// ========================================

// ★ あなたの Google スプレッドシートのIDをここに設定してください
// （例: https://docs.google.com/spreadsheets/d/1ABC123xyz.../edit の「1ABC123xyz...」の部分）
const SPREADSHEET_ID = "1Qt6eAZMcVEKOLhv_ok3JD5XcVn4BN-nc27GZHL1a4iU";
const SHEET_NAME = "clothes";

/**
 * GET リクエスト: スプレッドシートから服一覧を取得して画面に返す
 */
function doGet(e) {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({
        status: "error",
        message: "code.gs の SPREADSHEET_ID が未設定です。スプレッドシートIDを設定してください。"
      });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const clothes = readSheetToObjects(sheet);

    return createJsonResponse({
      status: "success",
      clothes: clothes.map(c => ({
        ...c,
        tempMin: Number(c.tempMin || 10),
        tempMax: Number(c.tempMax || 25),
        tags: c.tags ? String(c.tags).split(/[,、]/).map(t => t.trim()).filter(Boolean) : []
      }))
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * POST リクエスト: 画面からの「登録」「編集」「削除」をスプレッドシートに反映
 */
function doPost(e) {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({
        status: "error",
        message: "code.gs の SPREADSHEET_ID が未設定です。"
      });
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action; // "save" または "delete" または "syncAll"
    const item = body.item;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // ヘッダー定義
    const headers = ["id", "category", "subcategory", "name", "brand", "color", "fit", "tempMin", "tempMax", "tags", "description"];
    ensureHeaders(sheet, headers);

    if (action === "save") {
      // 追加または更新
      saveOrUpdateItem(sheet, headers, item);
      return createJsonResponse({ status: "success", message: "スプレッドシートに保存しました。" });
    } else if (action === "delete") {
      // 削除
      deleteItemById(sheet, item.id);
      return createJsonResponse({ status: "success", message: "スプレッドシートから削除しました。" });
    } else if (action === "syncAll") {
      // 画面の服一覧でスプレッドシートを丸ごと初期化・同期
      syncAllItems(sheet, headers, body.clothes || []);
      return createJsonResponse({ status: "success", message: "全データをスプレッドシートに一括同期しました。" });
    }

    return createJsonResponse({ status: "error", message: "未対応のアクションです: " + action });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * 1件の保存または更新
 */
function saveOrUpdateItem(sheet, headers, item) {
  const data = sheet.getDataRange().getValues();
  const idColIdx = headers.indexOf("id");
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idColIdx]) === String(item.id)) {
      targetRow = r + 1; // 1-indexed
      break;
    }
  }

  const rowValues = headers.map(h => {
    if (h === "tags") {
      return Array.isArray(item.tags) ? item.tags.join(", ") : (item.tags || "");
    }
    return item[h] !== undefined ? item[h] : "";
  });

  if (targetRow > 0) {
    // 既存行を更新
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // 新規行を追加
    sheet.appendRow(rowValues);
  }
}

/**
 * IDによる行削除
 */
function deleteItemById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(id)) {
      sheet.deleteRow(r + 1);
      break;
    }
  }
}

/**
 * 全アイテム一括同期
 */
function syncAllItems(sheet, headers, clothesList) {
  sheet.clearContents();
  sheet.appendRow(headers);
  if (!clothesList || clothesList.length === 0) return;

  const rows = clothesList.map(item => {
    return headers.map(h => {
      if (h === "tags") {
        return Array.isArray(item.tags) ? item.tags.join(", ") : (item.tags || "");
      }
      return item[h] !== undefined ? item[h] : "";
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * 1行目のヘッダーが存在しない場合に作成
 */
function ensureHeaders(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(headers);
  }
}

/**
 * シートデータをオブジェクト配列として取得
 */
function readSheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx];
    });
    return obj;
  });
}

function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}