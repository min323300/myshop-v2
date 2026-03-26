// ============================================================
// ⚙️ 설정 파일 - config.js (담누리마켓)
// ============================================================
const CONFIG = {
  // ✅ Google Sheets ID
  SHEET_ID: '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI',

  // ✅ Apps Script URL (주문저장 / PG설정 로드 / 포인트 등 모든 백엔드 통신)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzWpT2On47R7_LTRiznH7qcPBYTPUV3i4UiywI8lkHUYt6KGzDevap7RfQHACwD7oxDzg/exec',

  // ✅ 이미지 기본 URL
  IMAGE_BASE: 'https://min323300.github.io/myshop/images/',

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
    };
  },

  // ✅ 본사 기본 정보 (구글시트 로드 전 기본값 - 구글시트가 덮어씀)
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

  // ✅ PG 설정 (윈글로벌페이)
  // tmnId / payKey 는 보안상 구글시트 PG설정 시트에서 로드 (winpay.js > loadConfig)
  PG: {
    PROVIDER:      'winglobalpay',
    MERCHANT_ID:   'WGA000003',
    API_PROXY_URL: 'https://script.google.com/macros/s/AKfycbzWpT2On47R7_LTRiznH7qcPBYTPUV3i4UiywI8lkHUYt6KGzDevap7RfQHACwD7oxDzg/exec',
  },

  // ✅ 기타 설정
  PRODUCTS_PER_PAGE:   12,
  CURRENCY:            'KRW',
  DEFAULT_THEME_COLOR: '#FF5733',
};

// ============================================================
// ✅ 구글시트에서 스토어 정보 자동 로드
// - 사업자정보 시트 → 본사 브랜드명/상호/전화/이메일/주소 자동 적용
// - 대리점 시트 → IS_DEALER=true 일 때 대리점명 자동 적용
// ============================================================
(function loadStoreInfoFromSheet() {
  var SHEET_ID = CONFIG.SHEET_ID;

  // CSV 파싱 함수
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

  // ① 사업자정보 시트 로드 → CONFIG.STORE 자동 업데이트
  var bizUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
    + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('사업자정보')
    + '&t=' + Date.now();

  fetch(bizUrl)
    .then(function(r){ return r.text(); })
    .then(function(csv) {
      var rows = parseCSV(csv);
      if (!rows.length) return;

      // 대리점별 or 본사 행 찾기
      var myId = CONFIG.DEALER_ID || '본사';
      var row = rows.find(function(r){
        return (r['대리점ID'] || '본사') === myId;
      }) || rows.find(function(r){
        return !r['대리점ID'] || r['대리점ID'] === '' || r['대리점ID'] === '본사';
      }) || rows[0];

      if (!row) return;

      // CONFIG.STORE 값 덮어쓰기
      if (row['브랜드명'] || row['상호명'])  CONFIG.STORE.BRAND   = row['브랜드명'] || row['상호명'] || CONFIG.STORE.BRAND;
      if (row['상호'])                        CONFIG.STORE.NAME    = row['상호']    || CONFIG.STORE.NAME;
      if (row['전화'])                        CONFIG.STORE.PHONE   = row['전화']    || CONFIG.STORE.PHONE;
      if (row['이메일'])                      CONFIG.STORE.EMAIL   = row['이메일']  || CONFIG.STORE.EMAIL;
      if (row['주소'])                        CONFIG.STORE.ADDRESS = row['주소']    || CONFIG.STORE.ADDRESS;
      if (row['태그라인'] || row['슬로건'])  CONFIG.STORE.TAGLINE = row['태그라인'] || row['슬로건'] || CONFIG.STORE.TAGLINE;
      if (row['인스타그램'])                  CONFIG.STORE.SNS.INSTAGRAM = row['인스타그램'];
      if (row['카카오'])                      CONFIG.STORE.SNS.KAKAO     = row['카카오'];
      if (row['유튜브'])                      CONFIG.STORE.SNS.YOUTUBE   = row['유튜브'];

      // 화면에 즉시 반영
      applyStoreInfo();
    })
    .catch(function(e){ console.log('사업자정보 로드 실패:', e); });

  // ② 대리점 시트 로드 → IS_DEALER=true 일 때 대리점명 자동 적용
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

        // ✅ 대리점명 자동 적용
        var dealerName = myRow['대리점명'] || '';
        if (dealerName) {
          CONFIG.DEALER_NAME     = dealerName;
          CONFIG.STORE.BRAND     = dealerName;
          CONFIG.STORE.NAME      = dealerName;
        }
        // 테마색상 적용
        if (myRow['테마색상']) {
          CONFIG.DEFAULT_THEME_COLOR = myRow['테마색상'];
          document.documentElement.style.setProperty('--accent', myRow['테마색상']);
        }
        // 전화/이메일 등 대리점 개별 정보 적용
        if (myRow['연락처']) CONFIG.STORE.PHONE   = myRow['연락처'];
        if (myRow['이메일']) CONFIG.STORE.EMAIL   = myRow['이메일'];
        if (myRow['주소'])   CONFIG.STORE.ADDRESS = myRow['주소'];

        // 화면에 즉시 반영
        applyStoreInfo();
      })
      .catch(function(e){ console.log('대리점 정보 로드 실패:', e); });
  }

  // ③ 화면 반영 함수 - 스토어명이 표시되는 모든 요소 업데이트
  function applyStoreInfo() {
    var name = CONFIG.STORE.BRAND;

    // 헤더 로고 / 스토어명
    ['store-name', 'header-store-name', 'hd-title'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = name;
    });

    // 푸터 스토어명
    ['footer-store-name', 'footer-brand'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '🏪 ' + name;
    });

    // 푸터 사업자정보
    var bizEl = document.getElementById('footer-biz');
    if (bizEl) {
      bizEl.textContent = '상호: ' + CONFIG.STORE.NAME
        + ' | 전화: ' + CONFIG.STORE.PHONE
        + ' | 이메일: ' + CONFIG.STORE.EMAIL;
    }

    // 푸터 주소
    var addrEl = document.getElementById('footer-addr');
    if (addrEl) addrEl.textContent = '주소: ' + CONFIG.STORE.ADDRESS;

    // 푸터 전화번호 링크
    var phoneEl = document.getElementById('footer-phone');
    if (phoneEl) phoneEl.textContent = '📞 ' + CONFIG.STORE.PHONE;

    // 페이지 타이틀
    if (document.title && document.title.includes('담누리마켓')) {
      document.title = document.title.replace('담누리마켓', name);
    }

    // admin 페이지 헤더
    var hdTitle = document.querySelector('.hd-title');
    if (hdTitle) hdTitle.textContent = name;
  }

})();
