// ============================================================
// 담누리마켓 관리자 패널 - 딜러 관리 모듈
// js/admin-dealer.js
// (주)비에스컴퍼니 | 2026-03
// ============================================================

var _dlrAllRows = [];

// ── 현재 월 ─────────────────────────────────────────────────
function getDlrCurMonth() {
  var now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
}

// ── 수수료 구간 계산 ─────────────────────────────────────────
function getDlrTier(sales) {
  sales = Number(sales || 0);
  if (sales < 10000000) return { tier: 1, label: '1구간', rate: 40, color: '#3b82f6' };
  if (sales < 30000000) return { tier: 2, label: '2구간', rate: 50, color: '#16a34a' };
  return                       { tier: 3, label: '3구간', rate: 60, color: '#ea580c' };
}

// ── CSV 파싱 (딜러 전용, sheets.js 없을 때 대비) ─────────────
function parseDlrCSV(csv) {
  if (!csv || !csv.trim()) return [];
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

// ── 포맷 ────────────────────────────────────────────────────
function fmtDlr(n) { return Number(n||0).toLocaleString() + '원'; }
function fmtPt(n)  { return Number(n||0).toLocaleString() + 'P'; }

// ============================================================
// ① 딜러 목록
// ============================================================
async function loadDlrList() {
  document.getElementById('dlr-list-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  try {
    var url = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('딜러')
      + '&t=' + Date.now();
    var csv = await fetch(url).then(function(r){ return r.text(); });
    _dlrAllRows = parseDlrCSV(csv);
  } catch(e) { _dlrAllRows = []; }

  var active     = _dlrAllRows.filter(function(r){ return r['상태'] === '활성'; }).length;
  var totalSales = _dlrAllRows.reduce(function(s,r){ return s + Number(r['이번달매출']||0); }, 0);
  var totalPt    = _dlrAllRows.reduce(function(s,r){ return s + Number(r['포인트잔액']||0); }, 0);

  document.getElementById('dlr-active-cnt').textContent   = active + '명';
  document.getElementById('dlr-total-cnt').textContent    = _dlrAllRows.length + '명';
  document.getElementById('dlr-month-sales').textContent  = fmtDlr(totalSales);
  document.getElementById('dlr-total-point').textContent  = fmtPt(totalPt);

  filterDlrList('');
}

function filterDlrList(keyword) {
  var statusVal = (document.getElementById('dlr-status-filter') || {}).value || '';
  var kw = (keyword || '').toLowerCase();

  var filtered = _dlrAllRows.filter(function(r) {
    var matchKw = !kw ||
      (r['딜러명']||'').toLowerCase().includes(kw) ||
      (r['연락처']||'').includes(kw) ||
      (r['딜러ID']||'').toLowerCase().includes(kw);
    var matchStatus = !statusVal || r['상태'] === statusVal;
    return matchKw && matchStatus;
  });

  if (!filtered.length) {
    document.getElementById('dlr-list-tw').innerHTML =
      '<div style="padding:30px;text-align:center;color:#aaa;">딜러가 없습니다</div>';
    return;
  }

  var rows = filtered.map(function(r) {
    var sales = Number(r['이번달매출']||0);
    var t = getDlrTier(sales);
    var statusColor = r['상태'] === '활성' ? '#16a34a' : r['상태'] === '정지' ? '#ea580c' : '#aaa';
    var entryBadge  = r['입점비납부'] === 'TRUE'
      ? '<span style="color:#16a34a;font-weight:700;">✅ 완료</span>'
      : '<span style="color:#ea580c;">❌ 미납</span>';
    var cmsBadge = r['월사용비'] === 'TRUE'
      ? '<span style="color:#16a34a;font-weight:700;">✅ 정상</span>'
      : '<span style="color:#ea580c;">❌ 미설정</span>';
    return '<tr>'
      + '<td><strong>' + (r['딜러ID']||'') + '</strong></td>'
      + '<td>' + (r['딜러명']||'') + '</td>'
      + '<td>' + (r['연락처']||'') + '</td>'
      + '<td>' + (r['추천코드']||'') + '</td>'
      + '<td><span style="background:' + t.color + '20;color:' + t.color + ';padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">'
        + t.label + ' (' + t.rate + '%)</span></td>'
      + '<td style="color:#1d4ed8;font-weight:700;">' + fmtDlr(sales) + '</td>'
      + '<td style="color:#7c3aed;font-weight:700;">' + fmtPt(r['포인트잔액']) + '</td>'
      + '<td>' + entryBadge + '</td>'
      + '<td>' + cmsBadge + '</td>'
      + '<td><span style="color:' + statusColor + ';font-weight:700;">' + (r['상태']||'') + '</span></td>'
      + '<td>' + (r['과세유형']||'') + '</td>'
      + '<td>'
        + '<button onclick=\'openDlrEditModal(' + JSON.stringify(r).replace(/'/g,"\\'") + ')\' '
          + 'style="padding:4px 10px;border:1px solid #ddd;border-radius:6px;font-size:11px;cursor:pointer;background:#f8f9fa;margin-right:4px;">수정</button>'
        + '<button onclick=\'openDlrPointFromList("' + (r['딜러ID']||'') + '")\' '
          + 'style="padding:4px 10px;border:1px solid #7c3aed;color:#7c3aed;border-radius:6px;font-size:11px;cursor:pointer;background:#faf5ff;">포인트</button>'
        + '</td>'
      + '</tr>';
  }).join('');

  document.getElementById('dlr-list-tw').innerHTML =
    '<table><thead><tr>'
    + '<th>딜러ID</th><th>딜러명</th><th>연락처</th><th>추천코드</th>'
    + '<th>수수료구간</th><th>이번달매출</th><th>포인트잔액</th>'
    + '<th>입점비</th><th>월사용비</th><th>상태</th><th>과세유형</th><th>관리</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table>';
}

// ============================================================
// ② 딜러 수수료 현황
// ============================================================
async function loadDlrCommission() {
  var month = (document.getElementById('dlr-comm-month') || {}).value || getDlrCurMonth();
  document.getElementById('dlr-comm-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';

  try {
    var res = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=getDealerCommissionData&yearMonth=' + month)
      .then(function(r){ return r.json(); });
    var rows = res.rows || [];

    var totalSales = 0, totalComm = 0, totalHq = 0;
    rows.forEach(function(r) {
      totalSales += Number(r['총매출']||0);
      totalComm  += Number(r['딜러수수료']||0);
      totalHq    += Number(r['본사수익']||0);
    });

    document.getElementById('dlr-comm-total-sales').textContent = fmtDlr(totalSales);
    document.getElementById('dlr-comm-total-comm').textContent  = fmtDlr(totalComm);
    document.getElementById('dlr-comm-hq').textContent          = fmtDlr(totalHq);
    document.getElementById('dlr-comm-count').textContent       = rows.length + '명';

    if (!rows.length) {
      document.getElementById('dlr-comm-tw').innerHTML =
        '<div style="padding:30px;text-align:center;color:#aaa;">'
        + '정산 데이터가 없습니다. ⚙️ 수수료 계산 버튼을 눌러주세요.</div>';
      return;
    }

    var html = rows.map(function(r) {
      var t = getDlrTier(r['총매출']);
      return '<tr>'
        + '<td><strong>' + (r['딜러ID']||'') + '</strong></td>'
        + '<td>' + (r['정산월']||'') + '</td>'
        + '<td style="color:#1d4ed8;font-weight:700;">' + fmtDlr(r['총매출']) + '</td>'
        + '<td><span style="background:' + t.color + '20;color:' + t.color + ';padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">'
          + (r['구간라벨']||t.label) + ' (' + (r['딜러수수료율']||t.rate+'%') + ')</span></td>'
        + '<td style="color:#16a34a;font-weight:800;font-size:15px;">' + fmtDlr(r['딜러수수료']) + '</td>'
        + '<td style="color:#ea580c;font-weight:700;">' + fmtDlr(r['본사수익']) + '</td>'
        + '<td>' + (r['상태']||'') + '</td>'
        + '</tr>';
    }).join('');

    document.getElementById('dlr-comm-tw').innerHTML =
      '<table><thead><tr>'
      + '<th>딜러ID</th><th>정산월</th><th>총매출</th>'
      + '<th>수수료구간</th><th>딜러수수료</th><th>본사수익</th><th>상태</th>'
      + '</tr></thead><tbody>' + html + '</tbody></table>';

  } catch(e) {
    document.getElementById('dlr-comm-tw').innerHTML =
      '<div style="padding:30px;text-align:center;color:#e74c3c;">데이터 로드 실패: ' + e.message + '</div>';
  }
}

// 수수료 계산 실행
async function runDlrCalc() {
  var month = (document.getElementById('dlr-comm-month') || {}).value || getDlrCurMonth();
  if (!confirm(month + ' 딜러 수수료를 계산하시겠습니까?')) return;
  try {
    showAdminToast('⏳ 수수료 계산 중...');
    var res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'calcDealerCommission', data: { yearMonth: month } })
    }).then(function(r){ return r.json(); });
    showAdminToast('✅ 수수료 계산 완료! ' + (res.results||[]).length + '명');
    loadDlrCommission();
  } catch(e) {
    showAdminToast('❌ 오류: ' + e.message);
  }
}

