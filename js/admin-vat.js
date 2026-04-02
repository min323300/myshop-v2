// ============================================================
// admin-vat.js — 본사용 부가세 관리 (v4.7)
// 위탁판매 3자별 부가세 내역 · 세금계산서 발행 · 월별 통계
// ============================================================

var _vatAllRows    = [];   // 전체 원본 데이터
var _vatCurFilter  = 'all'; // 현재 탭 ('all' | 'unpaid')

// ── 초기화 ──────────────────────────────────────────────────
function initVatMgmt() {
  var now = new Date();
  var ym  = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  var el  = document.getElementById('vat-month');
  if (el && !el.value) el.value = ym;
  loadVatMgmt();
}

// ── 메인 조회 ────────────────────────────────────────────────
async function loadVatMgmt() {
  var ym = document.getElementById('vat-month').value;
  document.getElementById('vat-month-label').textContent = ym ? ym + ' 부가세 현황' : '전체 부가세 현황';

  var twId = document.getElementById('vat-tw');
  if (twId) twId.innerHTML = '<div class="loading"><div class="lspin">⏳</div><div style="margin-top:8px;font-size:13px;color:#aaa;">부가세 내역 조회 중...</div></div>';

  try {
    var params = '?action=getVatList&t=' + Date.now();
    if (ym) params += '&yearMonth=' + ym;
    var res  = await fetch(CONFIG.APPS_SCRIPT_URL + params);
    var json = await res.json();
    _vatAllRows = json.rows || [];
    renderVatSummary(_vatAllRows);
    renderVatTable(_vatAllRows, _vatCurFilter);
    updateVatTabCounts(_vatAllRows);
  } catch(e) {
    if (twId) twId.innerHTML = '<div style="padding:30px;text-align:center;color:#aaa;">데이터 없음 — 위탁판매 결제완료 건이 있어야 조회됩니다</div>';
  }
}

// ── 월별 통계 카드 ───────────────────────────────────────────
function renderVatSummary(rows) {
  var totConsign = 0, totHq = 0, totDealer = 0, totIssued = 0;
  rows.forEach(function(r) {
    totConsign += parseFloat(r['위탁대리점_부가세'] || 0);
    totHq      += parseFloat(r['본사_부가세']       || 0);
    totDealer  += parseFloat(r['판매대리점_부가세'] || 0);
    if (String(r['세금계산서_발행여부']).trim().toUpperCase() === 'TRUE') totIssued++;
  });

  var setVal = function(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; };
  setVal('vat-consign-total',  totConsign.toLocaleString() + '원');
  setVal('vat-hq-total',       totHq.toLocaleString()      + '원');
  setVal('vat-dealer-total',   totDealer.toLocaleString()  + '원');
  setVal('vat-issued-count',   totIssued + ' / ' + rows.length + '건');
}

// ── 탭별 카운트 ──────────────────────────────────────────────
function updateVatTabCounts(rows) {
  var unpaid = rows.filter(function(r){
    return String(r['세금계산서_발행여부']).trim().toUpperCase() !== 'TRUE';
  }).length;
  var setTc = function(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; };
  setTc('vat-tc-all',    rows.length);
  setTc('vat-tc-unpaid', unpaid);
  setTc('vat-tc-issued', rows.length - unpaid);
}

// ── 탭 전환 ──────────────────────────────────────────────────
function switchVatTab(tab, el) {
  _vatCurFilter = tab;
  document.querySelectorAll('#page-vat-mgmt .stab').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderVatTable(_vatAllRows, tab);
}

