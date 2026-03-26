// ============================================================
// 📺 라이브방송 시트 핸들러
// Apps Script doGet() 안의 action 분기에 아래 case 추가
// ============================================================

// --- doGet action 분기에 추가 ---
// case 'getLiveBroadcasts': return getLiveBroadcasts(e);

function getLiveBroadcasts(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // 시트 없으면 자동 생성
    let sheet = ss.getSheetByName('라이브방송');
    if (!sheet) {
      sheet = ss.insertSheet('라이브방송');
      sheet.getRange(1,1,1,12).setValues([[
        '방송ID','제목','대리점명','대리점ID','유튜브URL',
        '방송일시','마감시각','상태','연결상품ID','연결상품명',
        '시청자수','방송매출'
      ]]);
      // 예시 데이터 1건
      sheet.getRange(2,1,1,12).setValues([[
        'LIVE001','담누리마켓 오픈 기념 라이브','담누리마켓','main',
        '','','','예정','','',0,0
      ]]);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const broadcasts = data.slice(1)
      .filter(row => row[0]) // 방송ID 있는 행만
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, broadcasts })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch(e) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: e.toString(), broadcasts: [] })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
