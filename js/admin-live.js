// ============================================================
// admin-live.js — 라이브방송 · 알림신청자 · 쿠폰발급 관리
// ============================================================

var allLiveData   = [];
var allAlarmData  = [];
var allCouponData = [];

// 시트 URL 보완
(function() {
  if (!CONFIG || !CONFIG.SHEETS) return;
  function lsUrl(name) {
    return 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(name);
  }
  if (!CONFIG.SHEETS['라이브알림']) CONFIG.SHEETS['라이브알림'] = lsUrl('라이브알림');
  if (!CONFIG.SHEETS['라이브쿠폰']) CONFIG.SHEETS['라이브쿠폰'] = lsUrl('라이브쿠폰');
})();

// ── 라이브 목록 ──────────────────────────────────────────────
async function loadLiveData() {
  try {
    var url = CONFIG.SHEETS['라이브방송'] + '&t=' + Date.now();
    var res = await fetch(url);
    var csv = await res.text();
    allLiveData = parseAdminCSV(csv);
    renderLiveList(allLiveData);
    updateAlarmFilter();
  } catch(e) {
    document.getElementById('live-list').innerHTML =
      '<div style="padding:20px;text-align:center;color:#aaa;">데이터 로드 실패</div>';
  }
}

function renderLiveList(data) {
  var el = document.getElementById('live-list');
  if (!data.length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:#aaa;font-size:14px;">등록된 방송이 없습니다</div>';
    return;
  }
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="background:#f8f8f8;border-bottom:1px solid #eee;">'
    + '<th style="padding:10px;text-align:left;">방송제목</th>'
    + '<th style="padding:10px;text-align:center;">시작일시</th>'
    + '<th style="padding:10px;text-align:center;">상태</th>'
    + '<th style="padding:10px;text-align:center;">알림신청</th>'
    + '<th style="padding:10px;text-align:center;">쿠폰</th>'
    + '<th style="padding:10px;text-align:center;">관리</th>'
    + '</tr></thead><tbody>'
    + data.map(function(b) {
        var sc   = b['상태']==='진행중' ? '#e8342b' : b['상태']==='예정' ? '#1a73e8' : '#888';
        var safeB = JSON.stringify(b).replace(/"/g,'&quot;');
        return '<tr style="border-bottom:1px solid #f5f5f5;">'
          + '<td style="padding:10px;">'
            + '<div style="font-weight:500;color:#222;">' + (b['방송제목']||'-') + '</div>'
            + '<div style="font-size:11px;color:#aaa;">' + (b['대리점ID']||'본사') + '</div>'
          + '</td>'
          + '<td style="padding:10px;text-align:center;color:#666;">' + formatLiveDate(b['시작일시']) + '</td>'
          + '<td style="padding:10px;text-align:center;">'
            + '<span style="background:'+sc+'20;color:'+sc+';padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;">'
            + (b['상태']==='진행중'?'🔴 LIVE':b['상태']==='예정'?'⏳ 예정':'✅ 종료')
            + '</span>'
          + '</td>'
          + '<td style="padding:10px;text-align:center;color:#e85a2b;font-weight:600;">' + (b['알림신청수']||0) + '명</td>'
          + '<td style="padding:10px;text-align:center;">'
            + (b['쿠폰코드'] ? '<span style="background:#fff8f6;color:#e85a2b;padding:2px 8px;border-radius:4px;font-size:11px;">' + b['쿠폰코드'] + '</span>' : '-')
          + '</td>'
          + '<td style="padding:10px;text-align:center;">'
            + '<div style="display:flex;gap:6px;justify-content:center;">'
            + '<button onclick="editLive(' + safeB + ')" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:12px;cursor:pointer;">수정</button>'
            + (b['상태']==='예정'
                ? '<button onclick="changeLiveStatus(\''+b['번호']+'\',\'진행중\')" style="padding:4px 10px;background:#e85a2b;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;">▶ 시작</button>'
                : b['상태']==='진행중'
                ? '<button onclick="changeLiveStatus(\''+b['번호']+'\',\'종료\')" style="padding:4px 10px;background:#333;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;">■ 종료</button>'
                : '')
            + '</div>'
          + '</td></tr>';
      }).join('')
    + '</tbody></table>';
}

async function changeLiveStatus(no, status) {
  if (!confirm('상태를 "' + status + '"로 변경하시겠습니까?')) return;
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'saveLiveBroadcast', data: { 번호: no, 상태: status } })
    });
    showAdminToast(status==='진행중' ? '🔴 방송이 시작되었습니다!' : '✅ 방송이 종료되었습니다!');
    setTimeout(loadLiveData, 1500);
  } catch(e) { showAdminToast('오류가 발생했습니다'); }
}

