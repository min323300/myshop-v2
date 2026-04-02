// ============================================================
// dealer-orders.js — 주문/배송 관리
// ============================================================

var allOrders      = [];
var filteredOrders = [];
var curTab         = '';
var curOrderId     = '';
var curSelectedStatus = '';

function loadOrders() {
  if(!DEALER) return;
  document.getElementById('orders-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('주문')).then(function(r){return r.text();}).then(function(csv){
    var all = parseCSV(csv);
    allOrders = all.filter(function(o){ return o['대리점ID']===DEALER.id; });
    updateTabCounts(allOrders);
    applyFilter();
  }).catch(function(){ document.getElementById('orders-tw').innerHTML=EMPTY('🛒','주문 없음'); });
}

function updateTabCounts(list) {
  var statuses=['주문완료','결제완료','상품준비','배송중','배송완료','취소'];
  document.getElementById('tc-all').textContent = list.length;
  statuses.forEach(function(s){
    var el=document.getElementById('tc-'+s);
    if(el) el.textContent=list.filter(function(o){return o['주문상태']===s;}).length;
  });
}

function setTab(status, el) {
  curTab = status;
  document.querySelectorAll('.stab').forEach(function(t){t.classList.remove('active');});
  if(el) el.classList.add('active');
  applyFilter();
}

function applyFilter() {
  var search = (document.getElementById('order-search').value||'').toLowerCase();
  var from   = document.getElementById('order-date-from').value;
  var to     = document.getElementById('order-date-to').value;
  filteredOrders = allOrders.filter(function(o){
    var matchTab    = !curTab || o['주문상태']===curTab;
    var matchSearch = !search
      || (o['주문번호']||'').toLowerCase().includes(search)
      || getField(o,['받는분','수취인명','주문자명','주문자']).toLowerCase().includes(search)
      || getField(o,['받는분연락처','연락처','전화번호']).includes(search)
      || getField(o,['주문상품명','상품명']).toLowerCase().includes(search);
    var matchFrom = !from || (o['주문일시']||'')>=from;
    var matchTo   = !to   || (o['주문일시']||'')<=to+'T99:99';
    return matchTab && matchSearch && matchFrom && matchTo;
  });
  renderOrders(filteredOrders);
}

function clearOrderFilter() {
  document.getElementById('order-search').value='';
  document.getElementById('order-date-from').value='';
  document.getElementById('order-date-to').value='';
  curTab='';
  document.querySelectorAll('.stab').forEach(function(t){t.classList.remove('active');});
  document.querySelector('.stab').classList.add('active');
  filteredOrders=allOrders;
  renderOrders(filteredOrders);
}

