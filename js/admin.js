// ============================================================
// CONFIG
// ============================================================
var ADMIN_ID = 'admin', ADMIN_PW = 'damnuri2026';
var SCRIPT_URL = (typeof CONFIG!=='undefined') ? CONFIG.PG.API_PROXY_URL : '';
var IMG_BASE = (typeof CONFIG!=='undefined') ? CONFIG.IMAGE_BASE : 'https://min323300.github.io/myshop/images/';
var SHEET_URL = '';
var SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';

// ============================================================
// ☁️ Cloudinary 설정
// ============================================================
var CLOUDINARY_CLOUD = 'dmefdyags';
var CLOUDINARY_PRESET = 'damnuri_upload';

var allProds=[], allOrders=[], editingId=null, curPage='dashboard';
var srchQ='', catF='', statusF='', orderF='all';

// ✅ 현재 로그인한 사용자 정보
var currentUser = { type: '', dealerId: '', dealerName: '', raw: {} };

// ============================================================
// ✅ 로그인 - 본사 admin 또는 구글시트 대리점 계정
// ============================================================
window.doLogin = function() {
  var id = document.getElementById('lid').value.trim();
  var pw = document.getElementById('lpw').value.trim();
  if (!id || !pw) { document.getElementById('lerr').style.display = 'block'; return; }

  var errEl = document.getElementById('lerr');
  errEl.style.display = 'none';
  errEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';

  // ① 본사 admin 계정 먼저 확인
  if (id === ADMIN_ID && pw === ADMIN_PW) {
    currentUser = { type: 'admin', dealerId: '', dealerName: '본사 관리자', raw: {} };
    loginSuccess('본사 관리자');
    return;
  }

  // ② 구글시트 대리점 시트에서 대리점 계정 확인
  var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
    + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('대리점')
    + '&t=' + Date.now();

  errEl.textContent = '⏳ 로그인 확인 중...';
  errEl.style.display = 'block';
  errEl.style.color = '#666';

  fetch(url).then(function(r){ return r.text(); }).then(function(csv) {
    var rows = parseAdminCSV(csv);
    var matched = rows.find(function(r) {
      var sheetId = (r['관리자ID'] || r['아이디'] || '').trim();
      var sheetPw = (r['관리자PW'] || r['비밀번호'] || '').trim();
      var status  = (r['상태'] || '').trim();
      return sheetId === id && sheetPw === pw && status !== '해지';
    });

    if (matched) {
      var dealerId   = matched['대리점ID'] || '';
      var dealerName = matched['대리점명'] || dealerId;
      currentUser = { type: 'dealer', dealerId: dealerId, dealerName: dealerName, raw: matched };
      loginSuccess(dealerName);
    } else {
      errEl.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
      errEl.style.color = '';
    }
  }).catch(function() {
    errEl.textContent = '로그인 확인 중 오류가 발생했습니다. 다시 시도해주세요.';
    errEl.style.color = '#c0392b';
  });
};

// 로그인 성공 처리
function loginSuccess(name) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  var now = new Date();
  var h = now.getHours(), am = h >= 12 ? '오후' : '오전', hh = (h % 12) || 12;
  var dd = document.getElementById('hd-date');
  var ds = document.getElementById('dash-date');
  if (dd) dd.textContent = now.getFullYear() + '. ' + String(now.getMonth()+1).padStart(2,'0') + '. ' + String(now.getDate()).padStart(2,'0') + '. ' + am + ' ' + String(hh).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  if (ds) ds.textContent = now.getFullYear() + '년 ' + (now.getMonth()+1) + '월 ' + now.getDate() + '일';

  // ✅ 헤더에 로그인한 사용자명 표시
  var hdPanel = document.querySelector('.hd-panel');
  if (hdPanel) hdPanel.textContent = name + ' 관리자';

  // ✅ 대리점 로그인 시 본사 전용 메뉴 숨기기
  if (currentUser.type === 'dealer') {
    document.querySelectorAll('.sb-item').forEach(function(el) {
      var txt = el.textContent.trim();
      if (txt.includes('대리점 관리') || txt.includes('스토어 설정') || txt.includes('공지/매뉴얼')) {
        el.style.display = 'none';
      }
    });
  }

  loadDash();
}

function doLogout() {
  if (!confirm('로그아웃 하시겠습니까?')) return;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('lid').value = '';
  document.getElementById('lpw').value = '';
}

// ============================================================
// 페이지 전환
// ============================================================
function go(pid, el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.sb-item').forEach(function(i){ i.classList.remove('active'); });
  var pg = document.getElementById('page-' + pid);
  if (pg) pg.classList.add('active');
  if (el) el.classList.add('active');
  curPage = pid;
  var map = { 'dashboard': loadDash, 'prod-list': loadProds, 'photo-box': loadPhotos, 'cat-mgmt': loadCats, 'orders': loadOrders, 'groupbuy': loadGroupBuy, 'settlement': loadSettle, 'reviews': loadReviews, 'banners': loadBanners, 'dealer': loadDealer, 'notice': loadNotice, 'settings': loadSettings };
  if (map[pid]) map[pid]();
}
function refresh() { go(curPage, document.querySelector('.sb-item.active')); }

// ============================================================
// 대시보드
// ============================================================
function loadDash() {
  if (typeof ProductAPI === 'undefined') return;
  ProductAPI.getAll().then(function(prods) {
    allProds = prods;
    var active = prods.filter(function(p){ return p.isActive; }).length;
    document.getElementById('stat-grid').innerHTML =
      mk_sc('c-blue','🛒','0건','총 주문 수','전체 누적 주문') +
      mk_sc('c-green','💰','0원','총 매출','결제 완료 기준') +
      mk_sc('c-orange','🏬','0개','운영 대리점','전체 중 활성') +
      mk_sc('c-red','📦', active + '개','등록 상품','사용중인 상품');

    var top5 = prods.slice(0, 5);
    document.getElementById('dash-top5').innerHTML = top5.length
      ? '<table>' + TH(['순위','상품명','가격','판매수량','별점']) + '<tbody>' + top5.map(function(p, i) {
          return '<tr><td style="color:var(--accent);font-weight:700">' + (i+1) + '위</td><td>' + p.name + '</td><td>' + (p.salePrice||p.price).toLocaleString() + '원</td><td>' + (p.salesCount||0) + '개</td><td>⭐ ' + (p.rating||0) + '</td></tr>';
        }).join('') + '</tbody></table>'
      : EMPTY('📦','상품이 없습니다');

    if (typeof FranchiseAPI !== 'undefined') {
      FranchiseAPI.getAll().then(function(list) {
        document.getElementById('dash-franchise').innerHTML = list.length
          ? '<table>' + TH(['대리점명','도메인','상태']) + '<tbody>' + list.map(function(f) {
              return '<tr><td>' + f.name + '</td><td>' + (f.domain||'-') + '</td><td><span class="bdg bdg-green">' + (f.status||'-') + '</span></td></tr>';
            }).join('') + '</tbody></table>'
          : EMPTY('🏬','대리점 없음');
      });
    }

    if (typeof CONFIG !== 'undefined') {
      SheetAPI.fetch(CONFIG.SHEETS.주문).then(function(rows) {
        document.getElementById('dash-orders').innerHTML = rows.length
          ? '<table>' + TH(Object.keys(rows[0]).slice(0,5)) + '<tbody>' + rows.slice(0,5).map(function(row) {
              return '<tr>' + Object.keys(rows[0]).slice(0,5).map(function(k){ return '<td>' + (row[k]||'-') + '</td>'; }).join('') + '</tr>';
            }).join('') + '</tbody></table>'
          : EMPTY('🛒','주문 데이터가 없습니다');
      });
    }
  });
}

function mk_sc(cls, icon, val, label, sub) {
  return '<div class="sc ' + cls + '"><div class="sc-top"><div class="sc-icon">' + icon + '</div></div>' +
    '<div class="sc-val">' + val + '</div><div class="sc-label">' + label + '</div><div class="sc-sub">' + sub + '</div></div>';
}

