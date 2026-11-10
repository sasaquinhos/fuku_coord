// ========================================
// fuku_coord 用 Google Apps Script (code.gs)
// ========================================
// 画面から登録・編集・削除した服およびプロフィールを、Googleスプレッドシートに自動反映します。
// ※ 気温範囲は人間がいちいち入力せず、AIがアイテム名や特徴から自律的に判断します。
//
// 【スプレッドシートの構成】
// 1.「clothes」シート (服データ)
//    A列: id, B列: category, C列: subcategory, D列: name, E列: brand, F列: color, G列: fit, H列: tags, I列: description
//
// 2.「users」シート (プロフィールデータ)
//    A列: id, B列: name, C列: height, D列: weight, E列: hairStyle, F列: personalColor, G列: preferredStyle, H列: note
// ========================================

const SPREADSHEET_ID = "1Qt6eAZMcVEKOLhv_ok3JD5XcVn4BN-nc27GZHL1a4iU";
const SHEET_NAME_CLOTHES = "clothes";
const SHEET_NAME_USERS = "users";

/**
 * GET リクエスト: スプレッドシートから服一覧およびユーザー情報を取得
 */
function doGet(e) {
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({
        status: "error",
        message: "code.gs の SPREADSHEET_ID が未設定です。"
      });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const clothesSheet = ss.getSheetByName(SHEET_NAME_CLOTHES) || ss.getSheets()[0];
    const clothes = readSheetToObjects(clothesSheet);

    const usersSheet = ss.getSheetByName(SHEET_NAME_USERS);
    const users = usersSheet ? readSheetToObjects(usersSheet) : [];

    return createJsonResponse({
      status: "success",
      clothes: clothes.map(c => ({
        ...c,
        tags: c.tags ? String(c.tags).split(/[,、]/).map(t => t.trim()).filter(Boolean) : []
      })),
      user: users[0] || null
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

/**
 * POST リクエスト: 服の追加・更新・削除、およびプロフィールの保存
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
    const action = body.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. プロフィール保存
    if (action === "saveUser") {
      saveUserProfile(ss, body.user);
      return createJsonResponse({ status: "success", message: "プロフィールをスプレッドシートに保存しました。" });
    }

    // 2. 服データの保存・削除・一括同期
    const clothesSheet = ss.getSheetByName(SHEET_NAME_CLOTHES) || ss.getSheets()[0];
    const headers = ["id", "category", "subcategory", "name", "brand", "color", "fit", "tags", "description"];
    ensureHeaders(clothesSheet, headers);

    if (action === "save") {
      saveOrUpdateItem(clothesSheet, headers, body.item);
      return createJsonResponse({ status: "success", message: "スプレッドシートに服を保存しました。" });
    } else if (action === "delete") {
      deleteItemById(clothesSheet, body.item.id);
      return createJsonResponse({ status: "success", message: "スプレッドシートから服を削除しました。" });
    } else if (action === "syncAll") {
      syncAllItems(clothesSheet, headers, body.clothes || []);
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
 * ユーザープロフィールの保存
 */
function saveUserProfile(ss, user) {
  let sheet = ss.getSheetByName(SHEET_NAME_USERS);
  const userHeaders = ["id", "name", "height", "weight", "hairStyle", "personalColor", "preferredStyle", "note"];
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_USERS);
    sheet.appendRow(userHeaders);
  } else {
    ensureHeaders(sheet, userHeaders);
  }

  const rowValues = userHeaders.map(h => user[h] !== undefined ? user[h] : "");
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, 1, userHeaders.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * 1件の服の保存または更新
 */
function saveOrUpdateItem(sheet, headers, item) {
  const data = sheet.getDataRange().getValues();
  const idColIdx = headers.indexOf("id");
  let targetRow = -1;

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idColIdx]) === String(item.id)) {
      targetRow = r + 1;
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
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  } else {
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

function ensureHeaders(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(headers);
  }
}

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
