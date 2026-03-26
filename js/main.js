// ============================================================
// 대리점 URL 헬퍼 - dealer 파라미터 자동 유지
// ============================================================
function dealerUrl(url) {
  var dealerId = new URLSearchParams(window.location.search).get('dealer');
  if (!dealerId) return url;
  var sep = url.includes('?') ? '&' : '?';
  return url + sep + 'dealer=' + dealerId;
}

// ============================================================
// 배너 컨트롤러
// ============================================================
var BC = {
  n: 0, c: 0, t: null,
  load: function() {
    var SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
    var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('배너');
    fetch(url).then(function(r){ return r.text(); }).then(function(csv) {
      var lines = csv.trim().split('\n').slice(1);
      var banners = [];
      lines.forEach(function(line) {
        var cols = [];
        var cur = '', inQ = false;
        for (var i = 0; i < line.length; i++) {
          var ch = line[i];
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        cols.push(cur.trim());
        var active = (cols[9] || '').toUpperCase();
        if (active === 'TRUE') {
          banners.push({ title:cols[1]||'', sub:cols[2]||'', img:cols[3]||'', bg:cols[4]||'#FF5733', color:cols[5]||'#ffffff', link:cols[6]||'#', btn:cols[7]||'보기' });
        }
      });
      BC.build(banners.length ? banners : BC.defaults());
    }).catch(function(){ BC.build(BC.defaults()); });
  },
  defaults: function() {
    return [
      { title:'담누리마켓 오픈!', sub:'세상의 모든 것을 담누리마켓에서', bg:'#FF5733', color:'#fff', link:dealerUrl('products.html'), btn:'쇼핑 시작하기' },
      { title:'오늘의 특가 최대 50%', sub:'매일 새로운 특가 상품을 만나보세요', bg:'#2D3561', color:'#fff', link:dealerUrl('products.html?filter=sale'), btn:'특가 보기' },
      { title:'가맹점 모집 중', sub:'함께 성장하는 파트너를 찾습니다', bg:'#0A7E8C', color:'#fff', link:'#', btn:'가맹 문의' }
    ];
  },
  build: function(banners) {
    var slider = document.getElementById('banner-slider');
    var dotsEl = document.getElementById('banner-dots');
    if (!slider || !dotsEl) return;
    slider.innerHTML = ''; dotsEl.innerHTML = '';
    BC.n = banners.length;
    banners.forEach(function(b, i) {
      var slide = document.createElement('div');
      slide.style.cssText = 'min-width:100%;height:200px;flex-shrink:0;background:'+b.bg+';display:flex;align-items:center;justify-content:center;';
      if (b.img) slide.style.background = 'url('+b.img+') center/cover no-repeat';
      slide.innerHTML = '<div style="text-align:center;color:'+b.color+';">'
        +'<h2 style="font-size:22px;font-weight:900;margin-bottom:8px;text-shadow:0 1px 3px rgba(0,0,0,0.3)">'+b.title+'</h2>'
        +'<p style="font-size:13px;margin-bottom:14px;opacity:0.9;">'+b.sub+'</p>'
        +'<a href="'+b.link+'" style="background:rgba(255,255,255,0.95);color:'+b.bg+';padding:8px 22px;border-radius:25px;font-weight:700;font-size:13px;text-decoration:none;">'+b.btn+'</a>'
        +'</div>';
      slider.appendChild(slide);
      var dot = document.createElement('button');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;border:none;cursor:pointer;padding:0;background:'+(i===0?'#fff':'rgba(255,255,255,0.5)');
      dot.setAttribute('data-i', i);
      dot.onclick = function(){ BC.go(+this.getAttribute('data-i')); };
      dotsEl.appendChild(dot);
    });
    clearInterval(BC.t);
    BC.t = setInterval(function(){ BC.next(); }, 5000);
  },
  go: function(i) {
    if (!BC.n) return;
    BC.c = (i + BC.n) % BC.n;
    var slider = document.getElementById('banner-slider');
    if (slider) slider.style.transform = 'translateX(-' + (BC.c*100) + '%)';
    var dots = document.getElementById('banner-dots').children;
    for (var j = 0; j < dots.length; j++) dots[j].style.background = j===BC.c ? '#fff' : 'rgba(255,255,255,0.5)';
  },
  prev: function() { clearInterval(BC.t); BC.go(BC.c-1); BC.t=setInterval(function(){BC.next();},5000); },
  next: function() { BC.go(BC.c+1); }
};

// ============================================================
// 타이머
// ============================================================
function startTimer() {
  function upd() {
    var now = new Date(), mid = new Date(); mid.setHours(24,0,0,0);
    var d = Math.floor((mid-now)/1000);
    var h = document.getElementById('timer-h');
    var m = document.getElementById('timer-m');
    var s = document.getElementById('timer-s');
    if (h) h.textContent = String(Math.floor(d/3600)).padStart(2,'0');
    if (m) m.textContent = String(Math.floor((d%3600)/60)).padStart(2,'0');
    if (s) s.textContent = String(d%60).padStart(2,'0');
  }
  upd(); setInterval(upd, 1000);
}

// ============================================================
// 상품 카드 생성
// ============================================================
function mkCard(p) {
  var pr = p.salePrice || p.price;
  var dc = p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
  var pj = JSON.stringify(p).replace(/"/g,'&quot;');
  return '<div class="product-card" onclick="location.href=dealerUrl(\'product.html?id='+p.id+'\')">'
    +'<div class="product-img-wrap">'
    +'<img src="'+p.image+'" alt="'+p.name+'" loading="lazy" onerror="this.src=\'https://picsum.photos/400/400?random='+p.id+'\'">'
    +(p.badge?'<span class="product-badge badge-'+p.badge.toLowerCase()+'">'+p.badge+'</span>':'')
    +'<button class="product-wish" onclick="event.stopPropagation();this.textContent=this.textContent===\'❤️\'?\'🤍\':\'❤️\'">🤍</button>'
    +'<button class="product-quick-add" onclick="event.stopPropagation();Cart.add('+pj+')">🛒 빠른 담기</button>'
    +'</div><div class="product-info">'
    +'<div class="product-category">'+p.category+'</div>'
    +'<div class="product-name">'+p.name+'</div>'
    +'<div class="product-price"><span class="price-sale">'+pr.toLocaleString()+'원</span>'
    +(p.salePrice?'<span class="price-original">'+p.price.toLocaleString()+'원</span>':'')
    +(dc?'<span class="price-discount">'+dc+'%</span>':'')
    +'</div></div></div>';
}

// ============================================================
// ✅ 공동구매 카드 (실제 데이터 + 실시간 카운트다운)
// ============================================================
function mkGroup(g) {
  var pr = g.groupPrice || g.salePrice || g.price || g.originalPrice || 0;
  var orig = g.originalPrice || g.price || 0;
  var dc = (orig && pr && pr < orig) ? Math.round((1-pr/orig)*100) : 0;
  var pct = g.pct || 0;
  var timerId = 'gb-timer-' + g.id;

  // 종료일시 포맷
  var endStr = '';
  if (g.endAt) {
    var ed = g.endAt;
    endStr = ed.getFullYear() + '-'
      + String(ed.getMonth()+1).padStart(2,'0') + '-'
      + String(ed.getDate()).padStart(2,'0') + ' '
      + String(ed.getHours()).padStart(2,'0') + ':'
      + String(ed.getMinutes()).padStart(2,'0');
  }

  // 배송예정일
  var delivStr = g.deliveryDate ? '📦 ' + g.deliveryDate + ' 배송 예정' : '';

  var html = '<div class="group-buy-card" onclick="location.href=dealerUrl(\'product.html?id='+g.productId+'\')">'
    +'<img src="'+g.image+'" class="group-buy-img" alt="'+g.name+'" loading="lazy" onerror="this.src=\'https://picsum.photos/400/400?random=1\'">'
    +'<div class="group-buy-info">'
    +'<span class="group-buy-badge">👥 공동구매</span>'
    +'<div class="group-buy-name">'+g.name+'</div>'

    // 달성 바
    +'<div class="group-buy-bar"><div class="group-buy-fill" style="width:'+pct+'%"></div></div>'
    +'<div class="group-buy-pct">'
    +'<span style="color:#4CAF50;font-weight:700">'+pct+'% 달성</span>'
    +'<span>목표 '+g.targetQty+'명</span>'
    +'</div>'

    // 실시간 카운트다운
    +(endStr ? '<div style="margin-top:6px;font-size:12px;color:#e53935;font-weight:700;display:flex;align-items:center;gap:4px;">'
      +'⏰ 마감까지 <span id="'+timerId+'" data-end="'+(g.endAt?g.endAt.getTime():0)+'">계산중...</span>'
      +'</div>' : '')

    // 배송 예정일
    +(delivStr ? '<div style="font-size:11px;color:#666;margin-top:3px;">'+delivStr+'</div>' : '')

    // 가격
    +'<div class="group-buy-price">'
    +'<span class="group-buy-sale">'+pr.toLocaleString()+'원</span>'
    +(orig && orig !== pr ? '<span class="group-buy-original">'+orig.toLocaleString()+'원</span>' : '')
    +(dc ? '<span class="group-buy-discount">'+dc+'% 할인</span>' : '')
    +'</div>'
    +'</div></div>';

  return html;
}

// ============================================================
// 공동구매 카운트다운 타이머 시작
// ============================================================
function startGroupTimers() {
  function tick() {
    var timers = document.querySelectorAll('[id^="gb-timer-"]');
    timers.forEach(function(el) {
      var endMs = parseInt(el.getAttribute('data-end'));
      if (!endMs) { el.textContent = ''; return; }
      var diff = endMs - Date.now();
      if (diff <= 0) { el.textContent = '마감'; el.style.color = '#999'; return; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      el.textContent = (d > 0 ? d + '일 ' : '')
        + String(h).padStart(2,'0') + ':'
        + String(m).padStart(2,'0') + ':'
        + String(s).padStart(2,'0');
    });
  }
  tick();
  setInterval(tick, 1000);
}

function showP(id, arr, type) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!arr||!arr.length) { el.innerHTML='<p style="color:#999;padding:20px;grid-column:1/-1">상품이 없습니다</p>'; return; }
  var h='';
  for(var i=0;i<arr.length;i++) h += type==='g' ? mkGroup(arr[i]) : mkCard(arr[i]);
  el.innerHTML = h;
  if (type === 'g') startGroupTimers();
}

// ============================================================
// 드롭다운 네비 - 카테고리 시트 기준으로 9개 모두 표시
// ============================================================
function buildNav(products) {
  try {
    var nav = document.getElementById('main-nav');
    if (!nav) return;

    // ✅ 카테고리 시트에서 전체 목록 로드
    CategoryAPI.getMain().then(function(categories) {
      // 상품 기준 서브카테고리 맵 (있으면 드롭다운)
      var subMap = {};
      for (var i=0;i<products.length;i++) {
        var cat=(products[i].category||'').trim();
        var sub=(products[i].subCategory||'').trim();
        if(!cat) continue;
        if(!subMap[cat]) subMap[cat]=[];
        if(sub&&subMap[cat].indexOf(sub)===-1) subMap[cat].push(sub);
      }

      categories.forEach(function(c) {
        var cn = c.name.trim();
        var icon = c.icon || '';
        var subs = subMap[cn] || [];
        var wrap=document.createElement('div'); wrap.className='nav-item-wrap';
        var btn=document.createElement('button');
        btn.className='nav-item'+(subs.length?' has-sub':'');
        btn.textContent=icon+' '+cn; btn.setAttribute('data-c',cn);
        btn.onclick=function(){location.href=dealerUrl('products.html?category='+encodeURIComponent(this.getAttribute('data-c')));};
        wrap.appendChild(btn);
        if(subs.length){
          var dd=document.createElement('div'); dd.className='nav-dropdown';
          var ab=document.createElement('button'); ab.className='nav-dropdown-item'; ab.textContent='✦ 전체보기'; ab.setAttribute('data-c',cn);
          ab.onclick=function(e){e.stopPropagation();location.href=dealerUrl('products.html?category='+encodeURIComponent(this.getAttribute('data-c')));};
          dd.appendChild(ab);
          for(var s=0;s<subs.length;s++){
            var sb=document.createElement('button'); sb.className='nav-dropdown-item'; sb.textContent=subs[s];
            sb.setAttribute('data-c',cn); sb.setAttribute('data-s',subs[s]);
            sb.onclick=function(e){e.stopPropagation();location.href=dealerUrl('products.html?category='+encodeURIComponent(this.getAttribute('data-c'))+'&sub='+encodeURIComponent(this.getAttribute('data-s')));};
            dd.appendChild(sb);
          }
          wrap.appendChild(dd);
        }
        nav.appendChild(wrap);
      });
      // 🔴 라이브 메뉴 추가
      var liveWrap = document.createElement('div');
      liveWrap.className = 'nav-item-wrap';
      var liveBtn = document.createElement('button');
      liveBtn.className = 'nav-item';
      liveBtn.textContent = '🔴 라이브';
      liveBtn.style.cssText = 'color:#e85a2b;font-weight:700;';
      liveBtn.onclick = function(){ location.href = dealerUrl('live.html'); };
      liveWrap.appendChild(liveBtn);
      nav.appendChild(liveWrap);
    }).catch(function(e){ console.log('카테고리 nav 로드 실패:',e); });
  } catch(e){ console.log('nav err:',e); }
}

// ============================================================
// 앱 시작
// ============================================================
function runApp() {
  try { Cart.init(); } catch(e){}
  try { BC.load(); } catch(e){ try{ BC.build(BC.defaults()); }catch(e2){} }
  try { startTimer(); } catch(e){}

  try {
    var sn = document.getElementById('store-name');
    if (sn && typeof CONFIG !== 'undefined') sn.textContent = CONFIG.STORE.BRAND || CONFIG.STORE.NAME;
  } catch(e){}

  try { setTimeout(function(){ Popup.loadAndShow(); }, 800); } catch(e){}

  // 일반 상품 섹션
  ProductAPI.getAll().then(function(products) {
    buildNav(products);
    var best = products.filter(function(p){ return p.badge==='BEST'||p.isFeatured; }).slice(0,4);
    showP('best-products', best.length ? best : products.slice(0,4));
    var nw = products.filter(function(p){ return p.badge==='NEW'; }).slice(0,4);
    showP('new-products', nw.length ? nw : products.slice(2,6));
    var sale = products.filter(function(p){ return p.salePrice>0; }).slice(0,4);
    showP('sale-products', sale.length ? sale : products.slice(0,4));
    var flash = products.filter(function(p){ return p.salePrice>0; })
      .sort(function(a,b){ return (1-b.salePrice/b.price)-(1-a.salePrice/a.price); }).slice(0,4);
    showP('flash-products', flash.length ? flash : products.slice(0,4));
  }).catch(function(e){ console.error('상품 로드 실패:',e); });

  // ✅ 공동구매 섹션 (구글시트 실제 데이터)
  GroupBuyAPI.getActive().then(function(groups) {
    var el = document.getElementById('group-products');
    if (!el) return;
    if (!groups.length) {
      el.innerHTML = '<p style="color:#999;padding:20px;grid-column:1/-1">진행중인 공동구매가 없습니다</p>';
      return;
    }
    var h = '';
    groups.slice(0,4).forEach(function(g){ h += mkGroup(g); });
    el.innerHTML = h;
    startGroupTimers();
  }).catch(function(e){
    console.log('공동구매 로드 실패:', e);
  });
}

if(document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', function() { runApp(); loadBizInfo(); });
} else {
  runApp();
  loadBizInfo();
}

// ============================================================
// 사업자정보 로드
// ============================================================
function loadBizInfo() {
  var SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
  var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('사업자정보');
  fetch(url).then(function(r){ return r.text(); }).then(function(csv) {
    var lines = csv.trim().split('\n');
    if (lines.length < 2) return;
    var cols = [];
    var cur = '', inQ = false;
    var line = lines[1];
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    // 사업자정보 시트 컬럼: 상호|사업자번호|대표|주소|전화|이메일|도메인|연도|브랜드명|통신판매업
    var rawBrand = (cols[8]||'').trim();
    var biz = {
      name: cols[0]||'담누리마켓', regNo: cols[1]||'', ceo: cols[2]||'',
      address: cols[3]||'', phone: cols[4]||'1588-0000', email: cols[5]||'',
      domain: cols[6]||'', year: cols[7]||new Date().getFullYear(),
      brand: rawBrand || '담누리마켓',  // 브랜드명 없으면 담누리마켓 고정
      mailOrder: cols[9]||''
    };
    applyBizInfo(biz);
  }).catch(function(e){ console.log('사업자정보 로드 실패:', e); });
}

function applyBizInfo(biz) {
  // 대리점 URL 파라미터가 있으면 브랜드명 관련 요소는 건드리지 않음
  var isDealer = !!(new URLSearchParams(window.location.search).get('dealer'));

  if (!isDealer) {
    var sn = document.getElementById('store-name');
    if (sn) sn.textContent = biz.brand;
    var fsn = document.getElementById('footer-store-name');
    if (fsn) fsn.textContent = '🏪 ' + biz.brand;
    var fc = document.getElementById('footer-copy');
    if (fc) fc.textContent = '© '+biz.year+' '+biz.brand+'. All rights reserved.';
  }

  if (typeof CONFIG !== 'undefined') {
    CONFIG.STORE.BRAND = biz.brand; CONFIG.STORE.NAME = biz.name;
    CONFIG.STORE.PHONE = biz.phone; CONFIG.STORE.EMAIL = biz.email;
  }

  // 사업자 정보(주소, 대표, 사업자번호)는 대리점도 본사 것 그대로 표시
  var fb = document.getElementById('footer-biz');
  if (fb) {
    var parts = [];
    if (biz.name) parts.push('상호: '+biz.name);
    if (biz.regNo) parts.push('사업자번호: '+biz.regNo);
    if (biz.ceo) parts.push('대표: '+biz.ceo);
    if (biz.mailOrder) parts.push('통신판매업: '+biz.mailOrder);
    fb.textContent = parts.join(' | ');
  }
  var fa = document.getElementById('footer-addr');
  if (fa) {
    var ap = [];
    if (biz.address) ap.push('주소: '+biz.address);
    if (biz.phone) ap.push('TEL: '+biz.phone);
    if (biz.email) ap.push('EMAIL: '+biz.email);
    fa.textContent = ap.join(' | ');
  }
  var fp = document.getElementById('footer-phone'); if (fp) fp.textContent = '📞 '+biz.phone;
  var fe = document.getElementById('footer-email'); if (fe&&biz.email) fe.textContent = '📧 '+biz.email;
}