// ── 테이블 렌더링 ────────────────────────────────────────────
function renderVatTable(rows, filter) {
  var el = document.getElementById('vat-tw');
  if (!el) return;

  var filtered = rows.filter(function(r) {
    if (filter === 'unpaid') return String(r['세금계산서_발행여부']).trim().toUpperCase() !== 'TRUE';
    if (filter === 'issued') return String(r['세금계산서_발행여부']).trim().toUpperCase() === 'TRUE';
    return true;
  });

  // 대리점 검색 필터
  var dealerKw = (document.getElementById('vat-dealer-search') || {}).value || '';
  if (dealerKw.trim()) {
    filtered = filtered.filter(function(r) {
      return (r['판매대리점ID']||'').includes(dealerKw) ||
             (r['위탁대리점ID']||'').includes(dealerKw);
    });
  }

  if (!filtered.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;"><div style="font-size:32px;margin-bottom:10px;">🧾</div>해당 조건의 부가세 내역이 없습니다</div>';
    return;
  }

  var html = '<div style="overflow-x:auto;">'
    + '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:900px;">'
    + '<thead><tr style="background:#f8f9ff;border-bottom:2px solid #e0e7ff;">'
    + '<th style="padding:10px 8px;text-align:center;color:#4f46e5;">번호</th>'
    + '<th style="padding:10px 8px;text-align:left;color:#4f46e5;">주문번호</th>'
    + '<th style="padding:10px 8px;text-align:center;color:#4f46e5;">결제일시</th>'
    + '<th style="padding:10px 8px;text-align:left;color:#4f46e5;">상품명</th>'
    + '<th style="padding:10px 8px;text-align:left;color:#4f46e5;">위탁대리점</th>'
    + '<th style="padding:10px 8px;text-align:left;color:#4f46e5;">판매대리점</th>'
    + '<th style="padding:10px 8px;text-align:right;color:#e65100;">위탁 부가세</th>'
    + '<th style="padding:10px 8px;text-align:right;color:#1565c0;">본사 부가세</th>'
    + '<th style="padding:10px 8px;text-align:right;color:#2e7d32;">판매 부가세</th>'
    + '<th style="padding:10px 8px;text-align:right;color:#555;">원가</th>'
    + '<th style="padding:10px 8px;text-align:right;color:#555;">판매가</th>'
    + '<th style="padding:10px 8px;text-align:center;">세금계산서</th>'
    + '<th style="padding:10px 8px;text-align:center;">처리</th>'
    + '</tr></thead><tbody>';

  filtered.forEach(function(r) {
    var issued  = String(r['세금계산서_발행여부']).trim().toUpperCase() === 'TRUE';
    var rowBg   = issued ? '' : 'background:#fffbf0;';
    var issueBadge = issued
      ? '<span style="background:#e8f5e9;color:#2e7d32;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;">✅ 발행완료<br><span style="font-size:10px;color:#888;">' + (r['세금계산서_발행일']||'') + '</span></span>'
      : '<span style="background:#fff3e0;color:#e65100;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;">⏳ 미발행</span>';
    var issueBtn = issued
      ? '<span style="color:#aaa;font-size:11px;">발행완료</span>'
      : '<button onclick="issueTaxInvoice(\''+r['번호']+'\')" style="padding:5px 10px;background:#4f46e5;color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;font-family:var(--font);">발행 처리</button>';

    html += '<tr style="border-bottom:1px solid #f0f0f0;' + rowBg + '">'
      + '<td style="padding:9px 8px;text-align:center;color:#888;">' + (r['번호']||'-') + '</td>'
      + '<td style="padding:9px 8px;font-size:11px;color:#555;">' + (r['주문번호']||'-') + '</td>'
      + '<td style="padding:9px 8px;text-align:center;font-size:11px;color:#777;">' + String(r['결제일시']||'').substring(0,10) + '</td>'
      + '<td style="padding:9px 8px;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (r['상품명']||'-') + '</td>'
      + '<td style="padding:9px 8px;color:#e65100;font-weight:600;">' + (r['위탁대리점ID']||'-') + '</td>'
      + '<td style="padding:9px 8px;color:#1565c0;font-weight:600;">' + (r['판매대리점ID']||'-') + '</td>'
      + '<td style="padding:9px 8px;text-align:right;font-weight:700;color:#e65100;">' + parseFloat(r['위탁대리점_부가세']||0).toLocaleString() + '원</td>'
      + '<td style="padding:9px 8px;text-align:right;font-weight:700;color:#1565c0;">' + parseFloat(r['본사_부가세']||0).toLocaleString() + '원</td>'
      + '<td style="padding:9px 8px;text-align:right;font-weight:700;color:#2e7d32;">' + parseFloat(r['판매대리점_부가세']||0).toLocaleString() + '원</td>'
      + '<td style="padding:9px 8px;text-align:right;color:#777;">' + parseFloat(r['원가']||0).toLocaleString() + '원</td>'
      + '<td style="padding:9px 8px;text-align:right;color:#777;">' + parseFloat(r['판매가']||0).toLocaleString() + '원</td>'
      + '<td style="padding:9px 8px;text-align:center;">' + issueBadge + '</td>'
      + '<td style="padding:9px 8px;text-align:center;">' + issueBtn + '</td>'
      + '</tr>';
  });

  html += '</tbody></table></div>';

  // 합계 행
  var sumC=0, sumH=0, sumD=0;
  filtered.forEach(function(r){
    sumC += parseFloat(r['위탁대리점_부가세']||0);
    sumH += parseFloat(r['본사_부가세']||0);
    sumD += parseFloat(r['판매대리점_부가세']||0);
  });
  html += '<div style="padding:12px 16px;background:#f8f9ff;border-top:2px solid #e0e7ff;display:flex;gap:24px;font-size:13px;font-weight:700;">'
    + '<span>📊 조회 건수: <strong>' + filtered.length + '건</strong></span>'
    + '<span style="color:#e65100;">위탁 부가세 합계: ' + sumC.toLocaleString() + '원</span>'
    + '<span style="color:#1565c0;">본사 부가세 합계: ' + sumH.toLocaleString() + '원</span>'
    + '<span style="color:#2e7d32;">판매 부가세 합계: ' + sumD.toLocaleString() + '원</span>'
    + '<span style="color:#555;margin-left:auto;">총 부가세: ' + (sumC+sumH+sumD).toLocaleString() + '원</span>'
    + '</div>';

  el.innerHTML = html;
}

