// ============================================================
// dealer-products.js — 본사상품 조회 · 내 상품 관리 · 위탁판매
// ============================================================

var hqAllProducts = [];
var myProducts    = [];
var optionCount   = 0;

// ── 본사 상품 조회 ────────────────────────────────────────────
function loadHqProducts() {
  document.getElementById('hq-products-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('상품목록')).then(function(r){return r.text();}).then(function(csv){
    hqAllProducts = parseCSV(csv).filter(function(p){ return p['사용여부']!=='FALSE'&&p['상품명']; });
    var cats = [...new Set(hqAllProducts.map(function(p){ return p['카테고리']; }).filter(Boolean))];
    var catSel = document.getElementById('hq-cat-filter');
    catSel.innerHTML = '<option value="">전체 카테고리</option>'
      +cats.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
    renderHqProducts(hqAllProducts);
  }).catch(function(){
    document.getElementById('hq-products-tw').innerHTML = EMPTY('📦','상품 로드 실패');
  });
}

function filterHqProducts(q) {
  var cat = document.getElementById('hq-cat-filter').value;
  var filtered = hqAllProducts.filter(function(p){
    return (!q||(p['상품명']||'').includes(q)) && (!cat||p['카테고리']===cat);
  });
  renderHqProducts(filtered);
}

