const SHEET_NAME = '스터디신청';
const HEADERS = [
  '접수일시', '접수ID', '성함', '연락처', '관심분야', '개인정보동의',
  '페이지URL', '유입경로', '브라우저정보', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_content', 'utm_term', '상태', '메모'
];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'wealth-study-application' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};

    // 봇이 숨김 필드를 채운 경우 실제 저장 없이 성공으로 응답합니다.
    if (clean_(p.website, 200)) return response_(true, '접수되었습니다.');

    const data = {
      requestId: clean_(p.request_id, 80) || Utilities.getUuid(),
      name: clean_(p.name, 40),
      phone: formatPhone_(p.phone),
      interest: clean_(p.interest, 80),
      consent: clean_(p.consent, 10),
      pageUrl: clean_(p.page_url, 500),
      referrer: clean_(p.referrer, 500),
      userAgent: clean_(p.user_agent, 500),
      utmSource: clean_(p.utm_source, 100),
      utmMedium: clean_(p.utm_medium, 100),
      utmCampaign: clean_(p.utm_campaign, 150),
      utmContent: clean_(p.utm_content, 150),
      utmTerm: clean_(p.utm_term, 150)
    };

    validate_(data);

    const cache = CacheService.getScriptCache();
    if (cache.get(data.requestId)) return response_(true, '이미 접수된 신청입니다.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      ensureHeaders_(sheet);
      sheet.appendRow([
        new Date(), safe_(data.requestId), safe_(data.name), safe_(data.phone),
        safe_(data.interest), '동의', safe_(data.pageUrl), safe_(data.referrer),
        safe_(data.userAgent), safe_(data.utmSource), safe_(data.utmMedium),
        safe_(data.utmCampaign), safe_(data.utmContent), safe_(data.utmTerm),
        '신규', ''
      ]);
      sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      cache.put(data.requestId, '1', 21600);
    } finally {
      lock.releaseLock();
    }

    return response_(true, '신청이 정상적으로 접수되었습니다.');
  } catch (error) {
    console.error(error);
    return response_(false, error.message || '접수 중 오류가 발생했습니다.');
  }
}

function setSpreadsheetId(spreadsheetId) {
  if (!spreadsheetId) throw new Error('스프레드시트 ID를 입력해 주세요.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
}

function setupSheet() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#102b4e')
    .setFontColor('#ffffff');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function getSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Apps Script의 SPREADSHEET_ID가 설정되지 않았습니다.');
  const spreadsheet = SpreadsheetApp.openById(id);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
}

function validate_(data) {
  if (!data.name) throw new Error('성함을 입력해 주세요.');
  if (!/^01[016789]-\d{3,4}-\d{4}$/.test(data.phone)) throw new Error('연락처를 확인해 주세요.');
  if (!data.interest) throw new Error('관심 분야를 선택해 주세요.');
  if (data.consent !== '동의') throw new Error('개인정보 수집·이용 동의가 필요합니다.');
}

function clean_(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function formatPhone_(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^01[016789]\d{7}$/.test(digits)) {
    return digits.replace(/^(01[016789])(\d{3})(\d{4})$/, '$1-$2-$3');
  }
  if (/^01[016789]\d{8}$/.test(digits)) {
    return digits.replace(/^(01[016789])(\d{4})(\d{4})$/, '$1-$2-$3');
  }
  return clean_(value, 30);
}

// 셀 수식으로 해석될 수 있는 사용자 입력을 일반 텍스트로 저장합니다.
function safe_(value) {
  const text = String(value || '');
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function response_(ok, message) {
  const color = ok ? '#102b4e' : '#9b2c2c';
  const payload = JSON.stringify({
    source: 'wealth-study-application',
    ok: ok,
    message: message
  }).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="ko"><head><meta charset="utf-8"></head>' +
    '<body style="font-family:sans-serif;color:' + color + '">' +
    '<p>' + escapeHtml_(message) + '</p>' +
    '<script>window.parent.postMessage(' + payload + ', "*");<\/script>' +
    '</body></html>'
  );
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}
