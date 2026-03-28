// ============================================================
// admin-consignment.js — 위탁판매 승인 관리 v1.0
// 개선사항:
//   - 원가·판매가·수익 분배 미리보기 (카드형)
//   - 거절사유 입력 모달
//   - 대리점별 필터
//   - 승인일시 표시
//   - 위탁정산 현황 조회
// ============================================================

var allConsignData  = [];
var csDetailProduct = null; // 상세 보기용

// ── 목록 로드 ────────────────────────────────────────────────
async function loadConsignmentMgmt() {
  document.getElementById('cm-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  try {
    var url = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('대리점상품') + '&t=' + Date.now();
    var res = await fetch(url);
    var csv = await res.text();
    var all = parseAdminCSV(csv);

    // 위탁신청된 상품만
    allConsignData = all.filter(function(p){ return p['위탁여부']==='TRUE'; });

    var pending  = allConsignData.filter(function(p){ return p['본사승인']!=='TRUE'&&p['본사승인']!=='FALSE'; }).length;
    var approved = allConsignData.filter(function(p){ return p['본사승인']==='TRUE'; }).length;
    var rejected = allConsignData.filter(function(p){ return p['본사승인']==='FALSE'; }).length;

    document.getElementById('cm-pending').textContent  = pending;
    document.getElementById('cm-approved').textContent = approved;
    document.getElementById('cm-rejected').textContent = rejected;
    document.getElementById('cm-total').textContent    = allConsignData.length;

    // 대리점 필터 목록 구성
    buildDealerFilter(allConsignData);
    renderConsignList(allConsignData);
  } catch(e) {
    document.getElementById('cm-tw').innerHTML =
      '<div style="padding:20px;text-align:center;color:#aaa;">데이터 로드 실패: '+e.message+'</div>';
  }
}

