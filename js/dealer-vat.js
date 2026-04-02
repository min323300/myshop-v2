// ============================================================
// dealer-vat.js — 대리점용 부가세 조회 (v4.7)
// 위탁공급(위탁대리점으로서) + 판매(판매대리점으로서) 부가세 조회
// ============================================================

var _dVatConsign = [];   // 위탁공급 부가세 (내가 상품 공급)
var _dVatSales   = [];   // 판매 부가세 (내가 판매)
var _dVatCurTab  = 'consign';

// ── 초기화 ──────────────────────────────────────────────────
function loadDealerVat() {
  var now = new Date();
  var ym  = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  var el  = document.getElementById('dvat-month');
  if (el && !el.value) el.value = ym;
  loadDealerVatData();
}

// ── 데이터 조회 ──────────────────────────────────────────────
async function loadDealerVatData() {
  if (!DEALER) return;
  var ym = (document.getElementById('dvat-month') || {}).value || '';

  var csEl = document.getElementById('dvat-consign-tw');
  var slEl = document.getElementById('dvat-sales-tw');
  var spin = '<div class="loading"><div class="lspin">⏳</div></div>';
  if (csEl) csEl.innerHTML = spin;
  if (slEl) slEl.innerHTML = spin;

  // 위탁공급 (내가 상품을 공급한 경우)
  var pConsign = fetchDealerVat('consign', ym);
  // 판매 (내가 판매한 경우)
  var pSales   = fetchDealerVat('sales', ym);

  try {
    var results = await Promise.all([pConsign, pSales]);
    _dVatConsign = results[0];
    _dVatSales   = results[1];
    renderDealerVatSummary();
    renderDealerVatTable('consign');
    renderDealerVatTable('sales');
    updateDealerVatTabCount();
  } catch(e) {
    if (csEl) csEl.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">데이터 조회 실패</div>';
    if (slEl) slEl.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">데이터 조회 실패</div>';
  }
}

async function fetchDealerVat(type, ym) {
  var params = '?action=getVatList&대리점ID=' + encodeURIComponent(DEALER.id)
    + '&type=' + type + '&t=' + Date.now();
  if (ym) params += '&yearMonth=' + ym;
  var res  = await fetch(SCRIPT_URL + params);
  var json = await res.json();
  return json.rows || [];
}

// ── 요약 카드 ────────────────────────────────────────────────
function renderDealerVatSummary() {
  var setVal = function(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; };

  // 위탁공급: 내가 납부할 부가세 (원가 × 10%)
  var totConsignVat = _dVatConsign.reduce(function(s,r){ return s + parseFloat(r['위탁대리점_부가세']||0); }, 0);
  var issuedConsign = _dVatConsign.filter(function(r){ return String(r['세금계산서_발행여부']).toUpperCase()==='TRUE'; }).length;

  // 판매: 내가 납부할 부가세 (판매수익 역산)
  var totSalesVat   = _dVatSales.reduce(function(s,r){ return s + parseFloat(r['판매대리점_부가세']||0); }, 0);

  setVal('dvat-consign-vat',    totConsignVat.toLocaleString() + '원');
  setVal('dvat-consign-cnt',    _dVatConsign.length + '건');
  setVal('dvat-consign-issued', issuedConsign + ' / ' + _dVatConsign.length + '건');
  setVal('dvat-sales-vat',      totSalesVat.toLocaleString() + '원');
  setVal('dvat-sales-cnt',      _dVatSales.length + '건');
}

// ── 탭별 카운트 ──────────────────────────────────────────────
function updateDealerVatTabCount() {
  var elC = document.getElementById('dvat-tc-consign');
  var elS = document.getElementById('dvat-tc-sales');
  if (elC) elC.textContent = _dVatConsign.length;
  if (elS) elS.textContent = _dVatSales.length;
}

// ── 탭 전환 ──────────────────────────────────────────────────
function switchDealerVatTab(tab, el) {
  _dVatCurTab = tab;
  document.querySelectorAll('#page-vat .stab').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');
  document.getElementById('dvat-consign-section').style.display = tab === 'consign' ? 'block' : 'none';
  document.getElementById('dvat-sales-section').style.display   = tab === 'sales'   ? 'block' : 'none';
}

