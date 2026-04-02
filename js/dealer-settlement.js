// ============================================================
// dealer-settlement.js — 정산 · 리뷰 · 공지 · 매뉴얼
// ============================================================

// ── 정산 ─────────────────────────────────────────────────────
function loadSettlement() {
  if(!DEALER) return;
  document.getElementById('settlement-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('정산')).then(function(r){return r.text();}).then(function(csv){
    var rows = parseCSV(csv).filter(function(r){
      return (r['대리점ID']||'').toString().trim() === (DEALER.id||'').toString().trim();
    });
    var totalSales=0, totalPg=0, totalHq=0, totalMine=0;
    rows.forEach(function(r){
      totalSales += parseFloat(r['총매출'])||0;
      totalPg    += parseFloat(r['PG수수료'])||0;
      totalHq    += parseFloat(r['본사수수료'])||0;
      totalMine  += parseFloat(r['대리점수령액'])||0;
    });
    document.getElementById('settle-total').textContent = totalSales.toLocaleString()+'원';
    document.getElementById('settle-pg').textContent    = totalPg.toLocaleString()+'원';
    document.getElementById('settle-hq').textContent    = totalHq.toLocaleString()+'원';
    document.getElementById('settle-mine').textContent  = totalMine.toLocaleString()+'원';

    document.getElementById('settlement-tw').innerHTML = rows.length
      ? '<table>'+TH(['정산월','총매출','PG요율','PG수수료','본사마진율','본사수수료','내 수령액','상태'])+'<tbody>'
        +rows.sort(function(a,b){return b['정산월']>a['정산월']?1:-1;}).map(function(r){
          return '<tr>'
            +'<td style="font-weight:600;">'+(r['정산월']||'-')+'</td>'
            +'<td>'+fmt(r['총매출'])+'</td>'
            +'<td style="text-align:center;">'+(r['PG요율']||0)+'%</td>'
            +'<td style="color:#e53935;">-'+fmt(r['PG수수료'])+'</td>'
            +'<td style="text-align:center;">'+(r['본사마진율']||0)+'%</td>'
            +'<td style="color:#e53935;">-'+fmt(r['본사수수료'])+'</td>'
            +'<td style="font-weight:700;color:var(--green);">'+fmt(r['대리점수령액'])+'</td>'
            +'<td><span class="bdg bdg-new">'+(r['상태']||'정산완료')+'</span></td>'
            +'</tr>';
        }).join('')+'</tbody></table>'
      : EMPTY('💰','정산 내역 없음','매출 발생 후 본사에서 정산 계산 시 표시됩니다');
  }).catch(function(){ document.getElementById('settlement-tw').innerHTML=EMPTY('💰','정산 내역 없음'); });
}

// ── 리뷰 ─────────────────────────────────────────────────────
var allReviews = [];

function loadReviews() {
  if(!DEALER) return;
  document.getElementById('reviews-tw').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('리뷰')).then(function(r){return r.text();}).then(function(csv){
    allReviews = parseCSV(csv).filter(function(r){ return r['대리점ID']===DEALER.id; });
    renderReviews(allReviews);
  }).catch(function(){ document.getElementById('reviews-tw').innerHTML=EMPTY('⭐','리뷰 없음'); });
}

function filterReviews(){
  var f = document.getElementById('review-filter').value;
  renderReviews(f ? allReviews.filter(function(r){return r['별점']===f;}) : allReviews);
}