function filterLive(status, btn) {
  document.querySelectorAll('#page-live-mgmt .stab').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var filtered = status==='전체' ? allLiveData : allLiveData.filter(function(b){ return b['상태']===status; });
  renderLiveList(filtered);
}

function openLiveModal() {
  ['live-no','live-title','live-desc','live-youtube','live-thumb','live-start','live-end',
   'live-products','live-sale','live-coupon-code','live-coupon-rate','live-coupon-hour','live-shorts'
  ].forEach(function(id){ document.getElementById(id).value=''; });
  document.getElementById('live-status').value = '예정';
  document.getElementById('live-active').value = 'TRUE';
  document.getElementById('live-modal-title').textContent = '📺 새 방송 등록';
  document.getElementById('live-modal-overlay').style.display = 'flex';
}

function editLive(b) {
  document.getElementById('live-no').value          = b['번호']       || '';
  document.getElementById('live-title').value        = b['방송제목']   || '';
  document.getElementById('live-desc').value         = b['방송설명']   || '';
  document.getElementById('live-youtube').value      = b['유튜브URL']  || '';
  document.getElementById('live-thumb').value        = b['썸네일이미지']|| '';
  document.getElementById('live-start').value        = (b['시작일시']||'').replace(' ','T').substring(0,16);
  document.getElementById('live-end').value          = (b['종료일시']||'').replace(' ','T').substring(0,16);
  document.getElementById('live-products').value     = b['특가상품번호']|| '';
  document.getElementById('live-sale').value         = b['특가정보']   || '';
  document.getElementById('live-coupon-code').value  = b['쿠폰코드']   || '';
  document.getElementById('live-coupon-rate').value  = b['쿠폰할인율'] || '';
  document.getElementById('live-coupon-hour').value  = b['쿠폰유효시간']|| '';
  document.getElementById('live-status').value       = b['상태']       || '예정';
  document.getElementById('live-active').value       = b['사용여부']   || 'TRUE';
  document.getElementById('live-shorts').value       = b['예고편URL']  || '';
  document.getElementById('live-modal-title').textContent = '📺 방송 수정';
  document.getElementById('live-modal-overlay').style.display = 'flex';
}

function closeLiveModal() {
  document.getElementById('live-modal-overlay').style.display = 'none';
}

async function saveLive() {
  var title   = document.getElementById('live-title').value.trim();
  var youtube = document.getElementById('live-youtube').value.trim();
  var start   = document.getElementById('live-start').value;
  if (!title)   { showAdminToast('방송 제목을 입력하세요'); return; }
  if (!youtube) { showAdminToast('유튜브 URL을 입력하세요'); return; }
  if (!start)   { showAdminToast('시작 일시를 입력하세요'); return; }

  var data = {
    번호:         document.getElementById('live-no').value || '',
    방송제목:     title,
    방송설명:     document.getElementById('live-desc').value,
    유튜브URL:    youtube,
    썸네일이미지: document.getElementById('live-thumb').value,
    시작일시:     start.replace('T',' '),
    종료일시:     document.getElementById('live-end').value.replace('T',' '),
    특가상품번호: document.getElementById('live-products').value,
    특가정보:     document.getElementById('live-sale').value,
    쿠폰코드:     document.getElementById('live-coupon-code').value,
    쿠폰할인율:   document.getElementById('live-coupon-rate').value,
    쿠폰유효시간: document.getElementById('live-coupon-hour').value,
    상태:         document.getElementById('live-status').value,
    사용여부:     document.getElementById('live-active').value,
    예고편URL:    document.getElementById('live-shorts').value,
    대리점ID:     '본사',
    알림신청수:   document.getElementById('live-no').value ? undefined : '0'
  };
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, { method:'POST', mode:'no-cors', body: JSON.stringify({ action:'saveLiveBroadcast', data:data }) });
    showAdminToast('✅ 방송이 저장되었습니다!');
    closeLiveModal();
    setTimeout(loadLiveData, 1500);
  } catch(e) { showAdminToast('오류: ' + e.message); }
}

// ── 알림 신청자 ───────────────────────────────────────────────
async function loadAlarmData() {
  try {
    var url = CONFIG.SHEETS['라이브알림'] + '&t=' + Date.now();
    var res = await fetch(url);
    var csv = await res.text();
    allAlarmData = parseAdminCSV(csv);
    renderAlarmList(allAlarmData);
  } catch(e) {
    document.getElementById('alarm-list').innerHTML =
      '<div style="padding:20px;text-align:center;color:#aaa;">데이터 없음 (첫 신청 후 자동 생성)</div>';
  }
}