// ============================================================
// ③ 포인트 관리
// ============================================================
async function loadDlrPoints() {
  document.getElementById('dlr-point-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  try {
    var res = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=getDealerPointData&t=' + Date.now())
      .then(function(r){ return r.json(); });
    var rows = (res.rows || []).slice().reverse();

    if (!rows.length) {
      document.getElementById('dlr-point-tw').innerHTML =
        '<div style="padding:30px;text-align:center;color:#aaa;">포인트 내역이 없습니다</div>';
      return;
    }

    var html = rows.map(function(r) {
      var isMinus = r['포인트종류'] === '사용';
      return '<tr>'
        + '<td>' + (String(r['발생일']||'')).slice(0,10) + '</td>'
        + '<td><strong>' + (r['딜러ID']||'') + '</strong></td>'
        + '<td><span style="background:' + (isMinus?'#fee2e2':'#dcfce7') + ';color:' + (isMinus?'#dc2626':'#16a34a') + ';padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">'
          + (r['포인트종류']||'') + '</span></td>'
        + '<td style="color:' + (isMinus?'#dc2626':'#7c3aed') + ';font-weight:800;">'
          + (isMinus ? '−' : '+') + ' ' + fmtPt(r['포인트금액']) + '</td>'
        + '<td>' + (r['사유']||'') + '</td>'
        + '</tr>';
    }).join('');

    document.getElementById('dlr-point-tw').innerHTML =
      '<table><thead><tr>'
      + '<th>날짜</th><th>딜러ID</th><th>구분</th><th>포인트</th><th>사유</th>'
      + '</tr></thead><tbody>' + html + '</tbody></table>';

  } catch(e) {
    document.getElementById('dlr-point-tw').innerHTML =
      '<div style="padding:30px;text-align:center;color:#e74c3c;">데이터 로드 실패</div>';
  }
}

