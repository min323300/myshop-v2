// ============================================================
// admin-settlement.js — 정산 관리 · 본사 마진율
// ============================================================

async function initSettlement() {
  var now = new Date();
  var ym  = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('settle-month').value = ym;

  // 본사마진율 로드
  try {
    var res  = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=getHqMarginRate&t=' + Date.now());
    var json = await res.json();
    if (json.rate) document.getElementById('hq-margin-rate').value = json.rate;
  } catch(e) {}

  loadSettlement();
}

async function loadSettlement() {
  var ym = document.getElementById('settle-month').value;
  if (!ym) { showAdminToast('월을 선택하세요'); return; }

  document.getElementById('settle-tw').innerHTML =
    '<div class="loading"><div class="lspin">⏳</div></div>';
  document.getElementById('settle-month-label').textContent = ym + ' 정산';

  try {
    var url = CONFIG.APPS_SCRIPT_URL + '?action=getSettlement&yearMonth=' + ym + '&t=' + Date.now();
    var res  = await fetch(url);
    var json = await res.json();
    renderSettlement(json.rows || []);
  } catch(e) {
    document.getElementById('settle-tw').innerHTML =
      '<div style="padding:20px;text-align:center;color:#aaa;">데이터 없음 — 정산 계산을 먼저 실행하세요</div>';
  }
}

function renderSettlement(rows) {
  var el = document.getElementById('settle-tw');
  if (!rows.length) {
    el.innerHTML = '<div style="padding:30px;text-align:center;color:#aaa;">정산 데이터 없음 — ⚙️ 정산 계산 버튼을 눌러주세요</div>';
    ['settle-total','settle-pg','settle-hq','settle-dealer'].forEach(function(id){
      document.getElementById(id).textContent='0원';
    });
    return;
  }

  var totalSale=0, totalPg=0, totalHq=0, totalDealer=0;
  rows.forEach(function(r){
    totalSale  += parseFloat(r['총매출']       ||0);
    totalPg    += parseFloat(r['PG수수료']     ||0);
    totalHq    += parseFloat(r['본사수수료']   ||0);
    totalDealer+= parseFloat(r['대리점수령액'] ||0);
  });

  document.getElementById('settle-total').textContent  = totalSale.toLocaleString()+'원';
  document.getElementById('settle-pg').textContent     = totalPg.toLocaleString()+'원';
  document.getElementById('settle-hq').textContent     = totalHq.toLocaleString()+'원';
  document.getElementById('settle-dealer').textContent = totalDealer.toLocaleString()+'원';

  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="background:#f8f8f8;border-bottom:1px solid #eee;">'
    + '<th style="padding:10px;text-align:left;">대리점</th>'
    + '<th style="padding:10px;text-align:right;">총매출</th>'
    + '<th style="padding:10px;text-align:center;">PG요율</th>'
    + '<th style="padding:10px;text-align:right;">PG수수료</th>'
    + '<th style="padding:10px;text-align:center;">본사마진율</th>'
    + '<th style="padding:10px;text-align:right;">본사수수료</th>'
    + '<th style="padding:10px;text-align:right;color:#1a7f4b;">대리점수령액</th>'
    + '<th style="padding:10px;text-align:center;">상태</th>'
    + '</tr></thead><tbody>'
    + rows.map(function(r){
        return '<tr style="border-bottom:1px solid #f5f5f5;">'
          + '<td style="padding:10px;font-weight:600;">'+(r['대리점ID']||'-')+'</td>'
          + '<td style="padding:10px;text-align:right;">'+parseFloat(r['총매출']||0).toLocaleString()+'원</td>'
          + '<td style="padding:10px;text-align:center;">'+(r['PG요율']||0)+'%</td>'
          + '<td style="padding:10px;text-align:right;color:#e85a2b;">'+parseFloat(r['PG수수료']||0).toLocaleString()+'원</td>'
          + '<td style="padding:10px;text-align:center;">'+(r['본사마진율']||0)+'%</td>'
          + '<td style="padding:10px;text-align:right;color:#e85a2b;">'+parseFloat(r['본사수수료']||0).toLocaleString()+'원</td>'
          + '<td style="padding:10px;text-align:right;font-weight:700;color:#1a7f4b;">'+parseFloat(r['대리점수령액']||0).toLocaleString()+'원</td>'
          + '<td style="padding:10px;text-align:center;"><span style="background:#e8f5e9;color:#2e7d32;padding:2px 10px;border-radius:10px;font-size:11px;">'+(r['상태']||'-')+'</span></td>'
          + '</tr>';
      }).join('')
    + '</tbody></table>';
}

async function runCalcSettlement() {
  var ym = document.getElementById('settle-month').value;
  if (!ym) { showAdminToast('월을 선택하세요'); return; }
  if (!confirm(ym + ' 정산을 계산하시겠습니까?')) return;
  showAdminToast('⏳ 정산 계산 중...');
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'calcSettlement', data: { yearMonth: ym } })
    });
    showAdminToast('✅ 정산 계산 완료!');
    setTimeout(loadSettlement, 1500);
  } catch(e) { showAdminToast('오류: ' + e.message); }
}

async function saveHqMargin() {
  var rate = parseFloat(document.getElementById('hq-margin-rate').value);
  if (isNaN(rate) || rate < 0.1 || rate > 0.2) {
    showAdminToast('0.1 ~ 0.2 사이 값을 입력하세요');
    return;
  }
  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'saveHqMarginRate', data: { 비율: rate } })
    });
    showAdminToast('✅ 본사 마진율 저장 완료!');
  } catch(e) { showAdminToast('오류: ' + e.message); }
}