function renderReviews(list){
  var el = document.getElementById('reviews-tw');
  if(!list.length){ el.innerHTML=EMPTY('⭐','리뷰 없음'); return; }
  el.innerHTML = '<table>'+TH(['번호','상품번호','작성자','별점','내용','답글','작성일','관리'])+'<tbody>'
    +list.sort(function(a,b){return b['작성일']>a['작성일']?1:-1;}).map(function(r){
      return '<tr>'
        +'<td>'+r['번호']+'</td>'
        +'<td>'+r['상품번호']+'</td>'
        +'<td style="font-weight:600;">'+(r['작성자']||'-')+'</td>'
        +'<td>'+'⭐'.repeat(parseInt(r['별점'])||0)+'</td>'
        +'<td style="max-width:200px;font-size:12px;">'+(r['리뷰내용']||'-')+'</td>'
        +'<td style="max-width:150px;font-size:11px;color:var(--gray);">'+(r['답글내용']||'<span style="color:#bbb;">미작성</span>')+'</td>'
        +'<td style="font-size:11px;">'+(r['작성일']||'-')+'</td>'
        +'<td><button class="btn btn-outline btn-sm" onclick="openReplyModal(this)" data-id="'+r['번호']+'" data-reply="'+encodeURIComponent(r['답글내용']||'')+'">💬 답글</button></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}

function openReplyModal(btn){
  document.getElementById('reply-review-id').value = btn.getAttribute('data-id');
  document.getElementById('reply-content').value   = decodeURIComponent(btn.getAttribute('data-reply')||'');
  document.getElementById('reply-modal').classList.add('active');
}
function closeReplyModal(){ document.getElementById('reply-modal').classList.remove('active'); }

function saveReply(){
  var id      = document.getElementById('reply-review-id').value;
  var content = document.getElementById('reply-content').value.trim();
  if(!content){ showToast('답글 내용을 입력하세요','warn'); return; }
  var today = new Date().toISOString().split('T')[0];
  fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',body:JSON.stringify({action:'saveReviewReply',data:{번호:id,답글내용:content,답글작성자:DEALER.name,답글작성일:today}})})
    .then(function(){ showToast('답글이 저장됐습니다','ok'); closeReplyModal(); setTimeout(loadReviews,1500); });
}

// ── 공지/매뉴얼 ──────────────────────────────────────────────
function loadNotice() {
  var el = document.getElementById('notice-list');
  el.innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('공지사항')).then(function(r){return r.text();}).then(function(csv){
    var notices = parseCSV(csv).filter(function(n){ return n['사용여부']!=='FALSE'&&n['구분']!=='매뉴얼'; });
    el.innerHTML = notices.length
      ? notices.sort(function(a,b){return b['작성일']>a['작성일']?1:-1;}).map(function(n){
          var cls = n['중요도']==='긴급'?'urgent':n['중요도']==='중요'?'important':'';
          return '<div class="notice-card '+cls+'">'
            +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">'
            +(n['중요도']==='긴급'?'<span style="background:#fde8e8;color:#c0392b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">🚨 긴급</span>'
              :n['중요도']==='중요'?'<span style="background:#fef3e2;color:#e67e22;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">🔴 중요</span>':'')
            +'<div class="notice-title">'+n['제목']+'</div></div>'
            +'<div class="notice-content">'+n['내용']+'</div>'
            +'<div class="notice-meta">📅 '+n['작성일']+'</div></div>';
        }).join('')
      : EMPTY('📢','공지사항 없음','본사에서 공지가 등록되면 여기에 표시됩니다');
  }).catch(function(){ el.innerHTML=EMPTY('📢','공지사항 없음'); });
}

function loadManual() {
  var el = document.getElementById('manual-list');
  el.innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  fetch(sheetUrl('공지사항')).then(function(r){return r.text();}).then(function(csv){
    var manuals = parseCSV(csv).filter(function(n){ return n['사용여부']!=='FALSE'&&n['구분']==='매뉴얼'; });
    el.innerHTML = manuals.length
      ? manuals.map(function(m){
          return '<details style="border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden;">'
            +'<summary style="padding:14px 18px;cursor:pointer;font-weight:700;font-size:14px;background:#fafbfc;list-style:none;display:flex;justify-content:space-between;align-items:center;">'
            +m['제목']+'<span style="font-size:12px;color:var(--gray);font-weight:400;">펼치기 ▼</span></summary>'
            +'<div style="padding:18px;font-size:13px;color:#444;white-space:pre-wrap;line-height:1.8;border-top:1px solid var(--border);">'+m['내용']+'</div></details>';
        }).join('')
      : EMPTY('📖','운영매뉴얼 없음','본사에서 등록되면 여기에 표시됩니다');
  }).catch(function(){ el.innerHTML=EMPTY('📖','운영매뉴얼 없음'); });
}