// ============================================================
// 딜러 등록/수정 모달
// ============================================================
function openDlrModal() {
  document.getElementById('dlrm-title').textContent  = '🧑‍💼 딜러 등록';
  document.getElementById('dlrm-did').value          = '';
  document.getElementById('dlrm-did').readOnly       = false;
  document.getElementById('dlrm-name').value         = '';
  document.getElementById('dlrm-phone').value        = '';
  document.getElementById('dlrm-email').value        = '';
  document.getElementById('dlrm-refcode').value      = '';
  document.getElementById('dlrm-uid').value          = '';
  document.getElementById('dlrm-pw').value           = '';
  document.getElementById('dlrm-status').value       = '활성';
  document.getElementById('dlrm-tax').value          = '일반';
  document.getElementById('dlrm-entry').value        = 'FALSE';
  document.getElementById('dlrm-monthly').value      = 'FALSE';
  document.getElementById('dlr-modal').style.display = 'flex';
}

function openDlrEditModal(row) {
  document.getElementById('dlrm-title').textContent  = '🧑‍💼 딜러 수정';
  document.getElementById('dlrm-did').value          = row['딜러ID']   || '';
  document.getElementById('dlrm-did').readOnly       = true;
  document.getElementById('dlrm-name').value         = row['딜러명']   || '';
  document.getElementById('dlrm-phone').value        = row['연락처']   || '';
  document.getElementById('dlrm-email').value        = row['이메일']   || '';
  document.getElementById('dlrm-refcode').value      = row['추천코드'] || '';
  document.getElementById('dlrm-uid').value          = row['아이디']   || '';
  document.getElementById('dlrm-pw').value           = row['비밀번호'] || '';
  document.getElementById('dlrm-status').value       = row['상태']     || '활성';
  document.getElementById('dlrm-tax').value          = row['과세유형'] || '일반';
  document.getElementById('dlrm-entry').value        = row['입점비납부'] || 'FALSE';
  document.getElementById('dlrm-monthly').value      = row['월사용비'] || 'FALSE';
  document.getElementById('dlr-modal').style.display = 'flex';
}

function closeDlrModal() {
  document.getElementById('dlr-modal').style.display = 'none';
}

