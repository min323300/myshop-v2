// ============================================================
// ⚙️ 설정 파일 - config.js (담누리마켓 V2)
// ============================================================
const CONFIG = {
  // ✅ Google Sheets ID (쇼핑몰2버전 시트)
  SHEET_ID: '1gjnczt_Db959Nc6aAF6CIPIj1SBY4XvoIXuEAAIJOZE',

  // ✅ Apps Script URL (기존과 동일 — 새 배포 후 변경 예정)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbw_rbhRHPQhNYHttEbAyKiLDB32r1TQlhPBO6V3kIQq0AW1mNoz0yb3gjlaiQtB1uyn/exec',
  
  // ✅ YouTube 동시접속자 API 키
  YOUTUBE_API_KEY: 'AIzaSyCbIR9GlemCUaHvcbGOy8AdrXEsd5EZlhE',

  // ✅ 이미지 기본 URL (myshop-v2 저장소)
  IMAGE_BASE: 'https://min323300.github.io/myshop-v2/images/',

  // 시트별 URL 자동 생성
  get SHEETS() {
    const base = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
    return {
      상품목록:   base + encodeURIComponent('상품목록'),
      카테고리:   base + encodeURIComponent('카테고리'),
      대리점상품: base + encodeURIComponent('대리점상품'),
      리뷰:       base + encodeURIComponent('리뷰'),
      대리점:     base + encodeURIComponent('대리점'),
      주문:       base + encodeURIComponent('주문'),
      정산:       base + encodeURIComponent('정산'),
      수수료:     base + encodeURIComponent('수수료'),
      PG설정:     base + encodeURIComponent('PG설정'),
      팝업:       base + encodeURIComponent('팝업'),
      배너:       base + encodeURIComponent('배너'),
      배송정책:   base + encodeURIComponent('배송정책'),
      사업자정보: base + encodeURIComponent('사업자정보'),
      라이브방송: base + encodeURIComponent('라이브방송'),
    };
  },

  // ✅ 본사 기본 정보
  STORE: {
    BRAND:   '담누리마켓',
    NAME:    '(주)비에스컴퍼니',
    LOGO:    '🏪',
    TAGLINE: '담누리마켓에서 모든 것을 담으세요',
    PHONE:   '031-876-6606',
    EMAIL:   'hypo3300@naver.com',
    ADDRESS: '경기도 의정부시 호국로 1195-1 4층',
    SNS: {
      INSTAGRAM: 'https://instagram.com/',
      KAKAO:     'https://pf.kakao.com/',
      YOUTUBE:   'https://youtube.com/',
    }
  },

  // ✅ 대리점 설정
  IS_DEALER:   false,
  DEALER_ID:   '',
  DEALER_NAME: '',

  // ✅ PG 설정 (윈글로벌페이) — 심사 통과 후 새 MID 입력
  PG: {
    PROVIDER:      'winglobalpay',
    MERCHANT_ID:   '',
    API_PROXY_URL: 'https://script.google.com/macros/s/AKfycbzWpT2On47R7_LTRiznH7qcPBYTPUV3i4UiywI8lkHUYt6KGzDevap7RfQHACwD7oxDzg/exec',
  },

  // ✅ 기타 설정
  PRODUCTS_PER_PAGE:   12,
  CURRENCY:            'KRW',
  DEFAULT_THEME_COLOR: '#FF5733',
};