// ── 대리점 필터 목록 생성 ────────────────────────────────────
function buildDealerFilter(data) {
  var sel = document.getElementById('cm-dealer-filter');
  if (!sel) return;
  var dealers = [...new Set(data.map(function(p){ return p['대리점ID']||''; }).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">전체 대리점</option>'
    + dealers.map(function(d){ return '<option value="'+d+'">'+d+'</option>'; }).join('');
}

// ── 필터 적용 ────────────────────────────────────────────────
function filterConsignment() {
  var status   = document.getElementById('cm-filter').value;
  var dealerId = (document.getElementById('cm-dealer-filter') || {}).value || '';

  var filtered = allConsignData.filter(function(p){
    var matchStatus = true;
    if (status === 'pending')  matchStatus = p['본사승인']!=='TRUE'&&p['본사승인']!=='FALSE';
    if (status === 'approved') matchStatus = p['본사승인']==='TRUE';
    if (status === 'rejected') matchStatus = p['본사승인']==='FALSE';
    var matchDealer = !dealerId || p['대리점ID']===dealerId;
    return matchStatus && matchDealer;
  });
  renderConsignList(filtered);
}

// ── 목록 렌더링 ──────────────────────────────────────────────
function renderConsignList(data) {
  var el = document.getElementById('cm-tw');
  if (!data.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;font-size:14px;">신청 내역이 없습니다</div>';
    return;
  }

  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
    + '<thead><tr style="background:#f8f8f8;border-bottom:2px solid #eee;">'
    + '<th style="padding:11px 14px;text-align:left;">이미지</th>'
    + '<th style="padding:11px 14px;text-align:left;">상품명</th>'
    + '<th style="padding:11px 14px;text-align:center;">대리점</th>'
    + '<th style="padding:11px 14px;text-align:right;">원가</th>'
    + '<th style="padding:11px 14px;text-align:right;">판매가</th>'
    + '<th style="padding:11px 14px;text-align:right;">수익금</th>'
    + '<th style="padding:11px 14px;text-align:center;">승인상태</th>'
    + '<th style="padding:11px 14px;text-align:center;">승인일시</th>'
    + '<th style="padding:11px 14px;text-align:center;">관리</th>'
    + '</tr></thead><tbody>'
    + data.map(function(p) {
        var apr      = p['본사승인'];
        var cost     = parseInt(p['원가']||0);
        var price    = parseInt(p['가격']||0);
        var profit   = price - cost;
        var hqShare  = Math.round(profit * 0.4);
        var dlShare  = profit - hqShare;
        var vat      = Math.round(cost * 0.1);

        var statusHtml = apr==='TRUE'
          ? '<span style="background:#e8f5e9;color:#2e7d32;padding:3px 11px;border-radius:12px;font-size:11px;font-weight:700;">✅ 승인완료</span>'
          : apr==='FALSE'
          ? '<span style="background:#fce4ec;color:#c62828;padding:3px 11px;border-radius:12px;font-size:11px;font-weight:700;">❌ 거절</span>'
          : '<span style="background:#fff8e1;color:#f57f17;padding:3px 11px;border-radius:12px;font-size:11px;font-weight:700;">⏳ 대기중</span>';

        var profitColor = profit > 0 ? '#1a7f4b' : '#e53935';
        var profitStr   = profit > 0 ? '+'+profit.toLocaleString()+'원' : profit.toLocaleString()+'원';

        return '<tr style="border-bottom:1px solid #f5f5f5;" id="cs-row-'+p['번호']+'-'+p['대리점ID']+'">'
          + '<td style="padding:11px 14px;">'
            + '<img src="'+(p['이미지']||'https://picsum.photos/46')+'" '
            + 'style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1px solid #eee;" '
            + 'onerror="this.src=\'https://picsum.photos/46\'"></td>'
          + '<td style="padding:11px 14px;">'
            + '<div style="font-weight:600;color:#222;">'+(p['상품명']||'-')+'</div>'
            + '<div style="font-size:11px;color:#aaa;margin-top:2px;">#'+(p['번호']||'')+'</div>'
          + '</td>'
          + '<td style="padding:11px 14px;text-align:center;">'
            + '<span style="background:#e8f4fd;color:#1565c0;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">'+(p['대리점ID']||'-')+'</span>'
          + '</td>'
          + '<td style="padding:11px 14px;text-align:right;color:#666;">'+(cost>0?cost.toLocaleString()+'원':'<span style="color:#bbb;">미입력</span>')+'</td>'
          + '<td style="padding:11px 14px;text-align:right;font-weight:700;color:#e85a2b;">'+(price>0?price.toLocaleString()+'원':'-')+'</td>'
          + '<td style="padding:11px 14px;text-align:right;font-weight:700;color:'+profitColor+';">'+(cost>0&&price>0?profitStr:'<span style="color:#bbb;">-</span>')+'</td>'
          + '<td style="padding:11px 14px;text-align:center;">'+statusHtml+'</td>'
          + '<td style="padding:11px 14px;text-align:center;font-size:11px;color:#aaa;">'+(p['승인일시']||'-')+'</td>'
          + '<td style="padding:11px 14px;text-align:center;">'
            + '<div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap;">'
            + '<button onclick="openCsDetail(\''+p['번호']+'\',\''+p['대리점ID']+'\')" '
              + 'style="padding:4px 10px;background:#f0f4ff;color:#1565c0;border:none;border-radius:5px;font-size:11px;cursor:pointer;">📋 상세</button>'
            + (apr!=='TRUE' ? '<button onclick="approveConsignment(\''+p['번호']+'\',\''+p['대리점ID']+'\',\'TRUE\')" '
              + 'style="padding:4px 10px;background:#2e7d32;color:#fff;border:none;border-radius:5px;font-size:11px;cursor:pointer;">✅ 승인</button>' : '')
            + (apr!=='FALSE' ? '<button onclick="openRejectModal(\''+p['번호']+'\',\''+p['대리점ID']+'\')" '
              + 'style="padding:4px 10px;background:#c62828;color:#fff;border:none;border-radius:5px;font-size:11px;cursor:pointer;">❌ 거절</button>' : '')
            + '</div>'
          + '</td></tr>';
      }).join('')
    + '</tbody></table>';
}

// ── 상품 상세 모달 ────────────────────────────────────────────
function openCsDetail(no, dealerId) {
  var p = allConsignData.find(function(x){ return x['번호']===no && x['대리점ID']===dealerId; });
  if (!p) return;

  var cost    = parseInt(p['원가']||0);
  var price   = parseInt(p['가격']||0);
  var vat     = Math.round(cost * 0.1);
  var profit  = price - cost;
  var hqShare = Math.round(profit * 0.4);
  var dlShare = profit - hqShare;
  var hasCost = cost > 0 && price > 0;

  var apr = p['본사승인'];
  var statusHtml = apr==='TRUE'
    ? '<span style="background:#e8f5e9;color:#2e7d32;padding:3px 11px;border-radius:12px;font-size:12px;font-weight:700;">✅ 승인완료</span>'
    : apr==='FALSE'
    ? '<span style="background:#fce4ec;color:#c62828;padding:3px 11px;border-radius:12px;font-size:12px;font-weight:700;">❌ 거절</span>'
    : '<span style="background:#fff8e1;color:#f57f17;padding:3px 11px;border-radius:12px;font-size:12px;font-weight:700;">⏳ 승인 대기중</span>';

  var old = document.getElementById('cs-detail-modal');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'cs-detail-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = '<div style="background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">'

    // 헤더
    + '<div style="padding:20px 24px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">'
      + '<span style="font-size:17px;font-weight:700;">📋 위탁판매 상세</span>'
      + '<button onclick="document.getElementById(\'cs-detail-modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;">✕</button>'
    + '</div>'

    // 상품 정보
    + '<div style="padding:20px 24px;">'
      + '<div style="display:flex;gap:16px;margin-bottom:20px;">'
        + '<img src="'+(p['이미지']||'https://picsum.photos/80')+'" style="width:80px;height:80px;object-fit:cover;border-radius:10px;border:1px solid #eee;" onerror="this.src=\'https://picsum.photos/80\'">'
        + '<div style="flex:1;">'
          + '<div style="font-size:16px;font-weight:700;margin-bottom:4px;">'+(p['상품명']||'-')+'</div>'
          + '<div style="font-size:12px;color:#888;margin-bottom:6px;">'+(p['카테고리']||'미분류')+' · #'+(p['번호']||'')+'</div>'
          + '<div>'+statusHtml+'</div>'
          + (p['승인일시'] ? '<div style="font-size:11px;color:#aaa;margin-top:4px;">처리일시: '+p['승인일시']+'</div>' : '')
        + '</div>'
      + '</div>'

      // 대리점 정보
      + '<div style="background:#f0f4ff;border-radius:10px;padding:14px 16px;margin-bottom:16px;">'
        + '<div style="font-size:12px;font-weight:700;color:#1565c0;margin-bottom:8px;">🏬 대리점 정보</div>'
        + '<div style="display:flex;gap:20px;font-size:13px;">'
          + '<div><span style="color:#888;">대리점 ID</span><br><strong style="color:#1565c0;">'+dealerId+'</strong></div>'
          + '<div><span style="color:#888;">신청상품번호</span><br><strong>'+no+'</strong></div>'
          + '<div><span style="color:#888;">재고</span><br><strong>'+(p['재고']||'-')+'</strong></div>'
        + '</div>'
      + '</div>'

      // 정산 구조 미리보기
      + (hasCost
        ? '<div style="background:#f8fffe;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin-bottom:16px;">'
            + '<div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:12px;">💰 위탁 정산 구조 미리보기</div>'
            + '<div style="display:flex;flex-direction:column;gap:7px;font-size:13px;">'
              + csRow('고객 결제 (판매가)', price.toLocaleString()+'원', '#222', true)
              + csRow('위탁대리점 수취 (원가+부가세 '+vat.toLocaleString()+'원)', '-('+((cost+vat).toLocaleString())+'원)', '#e53935')
              + csRow('수익금 (판매가 - 원가)', profit.toLocaleString()+'원', '#1565c0')
              + '<div style="border-top:1px dashed #a7f3d0;margin:4px 0;"></div>'
              + csRow('본사 수익 (수익금의 40%)', hqShare.toLocaleString()+'원', '#f57f17')
              + csRow('판매대리점 수익 (수익금의 60%)', dlShare.toLocaleString()+'원', '#1a7f4b', true)
            + '</div>'
            + '<div style="margin-top:10px;padding:8px 12px;background:#ecfdf5;border-radius:6px;font-size:11px;color:#065f46;">'
              + '💡 부가세(10%)는 별도 처리 — 위탁대리점이 판매대리점에 세금계산서 발행'
            + '</div>'
          + '</div>'
        : '<div style="background:#fff8f7;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;color:#c62828;">'
            + '⚠️ 원가 정보가 없어 정산 구조를 미리볼 수 없습니다.<br>대리점에 원가 입력을 요청하거나 직접 확인 후 승인하세요.'
          + '</div>')

    + '</div>'

    // 하단 버튼
    + '<div style="padding:16px 24px;border-top:1px solid #eee;background:#f9fafb;border-radius:0 0 16px 16px;display:flex;justify-content:flex-end;gap:10px;">'
      + '<button onclick="document.getElementById(\'cs-detail-modal\').remove()" style="padding:9px 20px;background:#fff;border:1px solid #ddd;border-radius:8px;font-size:13px;cursor:pointer;">닫기</button>'
      + (apr!=='TRUE' ? '<button onclick="document.getElementById(\'cs-detail-modal\').remove();approveConsignment(\''+no+'\',\''+dealerId+'\',\'TRUE\')" style="padding:9px 20px;background:#2e7d32;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">✅ 승인하기</button>' : '')
      + (apr!=='FALSE' ? '<button onclick="document.getElementById(\'cs-detail-modal\').remove();openRejectModal(\''+no+'\',\''+dealerId+'\')" style="padding:9px 20px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">❌ 거절하기</button>' : '')
    + '</div>'

  + '</div>';
  document.body.appendChild(modal);
}

function csRow(label, value, color, bold) {
  return '<div style="display:flex;justify-content:space-between;padding:4px 0;">'
    + '<span style="color:#555;">' + label + '</span>'
    + '<span style="color:' + (color||'#222') + ';' + (bold?'font-weight:700;':'') + '">' + value + '</span>'
    + '</div>';
}

// ── 거절 모달 ─────────────────────────────────────────────────
function openRejectModal(no, dealerId) {
  var old = document.getElementById('cs-reject-modal');
  if (old) old.remove();
  var modal = document.createElement('div');
  modal.id = 'cs-reject-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = '<div style="background:#fff;border-radius:14px;width:100%;max-width:420px;box-shadow:0 12px 40px rgba(0,0,0,0.2);">'
    + '<div style="padding:18px 22px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">'
      + '<span style="font-size:16px;font-weight:700;">❌ 위탁판매 거절</span>'
      + '<button onclick="document.getElementById(\'cs-reject-modal\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;">✕</button>'
    + '</div>'
    + '<div style="padding:20px 22px;">'
      + '<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:13px;color:#c62828;margin-bottom:16px;">'
        + '거절 시 대리점의 위탁판매 신청이 취소됩니다. 사유를 입력하면 관리자가 확인할 수 있습니다.'
      + '</div>'
      + '<label style="font-size:12px;font-weight:600;color:#444;display:block;margin-bottom:6px;">거절 사유 (선택)</label>'
      + '<textarea id="cs-reject-reason" rows="3" placeholder="예: 상품 정보 불충분, 원가 미입력, 카테고리 부적합..." '
        + 'style="width:100%;box-sizing:border-box;padding:10px 13px;border:1px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;"></textarea>'
    + '</div>'
    + '<div style="padding:14px 22px;border-top:1px solid #eee;background:#f9fafb;border-radius:0 0 14px 14px;display:flex;justify-content:flex-end;gap:10px;">'
      + '<button onclick="document.getElementById(\'cs-reject-modal\').remove()" style="padding:9px 18px;background:#fff;border:1px solid #ddd;border-radius:8px;font-size:13px;cursor:pointer;">취소</button>'
      + '<button onclick="submitReject(\''+no+'\',\''+dealerId+'\')" style="padding:9px 18px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">❌ 거절 확정</button>'
    + '</div>'
  + '</div>';
  document.body.appendChild(modal);
  setTimeout(function(){ document.getElementById('cs-reject-reason').focus(); }, 100);
}

async function submitReject(no, dealerId) {
  var reason = (document.getElementById('cs-reject-reason')||{}).value || '';
  document.getElementById('cs-reject-modal').remove();
  await approveConsignment(no, dealerId, 'FALSE', reason);
}

// ── 승인/거절 처리 ────────────────────────────────────────────
async function approveConsignment(no, dealerId, value, reason) {
  if (!reason && !confirm(value==='TRUE' ? '승인하시겠습니까?' : '거절하시겠습니까?')) return;
  try {
    var data = { 번호: no, 대리점ID: dealerId, 본사승인: value };
    if (reason) data['거절사유'] = reason;
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      body: JSON.stringify({ action: 'approveConsignment', data: data })
    });
    // 로컬 상태 즉시 업데이트 (새로고침 없이 반영)
    var item = allConsignData.find(function(p){ return p['번호']===no && p['대리점ID']===dealerId; });
    if (item) item['본사승인'] = value;
    showAdminToast(value==='TRUE' ? '✅ 승인 완료!' : '❌ 거절 처리됐습니다');
    setTimeout(loadConsignmentMgmt, 1500);
  } catch(e) { showAdminToast('오류가 발생했습니다'); }
}