// ============================================================
// 상품 목록
// ============================================================
function loadProds() {
  document.getElementById('prod-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div><div style="margin-top:10px">상품 불러오는 중...</div></div>';
  if (typeof ProductAPI === 'undefined') return;
  ProductAPI.getAll().then(function(prods) {
    allProds = prods;
    var cats = [...new Set(prods.map(function(p){ return p.category; }))].filter(Boolean);
    document.getElementById('cat-sel').innerHTML = '<option value="">전체 카테고리</option>' + cats.map(function(c){ return '<option>' + c + '</option>'; }).join('');
    document.getElementById('prod-sub').textContent = '전체 ' + prods.length + '개 상품';
    renderProds(prods);
  }).catch(function(){ document.getElementById('prod-tw').innerHTML = EMPTY('⚠️','불러오기 실패'); });
}

function renderProds(prods) {
  document.getElementById('prod-cnt').textContent = prods.length + '개';
  if (!prods.length) { document.getElementById('prod-tw').innerHTML = EMPTY('📦','검색 결과 없음'); return; }
  document.getElementById('prod-tw').innerHTML =
    '<table>' + TH(['#','이미지','상품명','카테고리','판매가','할인가','재고','배송비','뱃지','추천','상태','관리']) + '<tbody>' +
    prods.map(function(p) {
      var disc = p.salePrice && p.price ? Math.round((1-p.salePrice/p.price)*100) : 0;
      var feeText = '-';
      if (p.deliveryType === '무료배송') { feeText = '<span style="color:#1a7f4b;font-weight:700;">무료</span>'; }
      else if (p.deliveryFee !== undefined && p.deliveryFee !== '') {
        var fee = parseInt(p.deliveryFee);
        feeText = fee === 0 ? '<span style="color:#1a7f4b;font-weight:700;">무료</span>' : fee.toLocaleString() + '원';
      }
      return '<tr>' +
        '<td style="color:var(--gray);font-size:12px;">' + p.id + '</td>' +
        '<td><img class="thumb" src="' + p.image + '" onerror="this.style.opacity=\'0.15\'"></td>' +
        '<td><div class="pname">' + p.name + '</div>' + (p.supplier ? '<div class="psub">' + p.supplier + '</div>' : '') + '</td>' +
        '<td>' + p.category + '</td>' +
        '<td>' + (p.price||0).toLocaleString() + '원</td>' +
        '<td>' + (p.salePrice ? '<strong style="color:var(--accent)">' + (p.salePrice||0).toLocaleString() + '원</strong><br><span style="font-size:11px;color:var(--red)">-' + disc + '%</span>' : '-') + '</td>' +
        '<td>' + (p.stock||0) + '</td>' +
        '<td>' + feeText + '</td>' +
        '<td>' + (p.badge ? '<span class="bdg bdg-' + p.badge.toLowerCase() + '">' + p.badge + '</span>' : '-') + '</td>' +
        '<td>' + (p.isFeatured ? '⭐' : '-') + '</td>' +
        '<td>' + (p.isActive ? '<span class="bdg bdg-on">판매중</span>' : '<span class="bdg bdg-off">숨김</span>') + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn btn-outline btn-xs" onclick="editProd(\'' + p.id + '\')">✏️ 수정</button> ' +
          '<button class="btn ' + (p.isActive ? 'btn-danger' : 'btn-green') + ' btn-xs" onclick="toggleProd(\'' + p.id + '\',\'' + p.name + '\',' + (p.isActive) + ')">' + (p.isActive ? '숨김' : '노출') + '</button>' +
        '</td></tr>';
    }).join('') + '</tbody></table>';
}

function fProds(q){ srchQ = q.toLowerCase(); applyFilters(); }
function fCat(c){ catF = c; applyFilters(); }
function fStatus(s){ statusF = s; applyFilters(); }
function applyFilters() {
  renderProds(allProds.filter(function(p) {
    return (!srchQ || (p.name + ' ' + (p.supplier||'')).toLowerCase().includes(srchQ)) &&
      (!catF || p.category === catF) &&
      (!statusF || (statusF==='active' && p.isActive) || (statusF==='inactive' && !p.isActive) || (statusF==='featured' && p.isFeatured));
  }));
}

// ============================================================
// 사진 보관함
// ============================================================
function loadPhotos() {
  var imgs = [];
  allProds.forEach(function(p) {
    ['image','detailImages','detailImages2','certImage'].forEach(function(k) {
      if (p[k]) { var fn = p[k].replace(IMG_BASE,''); if (fn && fn !== p[k]) imgs.push({name:fn, url:p[k], prod:p.name}); }
    });
  });
  document.getElementById('photo-grid').innerHTML = imgs.length
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;">' +
      imgs.map(function(i){ return '<div style="background:var(--bg);border-radius:10px;overflow:hidden;border:1px solid var(--border);"><img src="' + i.url + '" style="width:100%;height:110px;object-fit:cover;display:block;" onerror="this.style.opacity=\'0.2\'"><div style="padding:8px;"><div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + i.name + '</div><div style="font-size:10px;color:var(--gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + i.prod + '</div></div></div>'; }).join('') + '</div>' +
      '<div style="margin-top:14px;padding:12px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;font-size:12px;color:#92400e;">📌 이미지 추가는 상품 등록 시 📁 버튼으로 Cloudinary에 직접 업로드하세요</div>'
    : EMPTY('🖼️','상품에 등록된 이미지가 없습니다','상품 등록 시 📁 버튼으로 이미지를 업로드하세요');
}

// ============================================================
// 카테고리
// ============================================================
function loadCats() {
  if (typeof CategoryAPI === 'undefined') return;
  CategoryAPI.getAll().then(function(cats) {
    document.getElementById('cat-tw').innerHTML = cats.length
      ? '<table>' + TH(['번호','아이콘','카테고리명','상위','순서']) + '<tbody>' + cats.map(function(c) {
          return '<tr><td>' + c.id + '</td><td>' + c.icon + '</td><td><strong>' + c.name + '</strong></td><td>' + (c.parentId||'-') + '</td><td>' + c.order + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<div style="padding:12px 16px;font-size:12px;color:var(--gray);background:var(--bg);border-top:1px solid var(--border);">📌 추가/수정은 <a href="' + SHEET_URL + '" target="_blank" style="color:var(--accent)">구글시트 카테고리 시트</a>에서 하세요</div>'
      : EMPTY('📁','카테고리 없음');
  });
}

// ============================================================
// 주문 ★송장번호/택배사 기능 포함★
// ============================================================
var orderTabF = 'all';

function loadOrders() {
  document.getElementById('order-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  if (typeof CONFIG === 'undefined') return;
  var url = 'https://docs.google.com/spreadsheets/d/1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('주문') + '&t=' + Date.now();
  fetch(url).then(function(r){ return r.text(); }).then(function(csv) {
    allOrders = parseAdminCSV(csv);
    updateOrderTabCounts(allOrders);
    applyOrderFilter();
  }).catch(function(){ document.getElementById('order-tw').innerHTML = EMPTY('🛒','주문 불러오기 실패'); });
}

function updateOrderTabCounts(rows) {
  document.getElementById('oc-all').textContent    = rows.length;
  document.getElementById('order-total-count').textContent = rows.length;
  document.getElementById('oc-wait').textContent   = rows.filter(function(o){ return (o['주문상태']||'').includes('결제대기'); }).length;
  document.getElementById('oc-paid').textContent   = rows.filter(function(o){ return (o['주문상태']||'').includes('결제완료'); }).length;
  document.getElementById('oc-ship').textContent   = rows.filter(function(o){ return (o['주문상태']||'').includes('배송중'); }).length;
  document.getElementById('oc-done').textContent   = rows.filter(function(o){ return (o['주문상태']||'').includes('배송완료'); }).length;
  document.getElementById('oc-cancel').textContent = rows.filter(function(o){ return (o['주문상태']||'').includes('취소'); }).length;
}

function setOrderTab(s, el) {
  orderTabF = s;
  document.querySelectorAll('#page-orders .stab').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');
  var sel = document.getElementById('order-status-sel');
  if (sel) sel.value = s;
  applyOrderFilter();
}

function applyOrderFilter() {
  var status   = document.getElementById('order-status-sel') ? document.getElementById('order-status-sel').value : 'all';
  var dateFrom = document.getElementById('order-date-from') ? document.getElementById('order-date-from').value : '';
  var dateTo   = document.getElementById('order-date-to')   ? document.getElementById('order-date-to').value   : '';
  var keyword  = document.getElementById('order-search')    ? document.getElementById('order-search').value.trim().toLowerCase() : '';
  orderTabF = status;
  var filtered = allOrders.filter(function(o) {
    if (currentUser.type === 'dealer') {
      var oDealerId = (o['대리점ID'] || '').trim();
      if (oDealerId !== currentUser.dealerId) return false;
    }
    if (status !== 'all' && !(o['주문상태']||'').includes(status)) return false;
    if (dateFrom || dateTo) {
      var d = (o['주문일시']||o['저장일시']||'').substring(0,10).replace(/\./g,'-').replace(/ /g,'');
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;
    }
    if (keyword) {
      var searchTarget = [o['주문번호'],o['주문자명'],o['연락처'],o['이메일'],o['주문상품'],o['송장번호']].join(' ').toLowerCase();
      if (!searchTarget.includes(keyword)) return false;
    }
    return true;
  });
  renderOrders(filtered);
}

function clearOrderFilter() {
  var sel = document.getElementById('order-status-sel'); if (sel) sel.value = 'all';
  var df  = document.getElementById('order-date-from'); if (df) df.value = '';
  var dt  = document.getElementById('order-date-to');   if (dt) dt.value = '';
  var kw  = document.getElementById('order-search');    if (kw) kw.value = '';
  orderTabF = 'all';
  document.querySelectorAll('#page-orders .stab').forEach(function(t, i){ t.classList.toggle('active', i===0); });
  renderOrders(allOrders);
}

function openTrackingModal(orderNo, currentCarrier, currentTracking) {
  var modal = document.getElementById('tracking-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'tracking-modal';
    modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;';
    modal.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:28px;width:380px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<div style="font-size:17px;font-weight:800;margin-bottom:20px;">📦 송장번호 입력</div>' +
        '<div style="margin-bottom:14px;">' +
          '<label style="font-size:12px;font-weight:700;color:#666;display:block;margin-bottom:6px;">택배사</label>' +
          '<select id="tm-carrier" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;">' +
            '<option value="">-- 택배사 선택 --</option>' +
            '<option>CJ대한통운</option><option>한진택배</option><option>롯데택배</option>' +
            '<option>우체국택배</option><option>로젠택배</option><option>쿠팡로켓</option><option>직접배송</option>' +
          '</select>' +
        '</div>' +
        '<div style="margin-bottom:20px;">' +
          '<label style="font-size:12px;font-weight:700;color:#666;display:block;margin-bottom:6px;">송장번호</label>' +
          '<input id="tm-tracking" type="text" placeholder="송장번호를 입력하세요" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:flex;gap:10px;">' +
          '<button onclick="closeTrackingModal()" style="flex:1;padding:11px;border:1px solid #ddd;border-radius:8px;background:#f5f5f5;font-size:14px;cursor:pointer;">취소</button>' +
          '<button onclick="saveTracking()" style="flex:2;padding:11px;border:none;border-radius:8px;background:#FF5733;color:#fff;font-weight:700;font-size:14px;cursor:pointer;">📦 저장</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
  }
  document.getElementById('tm-carrier').value = currentCarrier || '';
  document.getElementById('tm-tracking').value = currentTracking || '';
  modal.setAttribute('data-orderno', orderNo);
  modal.style.display = 'flex';
  setTimeout(function(){ document.getElementById('tm-tracking').focus(); }, 100);
}

function closeTrackingModal() {
  var modal = document.getElementById('tracking-modal');
  if (modal) modal.style.display = 'none';
}

function saveTracking() {
  var modal    = document.getElementById('tracking-modal');
  var orderNo  = modal.getAttribute('data-orderno');
  var carrier  = document.getElementById('tm-carrier').value.trim();
  var tracking = document.getElementById('tm-tracking').value.trim();
  if (!tracking) { alert('송장번호를 입력하세요'); return; }
  if (!carrier)  { alert('택배사를 선택하세요'); return; }
  var url = (typeof CONFIG !== 'undefined') ? CONFIG.PG.API_PROXY_URL : '';
  if (!url) { alert('API URL 없음'); return; }
  fetch(url, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateOrderStatus', data: { '주문번호': orderNo, '주문상태': '배송중', '송장번호': tracking, '택배사': carrier } })
  }).then(function() {
    closeTrackingModal();
    showToast('송장번호가 저장됐습니다! (상태→배송중)','ok');
    setTimeout(loadOrders, 800);
  }).catch(function(e){ console.log(e); });
}

function renderOrders(rows) {
  if (!rows.length) { document.getElementById('order-tw').innerHTML = EMPTY('🛒','주문 내역 없음'); return; }
  function getVal(row, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      if (row[candidates[i]] !== undefined && row[candidates[i]] !== '') return row[candidates[i]];
    }
    return '-';
  }
  var statusColor = { '결제대기':'#fff3cd','결제완료':'#d1fae5','배송중':'#dbeafe','배송완료':'#e0e7ff','취소':'#fee2e2' };
  var statusText  = { '결제대기':'#856404','결제완료':'#065f46','배송중':'#1e40af','배송완료':'#3730a3','취소':'#991b1b' };
  var statuses = ['결제대기','결제완료','상품준비','배송중','배송완료','취소'];
  var html = '<div style="overflow-x:auto;"><table><thead><tr>' +
    '<th>주문번호</th><th>주문일시</th><th>주문자명</th><th>연락처</th>' +
    '<th>주문상품</th><th>결제금액</th><th>대리점ID</th>' +
    '<th>📦 송장번호</th><th>주문상태</th><th>상태변경</th>' +
    '</tr></thead><tbody>';
  rows.forEach(function(row) {
    var orderNo  = getVal(row, ['주문번호']);
    var orderDt  = getVal(row, ['주문일시','저장일시','주문날짜']);
    var orderer  = getVal(row, ['주문자명','주문자이름','이름']);
    var phone    = getVal(row, ['연락처','전화번호']);
    var items    = getVal(row, ['주문상품명','주문상품','상품명']);
    var amount   = getVal(row, ['결제금액','금액']);
    var dealer   = getVal(row, ['대리점ID']);
    var st       = getVal(row, ['주문상태','status']);
    var tracking = row['송장번호'] || '';
    var carrier  = row['택배사']   || '';
    if (st === '-') st = '결제대기';
    var bg = statusColor[st] || '#f3f4f6';
    var tc = statusText[st]  || '#374151';
    var amt = (amount && amount !== '-') ? Number(String(amount).replace(/[^0-9]/g,'')).toLocaleString() + '원' : '-';
    var safeNo       = String(orderNo).replace(/"/g,'').replace(/'/g,'');
    var safeCarrier  = carrier.replace(/'/g,'');
    var safeTracking = tracking.replace(/'/g,'');
    var sel = '<select data-no="' + safeNo + '" onchange="changeOrderStatus(this)" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:pointer;">';
    statuses.forEach(function(s){ sel += '<option value="' + s + '"' + (s===st?' selected':'') + '>' + s + '</option>'; });
    sel += '</select>';
    var trackCell = tracking
      ? '<div style="font-size:11px;"><span style="color:var(--gray);">' + carrier + '</span><br><strong style="color:var(--accent);">' + tracking + '</strong></div>' +
        '<button onclick="openTrackingModal(\'' + safeNo + '\',\'' + safeCarrier + '\',\'' + safeTracking + '\')" style="margin-top:4px;padding:2px 7px;font-size:10px;border:1px solid var(--border);border-radius:4px;background:#f5f5f5;cursor:pointer;">✏️ 수정</button>'
      : '<button onclick="openTrackingModal(\'' + safeNo + '\',\'\',\'\')" style="padding:3px 9px;font-size:11px;border:none;border-radius:5px;background:#e8f5e9;color:#1b5e20;cursor:pointer;font-weight:600;">📦 입력</button>';
    html += '<tr>' +
      '<td style="font-size:11px;color:var(--accent);font-weight:700;">' + orderNo + '</td>' +
      '<td style="font-size:11px;color:var(--gray);">' + orderDt + '</td>' +
      '<td style="font-weight:600;">' + orderer + '</td>' +
      '<td>' + phone + '</td>' +
      '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + items + '">' + items + '</td>' +
      '<td style="font-weight:700;color:var(--accent);">' + amt + '</td>' +
      '<td style="font-size:11px;">' + (dealer==='본사'||dealer==='-' ? '<span style="color:var(--gray)">본사</span>' : dealer) + '</td>' +
      '<td style="min-width:110px;">' + trackCell + '</td>' +
      '<td><span style="padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;background:' + bg + ';color:' + tc + ';">' + st + '</span></td>' +
      '<td>' + sel + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('order-tw').innerHTML = html;
}

function changeOrderStatus(sel) {
  var orderNo = sel.getAttribute('data-no');
  var status  = sel.value;
  if (!orderNo) return;
  var url = (typeof CONFIG !== 'undefined') ? CONFIG.PG.API_PROXY_URL : '';
  if (!url) { alert('API URL 없음'); return; }
  if (status === '배송중') {
    var row = allOrders.find(function(o){ return String(o['주문번호']).trim() === orderNo; }) || {};
    openTrackingModal(orderNo, row['택배사']||'', row['송장번호']||'');
    sel.value = (row['주문상태'] || '결제대기');
    return;
  }
  fetch(url, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'updateOrderStatus', data: { '주문번호': orderNo, '주문상태': status } })
  }).then(function(){ setTimeout(loadOrders, 800); }).catch(function(e){ console.log(e); });
}

function downloadOrderExcel() {
  if (!allOrders.length) { alert('주문 데이터가 없습니다'); return; }
  var status   = document.getElementById('order-status-sel') ? document.getElementById('order-status-sel').value : 'all';
  var dateFrom = document.getElementById('order-date-from') ? document.getElementById('order-date-from').value : '';
  var dateTo   = document.getElementById('order-date-to')   ? document.getElementById('order-date-to').value   : '';
  var keyword  = document.getElementById('order-search')    ? document.getElementById('order-search').value.trim().toLowerCase() : '';
  var rows = allOrders.filter(function(o) {
    if (status !== 'all' && !(o['주문상태']||'').includes(status)) return false;
    if (dateFrom || dateTo) {
      var d = (o['주문일시']||o['저장일시']||'').substring(0,10).replace(/\./g,'-');
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;
    }
    if (keyword) {
      var t = [o['주문번호'],o['주문자명'],o['연락처'],o['이메일'],o['주문상품'],o['송장번호']].join(' ').toLowerCase();
      if (!t.includes(keyword)) return false;
    }
    return true;
  });
  if (!rows.length) { alert('필터 결과가 없습니다'); return; }
  var cols = ['주문번호','주문일시','주문자명','연락처','이메일','받는분','배송주소','주문상품','수량','결제금액','결제방법','대리점ID','추천인코드','회원구분','주문상태','송장번호','택배사','메모','저장일시'];
  var lines = ['\uFEFF' + cols.join(',')];
  rows.forEach(function(row) {
    lines.push(cols.map(function(c){ var v = String(row[c]||'').replace(/"/g,'""'); return '"' + v + '"'; }).join(','));
  });
  var csv = lines.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  var now = new Date();
  link.download = '주문내역_' + now.getFullYear() + ('0'+(now.getMonth()+1)).slice(-2) + ('0'+now.getDate()).slice(-2) + '.csv';
  link.click();
}

// ============================================================
// 정산
// ============================================================
function loadSettle() {
  if (typeof CONFIG === 'undefined') return;
  SheetAPI.fetch(CONFIG.SHEETS.정산).then(function(rows) {
    document.getElementById('settle-tw').innerHTML = rows.length
      ? '<table>' + TH(Object.keys(rows[0])) + '<tbody>' + rows.map(function(row) {
          return '<tr>' + Object.values(row).map(function(v){ return '<td>' + (v||'-') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>'
      : EMPTY('💰','정산 데이터 없음');
  });
}

// ============================================================
// 리뷰
// ============================================================
function loadReviews() {
  if (typeof CONFIG === 'undefined') return;
  SheetAPI.fetch(CONFIG.SHEETS.리뷰).then(function(rows) {
    document.getElementById('review-tw').innerHTML = rows.length
      ? '<table>' + TH(['번호','상품번호','작성자','별점','리뷰내용','공개여부']) + '<tbody>' + rows.map(function(r) {
          return '<tr><td>' + (r['번호']||'-') + '</td><td>' + (r['상품번호']||'-') + '</td><td>' + (r['작성자']||'-') + '</td>' +
            '<td>' + ('⭐'.repeat(Math.min(parseInt(r['별점'])||0,5))) + '</td>' +
            '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (r['리뷰내용']||'-') + '</td>' +
            '<td>' + (r['공개여부']==='FALSE' ? '<span class="bdg bdg-off">비공개</span>' : '<span class="bdg bdg-on">공개</span>') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : EMPTY('⭐','리뷰 없음');
  });
}

// ============================================================
// CSV 파싱 공통 함수
// ============================================================
function parseAdminCSV(csv) {
  var lines = csv.trim().split('\n');
  var headers = lines[0].split(',').map(function(h){ return h.trim().replace(/"/g,''); });
  return lines.slice(1).map(function(line) {
    var vals=[], cur='', inQ=false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch==='"') { inQ=!inQ; } else if (ch===','&&!inQ) { vals.push(cur.trim()); cur=''; } else cur+=ch;
    }
    vals.push(cur.trim());
    var obj = {}; headers.forEach(function(h, i){ obj[h] = (vals[i]||'').replace(/"/g,'').trim(); }); return obj;
  }).filter(function(r){ return Object.values(r).some(function(v){ return v; }); });
}

// ============================================================
// 배너/팝업 CRUD
// ============================================================
var bannerAllData = [];
var popupAllData  = [];

function loadBanners() {
  var SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
  var bUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('배너') + '&t=' + Date.now();
  document.getElementById('banner-list-wrap').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  document.getElementById('popup-list-wrap').innerHTML  = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(bUrl).then(function(r){ return r.text(); }).then(function(csv) {
    bannerAllData = parseAdminCSV(csv); renderBannerList();
  }).catch(function(){ document.getElementById('banner-list-wrap').innerHTML = EMPTY('🎨','배너 없음','➕ 배너 추가 버튼으로 등록하세요'); });
  var pUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('팝업') + '&t=' + Date.now();
  fetch(pUrl).then(function(r){ return r.text(); }).then(function(csv) {
    popupAllData = parseAdminCSV(csv); renderPopupList();
  }).catch(function(){ document.getElementById('popup-list-wrap').innerHTML = EMPTY('📢','팝업 없음','➕ 팝업 추가 버튼으로 등록하세요'); });
}

function renderBannerList() {
  var el = document.getElementById('banner-list-wrap');
  if (!bannerAllData.length) { el.innerHTML = EMPTY('🎨','배너 없음','➕ 배너 추가 버튼으로 등록하세요'); return; }
  el.innerHTML = bannerAllData.map(function(b) {
    var active = b['사용여부'] === 'TRUE';
    var no  = (b['번호']||'').replace(/"/g,'');
    var tit = (b['제목']||'').replace(/"/g,'').replace(/'/g,'&#39;');
    return '<div style="margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid var(--border);">' +
      '<div style="background:' + (b['배경색']||'#FF5733') + ';color:' + (b['글자색']||'#fff') + ';padding:14px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div><div style="font-weight:700;font-size:14px;">' + (b['제목']||'-') + '</div>' + (b['부제목'] ? '<div style="font-size:11px;opacity:0.8;margin-top:2px;">' + b['부제목'] + '</div>' : '') + '</div>' +
      '<span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;">' + (active ? '✅ 사용' : '❌ 미사용') + '</span>' +
      '</div>' +
      '<div style="padding:10px 14px;font-size:12px;color:var(--gray);display:flex;align-items:center;justify-content:space-between;">' +
      '<span>링크: ' + (b['링크']||'-') + ' · 순서: ' + (b['순서']||'-') + '</span>' +
      '<div style="display:flex;gap:8px;">' +
      '<button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="editBanner(this)" data-id="' + no + '">✏️ 수정</button>' +
      '<button class="btn" style="font-size:11px;padding:4px 10px;background:#fee;color:#c0392b;border:1px solid #fcc;" onclick="deleteBannerItem(this)" data-id="' + no + '" data-title="' + tit + '">🗑️ 삭제</button>' +
      '</div></div></div>';
  }).join('');
}

function renderPopupList() {
  var el = document.getElementById('popup-list-wrap');
  if (!popupAllData.length) { el.innerHTML = EMPTY('📢','팝업 없음','➕ 팝업 추가 버튼으로 등록하세요'); return; }
  el.innerHTML = popupAllData.map(function(p) {
    var active = p['사용여부'] === 'TRUE';
    var no  = (p['번호']||'').replace(/"/g,'');
    var tit = (p['제목']||'').replace(/"/g,'').replace(/'/g,'&#39;');
    return '<div style="padding:14px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
      '<div><div style="font-weight:700;font-size:14px;">' + (p['제목']||'-') + '</div>' +
      '<div style="font-size:12px;color:var(--gray);margin-top:4px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (p['내용']||(p['이미지']?'[이미지 팝업]':'')) + '</div>' +
      '<div style="font-size:11px;color:var(--gray);margin-top:4px;">' + (p['시작일']?p['시작일']+' ~ ':'') + ' ' + (p['종료일']||'') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">' +
      '<span style="' + (active ? 'background:#e8f5e9;color:#388e3c' : 'background:#fce4ec;color:#c62828') + ';padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">' + (active ? '✅ 활성' : '❌ 비활성') + '</span>' +
      '<div style="display:flex;gap:6px;">' +
      '<button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="editPopup(this)" data-id="' + no + '">✏️ 수정</button>' +
      '<button class="btn" style="font-size:11px;padding:4px 10px;background:#fee;color:#c0392b;border:1px solid #fcc;" onclick="deletePopupItem(this)" data-id="' + no + '" data-title="' + tit + '">🗑️ 삭제</button>' +
      '</div></div></div></div>';
  }).join('');
}

function openBannerModal(){ clearBannerForm(); document.getElementById('bm-title').textContent='🎨 배너 등록'; document.getElementById('banner-modal').classList.add('open'); }
function closeBannerModal(){ document.getElementById('banner-modal').classList.remove('open'); }
function clearBannerForm(){ ['bm-id','bm-title-input','bm-sub','bm-img','bm-link','bm-btn','bm-start','bm-end'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('bm-order').value='1'; document.getElementById('bm-active').value='TRUE'; document.getElementById('bm-bg').value='#FF5733'; document.getElementById('bm-color').value='#ffffff'; var pv=document.getElementById('bm-img-pv'); if(pv) pv.innerHTML=''; var st=document.getElementById('bm-upload-status'); if(st) st.style.display='none'; }

function editBanner(btn) {
  var id = btn.getAttribute('data-id');
  var b  = bannerAllData.find(function(x){ return x['번호'] === String(id); }); if (!b) return;
  document.getElementById('bm-title').textContent = '🎨 배너 수정';
  document.getElementById('bm-id').value = b['번호']||''; document.getElementById('bm-title-input').value = b['제목']||''; document.getElementById('bm-sub').value = b['부제목']||''; document.getElementById('bm-img').value = b['이미지']||''; document.getElementById('bm-bg').value = b['배경색']||'#FF5733'; document.getElementById('bm-color').value = b['글자색']||'#ffffff'; document.getElementById('bm-link').value = b['링크']||''; document.getElementById('bm-btn').value = b['버튼텍스트']||''; document.getElementById('bm-start').value = b['시작일']||''; document.getElementById('bm-end').value = b['종료일']||''; document.getElementById('bm-order').value = b['순서']||'1'; document.getElementById('bm-active').value = b['사용여부']==='FALSE'?'FALSE':'TRUE';
  document.getElementById('banner-modal').classList.add('open');
}

function saveBanner() {
  var title = document.getElementById('bm-title-input').value.trim();
  if (!title) { showToast('제목을 입력하세요','warn'); return; }
  if (!SCRIPT_URL) { showToast('Apps Script URL이 config.js에 설정되어 있지 않습니다','warn'); return; }
  var data = { 번호: document.getElementById('bm-id').value||'', 제목: title, 부제목: document.getElementById('bm-sub').value, 이미지: document.getElementById('bm-img').value, 배경색: document.getElementById('bm-bg').value, 글자색: document.getElementById('bm-color').value, 링크: document.getElementById('bm-link').value, 버튼텍스트: document.getElementById('bm-btn').value, 시작일: document.getElementById('bm-start').value, 종료일: document.getElementById('bm-end').value, 순서: document.getElementById('bm-order').value, 사용여부: document.getElementById('bm-active').value };
  fetch(SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'saveBanner',data:data}) })
    .then(function(){ showToast('배너가 저장됐습니다!','ok'); closeBannerModal(); setTimeout(loadBanners,1500); });
}

function deleteBannerItem(btn) {
  var id = btn.getAttribute('data-id'), title = btn.getAttribute('data-title');
  if (!confirm('[' + title + '] 배너를 삭제하시겠습니까?')) return;
  if (!SCRIPT_URL) { showToast('Apps Script URL 미설정','warn'); return; }
  fetch(SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'deleteBanner',data:{번호:id}}) })
    .then(function(){ showToast('삭제됐습니다','ok'); setTimeout(loadBanners,1500); });
}

function openPopupModal(){ clearPopupForm(); document.getElementById('pm-title').textContent='📢 팝업 등록'; document.getElementById('popup-modal').classList.add('open'); }
function closePopupModal(){ document.getElementById('popup-modal').classList.remove('open'); }
function clearPopupForm(){ ['pm-id','pm-title-input','pm-content','pm-img','pm-link','pm-start','pm-end'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('pm-width').value='500px'; document.getElementById('pm-active').value='TRUE'; var pv=document.getElementById('pm-img-pv'); if(pv) pv.innerHTML=''; }

function editPopup(btn) {
  var id = btn.getAttribute('data-id');
  var p  = popupAllData.find(function(x){ return x['번호'] === String(id); }); if (!p) return;
  document.getElementById('pm-title').textContent = '📢 팝업 수정';
  document.getElementById('pm-id').value = p['번호']||''; document.getElementById('pm-title-input').value = p['제목']||''; document.getElementById('pm-content').value = p['내용']||''; document.getElementById('pm-img').value = p['이미지']||''; document.getElementById('pm-link').value = p['링크']||''; document.getElementById('pm-width').value = p['팝업너비']||'500px'; document.getElementById('pm-start').value = p['시작일']||''; document.getElementById('pm-end').value = p['종료일']||''; document.getElementById('pm-active').value = p['사용여부']==='FALSE'?'FALSE':'TRUE';
  document.getElementById('popup-modal').classList.add('open');
}

function savePopup() {
  var title = document.getElementById('pm-title-input').value.trim();
  if (!title) { showToast('제목을 입력하세요','warn'); return; }
  if (!SCRIPT_URL) { showToast('Apps Script URL이 config.js에 설정되어 있지 않습니다','warn'); return; }
  var data = { 번호: document.getElementById('pm-id').value||'', 제목: title, 내용: document.getElementById('pm-content').value, 이미지: document.getElementById('pm-img').value, 링크: document.getElementById('pm-link').value, 팝업너비: document.getElementById('pm-width').value, 시작일: document.getElementById('pm-start').value, 종료일: document.getElementById('pm-end').value, 사용여부: document.getElementById('pm-active').value };
  fetch(SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'savePopup',data:data}) })
    .then(function(){ showToast('팝업이 저장됐습니다!','ok'); closePopupModal(); setTimeout(loadBanners,1500); });
}

function deletePopupItem(btn) {
  var id = btn.getAttribute('data-id'), title = btn.getAttribute('data-title');
  if (!confirm('[' + title + '] 팝업을 삭제하시겠습니까?')) return;
  if (!SCRIPT_URL) { showToast('Apps Script URL 미설정','warn'); return; }
  fetch(SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'deletePopup',data:{번호:id}}) })
    .then(function(){ showToast('삭제됐습니다','ok'); setTimeout(loadBanners,1500); });
}

// ============================================================
// 공동구매 관리
// ============================================================
var gbAllData = [];
var gbCurrentFilter = 'all';
var gbTimerInterval = null;

function parseDateTime(str){ if(!str) return null; return new Date(str.replace(' ','T')); }
function getGbStatus(g){ var now=new Date(); if(!g.isActive) return 'disabled'; if(g.startAt&&now<g.startAt) return 'upcoming'; if(g.endAt&&now>g.endAt) return 'ended'; return 'active'; }
function getPct(cur,tgt){ if(!tgt) return 0; return Math.min(100,Math.round((cur/tgt)*100)); }
function getRemaining(endAt){
  if(!endAt) return '';
  var diff=endAt-new Date(); if(diff<=0) return '마감';
  var d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
  return (d>0?d+'일 ':'')+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function fmtDateTime(dt){ if(!dt) return '-'; return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'); }

function openGroupBuyModal(){ clearGroupBuyForm(); document.getElementById('gbm-title').textContent='👥 공동구매 등록'; document.getElementById('groupbuy-modal').classList.add('open'); }
function closeGroupBuyModal(){ document.getElementById('groupbuy-modal').classList.remove('open'); }
function clearGroupBuyForm(){ ['gbm-id','gbm-pid','gbm-title-input','gbm-price','gbm-delivery','gbm-start','gbm-end','gbm-desc'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('gbm-target').value='100'; document.getElementById('gbm-current').value='0'; document.getElementById('gbm-active').value='TRUE'; }

function loadGroupBuy(){
  var tw=document.getElementById('gb-tw');
  if(tw) tw.innerHTML='<div class="loading"><div class="lspin">⏳</div><div style="margin-top:10px">불러오는 중...</div></div>';
  var SHEET_ID='1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
  var gbUrl='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent('공동구매')+'&t='+Date.now();
  var prodUrl='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent('상품목록')+'&t='+Date.now();
  function parseCSV(csv){
    var lines=csv.trim().split('\n');
    var headers=lines[0].split(',').map(function(h){ return h.trim().replace(/"/g,''); });
    return lines.slice(1).map(function(line){ var vals=[],cur='',inQ=false; for(var i=0;i<line.length;i++){ var ch=line[i]; if(ch==='"'){inQ=!inQ;} else if(ch===','&&!inQ){vals.push(cur.trim());cur='';} else cur+=ch; } vals.push(cur.trim()); var obj={}; headers.forEach(function(h,i){ obj[h]=(vals[i]||'').replace(/"/g,'').trim(); }); return obj; }).filter(function(r){ return Object.values(r).some(function(v){return v;}); });
  }
  Promise.all([fetch(gbUrl).then(function(r){return r.text();}), fetch(prodUrl).then(function(r){return r.text();})]).then(function(results){
    var gbRows=parseCSV(results[0]), prodRows=parseCSV(results[1]);
    gbAllData=gbRows.map(function(row){
      var prod=prodRows.find(function(p){ return String(p['번호'])===String(row['상품번호']); })||{};
      var g={ id:row['번호']||'', productId:row['상품번호']||'', title:row['제목']||prod['상품명']||'', groupPrice:parseInt(row['공동구매가'])||0, targetQty:parseInt(row['목표수량'])||100, currentQty:parseInt(row['현재참여'])||0, startAt:parseDateTime(row['시작일시']), endAt:parseDateTime(row['종료일시']), deliveryDate:row['배송예정일']||'', isActive:row['사용여부']!=='FALSE', description:row['설명']||'', originalPrice:parseInt(prod['가격'])||0, image:prod['이미지']||'', category:prod['카테고리']||'' };
      g.status=getGbStatus(g); g.pct=getPct(g.currentQty,g.targetQty); return g;
    });
    var active=0,upcoming=0,ended=0,totalQty=0;
    gbAllData.forEach(function(g){ if(g.status==='active') active++; else if(g.status==='upcoming') upcoming++; else if(g.status==='ended') ended++; totalQty+=g.currentQty; });
    var setV=function(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; };
    setV('gb-active-cnt',active); setV('gb-upcoming-cnt',upcoming); setV('gb-ended-cnt',ended); setV('gb-total-qty',totalQty.toLocaleString()+'명');
    setV('gb-cnt-all',gbAllData.length); setV('gb-cnt-active',active); setV('gb-cnt-upcoming',upcoming); setV('gb-cnt-ended',ended);
    renderGroupBuy(gbCurrentFilter);
    if(gbTimerInterval) clearInterval(gbTimerInterval);
    gbTimerInterval=setInterval(function(){ document.querySelectorAll('[id^="gbt-"]').forEach(function(el){ var endMs=parseInt(el.getAttribute('data-end')); if(!endMs) return; var diff=endMs-Date.now(); if(diff<=0){el.textContent='마감완료';el.style.color='#999';return;} el.textContent=getRemaining(new Date(endMs)); }); },1000);
  }).catch(function(){ var tw=document.getElementById('gb-tw'); if(tw) tw.innerHTML='<div class="empty"><div class="empty-ico">⚠️</div><div class="empty-txt">공동구매 시트 없음</div><div class="empty-sub">구글시트에 "공동구매" 시트를 만들어주세요</div></div>'; });
}

function fGroupBuy(filter,el){
  gbCurrentFilter=filter;
  document.querySelectorAll('.stab').forEach(function(t){ t.classList.remove('active'); });
  if(el) el.classList.add('active');
  renderGroupBuy(filter);
}

function renderGroupBuy(filter){
  var tw=document.getElementById('gb-tw'); if(!tw) return;
  var data=filter==='all'?gbAllData:gbAllData.filter(function(g){ return g.status===filter; });
  if(!data.length){ tw.innerHTML='<div class="empty"><div class="empty-ico">👥</div><div class="empty-txt">공동구매 없음</div><div class="empty-sub">➕ 공동구매 추가 버튼으로 등록하세요</div></div>'; return; }
  var statusLabel={
    active:'<span style="background:#e8f5e9;color:#388e3c;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">▶ 진행중</span>',
    upcoming:'<span style="background:#e3f2fd;color:#1565c0;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">⏳ 예정</span>',
    ended:'<span style="background:#f5f5f5;color:#999;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">✅ 마감</span>',
    disabled:'<span style="background:#fce4ec;color:#c62828;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">🚫 비활성</span>'
  };
  var html='<table><thead><tr><th>번호</th><th>상품</th><th>공동구매가</th><th>참여현황</th><th>달성률</th><th>시작일시</th><th>종료일시</th><th>마감까지</th><th>배송예정일</th><th>상태</th><th>관리</th></tr></thead><tbody>';
  data.forEach(function(g){
    var dc=(g.originalPrice&&g.groupPrice<g.originalPrice)?Math.round((1-g.groupPrice/g.originalPrice)*100):0;
    var pctColor=g.pct>=100?'#388e3c':g.pct>=70?'#FF5733':'#1565c0';
    var safeId    = String(g.id).replace(/'/g,'');
    var safeTitle = String(g.title).replace(/'/g,'&#39;').replace(/"/g,'&quot;');
    var manageBtns =
      '<button onclick="editGroupBuyItem(\'' + safeId + '\')" style="padding:4px 9px;font-size:11px;border:1px solid var(--border);border-radius:5px;background:#fff;cursor:pointer;margin-bottom:4px;display:block;width:100%;">✏️ 수정</button>' +
      (g.status === 'active'
        ? '<button onclick="forceEndGroupBuy(\'' + safeId + '\',\'' + safeTitle + '\')" style="padding:4px 9px;font-size:11px;border:none;border-radius:5px;background:#fce4ec;color:#c62828;cursor:pointer;font-weight:700;display:block;width:100%;">🔴 강제마감</button>'
        : '<button onclick="deleteGroupBuyItem(\'' + safeId + '\',\'' + safeTitle + '\')" style="padding:4px 9px;font-size:11px;border:none;border-radius:5px;background:#fee;color:#c0392b;cursor:pointer;display:block;width:100%;">🗑️ 삭제</button>'
      );
    html+='<tr><td style="font-weight:700;">'+g.id+'</td><td><div style="font-weight:600;max-width:160px;">'+g.title+'</div>'+(g.category?'<div style="font-size:11px;color:#999;">'+g.category+'</div>':'')+'</td>'+
      '<td><div style="font-weight:900;color:#FF5733;">'+g.groupPrice.toLocaleString()+'원</div>'+(dc?'<div style="font-size:11px;color:#e53935;">'+dc+'% 할인</div>':'')+(g.originalPrice?'<div style="font-size:11px;color:#bbb;text-decoration:line-through;">'+g.originalPrice.toLocaleString()+'원</div>':'')+'</td>'+
      '<td style="text-align:center;"><strong>'+g.currentQty+'</strong><span style="color:#bbb;"> / '+g.targetQty+'명</span></td>'+
      '<td style="min-width:100px;"><div style="background:#f0f0f0;border-radius:4px;height:8px;overflow:hidden;margin-bottom:4px;"><div style="height:100%;background:'+pctColor+';width:'+g.pct+'%;border-radius:4px;"></div></div><div style="font-size:12px;font-weight:700;color:'+pctColor+';">'+g.pct+'%</div></td>'+
      '<td style="font-size:12px;">'+fmtDateTime(g.startAt)+'</td><td style="font-size:12px;font-weight:700;color:#e53935;">'+fmtDateTime(g.endAt)+'</td>'+
      '<td style="font-size:12px;font-weight:700;color:#e53935;">'+(g.status==='active'?'<span id="gbt-'+g.id+'" data-end="'+(g.endAt?g.endAt.getTime():0)+'" style="font-family:monospace;">'+getRemaining(g.endAt)+'</span>':(g.status==='ended'?'<span style="color:#999;">마감완료</span>':'<span style="color:#1565c0;">아직 시작 전</span>'))+'</td>'+
      '<td style="font-size:12px;">'+(g.deliveryDate?'📦 '+g.deliveryDate:'-')+'</td>'+
      '<td>'+(statusLabel[g.status]||'')+'</td>'+
      '<td style="min-width:80px;">'+manageBtns+'</td></tr>';
  });
  html+='</tbody></table>';
  tw.innerHTML=html;
}

function forceEndGroupBuy(id, title) {
  if (!confirm('[' + title + '] 공동구매를 강제 마감하시겠습니까?\n종료일시가 현재 시각으로 변경됩니다.')) return;
  if (!SCRIPT_URL) { showToast('Apps Script URL 미설정','warn'); return; }
  var now = new Date();
  var nowStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  fetch(SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'saveGroupBuy', data:{ 번호: id, 종료일시: nowStr, 사용여부: 'FALSE' }}) })
    .then(function(){ showToast('강제 마감됐습니다!','ok'); setTimeout(loadGroupBuy,1500); });
}

function editGroupBuyItem(id){
  var g=gbAllData.find(function(x){ return x.id===String(id); }); if(!g) return;
  document.getElementById('gbm-title').textContent='👥 공동구매 수정';
  document.getElementById('gbm-id').value=g.id||''; document.getElementById('gbm-pid').value=g.productId||''; document.getElementById('gbm-title-input').value=g.title||''; document.getElementById('gbm-price').value=g.groupPrice||''; document.getElementById('gbm-target').value=g.targetQty||100; document.getElementById('gbm-current').value=g.currentQty||0; document.getElementById('gbm-delivery').value=g.deliveryDate||''; document.getElementById('gbm-desc').value=g.description||''; document.getElementById('gbm-active').value=g.isActive?'TRUE':'FALSE';
  if(g.startAt){ var s=g.startAt; document.getElementById('gbm-start').value=s.getFullYear()+'-'+String(s.getMonth()+1).padStart(2,'0')+'-'+String(s.getDate()).padStart(2,'0')+'T'+String(s.getHours()).padStart(2,'0')+':'+String(s.getMinutes()).padStart(2,'0'); }
  if(g.endAt){ var e=g.endAt; document.getElementById('gbm-end').value=e.getFullYear()+'-'+String(e.getMonth()+1).padStart(2,'0')+'-'+String(e.getDate()).padStart(2,'0')+'T'+String(e.getHours()).padStart(2,'0')+':'+String(e.getMinutes()).padStart(2,'0'); }
  document.getElementById('groupbuy-modal').classList.add('open');
}

function saveGroupBuy(){
  var pid=document.getElementById('gbm-pid').value.trim(), price=document.getElementById('gbm-price').value.trim(), endDt=document.getElementById('gbm-end').value;
  if(!pid||!price||!endDt){ showToast('상품번호, 공동구매가, 종료일시는 필수입니다','warn'); return; }
  if(!SCRIPT_URL){ showToast('Apps Script URL이 config.js에 설정되어 있지 않습니다','warn'); return; }
  function fmtDt(v){ if(!v) return ''; return v.replace('T',' ').substring(0,16); }
  var data={ 번호:document.getElementById('gbm-id').value||'', 상품번호:pid, 제목:document.getElementById('gbm-title-input').value, 공동구매가:price, 목표수량:document.getElementById('gbm-target').value, 현재참여:document.getElementById('gbm-current').value, 시작일시:fmtDt(document.getElementById('gbm-start').value), 종료일시:fmtDt(endDt), 배송예정일:document.getElementById('gbm-delivery').value, 설명:document.getElementById('gbm-desc').value, 사용여부:document.getElementById('gbm-active').value };
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'saveGroupBuy',data:data})})
    .then(function(){ showToast('공동구매가 저장됐습니다!','ok'); closeGroupBuyModal(); setTimeout(loadGroupBuy,1500); });
}

function deleteGroupBuyItem(id,title){
  if(!confirm('['+title+'] 공동구매를 삭제하시겠습니까?')) return;
  if(!SCRIPT_URL){ showToast('Apps Script URL 미설정','warn'); return; }
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deleteGroupBuy',data:{번호:id}})})
    .then(function(){ showToast('삭제됐습니다','ok'); setTimeout(loadGroupBuy,1500); });
}

// ============================================================
// 대리점 CRUD
// ============================================================
var dealerAllData=[];

function loadDealer(){
  var SHEET_ID='1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
  var url='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent('대리점')+'&t='+Date.now();
  document.getElementById('dealer-tw').innerHTML='<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(url).then(function(r){return r.text();}).then(function(csv){
    dealerAllData=parseAdminCSV(csv);
    var active=0,recruit=0,pause=0;
    dealerAllData.forEach(function(d){ var st=d['상태']||''; if(st==='운영중') active++; else if(st==='모집중') recruit++; else if(st==='일시중지') pause++; });
    document.getElementById('dealer-active').textContent=active; document.getElementById('dealer-recruit').textContent=recruit; document.getElementById('dealer-pause').textContent=pause; document.getElementById('dealer-total').textContent=dealerAllData.length;
    var statusColor={'운영중':'bdg-green','모집중':'bdg-blue','일시중지':'bdg-orange','해지':'bdg-red'};
    document.getElementById('dealer-tw').innerHTML=dealerAllData.length
      ?'<table>'+TH(['ID','대리점명','대표자','연락처','도메인','상태','수수료율','계약기간','관리'])+'<tbody>'+
        dealerAllData.map(function(d){
          return '<tr><td style="font-size:11px;color:var(--gray);">'+d['대리점ID']+'</td><td><strong>'+d['대리점명']+'</strong></td><td>'+(d['대표자명']||'-')+'</td><td>'+(d['연락처']||'-')+'</td><td style="font-size:12px;">'+(d['도메인']||'-')+'</td><td><span class="bdg '+(statusColor[d['상태']]||'bdg-gray')+'">'+(d['상태']||'-')+'</span></td><td>'+(d['수수료율']||'2')+'%</td><td style="font-size:11px;">'+(d['계약일']||'-')+' ~ '+(d['계약종료일']||'')+'</td><td><button class="btn btn-outline" style="font-size:11px;padding:4px 10px;" onclick="editDealer(this)" data-id="'+d['대리점ID']+'">✏️ 수정</button></td></tr>';
        }).join('')+'</tbody></table>'
      :EMPTY('🏬','대리점 없음','➕ 대리점 추가 버튼으로 등록하세요');
  }).catch(function(){ document.getElementById('dealer-tw').innerHTML=EMPTY('🏬','대리점 없음'); });
}

function openDealerModal(){ clearDealerForm(); document.getElementById('dm-title').textContent='🏬 대리점 등록'; document.getElementById('dealer-modal').classList.add('open'); }
function closeDealerModal(){ document.getElementById('dealer-modal').classList.remove('open'); }
function clearDealerForm(){ ['dm-id','dm-fid','dm-name','dm-owner','dm-phone','dm-email','dm-address','dm-domain','dm-start','dm-end','dm-bank','dm-admin-id','dm-admin-pw'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('dm-commission').value='2'; document.getElementById('dm-status').value='모집중'; document.getElementById('dm-color').value='#FF5733'; }

function editDealer(btn){
  var fid=btn.getAttribute('data-id');
  var d=dealerAllData.find(function(x){ return x['대리점ID']===fid; }); if(!d) return;
  document.getElementById('dm-title').textContent='🏬 대리점 수정';
  document.getElementById('dm-id').value=d['대리점ID']||'';
  document.getElementById('dm-fid').value=d['대리점ID']||'';
  document.getElementById('dm-name').value=d['대리점명']||'';
  document.getElementById('dm-owner').value=d['대표자명']||'';
  document.getElementById('dm-phone').value=d['연락처']||'';
  document.getElementById('dm-email').value=d['이메일']||'';
  document.getElementById('dm-address').value=d['주소']||'';
  document.getElementById('dm-domain').value=d['도메인']||'';
  document.getElementById('dm-color').value=d['테마색상']||'#FF5733';
  document.getElementById('dm-start').value=d['계약일']||'';
  document.getElementById('dm-end').value=d['계약종료일']||'';
  document.getElementById('dm-commission').value=d['수수료율']||'2';
  document.getElementById('dm-status').value=d['상태']||'모집중';
  document.getElementById('dm-bank').value=d['정산계좌']||'';
  var adminIdEl = document.getElementById('dm-admin-id'); if(adminIdEl) adminIdEl.value = d['관리자ID'] || d['아이디'] || '';
  var adminPwEl = document.getElementById('dm-admin-pw'); if(adminPwEl) adminPwEl.value = d['관리자PW'] || d['비밀번호'] || '';
  document.getElementById('dealer-modal').classList.add('open');
}

function saveDealer(){
  var fid=document.getElementById('dm-fid').value.trim(), name=document.getElementById('dm-name').value.trim();
  if(!fid||!name){ showToast('대리점 ID와 대리점명은 필수입니다','warn'); return; }
  if(!SCRIPT_URL){ showToast('Apps Script URL이 config.js에 설정되어 있지 않습니다','warn'); return; }
  var data={
    대리점ID:   fid,
    대리점명:   name,
    대표자명:   document.getElementById('dm-owner').value,
    연락처:     document.getElementById('dm-phone').value,
    이메일:     document.getElementById('dm-email').value,
    주소:       document.getElementById('dm-address').value,
    도메인:     document.getElementById('dm-domain').value,
    테마색상:   document.getElementById('dm-color').value,
    계약일:     document.getElementById('dm-start').value,
    계약종료일: document.getElementById('dm-end').value,
    수수료율:   document.getElementById('dm-commission').value,
    상태:       document.getElementById('dm-status').value,
    정산계좌:   document.getElementById('dm-bank').value,
    관리자ID:   (document.getElementById('dm-admin-id') ? document.getElementById('dm-admin-id').value.trim() : ''),
    관리자PW:   (document.getElementById('dm-admin-pw') ? document.getElementById('dm-admin-pw').value.trim() : '')
  };
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'saveDealer',data:data})})
    .then(function(){ showToast('대리점이 저장됐습니다!','ok'); closeDealerModal(); setTimeout(loadDealer,1500); });
}

// ============================================================
// 공지/매뉴얼
// ============================================================
var noticeAllData=[];

function loadNotice(){
  var SHEET_ID='1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
  var url='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent('공지사항')+'&t='+Date.now();
  document.getElementById('notice-list').innerHTML='<div class="loading"><div class="lspin">⏳</div></div>';
  document.getElementById('manual-wrap').innerHTML='<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(url).then(function(r){return r.text();}).then(function(csv){
    noticeAllData=parseAdminCSV(csv);
    var notices=noticeAllData.filter(function(n){ return n['구분']!=='매뉴얼'&&n['사용여부']!=='FALSE'; });
    var manuals=noticeAllData.filter(function(n){ return n['구분']==='매뉴얼'&&n['사용여부']!=='FALSE'; });
    var priColor={'긴급':'#c0392b','중요':'#e67e22','보통':'#666'};
    document.getElementById('notice-list').innerHTML=notices.length
      ?notices.map(function(n){
          return '<div style="padding:14px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:8px;">'+(n['중요도']&&n['중요도']!=='보통'?'<span style="background:'+(n['중요도']==='긴급'?'#fde8e8':'#fef3e2')+';color:'+priColor[n['중요도']||'보통']+';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">'+n['중요도']+'</span>':'')+'<strong style="font-size:14px;">'+n['제목']+'</strong></div><div style="display:flex;gap:6px;"><button class="btn btn-outline" style="font-size:11px;padding:3px 8px;" onclick="editNotice(this)" data-id="'+n['번호']+'">✏️</button><button class="btn" style="font-size:11px;padding:3px 8px;background:#fee;color:#c0392b;border:1px solid #fcc;" onclick="deleteNoticeItem(this)" data-id="'+n['번호']+'" data-title="'+n['제목'].replace(/"/g,'')+'">🗑️</button></div></div><div style="font-size:13px;color:#444;white-space:pre-wrap;">'+n['내용']+'</div><div style="font-size:11px;color:var(--gray);margin-top:6px;">'+n['작성일']+'</div></div>';
        }).join('')
      :EMPTY('📢','공지사항 없음','➕ 공지 등록 버튼으로 추가하세요');
    document.getElementById('manual-wrap').innerHTML=manuals.length
      ?manuals.map(function(m){ return '<details style="border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden;"><summary style="padding:12px 16px;cursor:pointer;font-weight:700;font-size:13px;background:var(--bg-card);">'+m['제목']+'</summary><div style="padding:14px 16px;font-size:13px;color:#444;white-space:pre-wrap;border-top:1px solid var(--border);">'+m['내용']+'</div></details>'; }).join('')
      :EMPTY('📖','운영매뉴얼 없음','구분을 "매뉴얼"로 선택해서 등록하세요');
  }).catch(function(){ document.getElementById('notice-list').innerHTML=EMPTY('📢','공지사항 없음'); document.getElementById('manual-wrap').innerHTML=EMPTY('📖','운영매뉴얼 없음'); });
}

function openNoticeModal(){ clearNoticeForm(); document.getElementById('nm-title').textContent='📢 공지 등록'; document.getElementById('notice-modal').classList.add('open'); }
function closeNoticeModal(){ document.getElementById('notice-modal').classList.remove('open'); }
function clearNoticeForm(){ ['nm-id','nm-title-input','nm-content'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); document.getElementById('nm-type').value='공지'; document.getElementById('nm-priority').value='보통'; document.getElementById('nm-active').value='TRUE'; }

function editNotice(btn){ var id=btn.getAttribute('data-id');
  var n=noticeAllData.find(function(x){ return x['번호']===String(id); }); if(!n) return;
  document.getElementById('nm-title').textContent='📢 공지 수정';
  document.getElementById('nm-id').value=n['번호']||''; document.getElementById('nm-title-input').value=n['제목']||''; document.getElementById('nm-content').value=n['내용']||''; document.getElementById('nm-type').value=n['구분']||'공지'; document.getElementById('nm-priority').value=n['중요도']||'보통'; document.getElementById('nm-active').value=n['사용여부']==='FALSE'?'FALSE':'TRUE';
  document.getElementById('notice-modal').classList.add('open');
}

function saveNotice(){
  var title=document.getElementById('nm-title-input').value.trim(), content=document.getElementById('nm-content').value.trim();
  if(!title||!content){ showToast('제목과 내용은 필수입니다','warn'); return; }
  if(!SCRIPT_URL){ showToast('Apps Script URL이 config.js에 설정되어 있지 않습니다','warn'); return; }
  var now=new Date(); var dateStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  var data={ 번호:document.getElementById('nm-id').value||'', 제목:title, 내용:content, 구분:document.getElementById('nm-type').value, 중요도:document.getElementById('nm-priority').value, 사용여부:document.getElementById('nm-active').value, 작성일:dateStr };
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'saveNotice',data:data})})
    .then(function(){ showToast('공지가 저장됐습니다!','ok'); closeNoticeModal(); setTimeout(loadNotice,1500); });
}

function deleteNoticeItem(btn){ var id=btn.getAttribute('data-id'),title=btn.getAttribute('data-title');
  if(!confirm('['+title+'] 공지를 삭제하시겠습니까?')) return;
  if(!SCRIPT_URL){ showToast('Apps Script URL 미설정','warn'); return; }
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deleteNotice',data:{번호:id}})})
    .then(function(){ showToast('삭제됐습니다','ok'); setTimeout(loadNotice,1500); });
}

function openManualModal(){ document.getElementById('nm-type').value='매뉴얼'; openNoticeModal(); document.getElementById('nm-title').textContent='📖 매뉴얼 등록'; }

// ✅ 대리점 비밀번호 자동생성
function genDealerPw() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var pw = '';
  for (var i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  var el = document.getElementById('dm-admin-pw');
  if (el) { el.value = pw; el.type = 'text'; }
  showToast('비밀번호 자동생성: ' + pw, 'ok');
}

// ============================================================
// 설정
// ============================================================
function loadSettings(){
  if(typeof CONFIG==='undefined') return;
  var s = CONFIG.STORE || {};

  var pgUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('PG설정') + '&t=' + Date.now();
  fetch(pgUrl).then(function(r){ return r.text(); }).then(function(csv) {
    var rows = parseAdminCSV(csv);
    var hq = rows.find(function(r){ return (r['대리점ID']||'').trim()==='' || r['대리점ID']==='본사'; }) || rows[0] || {};
    var pgProvEl = document.getElementById('pg-provider'); if(pgProvEl) pgProvEl.value = hq['PG사'] || CONFIG.PG.PROVIDER || '';
    var pgMidEl  = document.getElementById('pg-mid');      if(pgMidEl)  pgMidEl.value  = hq['MID']  || CONFIG.PG.MERCHANT_ID || '';
    var pgKeyEl  = document.getElementById('pg-apikey');   if(pgKeyEl)  pgKeyEl.value  = hq['API키'] || '';
    var pgSecEl  = document.getElementById('pg-secret');   if(pgSecEl)  pgSecEl.value  = hq['시크릿키'] || '';
    var pgUrlEl  = document.getElementById('pg-script-url'); if(pgUrlEl) pgUrlEl.value = hq['ScriptURL'] || CONFIG.PG.API_PROXY_URL || '';
  }).catch(function() {
    var pgProvEl = document.getElementById('pg-provider'); if(pgProvEl) pgProvEl.value = CONFIG.PG.PROVIDER || '';
    var pgMidEl  = document.getElementById('pg-mid');      if(pgMidEl)  pgMidEl.value  = CONFIG.PG.MERCHANT_ID || '';
    var pgUrlEl  = document.getElementById('pg-script-url'); if(pgUrlEl) pgUrlEl.value = CONFIG.PG.API_PROXY_URL || '';
  });

  document.getElementById('settings-wrap').innerHTML =
    [['브랜드명',s.BRAND||'-'],['상호',s.NAME||'-'],['전화',s.PHONE||'-'],['이메일',s.EMAIL||'-'],['주소',s.ADDRESS||'-'],
     ['PG사',CONFIG.PG.PROVIDER||'미설정'],['Merchant ID',CONFIG.PG.MERCHANT_ID||'미설정'],
     ['Cloudinary Cloud',CLOUDINARY_CLOUD],['Upload Preset',CLOUDINARY_PRESET]
    ].map(function(r){
      return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--gray);font-weight:600;">'+r[0]+'</span><span style="font-weight:500;'+(r[1]==='미설정'?'color:var(--red)':'')+'">'+r[1]+'</span></div>';
    }).join('');

  document.getElementById('links-wrap').innerHTML =
    [['🌐 쇼핑몰','https://gasway.shop'],['📦 GitHub','https://github.com/min323300/myshop'],
     ['☁️ Cloudinary','https://console.cloudinary.com'],
     ['📊 Google Sheets','https://docs.google.com/spreadsheets/d/'+SHEET_ID],
     ['⚙️ Apps Script','https://script.google.com']
    ].map(function(r){
      return '<div style="padding:10px 0;border-bottom:1px solid var(--border);"><a href="'+r[1]+'" target="_blank" style="color:var(--accent);font-weight:600;font-size:13px;">'+r[0]+'</a><div style="font-size:11px;color:var(--gray);margin-top:2px;">'+r[1]+'</div></div>';
    }).join('');
}

function savePGSettings(){
  var provider=document.getElementById('pg-provider').value, mid=document.getElementById('pg-mid').value.trim(), apikey=document.getElementById('pg-apikey').value.trim(), secret=document.getElementById('pg-secret').value.trim(), scriptUrl=document.getElementById('pg-script-url').value.trim();
  var statusEl=document.getElementById('pg-status');
  if(!scriptUrl){ showToast('Apps Script URL을 입력하세요','warn'); return; }
  statusEl.innerHTML='<span style="color:var(--gray);">⏳ 저장 중...</span>';
  var data={ '대리점ID':'본사','PG사':provider,'MID':mid,'API키':apikey,'시크릿키':secret,'ScriptURL':scriptUrl };
  fetch(scriptUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'savePGConfig',data:data})}).then(function(){
    if(typeof CONFIG!=='undefined'){ CONFIG.PG.PROVIDER=provider; CONFIG.PG.MERCHANT_ID=mid; CONFIG.PG.API_PROXY_URL=scriptUrl; }
    SCRIPT_URL = scriptUrl;
    statusEl.innerHTML='<span style="color:var(--green);">✅ 저장 완료! (구글시트 PG설정 시트에 반영됨)</span>';
    showToast('PG 설정이 저장됐습니다!','ok');
    setTimeout(loadSettings,500);
  }).catch(function(){ statusEl.innerHTML='<span style="color:var(--red);">❌ 저장 실패 - Apps Script URL을 확인하세요</span>'; });
}

// ============================================================
// 상품 등록/수정 모달
// ============================================================
function openProdModal(prod){
  editingId=null; clearForm();
  document.getElementById('m-title').textContent='📦 상품 등록';
  if(prod){ editingId=prod.id; document.getElementById('m-title').textContent='✏️ 상품 수정 — '+prod.name; fillForm(prod); }
  document.getElementById('prod-modal').classList.add('open');
  pvImg();
}
function closeProdModal(){ document.getElementById('prod-modal').classList.remove('open'); }
document.getElementById('prod-modal').addEventListener('click',function(e){ if(e.target===this) closeProdModal(); });

function clearForm(){
  ['f-id','f-name','f-supp','f-subcat','f-price','f-sale','f-stock','f-img','f-det1','f-det2','f-cert','f-yt','f-desc','f-colors','f-sizes','f-caution','f-specs','f-delivery-fee','f-delivery-free'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  var dType = document.getElementById('f-delivery-type'); if(dType) dType.value='택배배송';
  document.getElementById('f-cat').value=''; document.getElementById('f-badge').value=''; document.getElementById('f-feat').checked=false; document.getElementById('f-active').checked=true; document.getElementById('f-active-lbl').textContent='✅ 판매중'; document.getElementById('img-pv').innerHTML=''; document.getElementById('disc-val').textContent='-';
  ['img-pv-0','img-pv-1','img-pv-2','img-pv-3'].forEach(function(id){ document.getElementById(id).innerHTML=''; });
}

function fillForm(p){
  var sv=function(id,v){ var el=document.getElementById(id); if(el) el.value=v||''; };
  sv('f-id',p.id); sv('f-name',p.name); sv('f-supp',p.supplier); sv('f-subcat',p.subCategory); sv('f-price',p.price); sv('f-sale',p.salePrice||''); sv('f-stock',p.stock); sv('f-yt',p.youtube); sv('f-desc',p.description); sv('f-colors',p.colors); sv('f-sizes',p.sizes); sv('f-caution',p.caution); sv('f-specs',p.specs);
  var dType = document.getElementById('f-delivery-type'); if(dType) dType.value = p.deliveryType || '택배배송';
  sv('f-delivery-fee',  p.deliveryFee  !== undefined ? p.deliveryFee  : '3000');
  sv('f-delivery-free', p.deliveryFree !== undefined ? p.deliveryFree : '50000');
  document.getElementById('f-cat').value=p.category||''; document.getElementById('f-badge').value=p.badge||''; document.getElementById('f-feat').checked=p.isFeatured||false; document.getElementById('f-active').checked=p.isActive!==false; document.getElementById('f-active-lbl').textContent=p.isActive!==false?'✅ 판매중':'🔴 숨김';
  sv('f-img',p.image||''); sv('f-det1',p.detailImages||''); sv('f-det2',p.detailImages2||''); sv('f-cert',p.certImage||'');
  calcDisc(); updateDeliveryPreview(); pvImg();
}

document.getElementById('f-active').addEventListener('change',function(){
  document.getElementById('f-active-lbl').textContent=this.checked?'✅ 판매중':'🔴 숨김';
});

function calcDisc(){
  var p=parseInt(document.getElementById('f-price').value)||0, s=parseInt(document.getElementById('f-sale').value)||0;
  document.getElementById('disc-val').textContent=(p>0&&s>0&&s<p)?Math.round((1-s/p)*100)+'% 할인':'-';
}

function updateDeliveryPreview(){
  var preview=document.getElementById('delivery-preview'); if(!preview) return;
  var dType = document.getElementById('f-delivery-type'); if(!dType) return;
  var type = dType.value;
  var fee  = parseInt(document.getElementById('f-delivery-fee').value) || 0;
  var free = parseInt(document.getElementById('f-delivery-free').value) || 0;
  if(type==='무료배송' || fee===0){
    preview.textContent='✅ 무료배송';
    preview.style.color='#1a7f4b';
  } else if(free>0){
    preview.textContent=fee.toLocaleString()+'원 ('+free.toLocaleString()+'원 이상 무료)';
    preview.style.color='#666';
  } else {
    preview.textContent=fee.toLocaleString()+'원';
    preview.style.color='#666';
  }
}

// ============================================================
// ☁️ 이미지 업로드 → Cloudinary
// ============================================================
function uploadImg(input,targetId,pvId){
  var file=input.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){ var pvEl=document.getElementById(pvId); if(pvEl) pvEl.innerHTML='<img src="'+e.target.result+'" style="max-width:100%;max-height:120px;border-radius:6px;margin-top:6px;">'; };
  reader.readAsDataURL(file);
  var statusId = (pvId && (pvId.startsWith('bm-')||pvId.startsWith('pm-'))) ? 'bm-upload-status' : 'upload-status';
  var statusEl = document.getElementById(statusId) || document.getElementById('upload-status');
  if (!statusEl) return;
  statusEl.style.display='block'; statusEl.style.background='#fffbeb'; statusEl.style.border='1px solid #fde68a'; statusEl.style.color='#92400e';
  statusEl.innerHTML='<span class="uploading-spinner"></span> Cloudinary 업로드 중... '+file.name;
  var formData=new FormData();
  formData.append('file',file); formData.append('upload_preset',CLOUDINARY_PRESET);
  fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',{method:'POST',body:formData})
  .then(function(r){ return r.json(); })
  .then(function(res){
    if(res.secure_url){
      document.getElementById(targetId).value=res.secure_url;
      statusEl.style.background='#f0fdf4'; statusEl.style.border='1px solid #86efac'; statusEl.style.color='#166534';
      statusEl.innerHTML='✅ 업로드 완료! URL이 자동 입력되었습니다.';
      setTimeout(function(){ statusEl.style.display='none'; },3000); pvImg();
    } else {
      statusEl.style.background='#fef2f2'; statusEl.style.border='1px solid #fca5a5'; statusEl.style.color='#991b1b';
      statusEl.innerHTML='❌ 업로드 실패: '+(res.error&&res.error.message?res.error.message:JSON.stringify(res));
    }
  }).catch(function(err){ statusEl.style.background='#fef2f2'; statusEl.style.border='1px solid #fca5a5'; statusEl.style.color='#991b1b'; statusEl.innerHTML='❌ 오류: '+err.message; });
}

function pvImg(){
  var fields=[{id:'f-img',label:'대표'},{id:'f-det1',label:'상세1'},{id:'f-det2',label:'상세2'},{id:'f-cert',label:'인증'}];
  document.getElementById('img-pv').innerHTML=fields.map(function(f){
    var v=document.getElementById(f.id).value.trim(); if(!v) return '';
    var url=v.startsWith('http')?v:IMG_BASE+v;
    return '<div class="img-pv-item"><img src="'+url+'" onerror="this.style.opacity=\'0.15\'"><div class="img-pv-label">'+f.label+'</div></div>';
  }).join('');
}

// ============================================================
// 상품 저장
// ============================================================
function saveProd(){
  var id=document.getElementById('f-id').value.trim(), name=document.getElementById('f-name').value.trim(), cat=document.getElementById('f-cat').value, price=document.getElementById('f-price').value;
  if(!id||!name||!cat||!price){ showToast('필수 항목 미입력 (번호/상품명/카테고리/가격)','err'); return; }
  var dTypeEl = document.getElementById('f-delivery-type');
  var dFeeEl  = document.getElementById('f-delivery-fee');
  var dFreeEl = document.getElementById('f-delivery-free');
  var deliveryType = dTypeEl ? dTypeEl.value : '택배배송';
  var deliveryFee  = dFeeEl  ? (dFeeEl.value || '0') : '0';
  var deliveryFree = dFreeEl ? (dFreeEl.value || '0') : '0';
  var data={
    번호:id, 상품명:name, 공급사:document.getElementById('f-supp').value.trim(),
    가격:price, 할인가:document.getElementById('f-sale').value||'0',
    카테고리:cat, 세부카테고리:document.getElementById('f-subcat').value.trim(),
    이미지:document.getElementById('f-img').value.trim(),
    상품설명:document.getElementById('f-desc').value.trim(),
    재고:document.getElementById('f-stock').value||'0',
    뱃지:document.getElementById('f-badge').value,
    추천여부:document.getElementById('f-feat').checked?'TRUE':'FALSE',
    사용여부:document.getElementById('f-active').checked?'TRUE':'FALSE',
    판매수량:'0', 별점평균:'0', 리뷰수:'0',
    상세이미지:document.getElementById('f-det1').value.trim(),
    상세이미지2:document.getElementById('f-det2').value.trim(),
    색상:document.getElementById('f-colors').value.trim(),
    사이즈:document.getElementById('f-sizes').value.trim(),
    유튜브:document.getElementById('f-yt').value.trim(),
    상세스펙:document.getElementById('f-specs').value.trim(),
    인증이미지:document.getElementById('f-cert').value.trim(),
    주의사항:document.getElementById('f-caution').value.trim(),
    배송방법: deliveryType,
    배송비:   deliveryFee,
    무료배송조건: deliveryFree
  };
  if(!SCRIPT_URL){ showToast('Apps Script URL 미설정 - 구글시트에 직접 입력해주세요','warn'); closeProdModal(); return; }
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:editingId?'updateProduct':'saveProduct',data:data})}).then(function(){
    showToast((editingId?'상품 수정':'상품 등록')+'됐습니다! 구글시트 확인 후 새로고침하세요.','ok'); closeProdModal(); setTimeout(loadProds,2000);
  }).catch(function(e){ showToast('저장 오류: '+e.message,'err'); });
}

function editProd(id){
  var p=allProds.find(function(p){ return String(p.id)===String(id); });
  if(p){ go('prod-list',document.querySelector('[onclick*="prod-list"]')); setTimeout(function(){ openProdModal(p); },100); }
}
function toggleProd(id,name,isActive){
  if(!confirm('['+name+'] 상품을 '+(isActive?'숨김':'판매 재개')+' 처리하시겠습니까?')) return;
  if(!SCRIPT_URL){ showToast('구글시트에서 사용여부를 직접 수정하세요','warn'); return; }
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'updateProductStatus',data:{번호:id,사용여부:isActive?'FALSE':'TRUE'}})}).then(function(){ showToast('상태 변경됐습니다. 새로고침하세요.','ok'); setTimeout(loadProds,2000); });
}

// ============================================================
// 유틸
// ============================================================
function TH(cols){ return '<thead><tr>'+cols.map(function(c){ return '<th>'+c+'</th>'; }).join('')+'</tr></thead>'; }
function EMPTY(ico,txt,sub){ return '<div class="empty"><div class="empty-ico">'+ico+'</div><div class="empty-txt">'+txt+'</div>'+(sub?'<div class="empty-sub">'+sub+'</div>':'')+'</div>'; }
function showToast(msg,type){ var t=document.getElementById('toast'); t.textContent=msg; t.className='toast'+(type?' '+type:''); t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },3500); }

document.querySelectorAll('.prod-sec-hd').forEach(function(hd){
  hd.addEventListener('click',function(){
    this.classList.toggle('collapsed');
    this.querySelector('.prod-sec-toggle').textContent=this.classList.contains('collapsed')?'∨':'∧';
  });
});