function genDlrPw() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  var pw = Array.from({length:8}, function(){ return chars[Math.floor(Math.random()*chars.length)]; }).join('');
  document.getElementById('dlrm-pw').value = pw;
}

async function saveDlr() {
  var did  = document.getElementById('dlrm-did').value.trim();
  var name = document.getElementById('dlrm-name').value.trim();
  var uid  = document.getElementById('dlrm-uid').value.trim();
  var pw   = document.getElementById('dlrm-pw').value.trim();
  var ref  = document.getElementById('dlrm-refcode').value.trim();

  if (!did || !name) { alert('딜러ID와 딜러명은 필수입니다.'); return; }
  if (!did.startsWith('dlr_')) { alert('딜러ID는 dlr_ 로 시작해야 합니다.\n예: dlr_001'); return; }
  if (!uid || !pw) { alert('로그인 아이디와 비밀번호를 입력해주세요.'); return; }
  if (!ref) { alert('추천코드를 입력해주세요.'); return; }

  var data = {
    딜러ID:    did,
    딜러명:    name,
    연락처:    document.getElementById('dlrm-phone').value,
    이메일:    document.getElementById('dlrm-email').value,
    추천코드:  ref,
    상태:      document.getElementById('dlrm-status').value,
    과세유형:  document.getElementById('dlrm-tax').value,
    입점비납부:document.getElementById('dlrm-entry').value,
    월사용비:  document.getElementById('dlrm-monthly').value,
    아이디:    uid,
    비밀번호:  pw,
    등록일:    new Date().toISOString().split('T')[0],
    이번달매출:'0',
    수수료구간:'1',
    포인트잔액:'0'
  };

  try {
    showAdminToast('⏳ 저장 중...');
    var res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveDlr', data: data })
    }).then(function(r){ return r.json(); });

    if (res.status === 'ok') {
      showAdminToast('✅ 딜러 저장 완료!');
      closeDlrModal();
      loadDlrList();
    } else {
      showAdminToast('❌ ' + (res.message || '저장 실패'));
    }
  } catch(e) {
    showAdminToast('❌ 오류: ' + e.message);
  }
}

// ============================================================
// 포인트 지급 모달
// ============================================================
async function openPointModal() {
  if (!_dlrAllRows.length) await loadDlrList();
  _fillDlrSelect('pm-dlr-id', '');
  document.getElementById('pm-amount').value = '';
  document.getElementById('pm-reason').value = '';
  document.getElementById('pm-type').value   = '적립';
  document.getElementById('point-modal').style.display = 'flex';
}

function openDlrPointFromList(dlrId) {
  openPointModal().then(function(){
    document.getElementById('pm-dlr-id').value = dlrId;
  });
}

function closePointModal() {
  document.getElementById('point-modal').style.display = 'none';
}

function _fillDlrSelect(selId, selectedId) {
  var sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = _dlrAllRows
    .filter(function(r){ return r['상태'] === '활성'; })
    .map(function(r){
      var v = r['딜러ID'] || '';
      return '<option value="' + v + '"' + (v === selectedId ? ' selected' : '') + '>'
        + (r['딜러명']||'') + ' (' + v + ')</option>';
    }).join('');
}

async function savePoint() {
  var dlrId  = document.getElementById('pm-dlr-id').value;
  var type   = document.getElementById('pm-type').value;
  var amount = Number(document.getElementById('pm-amount').value);
  var reason = document.getElementById('pm-reason').value.trim();

  if (!dlrId)   { alert('딜러를 선택해주세요.'); return; }
  if (!amount)  { alert('포인트 금액을 입력해주세요.'); return; }
  if (!reason)  { alert('사유를 입력해주세요.'); return; }

  try {
    showAdminToast('⏳ 처리 중...');
    var res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveDealerPoint',
        data: { 딜러ID: dlrId, 포인트종류: type, 포인트금액: amount, 사유: reason }
      })
    }).then(function(r){ return r.json(); });

    if (res.status === 'ok') {
      showAdminToast('✅ 포인트 ' + (type==='적립'?'지급':'차감') + ' 완료! ' + amount.toLocaleString() + 'P');
      closePointModal();
      loadDlrPoints();
      loadDlrList();
    } else {
      showAdminToast('❌ ' + (res.message || '처리 실패'));
    }
  } catch(e) {
    showAdminToast('❌ 오류: ' + e.message);
  }
}

// ============================================================
// 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('dlr-comm-month');
  if (el) el.value = getDlrCurMonth();
});