// ── 테이블 렌더링 ────────────────────────────────────────────
function renderDealerVatTable(type) {
  var rows  = type === 'consign' ? _dVatConsign : _dVatSales;
  var elId  = type === 'consign' ? 'dvat-consign-tw' : 'dvat-sales-tw';
  var el    = document.getElementById(elId);
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">'
      + '<div style="font-size:32px;margin-bottom:10px;">🧾</div>'
      + (type === 'consign' ? '위탁공급한 상품의 부가세 내역이 없습니다' : '판매 부가세 내역이 없습니다')
      + '</div>';
    return;
  }

  var isConsign = type === 'consign';
  var vatKey    = isConsign ? '위탁대리점_부가세' : '판매대리점_부가세';
  var vatLabel  = isConsign ? '납부 부가세 (원가×10%)' : '납부 부가세 (수익 역산)';

  var html = '<div style="overflow-x:auto;">'
    + '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px;">'
    + '<thead><tr style="background:#f8f9ff;border-bottom:2px solid #e0e7ff;">'
    + '<th style="padding:10px 8px;text-align:center;">번호</th>'
    + '<th style="padding:10px 8px;text-align:left;">주문번호</th>'
    + '<th style="padding:10px 8px;text-align:center;">결제일시</th>'
    + '<th style="padding:10px 8px;text-align:left;">상품명</th>'
    + (isConsign ? '<th style="padding:10px 8px;text-align:left;">판매대리점</th>' : '<th style="padding:10px 8px;text-align:left;">위탁대리점</th>')
    + '<th style="padding:10px 8px;text-align:right;">' + (isConsign ? '원가' : '판매가') + '</th>'
    + '<th style="padding:10px 8px;text-align:right;color:#e65100;">' + vatLabel + '</th>'
    + (isConsign ? '<th style="padding:10px 8px;text-align:center;">세금계산서</th>' : '')
    + '</tr></thead><tbody>';

  var totVat = 0;
  rows.forEach(function(r) {
    var vat    = parseFloat(r[vatKey] || 0);
    totVat    += vat;
    var issued = String(r['세금계산서_발행여부']).trim().toUpperCase() === 'TRUE';
    var badge  = issued
      ? '<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:8px;font-size:11px;">✅ 발행</span>'
      : '<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:8px;font-size:11px;">⏳ 대기</span>';

    html += '<tr style="border-bottom:1px solid #f0f0f0;">'
      + '<td style="padding:9px 8px;text-align:center;color:#888;">' + (r['번호']||'-') + '</td>'
      + '<td style="padding:9px 8px;font-size:11px;color:#555;">' + (r['주문번호']||'-') + '</td>'
      + '<td style="padding:9px 8px;text-align:center;font-size:11px;color:#777;">' + String(r['결제일시']||'').substring(0,10) + '</td>'
      + '<td style="padding:9px 8px;font-weight:600;">' + (r['상품명']||'-') + '</td>'
      + '<td style="padding:9px 8px;color:#4f46e5;font-weight:600;">' + (isConsign ? (r['판매대리점ID']||'-') : (r['위탁대리점ID']||'-')) + '</td>'
      + '<td style="padding:9px 8px;text-align:right;">' + parseFloat(isConsign ? (r['원가']||0) : (r['판매가']||0)).toLocaleString() + '원</td>'
      + '<td style="padding:9px 8px;text-align:right;font-weight:700;color:#e65100;">' + vat.toLocaleString() + '원</td>'
      + (isConsign ? '<td style="padding:9px 8px;text-align:center;">' + badge + '</td>' : '')
      + '</tr>';
  });

  html += '</tbody></table></div>';
  html += '<div style="padding:10px 16px;background:#f8f9ff;border-top:2px solid #e0e7ff;font-size:13px;font-weight:700;color:#e65100;">'
    + '💡 ' + vatLabel + ' 합계: ' + totVat.toLocaleString() + '원 (' + rows.length + '건)'
    + (isConsign ? ' — 세금계산서 발행 후 본사로 청구하세요' : ' — 수익금 기준 납부 부가세입니다')
    + '</div>';

  el.innerHTML = html;
}

// ── 엑셀 다운로드 ────────────────────────────────────────────
function downloadDealerVatExcel() {
  var rows = _dVatCurTab === 'consign' ? _dVatConsign : _dVatSales;
  if (!rows.length) { showToast('다운로드할 데이터가 없습니다', 'err'); return; }

  var headers = ['번호','주문번호','결제일시','상품명',
    '판매대리점ID','위탁대리점ID',
    '판매가','원가','수익금',
    '위탁대리점_부가세','본사_부가세','판매대리점_부가세',
    '세금계산서_발행여부','세금계산서_발행일'];

  var ym   = (document.getElementById('dvat-month') || {}).value || '';
  var type = _dVatCurTab === 'consign' ? '위탁공급부가세' : '판매부가세';

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
  a.download = type + '_' + (ym || '전체') + '_' + (DEALER ? DEALER.id : '') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ 엑셀 다운로드 완료!', 'ok');
}