// ── 위탁정산 현황 조회 ────────────────────────────────────────
async function loadConsignSettlement() {
  var el = document.getElementById('cs-settle-tw');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">조회 중...</div>';
  try {
    var url = CONFIG.APPS_SCRIPT_URL + '?action=getConsignmentSettlement&t=' + Date.now();
    var res = await fetch(url);
    var json = await res.json();
    var rows = json.rows || [];
    if (!rows.length) {
      el.innerHTML = '<div style="padding:30px;text-align:center;color:#aaa;">위탁정산 내역이 없습니다</div>';
      return;
    }
    el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
      + '<thead><tr style="background:#f8f8f8;border-bottom:2px solid #eee;">'
      + '<th style="padding:10px;text-align:left;">주문번호</th>'
      + '<th style="padding:10px;text-align:center;">판매대리점</th>'
      + '<th style="padding:10px;text-align:center;">위탁대리점</th>'
      + '<th style="padding:10px;text-align:right;">원가</th>'
      + '<th style="padding:10px;text-align:right;">판매가</th>'
      + '<th style="padding:10px;text-align:right;">본사(40%)</th>'
      + '<th style="padding:10px;text-align:right;">판매대리점(60%)</th>'
      + '<th style="padding:10px;text-align:center;">상태</th>'
      + '</tr></thead><tbody>'
      + rows.map(function(r){
          return '<tr style="border-bottom:1px solid #f5f5f5;">'
            + '<td style="padding:10px;font-size:12px;">'+(r['주문번호']||'-')+'</td>'
            + '<td style="padding:10px;text-align:center;"><span style="background:#e8f4fd;color:#1565c0;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;">'+(r['판매대리점ID']||'-')+'</span></td>'
            + '<td style="padding:10px;text-align:center;"><span style="background:#fce4ec;color:#c62828;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;">'+(r['위탁대리점ID']||'-')+'</span></td>'
            + '<td style="padding:10px;text-align:right;color:#666;">'+parseInt(r['원가']||0).toLocaleString()+'원</td>'
            + '<td style="padding:10px;text-align:right;font-weight:600;color:#e85a2b;">'+parseInt(r['판매가']||0).toLocaleString()+'원</td>'
            + '<td style="padding:10px;text-align:right;color:#f57f17;font-weight:600;">'+parseInt(r['본사수익(40%)']||0).toLocaleString()+'원</td>'
            + '<td style="padding:10px;text-align:right;color:#1a7f4b;font-weight:700;">'+parseInt(r['판매대리점수익(60%)']||0).toLocaleString()+'원</td>'
            + '<td style="padding:10px;text-align:center;"><span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:11px;">'+(r['상태']||'-')+'</span></td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>'
      + '<div style="padding:10px 14px;font-size:12px;color:#888;border-top:1px solid #f0f0f0;">총 '+rows.length+'건</div>';
  } catch(e) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">데이터 없음</div>';
  }
}
