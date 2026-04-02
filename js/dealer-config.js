// ============================================================
// dealer-config.js — 설정 · 유틸 · 로그인
// ============================================================

var SHEET_ID          = '1gjnczt_Db959Nc6aAF6CIPIj1SBY4XvoIXuEAAIJOZE';
var SCRIPT_URL        = 'https://script.google.com/macros/s/AKfycbzQ-Ce8Zbj5mO-iMF6IJQhNtbsHl7DGo9ER4bsBoJRoz1JnvIdkp3M3qb1efEcSlwoB/exec';
var CLOUDINARY_CLOUD  = 'dmefdyags';
var CLOUDINARY_PRESET = 'damnuri_upload';

var DEALER  = null;
var curPage = 'dashboard';

// ── CSV 유틸 ─────────────────────────────────────────────────
function sheetUrl(sheetName) {
  return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
    + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(sheetName) + '&t=' + Date.now();
}

function parseCSV(csv) {
  var lines   = csv.trim().split('\n');
  var headers = lines[0].split(',').map(function(h){ return h.trim().replace(/"/g,''); });
  return lines.slice(1).map(function(line){
    var vals=[], cur='', inQ=false;
    for(var i=0;i<line.length;i++){
      var ch=line[i];
      if(ch==='"'){inQ=!inQ;}
      else if(ch===','&&!inQ){vals.push(cur.trim());cur='';}
      else cur+=ch;
    }
    vals.push(cur.trim());
    var obj={};
    headers.forEach(function(h,i){ obj[h]=(vals[i]||'').replace(/"/g,'').trim(); });
    return obj;
  }).filter(function(r){ return Object.values(r).some(function(v){return v;}); });
}

// ── UI 유틸 ──────────────────────────────────────────────────
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' '+type : '');
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 3500);
}

function TH(cols) {
  return '<thead><tr>'+cols.map(function(c){ return '<th>'+c+'</th>'; }).join('')+'</tr></thead>';
}

function EMPTY(ico, txt, sub) {
  return '<div class="empty"><div class="empty-ico">'+ico+'</div>'
    +'<div class="empty-txt">'+txt+'</div>'
    +(sub?'<div class="empty-sub">'+sub+'</div>':'')+'</div>';
}

function fmt(n) { return (parseInt(n)||0).toLocaleString()+'원'; }

function getField(obj, candidates) {
  for(var i=0;i<candidates.length;i++){
    var v = obj[candidates[i]];
    if(v && v.trim && v.trim()) return v.trim();
  }
  return '';
}

function updateDate() {
  var el = document.getElementById('hd-date');
  if(!el) return;
  var now = new Date();
  el.textContent = now.getFullYear()+'.'
    +(now.getMonth()+1).toString().padStart(2,'0')+'.'
    +now.getDate().toString().padStart(2,'0')+' '
    +now.getHours().toString().padStart(2,'0')+':'
    +now.getMinutes().toString().padStart(2,'0');
}
setInterval(updateDate, 1000);
updateDate();

// ── 쇼핑몰 직접 URL 생성 (실제 접속용) ──────────────────────
function buildShopUrl(dealerId) {
  var did     = dealerId || '';
  var baseUrl = window.location.origin
    + window.location.pathname.replace('dealer-admin.html','');
  var domain  = (DEALER && DEALER.domain) ? DEALER.domain.trim() : '';

  if (!domain) {
    return baseUrl + 'index.html?dealer=' + did;
  }

  // 기존 ?dealer= 파라미터 제거 후 재조합
  domain = domain
    .replace(/[?&]dealer=[^&]*/g, '')
    .replace(/[?&]+$/, '')
    .replace(/\/$/, '');

  if (!domain.startsWith('http')) {
    domain = 'https://' + domain;
  }

  return domain + '?dealer=' + did;
}

// ── ✅ 카카오톡 공유용 프록시 URL (대리점 OG 태그 적용) ───────
// Apps Script가 대리점명/로고/설명으로 OG 태그를 생성한 뒤
// 실제 쇼핑몰로 자동 리다이렉트합니다.
function buildKakaoShareUrl(dealerId) {
  return SCRIPT_URL + '?store=' + (dealerId || '');
}

// ── 헤더/대시보드 링크 업데이트 ──────────────────────────────
function updateLinks() {
  if (!DEALER) return;
  var did           = DEALER.id || '';
  var baseUrl       = window.location.origin
    + window.location.pathname.replace('dealer-admin.html','');
  var fullShopUrl   = buildShopUrl(did);
  var kakaoShareUrl = buildKakaoShareUrl(did);  // 카카오 공유용
  var fullProdUrl   = baseUrl + 'products.html?dealer=' + did;

  // 대시보드 쇼핑몰 링크 박스
  // 복사 URL → 카카오 공유용 (OG 태그 적용)
  // 열기 버튼 → 직접 쇼핑몰 URL (빠른 접속)
  var urlEl  = document.getElementById('my-shop-url');
  var openEl = document.getElementById('my-shop-open');
  if(urlEl)  urlEl.textContent = kakaoShareUrl;
  if(openEl) openEl.href       = fullShopUrl;

  // 헤더 상단 "쇼핑몰" / "상품목록" 링크 → 직접 URL 유지
  var shopLink  = document.getElementById('shop-link');
  var prodsLink = document.getElementById('products-link');
  if(shopLink)  shopLink.href  = fullShopUrl;
  if(prodsLink) prodsLink.href = fullProdUrl;
}

// ── 로그인 ───────────────────────────────────────────────────
function doLogin() {
  var id = document.getElementById('lid').value.trim();
  var pw = document.getElementById('lpw').value.trim();
  if(!id||!pw){ document.getElementById('lerr').style.display='block'; return; }
  document.getElementById('lloading').style.display='block';
  document.getElementById('lerr').style.display='none';

  fetch(sheetUrl('대리점')).then(function(r){return r.text();}).then(function(csv){
    var rows  = parseCSV(csv);
    var found = rows.find(function(r){
      var rowId      = String(r['번호']||'').trim();
      var customId   = (r['아이디']||r['대리점ID']||'').trim();
      var idMatch    = rowId===id || customId===id;
      var phone      = String(r['연락처']||'').replace(/[^0-9]/g,'');
      var phoneLast4 = phone.slice(-4);
      var storedPw   = String(r['비밀번호']||'').trim();
      var pwMatch    = (storedPw && pw===storedPw) || pw===phoneLast4;
      return idMatch && pwMatch && r['상태']!=='해지';
    });
    document.getElementById('lloading').style.display='none';
    if(found){
      DEALER = {
        id:         found['대리점ID'] || found['아이디'] || id,
        name:       found['대리점명'] || found['상호명'] || id,
        owner:      found['대표자명'] || '',
        domain:     found['도메인']   || '',
        commission: parseFloat(found['수수료율']) || 2,
        status:     found['상태']     || ''
      };
      sessionStorage.setItem('dealer', JSON.stringify(DEALER));
      startApp();
    } else {
      document.getElementById('lerr').style.display='block';
    }
  }).catch(function(){
    document.getElementById('lloading').style.display='none';
    document.getElementById('lerr').textContent='서버 연결 실패. 잠시 후 다시 시도해주세요.';
    document.getElementById('lerr').style.display='block';
  });
}

function doLogout() {
  sessionStorage.removeItem('dealer');
  DEALER = null;
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('lid').value='';
  document.getElementById('lpw').value='';
}

// ✅ 자동 로그인 복원 — DOM 준비 후 실행
(function(){
  var saved = sessionStorage.getItem('dealer');
  if(saved){
    try{
      DEALER = JSON.parse(saved);
      if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
      } else {
        startApp();
      }
    }catch(e){}
  }
})();

// ── 앱 시작 ──────────────────────────────────────────────────
function startApp() {
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('hd-brand-name').textContent  = DEALER.name || '담누리마켓';
  document.getElementById('hd-dealer-info').textContent = '🏬 ' + DEALER.name;
  document.getElementById('sb-dealer-name').textContent = DEALER.name + ' (' + DEALER.id + ')';

  // ✅ 링크 즉시 업데이트 + DOM 완전 로드 후 한 번 더
  updateLinks();
  setTimeout(updateLinks, 200);
  setTimeout(updateLinks, 800);

  go('dashboard', document.querySelector('.sb-item.active'));
}

// ── 페이지 전환 ───────────────────────────────────────────────
function go(pid, el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.sb-item').forEach(function(i){ i.classList.remove('active'); });
  var pg = document.getElementById('page-'+pid);
  if(pg) pg.classList.add('active');
  if(el) el.classList.add('active');
  curPage = pid;

  var map = {
    'dashboard':   loadDashboard,
    'hq-products': loadHqProducts,
    'my-products': loadMyProducts,
    'orders':      loadOrders,
    'settlement':  loadSettlement,
    'vat':         loadDealerVat,
    'reviews':     loadReviews,
    'consignment': loadConsignment,
    'notice':      loadNotice,
    'manual':      loadManual,
    'live-list':   loadDealerLive,
    'live-alarm':  function(){ loadDealerLive(); loadDealerAlarm(); },
    'live-coupon': loadDealerCoupon
  };
  if(map[pid]) map[pid]();
}

// ── 사이드바 토글 (모바일) ────────────────────────────────────
function toggleSidebar() {
  var sb     = document.querySelector('.sb');
  var ov     = document.getElementById('sb-overlay');
  var isOpen = sb.classList.contains('open');
  sb.classList.toggle('open', !isOpen);
  ov.classList.toggle('open', !isOpen);
}
document.addEventListener('click', function(e) {
  if(e.target.closest('.sb-item') && window.innerWidth<=768){
    setTimeout(toggleSidebar, 150);
  }
});

// ── 쇼핑몰 링크 복사 ─────────────────────────────────────────
function copyShopLink() {
  var urlEl = document.getElementById('my-shop-url');
  if(!urlEl) return;
  var url = urlEl.textContent;
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(function(){
      showToast('카카오톡 공유 링크가 복사됐습니다! 고객에게 공유하세요 😊','ok');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value=url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('카카오톡 공유 링크가 복사됐습니다!','ok');
  }
}