function updateAlarmFilter() {
  var sel = document.getElementById('alarm-broadcast-filter');
  if (!sel) return;
  var titles = {};
  allLiveData.forEach(function(b){ titles[b['번호']] = b['방송제목']; });
  sel.innerHTML = '<option value="">전체 방송</option>'
    + Object.keys(titles).map(function(no){
        return '<option value="'+no+'">'+titles[no]+'</option>';
      }).join('');
}

function loadAlarmList() {
  var no       = document.getElementById('alarm-broadcast-filter').value;
  var filtered = no ? allAlarmData.filter(function(a){ return a['방송번호']===no; }) : allAlarmData;
  renderAlarmList(filtered);
}

function renderAlarmList(data) {
  var el = document.getElementById('alarm-list');
  if (!data.length) { el.innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">알림 신청자가 없습니다</div>'; return; }
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="background:#f8f8f8;border-bottom:1px solid #eee;">'
    + '<th style="padding:10px;text-align:left;">이름</th><th style="padding:10px;text-align:center;">연락처</th>'
    + '<th style="padding:10px;text-align:center;">이메일</th><th style="padding:10px;text-align:center;">방송번호</th>'
    + '<th style="padding:10px;text-align:center;">신청일시</th></tr></thead><tbody>'
    + data.map(function(a){
        return '<tr style="border-bottom:1px solid #f5f5f5;">'
          + '<td style="padding:10px;font-weight:500;">'+(a['이름']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;">'+(a['연락처']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;">'+(a['이메일']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;">'+(a['방송번호']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;color:#aaa;">'+(a['신청일시']||'-')+'</td></tr>';
      }).join('')
    + '</tbody></table>'
    + '<div style="padding:10px 14px;font-size:12px;color:#888;border-top:1px solid #f0f0f0;">총 '+data.length+'명</div>';
}

function sendAlarmEmail() {
  alert('이메일 발송 방법:\n\n구글 시트 → [📺 라이브 관리] 메뉴\n→ [🔔 알림 이메일 발송] 클릭\n→ 방송 번호 입력 후 전체 발송!');
}

// ── 쿠폰 내역 ─────────────────────────────────────────────────
async function loadCouponData() {
  try {
    var url = CONFIG.SHEETS['라이브쿠폰'] + '&t=' + Date.now();
    var res = await fetch(url);
    var csv = await res.text();
    allCouponData = parseAdminCSV(csv);
    renderCouponList(allCouponData);
  } catch(e) {
    document.getElementById('coupon-list').innerHTML =
      '<div style="padding:20px;text-align:center;color:#aaa;">데이터 없음</div>';
  }
}

function renderCouponList(data) {
  var el = document.getElementById('coupon-list');
  if (!data.length) { el.innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">발급된 쿠폰이 없습니다</div>'; return; }
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="background:#f8f8f8;border-bottom:1px solid #eee;">'
    + '<th style="padding:10px;text-align:left;">이름</th><th style="padding:10px;text-align:center;">연락처</th>'
    + '<th style="padding:10px;text-align:center;">쿠폰코드</th><th style="padding:10px;text-align:center;">할인율</th>'
    + '<th style="padding:10px;text-align:center;">발급일시</th><th style="padding:10px;text-align:center;">사용여부</th>'
    + '</tr></thead><tbody>'
    + data.map(function(c){
        return '<tr style="border-bottom:1px solid #f5f5f5;">'
          + '<td style="padding:10px;font-weight:500;">'+(c['이름']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;">'+(c['연락처']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;"><span style="background:#fff8f6;color:#e85a2b;padding:2px 8px;border-radius:4px;font-weight:600;">'+(c['쿠폰코드']||'-')+'</span></td>'
          + '<td style="padding:10px;text-align:center;">'+(c['할인율']||0)+'%</td>'
          + '<td style="padding:10px;text-align:center;color:#aaa;">'+(c['발급일시']||'-')+'</td>'
          + '<td style="padding:10px;text-align:center;color:'+(c['사용여부']==='TRUE'?'#e85a2b':'#888')+'">'+(c['사용여부']==='TRUE'?'✅ 사용':'미사용')+'</td></tr>';
      }).join('')
    + '</tbody></table>'
    + '<div style="padding:10px 14px;font-size:12px;color:#888;border-top:1px solid #f0f0f0;">총 '+data.length+'건</div>';
}

// ── 유틸 ─────────────────────────────────────────────────────
function formatLiveDate(str) {
  if (!str) return '-';
  var d = new Date(str); if (isNaN(d)) return str;
  var days = ['일','월','화','수','목','금','토'];
  return (d.getMonth()+1)+'/'+d.getDate()+'('+days[d.getDay()]+') '
    + String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