function renderHqProducts(list) {
  var el = document.getElementById('hq-products-tw');
  if(!list.length){ el.innerHTML=EMPTY('📦','상품 없음'); return; }
  el.innerHTML = '<table>'+TH(['#','이미지','상품명','카테고리','정가','할인가','뱃지','상태'])+'<tbody>'
    +list.map(function(p){
      var dc = (parseInt(p['가격'])&&parseInt(p['할인가'])) ? Math.round((1-parseInt(p['할인가'])/parseInt(p['가격']))*100) : 0;
      return '<tr>'
        +'<td style="color:var(--gray);font-size:12px;">'+p['번호']+'</td>'
        +'<td><img class="thumb" src="'+(p['이미지']||'https://picsum.photos/80?random='+p['번호'])+'" onerror="this.src=\'https://picsum.photos/80\'"></td>'
        +'<td>'+p['상품명']+'<span class="hq-badge">본사</span></td>'
        +'<td>'+(p['카테고리']||'-')+'</td>'
        +'<td>'+fmt(p['가격'])+'</td>'
        +'<td style="color:var(--accent);font-weight:700;">'+(parseInt(p['할인가'])>0?fmt(p['할인가'])+(dc?' <span style="font-size:10px;color:#e53935;">-'+dc+'%</span>':''):'-')+'</td>'
        +'<td>'+(p['뱃지']?'<span class="bdg bdg-'+p['뱃지'].toLowerCase()+'">'+p['뱃지']+'</span>':'-')+'</td>'
        +'<td><span class="bdg '+(p['사용여부']!=='FALSE'?'bdg-new':'bdg-sale')+'">'+(p['사용여부']!=='FALSE'?'판매중':'숨김')+'</span></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}

// ── 내 상품 관리 ──────────────────────────────────────────────
function loadMyProducts() {
  if(!DEALER) return;
  document.getElementById('my-products-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('대리점상품')).then(function(r){return r.text();}).then(function(csv){
    myProducts = parseCSV(csv).filter(function(p){
      return (p['대리점ID']||'').toString().trim() === (DEALER.id||'').toString().trim();
    });
    renderMyProducts();
  }).catch(function(){
    document.getElementById('my-products-tw').innerHTML = EMPTY('📦','상품 없음','상품 등록 버튼으로 추가하세요');
  });
}

function renderMyProducts() {
  var el = document.getElementById('my-products-tw');
  if(!myProducts.length){ el.innerHTML=EMPTY('📦','등록된 상품 없음','➕ 상품 등록 버튼으로 추가하세요'); return; }
  el.innerHTML = '<table>'+TH(['#','이미지','상품명','카테고리','정가','할인가','원가','뱃지','상태','위탁판매','관리'])+'<tbody>'
    +myProducts.map(function(p){
      return '<tr>'
        +'<td style="color:var(--gray);font-size:12px;">'+p['번호']+'</td>'
        +'<td><img class="thumb" src="'+(p['이미지']||'https://picsum.photos/80?random='+p['번호'])+'" onerror="this.src=\'https://picsum.photos/80\'"></td>'
        +'<td>'+p['상품명']+'<span class="dealer-badge">내상품</span></td>'
        +'<td>'+(p['카테고리']||'-')+'</td>'
        +'<td>'+fmt(p['가격'])+'</td>'
        +'<td style="color:var(--accent);font-weight:700;">'+(parseInt(p['할인가'])>0?fmt(p['할인가']):'-')+'</td>'
        +'<td style="color:var(--gray);font-size:12px;">'+(parseInt(p['원가'])>0?fmt(p['원가']):'-')+'</td>'
        +'<td>'+(p['뱃지']?'<span class="bdg bdg-'+p['뱃지'].toLowerCase()+'">'+p['뱃지']+'</span>':'-')+'</td>'
        +'<td><span class="bdg '+(p['사용여부']!=='FALSE'?'bdg-new':'bdg-sale')+'">'+(p['사용여부']!=='FALSE'?'판매중':'숨김')+'</span></td>'
        +'<td><button onclick="toggleConsignment(\''+p['번호']+'\',\''+(p['위탁여부']==='TRUE'?'FALSE':'TRUE')+'\')" '
          +'style="padding:4px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;'
          +'background:'+(p['위탁여부']==='TRUE'?'#fce4ec':'#e3f2fd')+';'
          +'color:'+(p['위탁여부']==='TRUE'?'#c62828':'#1565c0')+';cursor:pointer;font-weight:600;">'
          +(p['위탁여부']==='TRUE'?(p['본사승인']==='TRUE'?'✅승인':'⏳대기'):'🤝위탁신청')
          +'</button></td>'
        +'<td><div style="display:flex;gap:6px;">'
          +'<button class="btn btn-outline btn-sm" onclick="editMyProduct(this)" data-id="'+p['번호']+'">✏️</button>'
          +'<button class="btn btn-sm" style="background:#fee;color:#c0392b;border:1px solid #fcc;" onclick="deleteMyProduct(this)" data-id="'+p['번호']+'" data-name="'+p['상품명'].replace(/"/g,'')+'">🗑️</button>'
        +'</div></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}

// ── 상품 등록/수정 모달 ───────────────────────────────────────
function openMyProdModal(){
  clearMyProdForm();
  document.getElementById('mpm-title').textContent='📦 상품 등록';
  document.getElementById('my-prod-modal').classList.add('active');
}
function closeMyProdModal(){ document.getElementById('my-prod-modal').classList.remove('active'); }

function clearMyProdForm(){
  ['mpm-id','mpm-name','mpm-price','mpm-sale','mpm-cost','mpm-img','mpm-img2','mpm-img3','mpm-img4','mpm-detail-imgs','mpm-colors','mpm-sizes','mpm-desc','mpm-stock','mpm-delivery-fee'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('mpm-category').value='';
  document.getElementById('mpm-badge').value='';
  document.getElementById('mpm-featured').value='TRUE';
  document.getElementById('mpm-active').value='TRUE';
  document.getElementById('mpm-delivery-type').value='무료';
  document.getElementById('mpm-delivery-days').value='1~3일';
  document.getElementById('discount-preview').style.display='none';
  document.getElementById('options-wrap').innerHTML='';
  optionCount=0;
  ['prev-img1','prev-img2','prev-img3','prev-img4'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
}

function editMyProduct(btn){
  var id = btn.getAttribute('data-id');
  var p  = myProducts.find(function(x){ return x['번호']===id; });
  if(!p) return;
  document.getElementById('mpm-title').textContent='📦 상품 수정';
  document.getElementById('mpm-id').value        = p['번호']    || '';
  document.getElementById('mpm-name').value      = p['상품명']  || '';
  document.getElementById('mpm-category').value  = p['카테고리']|| '';
  document.getElementById('mpm-price').value     = p['가격']    || '';
  document.getElementById('mpm-sale').value      = p['할인가']  || '';
  document.getElementById('mpm-cost').value      = p['원가']    || '';
  document.getElementById('mpm-img').value       = p['이미지']  || '';
  document.getElementById('mpm-desc').value      = p['상품설명']|| '';
  document.getElementById('mpm-stock').value     = p['재고']    || '';
  document.getElementById('mpm-badge').value     = p['뱃지']    || '';
  document.getElementById('mpm-featured').value  = p['추천여부']|| 'TRUE';
  document.getElementById('mpm-active').value    = p['사용여부']==='FALSE'?'FALSE':'TRUE';
  document.getElementById('mpm-img2').value      = p['이미지2'] || '';
  document.getElementById('mpm-img3').value      = p['이미지3'] || '';
  document.getElementById('mpm-img4').value      = p['이미지4'] || '';
  document.getElementById('mpm-detail-imgs').value = p['상세이미지']|| '';
  document.getElementById('mpm-delivery-days').value = p['배송일']|| '1~3일';
  var deliveryFee = p['배송비']||'무료';
  document.getElementById('mpm-delivery-type').value = deliveryFee==='무료'?'무료':'유료';
  if(deliveryFee!=='무료'){
    document.getElementById('mpm-delivery-fee').value   = deliveryFee.replace('원','');
    document.getElementById('mpm-delivery-fee').disabled = false;
  }
  document.getElementById('mpm-colors').value = p['색상']||'';
  document.getElementById('mpm-sizes').value  = p['사이즈']||'';
  previewImg('mpm-img','prev-img1');
  calcDiscount();
  document.getElementById('my-prod-modal').classList.add('active');
}

// 이미지 업로드
function uploadCloudinary(input, targetId, previewId, spinnerId) {
  var file = input.files[0];
  if(!file) return;
  var spinner = document.getElementById(spinnerId);
  if(spinner) spinner.style.display='inline';
  var fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',{method:'POST',body:fd})
    .then(function(r){return r.json();}).then(function(d){
      if(d.secure_url){
        document.getElementById(targetId).value = d.secure_url;
        previewImg(targetId, previewId);
        showToast('이미지 업로드 완료!','ok');
      } else { showToast('업로드 실패',''); }
      if(spinner) spinner.style.display='none';
      input.value='';
    }).catch(function(){ showToast('업로드 오류',''); if(spinner) spinner.style.display='none'; });
}

function previewImg(inputId, imgId) {
  var url = document.getElementById(inputId).value.trim();
  var img = document.getElementById(imgId);
  if(url){ img.src=url; img.style.display='block'; img.onerror=function(){ img.style.display='none'; }; }
  else img.style.display='none';
}

function calcDiscount() {
  var price = parseInt(document.getElementById('mpm-price').value)||0;
  var sale  = parseInt(document.getElementById('mpm-sale').value)||0;
  var el    = document.getElementById('discount-preview');
  if(price>0&&sale>0&&sale<price){
    var dc = Math.round((1-sale/price)*100);
    el.innerHTML = '💡 할인율: <strong style="color:var(--accent);">'+dc+'%</strong> · 절감액: <strong>'+(price-sale).toLocaleString()+'원</strong>';
    el.style.display='block';
  } else { el.style.display='none'; }
}

function toggleDeliveryFee() {
  var type = document.getElementById('mpm-delivery-type').value;
  var fee  = document.getElementById('mpm-delivery-fee');
  fee.disabled = (type==='무료');
  fee.style.background = (type==='무료')?'#f5f5f5':'';
}

function addOption() {
  optionCount++;
  var wrap = document.getElementById('options-wrap');
  var div  = document.createElement('div');
  div.id = 'opt-row-'+optionCount;
  div.style.cssText='display:grid;grid-template-columns:1fr 2fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center;';
  div.innerHTML = '<input class="fi" placeholder="옵션명" id="opt-name-'+optionCount+'">'
    +'<input class="fi" placeholder="옵션값" id="opt-val-'+optionCount+'">'
    +'<input class="fi" type="number" placeholder="추가금액" id="opt-price-'+optionCount+'">'
    +'<button type="button" onclick="removeOption('+optionCount+')" style="background:#fee;border:1px solid #fcc;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:14px;">🗑️</button>';
  wrap.appendChild(div);
}
function removeOption(n){ var el=document.getElementById('opt-row-'+n); if(el) el.remove(); }
function getOptions() {
  var opts=[];
  document.querySelectorAll('[id^="opt-row-"]').forEach(function(row){
    var n = row.id.replace('opt-row-','');
    var name  = (document.getElementById('opt-name-'+n)||{}).value||'';
    var val   = (document.getElementById('opt-val-'+n)||{}).value||'';
    var price = (document.getElementById('opt-price-'+n)||{}).value||'0';
    if(name&&val) opts.push(name+':'+val+(price&&price!=='0'?'(+'+price+'원)':''));
  });
  return opts.join(' / ');
}

function toggleSection(hd) {
  var body   = hd.nextElementSibling;
  var toggle = hd.querySelector('.prod-sec-toggle');
  if(body.style.display==='none'){ body.style.display=''; if(toggle) toggle.textContent='∧'; }
  else { body.style.display='none'; if(toggle) toggle.textContent='∨'; }
}

function saveMyProduct(){
  if(!DEALER){ showToast('로그인 필요','warn'); return; }
  var name  = document.getElementById('mpm-name').value.trim();
  var price = document.getElementById('mpm-price').value.trim();
  var img   = document.getElementById('mpm-img').value.trim();
  if(!name||!price){ showToast('상품명과 정가는 필수입니다','warn'); return; }
  if(!img){ showToast('대표 이미지 URL을 입력하세요','warn'); return; }

  var data = {
    번호:      document.getElementById('mpm-id').value||'',
    상품명:    name,
    카테고리:  document.getElementById('mpm-category').value,
    가격:      price,
    할인가:    document.getElementById('mpm-sale').value||0,
    원가:      document.getElementById('mpm-cost').value||0,
    이미지:    img,
    이미지2:   document.getElementById('mpm-img2').value||'',
    이미지3:   document.getElementById('mpm-img3').value||'',
    이미지4:   document.getElementById('mpm-img4').value||'',
    상세이미지: document.getElementById('mpm-detail-imgs').value||'',
    상품설명:  document.getElementById('mpm-desc').value,
    색상:      document.getElementById('mpm-colors').value||'',
    사이즈:    document.getElementById('mpm-sizes').value||'',
    옵션:      getOptions(),
    배송비:    document.getElementById('mpm-delivery-type').value==='무료'
                 ? '무료' : document.getElementById('mpm-delivery-fee').value+'원',
    배송일:    document.getElementById('mpm-delivery-days').value,
    재고:      document.getElementById('mpm-stock').value||0,
    뱃지:      document.getElementById('mpm-badge').value,
    추천여부:  document.getElementById('mpm-featured').value,
    사용여부:  document.getElementById('mpm-active').value,
    대리점ID:  DEALER.id
  };
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',body:JSON.stringify({action:'saveDealerProduct',data:data})})
    .then(function(){ showToast('상품이 저장됐습니다!','ok'); closeMyProdModal(); setTimeout(loadMyProducts,1500); });
}

function deleteMyProduct(btn){
  var id   = btn.getAttribute('data-id');
  var name = btn.getAttribute('data-name');
  if(!confirm('['+name+'] 상품을 삭제하시겠습니까?')) return;
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',body:JSON.stringify({action:'deleteDealerProduct',data:{번호:id,대리점ID:DEALER.id}})})
    .then(function(){ showToast('삭제됐습니다','ok'); setTimeout(loadMyProducts,1500); });
}

// ── 위탁판매 ─────────────────────────────────────────────────
function loadConsignment() {
  if(!DEALER) return;
  document.getElementById('consignment-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('대리점상품')).then(function(r){return r.text();}).then(function(csv){
    var all     = parseCSV(csv);
    var myProds = all.filter(function(p){
      return (p['대리점ID']||'').toString().trim() === (DEALER.id||'').toString().trim();
    });
    var pending  = myProds.filter(function(p){ return p['위탁여부']==='TRUE'&&p['본사승인']!=='TRUE'&&p['본사승인']!=='FALSE'; }).length;
    var approved = myProds.filter(function(p){ return p['위탁여부']==='TRUE'&&p['본사승인']==='TRUE'; }).length;
    var other    = myProds.filter(function(p){ return !p['위탁여부']||p['위탁여부']==='FALSE'||p['본사승인']==='FALSE'; }).length;

    document.getElementById('cs-total').textContent    = myProds.length;
    document.getElementById('cs-pending').textContent  = pending;
    document.getElementById('cs-approved').textContent = approved;
    document.getElementById('cs-rejected').textContent = other;

    var el = document.getElementById('consignment-tw');
    if(!myProds.length){ el.innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">등록된 상품이 없습니다</div>'; return; }

    el.innerHTML = '<table>'+TH(['#','이미지','상품명','카테고리','정가','원가','위탁신청','본사승인'])+'<tbody>'
      +myProds.map(function(p){
        var isC=p['위탁여부']==='TRUE', apr=p['본사승인']==='TRUE', rej=p['본사승인']==='FALSE';
        var status = isC
          ? (apr?'<span style="background:#e8f5e9;color:#2e7d32;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">✅ 승인완료</span>'
              : rej?'<span style="background:#fce4ec;color:#c62828;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">❌ 거절</span>'
              : '<span style="background:#fff8e1;color:#f57f17;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:700;">⏳ 승인대기</span>')
          : '<span style="background:#f5f5f5;color:#aaa;padding:3px 9px;border-radius:12px;font-size:11px;">미신청</span>';
        return '<tr>'
          +'<td style="color:var(--gray);font-size:12px;">'+p['번호']+'</td>'
          +'<td><img class="thumb" src="'+(p['이미지']||'https://picsum.photos/80?random='+p['번호'])+'" onerror="this.src=\'https://picsum.photos/80\'"></td>'
          +'<td style="font-weight:600;">'+p['상품명']+'</td>'
          +'<td>'+(p['카테고리']||'-')+'</td>'
          +'<td>'+fmt(p['가격'])+'</td>'
          +'<td style="color:var(--gray);">'+(parseInt(p['원가'])>0?fmt(p['원가']):'-')+'</td>'
          +'<td>'+status+'<br>'
            +'<button onclick="toggleConsignment(\''+p['번호']+'\',\''+(isC?'FALSE':'TRUE')+'\')" '
            +'style="margin-top:4px;padding:3px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;'
            +'background:'+(isC?'#fce4ec':'#e3f2fd')+';color:'+(isC?'#c62828':'#1565c0')+';cursor:pointer;font-weight:600;">'
            +(isC?'❌ 신청취소':'🤝 위탁신청')+'</button></td>'
          +'<td style="font-size:12px;color:var(--gray);">'+(isC?(apr?'본사 노출중':rej?'본사 거절':'검토중'):'-')+'</td>'
          +'</tr>';
      }).join('')+'</tbody></table>';
  }).catch(function(){
    document.getElementById('consignment-tw').innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">데이터 로드 실패</div>';
  });
}

function toggleConsignment(productNo, newValue) {
  if(!DEALER) return;
  if(!confirm(newValue==='TRUE'
    ?'위탁판매를 신청하시겠습니까?\n본사 승인 후 다른 대리점 쇼핑몰에도 노출됩니다.'
    :'위탁판매 신청을 취소하시겠습니까?')) return;
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',
    body:JSON.stringify({action:'saveConsignmentProduct',data:{번호:productNo,대리점ID:DEALER.id,위탁여부:newValue,본사승인:''}})
  }).then(function(){
    showToast(newValue==='TRUE'?'✅ 위탁판매 신청 완료! 본사 승인을 기다려주세요.':'신청이 취소됐습니다.','ok');
    setTimeout(function(){ loadConsignment(); loadMyProducts(); },1500);
  }).catch(function(){ showToast('오류가 발생했습니다',''); });
}