function renderOrders(list) {
  var el  = document.getElementById('orders-tw');
  var cnt = document.getElementById('order-count');
  if(cnt) cnt.textContent='총 '+list.length+'건';
  if(!list.length){ el.innerHTML=EMPTY('🛒','주문 없음','필터를 변경하거나 새로고침 해보세요'); return; }
  var sorted = list.slice().sort(function(a,b){return b['주문일시']>a['주문일시']?1:-1;});
  el.innerHTML = '<table>'+TH(['주문번호','주문일시','주문상품','수량','금액','수취인','연락처','📦 송장번호','주문상태','빠른변경','상세'])+'<tbody>'
    +sorted.map(function(o){
      var stat     = o['주문상태']||'주문완료';
      var prodName = getField(o,['주문상품명','상품명','품명','주문상품','상품','item'])||'-';
      var receiver = getField(o,['받는분','수취인명','수취인','주문자명','주문자','성명','이름'])||'-';
      var phone    = getField(o,['받는분연락처','연락처','전화번호','휴대폰','수취인연락처'])||'-';
      var tracking = o['송장번호']||'';
      var carrier  = o['택배사']||'';
      var safeNo   = String(o['주문번호']||'').replace(/'/g,"\\'");
      var trackCell = tracking
        ? '<div style="font-size:11px;"><span style="color:#888;">'+carrier+'</span><br><strong style="color:var(--accent);">'+tracking+'</strong></div>'
          +'<button onclick="openDTrackingModal(\''+safeNo+'\')" style="margin-top:3px;padding:2px 6px;font-size:10px;border:1px solid #ddd;border-radius:4px;background:#f5f5f5;cursor:pointer;">✏️ 수정</button>'
        : '<button onclick="openDTrackingModal(\''+safeNo+'\')" style="padding:3px 9px;font-size:11px;border:none;border-radius:5px;background:#e8f5e9;color:#1b5e20;cursor:pointer;font-weight:600;">📦 입력</button>';
      return '<tr>'
        +'<td style="font-size:11px;font-weight:600;">'+(o['주문번호']||'-')+'</td>'
        +'<td style="font-size:11px;">'+(o['주문일시']||'-').substring(0,16)+'</td>'
        +'<td><div style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+prodName+'">'+prodName+'</div></td>'
        +'<td style="text-align:center;">'+(o['수량']||o['qty']||1)+'</td>'
        +'<td style="font-weight:700;color:var(--accent);">'+fmt(o['결제금액']||o['금액'])+'</td>'
        +'<td>'+receiver+'</td>'
        +'<td style="font-size:12px;">'+phone+'</td>'
        +'<td style="min-width:100px;">'+trackCell+'</td>'
        +'<td><span class="os os-'+stat+'">'+stat+'</span></td>'
        +'<td><select class="quick-status-sel" onchange="quickStatusChange(this,\''+o['주문번호']+'\')">'
          +'<option value="">변경...</option>'
          +['주문완료','결제완료','상품준비','배송중','배송완료','취소'].map(function(s){
            return '<option value="'+s+'"'+(stat===s?' selected':'')+'>'+s+'</option>';
          }).join('')
          +'</select></td>'
        +'<td><button class="btn btn-outline btn-sm" onclick="viewOrder(\''+o['주문번호']+'\')">상세</button></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}

function openDTrackingModal(orderId) {
  var order    = allOrders.find(function(o){return o['주문번호']===orderId;});
  if(!order) return;
  var tracking = order['송장번호']||'';
  var carrier  = order['택배사']||'';
  var old = document.getElementById('d-tracking-modal');
  if(old) old.remove();
  var carriers = ['CJ대한통운','한진택배','롯데택배','우체국택배','로젠택배','쿠팡로켓','직접배송'];
  var opts = carriers.map(function(c){return '<option value="'+c+'"'+(carrier===c?' selected':'')+'>'+c+'</option>';}).join('');
  var modal = document.createElement('div');
  modal.id='d-tracking-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML='<div style="background:#fff;border-radius:12px;padding:28px;width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.2);">'
    +'<h3 style="margin:0 0 16px;font-size:16px;">📦 송장번호 입력</h3>'
    +'<p style="font-size:12px;color:#888;margin:0 0 16px;">주문번호: '+orderId+'</p>'
    +'<label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">택배사</label>'
    +'<select id="dt-carrier" style="width:100%;padding:9px;border:1px solid #ddd;border-radius:7px;font-size:13px;margin-bottom:14px;"><option value="">택배사 선택</option>'+opts+'</select>'
    +'<label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">송장번호</label>'
    +'<input id="dt-tracking" value="'+tracking+'" placeholder="예: 1234567890123" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ddd;border-radius:7px;font-size:13px;margin-bottom:20px;">'
    +'<div style="display:flex;gap:10px;">'
      +'<button onclick="saveDTracking(\''+orderId+'\')" style="flex:1;padding:10px;background:#1e2336;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:600;cursor:pointer;">저장</button>'
      +'<button onclick="document.getElementById(\'d-tracking-modal\').remove()" style="flex:1;padding:10px;background:#f5f5f5;color:#333;border:none;border-radius:7px;font-size:14px;cursor:pointer;">취소</button>'
    +'</div></div>';
  document.body.appendChild(modal);
  document.getElementById('dt-tracking').focus();
}

function saveDTracking(orderId) {
  var carrier  = document.getElementById('dt-carrier').value;
  var tracking = document.getElementById('dt-tracking').value.trim();
  if(!carrier||!tracking){ alert('택배사와 송장번호를 모두 입력해주세요.'); return; }
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',
    body:JSON.stringify({action:'updateOrderStatus',data:{주문번호:orderId,주문상태:'배송중',송장번호:tracking,택배사:carrier,대리점ID:DEALER.id}})
  }).then(function(){
    var order=allOrders.find(function(o){return o['주문번호']===orderId;});
    if(order){order['송장번호']=tracking;order['택배사']=carrier;order['주문상태']='배송중';}
    document.getElementById('d-tracking-modal').remove();
    showToast('송장번호가 저장됐습니다 (배송중 처리)','ok');
    updateTabCounts(allOrders); applyFilter();
  }).catch(function(){showToast('저장 중 오류가 발생했습니다','');});
}

function quickStatusChange(sel, orderId) {
  var newStatus = sel.value;
  if(!newStatus) return;
  if(!confirm('['+orderId+'] 주문을 "'+newStatus+'"으로 변경하시겠습니까?')){ sel.value=''; return; }
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',
    body:JSON.stringify({action:'updateOrderStatus',data:{주문번호:orderId,주문상태:newStatus,대리점ID:DEALER.id}})
  }).then(function(){
    showToast('주문번호 '+orderId+' → ['+newStatus+'] 변경됐습니다','ok');
    var order=allOrders.find(function(o){return o['주문번호']===orderId;});
    if(order) order['주문상태']=newStatus;
    updateTabCounts(allOrders); applyFilter();
  }).catch(function(){showToast('저장 중 오류가 발생했습니다',''); sel.value='';});
}