// ── 세금계산서 발행 완료 처리 ────────────────────────────────
async function issueTaxInvoice(no) {
  if (!confirm('번호 ' + no + ' 건을 세금계산서 발행 완료 처리하시겠습니까?')) return;
  showAdminToast('⏳ 처리 중...');
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'updateTaxInvoiceStatus', data: { 번호: no } })
    });
    showAdminToast('✅ 세금계산서 발행 완료 처리됐습니다!');
    setTimeout(loadVatMgmt, 1200);
  } catch(e) {
    showAdminToast('오류: ' + e.message);
  }
}

// ── 엑셀 다운로드 ────────────────────────────────────────────
function downloadVatExcel() {
  if (!_vatAllRows.length) { showAdminToast('다운로드할 데이터가 없습니다'); return; }

  var headers = ['번호','주문번호','결제일시','판매대리점ID','위탁대리점ID','상품번호','상품명',
    '판매가','원가','수익금','본사수익','판매대리점수익',
    '위탁대리점_부가세','본사_부가세','판매대리점_부가세',
    '세금계산서_발행여부','세금계산서_발행일'];

  var ym   = (document.getElementById('vat-month')||{}).value || '';
  var rows = _vatAllRows;
  if (ym) rows = rows.filter(function(r){ return String(r['결제일시']||'').substring(0,7) === ym; });

  var csv = '\uFEFF' + headers.join(',') + '\n'
    + rows.map(function(r){
        return headers.map(function(h){
          var v = String(r[h] || '');
          return v.includes(',') ? '"' + v + '"' : v;
        }).join(',');
      }).join('\n');

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = '부가세내역_' + (ym || '전체') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast('✅ 엑셀 다운로드 완료!');
}
