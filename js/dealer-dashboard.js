// ============================================================
// dealer-dashboard.js — 대시보드
// ============================================================

function loadDashboard() {
  if(!DEALER) return;
  document.getElementById('dash-sub').textContent = DEALER.name + ' 대리점 대시보드';

  Promise.all([
    fetch(sheetUrl('대리점상품')).then(function(r){return r.text();}),
    fetch(sheetUrl('주문')).then(function(r){return r.text();}),
    fetch(sheetUrl('리뷰')).then(function(r){return r.text();}),
    fetch(sheetUrl('공지사항')).then(function(r){return r.text();})
  ]).then(function(results){
    var myProds = parseCSV(results[0]).filter(function(p){
      return (p['대리점ID']||'').toString().trim() === (DEALER.id||'').toString().trim();
    });
    var allOrd   = parseCSV(results[1]);
    var myOrders = allOrd.filter(function(o){ return o['대리점ID']===DEALER.id; });

    var today     = new Date().toISOString().split('T')[0];
    var thisMonth = new Date().toISOString().substring(0,7);

    var todayOrders = myOrders.filter(function(o){ return (o['주문일시']||'').startsWith(today); });
    var monthSales  = myOrders
      .filter(function(o){ return (o['주문일시']||'').startsWith(thisMonth); })
      .reduce(function(s,o){ return s+(parseInt(o['결제금액'])||0); }, 0);

    var myReviews = parseCSV(results[2]).filter(function(r){ return r['대리점ID']===DEALER.id; });

    document.getElementById('dash-orders').textContent   = todayOrders.length;
    document.getElementById('dash-sales').textContent    = monthSales.toLocaleString()+'원';
    document.getElementById('dash-products').textContent = myProds.length;
    document.getElementById('dash-reviews').textContent  = myReviews.length;

    // 최근 주문 5건
    var recentEl = document.getElementById('dash-recent-orders');
    var recent   = myOrders.sort(function(a,b){ return b['주문일시']>a['주문일시']?1:-1; }).slice(0,5);
    recentEl.innerHTML = recent.length
      ? '<table>'+TH(['주문번호','상품','금액','상태'])+'<tbody>'
        +recent.map(function(o){
          return '<tr>'
            +'<td style="font-size:11px;">'+(o['주문번호']||'-')+'</td>'
            +'<td>'+(o['상품명']||o['주문상품명']||'-')+'</td>'
            +'<td style="font-weight:700;color:var(--accent);">'+fmt(o['결제금액'])+'</td>'
            +'<td><span class="os os-'+(o['주문상태']||'')+'">'+(o['주문상태']||'-')+'</span></td>'
            +'</tr>';
        }).join('')+'</tbody></table>'
      : EMPTY('🛒','주문 없음');

    // 최근 공지 3건
    var notices = parseCSV(results[3])
      .filter(function(n){ return n['제목']&&n['사용여부']!=='FALSE'&&n['구분']!=='매뉴얼'; })
      .slice(0,3);
    document.getElementById('dash-notice').innerHTML = notices.length
      ? notices.map(function(n){
          return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">'
            +'<div style="font-weight:700;font-size:13px;">'
            +(n['중요도']==='긴급'?'🚨 ':n['중요도']==='중요'?'🔴 ':'')
            +(n['제목']||'')+'</div>'
            +'<div style="font-size:11px;color:var(--gray);margin-top:3px;">'+(n['작성일']||'')+'</div>'
            +'</div>';
        }).join('')
      : EMPTY('📢','공지 없음');

  }).catch(function(e){ console.error(e); });
}
