const SHEET_NAME = "Leaderboard";
const MAX_LEADERBOARD_ROWS = 50;
const HEADERS = ["id", "nickname", "stars", "playTimeMs", "completedAt", "createdAt"];

function doGet() {
  return json_({
    ok: true,
    plays: listPlays_(),
  });
}

function doPost(e) {
  const body = parseBody_(e);
  if (body.action && body.action !== "save") {
    return doGet();
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(10000);
    hasLock = true;
    const play = savePlay_(body.play || body);
    return json_({
      ok: true,
      play,
      plays: listPlays_(),
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error.message || String(error),
    });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function parseBody_(e) {
  const contents = e && e.postData && e.postData.contents;
  if (!contents) return (e && e.parameter) || {};
  try {
    return JSON.parse(contents);
  } catch {
    return (e && e.parameter) || {};
  }
}

function savePlay_(incomingPlay) {
  const play = sanitizePlay_(incomingPlay);
  const rows = readRows_();
  const existingIndex = rows.findIndex((row) => row.id === play.id);
  if (existingIndex === -1) {
    rows.push(play);
  }
  writeRows_(rows);
  return play;
}

function listPlays_() {
  return readRows_().sort(comparePlays_).slice(0, MAX_LEADERBOARD_ROWS).map(toClientPlay_);
}

function readRows_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).map(rowToPlay_).filter(Boolean);
}

function writeRows_(plays) {
  const sheet = getSheet_();
  const rows = plays.sort(comparePlays_).slice(0, MAX_LEADERBOARD_ROWS);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  if (rows.length === 0) return;
  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows.map(playToRow_));
}

function getSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  const headerValues = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = HEADERS.some((header, index) => headerValues[index] !== header);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sanitizePlay_(play) {
  if (!play || typeof play !== "object") {
    throw new Error("Missing play data.");
  }
  const nickname = String(play.nickname || "").trim().replace(/\s+/g, " ").slice(0, 18);
  const stars = Math.max(0, Math.floor(Number(play.stars)));
  const playTimeMs = Math.max(0, Math.floor(Number(play.playTimeMs)));
  const completedAt = Number.isFinite(Number(play.completedAt)) ? Math.floor(Number(play.completedAt)) : Date.now();
  if (!nickname || !Number.isFinite(stars) || !Number.isFinite(playTimeMs)) {
    throw new Error("Invalid play data.");
  }
  return {
    id: String(play.id || Utilities.getUuid()),
    nickname,
    stars,
    playTimeMs,
    completedAt,
    createdAt: Date.now(),
  };
}

function rowToPlay_(row) {
  const play = {
    id: row[0],
    nickname: row[1],
    stars: row[2],
    playTimeMs: row[3],
    completedAt: row[4],
    createdAt: row[5],
  };
  try {
    return {
      ...sanitizePlay_(play),
      createdAt: Number.isFinite(Number(play.createdAt)) ? Math.floor(Number(play.createdAt)) : Date.now(),
    };
  } catch {
    return null;
  }
}

function playToRow_(play) {
  return [play.id, play.nickname, play.stars, play.playTimeMs, play.completedAt, play.createdAt];
}

function toClientPlay_(play) {
  return {
    id: play.id,
    nickname: play.nickname,
    stars: play.stars,
    playTimeMs: play.playTimeMs,
    completedAt: play.completedAt,
  };
}

function comparePlays_(a, b) {
  if (b.stars !== a.stars) return b.stars - a.stars;
  if (a.playTimeMs !== b.playTimeMs) return a.playTimeMs - b.playTimeMs;
  return a.completedAt - b.completedAt;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