function viewOrder(orderId) {
  var o = allOrders.find(function(x){return x['주문번호']===orderId;});
  if(!o) return;
  curOrderId=''; curSelectedStatus='';
  curOrderId = orderId;
  var body     = document.getElementById('order-detail-body');
  var prodName = getField(o,['주문상품명','상품명','품명','상품'])||'-';
  var receiver = getField(o,['받는분','수취인명','수취인','주문자명','주문자'])||'-';
  var phone    = getField(o,['받는분연락처','연락처','전화번호','휴대폰'])||'-';
  var address  = getField(o,['배송주소','주소','배송지'])||'-';
  var zipcode  = getField(o,['우편번호','zip','postcode'])||'-';
  var memo     = getField(o,['메모','배송메모','요청사항'])||'없음';
  var fields = [
    ['주문번호',o['주문번호']],['주문일시',o['주문일시']||o['작성일시']],
    ['상품명',prodName],['수량',o['수량']||1],['결제금액',fmt(o['결제금액']||o['금액']||0)],['결제방법',o['결제방법']||'-'],
    ['주문자명',o['주문자명']||'-'],['연락처(주문자)',o['연락처']||'-'],
    ['받는분',receiver],['받는분연락처',phone],['배송주소',address],['우편번호',zipcode],
    ['메모',memo],['현재 주문상태',o['주문상태']||'주문완료'],['기존 송장번호',o['송장번호']||'미입력']
  ];
  body.innerHTML = '<div style="background:#f8f9ff;border-radius:10px;padding:4px 14px;margin-bottom:4px;">'
    +fields.map(function(r){
      var isStatus = r[0]==='현재 주문상태';
      return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eef;font-size:13px;">'
        +'<span style="color:var(--gray);font-weight:600;min-width:100px;">'+r[0]+'</span>'
        +'<span style="font-weight:500;text-align:right;">'+(isStatus?'<span class="os os-'+r[1]+'">'+r[1]+'</span>':r[1])+'</span></div>';
    }).join('')+'</div>';
  var stat = o['주문상태']||'주문완료';
  document.querySelectorAll('.status-btn').forEach(function(btn){
    btn.classList.remove('selected');
    if(btn.textContent.trim().replace('/반품','')===stat.replace('/반품','')) btn.classList.add('selected');
  });
  curSelectedStatus = stat;
  document.getElementById('modal-tracking').value = o['송장번호']||'';
  document.getElementById('modal-carrier').value  = o['택배사']||'';
  document.getElementById('modal-memo').value     = '';
  document.getElementById('order-modal').classList.add('active');
}

function selectStatus(status, btn) {
  document.querySelectorAll('.status-btn').forEach(function(b){b.classList.remove('selected');});
  btn.classList.add('selected');
  curSelectedStatus = status;
  var hint = document.getElementById('tracking-hint-label');
  if(status==='배송중'){ hint.textContent='(배송중 선택됨 — 송장번호를 입력해주세요)'; hint.style.color='var(--accent)'; document.getElementById('modal-tracking').focus(); }
  else { hint.textContent='(선택 사항)'; hint.style.color='var(--gray)'; }
}

function saveOrderStatus() {
  if(!curOrderId){ showToast('주문 정보 오류','warn'); return; }
  if(!curSelectedStatus){ showToast('변경할 상태를 선택해주세요','warn'); return; }
  var tracking = document.getElementById('modal-tracking').value.trim();
  var carrier  = document.getElementById('modal-carrier').value;
  var memo     = document.getElementById('modal-memo').value.trim();
  var btn      = document.getElementById('order-save-btn');
  btn.textContent='⏳ 저장 중...'; btn.disabled=true;
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',
    body:JSON.stringify({action:'updateOrderStatus',data:{주문번호:curOrderId,주문상태:curSelectedStatus,송장번호:tracking,택배사:carrier,처리메모:memo,대리점ID:DEALER.id,처리자:DEALER.name,처리일시:new Date().toISOString()}})
  }).then(function(){
    showToast('주문번호 '+curOrderId+' → ['+curSelectedStatus+'] 저장됐습니다','ok');
    var order=allOrders.find(function(o){return o['주문번호']===curOrderId;});
    if(order){order['주문상태']=curSelectedStatus; if(tracking) order['송장번호']=tracking; if(carrier) order['택배사']=carrier;}
    updateTabCounts(allOrders); applyFilter(); closeOrderModal();
  }).catch(function(){showToast('저장 중 오류가 발생했습니다','');})
  .finally(function(){btn.textContent='💾 상태 저장'; btn.disabled=false;});
}

function closeOrderModal(){
  document.getElementById('order-modal').classList.remove('active');
  curOrderId=''; curSelectedStatus='';
}

function downloadExcel(){
  if(!filteredOrders.length){ showToast('다운로드할 주문이 없습니다','warn'); return; }
  var headers=['주문번호','주문일시','상품명','수량','결제금액','수취인명','연락처','배송주소','우편번호','배송메모','주문상태','송장번호','택배사'];
  var rows=[headers];
  filteredOrders.forEach(function(o){ rows.push(headers.map(function(h){ return '"'+(o[h]||'').replace(/"/g,'""')+'"'; })); });
  var csv='\uFEFF'+rows.map(function(r){return r.join(',');}).join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download=DEALER.name+'_주문내역_'+new Date().toISOString().split('T')[0]+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('엑셀 파일 다운로드 완료!','ok');
}