// ============================================================
// ✅ 구글시트에서 스토어 정보 자동 로드
// ============================================================
(function loadStoreInfoFromSheet() {
  var SHEET_ID = CONFIG.SHEET_ID;

  function parseCSV(csv) {
    var lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    var headers = lines[0].split(',').map(function(h){ return h.trim().replace(/"/g,''); });
    return lines.slice(1).map(function(line) {
      var vals = [], cur = '', inQ = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      vals.push(cur.trim());
      var obj = {};
      headers.forEach(function(h, i){ obj[h] = (vals[i]||'').replace(/"/g,'').trim(); });
      return obj;
    }).filter(function(r){ return Object.values(r).some(function(v){ return v; }); });
  }

  var bizUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
    + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('사업자정보')
    + '&t=' + Date.now();

  fetch(bizUrl)
    .then(function(r){ return r.text(); })
    .then(function(csv) {
      var rows = parseCSV(csv);
      if (!rows.length) return;
      var myId = CONFIG.DEALER_ID || '본사';
      var row = rows.find(function(r){
        return (r['대리점ID'] || '본사') === myId;
      }) || rows.find(function(r){
        return !r['대리점ID'] || r['대리점ID'] === '' || r['대리점ID'] === '본사';
      }) || rows[0];
      if (!row) return;
      if (row['브랜드명'] || row['상호명'])  CONFIG.STORE.BRAND   = row['브랜드명'] || row['상호명'] || CONFIG.STORE.BRAND;
      if (row['상호'])                        CONFIG.STORE.NAME    = row['상호']    || CONFIG.STORE.NAME;
      if (row['전화'])                        CONFIG.STORE.PHONE   = row['전화']    || CONFIG.STORE.PHONE;
      if (row['이메일'])                      CONFIG.STORE.EMAIL   = row['이메일']  || CONFIG.STORE.EMAIL;
      if (row['주소'])                        CONFIG.STORE.ADDRESS = row['주소']    || CONFIG.STORE.ADDRESS;
      if (row['태그라인'] || row['슬로건'])  CONFIG.STORE.TAGLINE = row['태그라인'] || row['슬로건'] || CONFIG.STORE.TAGLINE;
      if (row['인스타그램'])                  CONFIG.STORE.SNS.INSTAGRAM = row['인스타그램'];
      if (row['카카오'])                      CONFIG.STORE.SNS.KAKAO     = row['카카오'];
      if (row['유튜브'])                      CONFIG.STORE.SNS.YOUTUBE   = row['유튜브'];
      applyStoreInfo();
    })
    .catch(function(e){ console.log('사업자정보 로드 실패:', e); });

  if (CONFIG.IS_DEALER && CONFIG.DEALER_ID) {
    var dealerUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('대리점')
      + '&t=' + Date.now();
    fetch(dealerUrl)
      .then(function(r){ return r.text(); })
      .then(function(csv) {
        var rows = parseCSV(csv);
        var myRow = rows.find(function(r){
          return (r['대리점ID'] || '') === CONFIG.DEALER_ID;
        });
        if (!myRow) return;
        var dealerName = myRow['대리점명'] || '';
        if (dealerName) {
          CONFIG.DEALER_NAME     = dealerName;
          CONFIG.STORE.BRAND     = dealerName;
          CONFIG.STORE.NAME      = dealerName;
        }
        if (myRow['테마색상']) {
          CONFIG.DEFAULT_THEME_COLOR = myRow['테마색상'];
          document.documentElement.style.setProperty('--accent', myRow['테마색상']);
        }
        if (myRow['연락처']) CONFIG.STORE.PHONE   = myRow['연락처'];
        if (myRow['이메일']) CONFIG.STORE.EMAIL   = myRow['이메일'];
        if (myRow['주소'])   CONFIG.STORE.ADDRESS = myRow['주소'];
        applyStoreInfo();
      })
      .catch(function(e){ console.log('대리점 정보 로드 실패:', e); });
  }

  function applyStoreInfo() {
    var name = CONFIG.STORE.BRAND;
    ['store-name', 'header-store-name', 'hd-title'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = name;
    });
    ['footer-store-name', 'footer-brand'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '🏪 ' + name;
    });
    var bizEl = document.getElementById('footer-biz');
    if (bizEl) {
      bizEl.textContent = '상호: ' + CONFIG.STORE.NAME
        + ' | 전화: ' + CONFIG.STORE.PHONE
        + ' | 이메일: ' + CONFIG.STORE.EMAIL;
    }
    var addrEl = document.getElementById('footer-addr');
    if (addrEl) addrEl.textContent = '주소: ' + CONFIG.STORE.ADDRESS;
    var phoneEl = document.getElementById('footer-phone');
    if (phoneEl) phoneEl.textContent = '📞 ' + CONFIG.STORE.PHONE;
    if (document.title && document.title.includes('담누리마켓')) {
      document.title = document.title.replace('담누리마켓', name);
    }
    var hdTitle = document.querySelector('.hd-title');
    if (hdTitle) hdTitle.textContent = name;
  }
})();
