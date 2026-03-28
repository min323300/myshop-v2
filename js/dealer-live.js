// ============================================================
// dealer-live.js — 라이브방송 · 알림신청자 · 쿠폰발급
// ============================================================

var dealerLiveAll  = [];
var dealerAlarmAll = [];

// ── 라이브 방송 목록 ──────────────────────────────────────────
async function loadDealerLive() {
  document.getElementById('dealer-live-list').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  try {
    var res = await fetch(sheetUrl('라이브방송'));
    var csv = await res.text();
    var all = parseCSV(csv);
    dealerLiveAll = all.filter(function(b){
      return b['대리점ID']===DEALER.id || b['대리점ID']==='본사';
    });
    renderDealerLive(dealerLiveAll);
    updateDealerAlarmFilter();
  } catch(e) {
    document.getElementById('dealer-live-list').innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">데이터 로드 실패</div>';
  }
}

function renderDealerLive(data) {
  var el = document.getElementById('dealer-live-list');
  if(!data.length){ el.innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">등록된 방송이 없습니다</div>'; return; }
  el.innerHTML = '<table>'+TH(['방송제목','시작일시','상태','알림신청','쿠폰','구분','관리'])+'<tbody>'
    +data.map(function(b){
      var sc    = b['상태']==='진행중'?'#e8342b':b['상태']==='예정'?'#1a73e8':'#888';
      var isOwn = b['대리점ID']===DEALER.id;
      var safeB = JSON.stringify(b).replace(/"/g,'&quot;');
      return '<tr>'
        +'<td style="font-weight:600;">'+(b['방송제목']||'-')+'</td>'
        +'<td style="font-size:12px;color:#666;">'+(b['시작일시']||'-').substring(0,16)+'</td>'
        +'<td><span style="background:'+sc+'20;color:'+sc+';padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;">'
          +(b['상태']==='진행중'?'🔴 LIVE':b['상태']==='예정'?'⏳ 예정':'✅ 종료')+'</span></td>'
        +'<td style="text-align:center;color:var(--accent);font-weight:700;">'+(b['알림신청수']||0)+'명</td>'
        +'<td style="text-align:center;">'+(b['쿠폰코드']?'<span style="background:#fff8f6;color:#e85a2b;padding:2px 8px;border-radius:4px;font-size:11px;">'+b['쿠폰코드']+'</span>':'-')+'</td>'
        +'<td><span style="background:'+(isOwn?'#f0fdf4':'#eff6ff')+';color:'+(isOwn?'#166534':'#1d4ed8')+';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">'+(isOwn?'내방송':'본사')+'</span></td>'
        +'<td>'+(isOwn?'<button onclick="editDealerLive('+safeB+')" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:12px;cursor:pointer;">✏️ 수정</button>':'-')+'</td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}

function filterDealerLive(status, btn) {
  document.querySelectorAll('#page-live-list .stab').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  var filtered = status==='전체' ? dealerLiveAll : dealerLiveAll.filter(function(b){return b['상태']===status;});
  renderDealerLive(filtered);
}

// ── 방송 등록/수정 모달 ───────────────────────────────────────
function openDealerLiveModal() {
  ['dlm-no','dlm-title-input','dlm-desc','dlm-youtube','dlm-thumb','dlm-start','dlm-end','dlm-coupon','dlm-rate'].forEach(function(id){
    document.getElementById(id).value='';
  });
  document.getElementById('dlm-status').value='예정';
  document.getElementById('dlm-active').value='TRUE';
  document.getElementById('dlm-title').textContent='📺 방송 등록';
  document.getElementById('dealer-live-modal').classList.add('active');
}

function editDealerLive(b) {
  document.getElementById('dlm-no').value          = b['번호']       || '';
  document.getElementById('dlm-title-input').value = b['방송제목']   || '';
  document.getElementById('dlm-desc').value        = b['방송설명']   || '';
  document.getElementById('dlm-youtube').value     = b['유튜브URL']  || '';
  document.getElementById('dlm-thumb').value       = b['썸네일이미지']|| '';
  document.getElementById('dlm-start').value       = (b['시작일시']||'').replace(' ','T').substring(0,16);
  document.getElementById('dlm-end').value         = (b['종료일시']||'').replace(' ','T').substring(0,16);
  document.getElementById('dlm-coupon').value      = b['쿠폰코드']   || '';
  document.getElementById('dlm-rate').value        = b['쿠폰할인율'] || '';
  document.getElementById('dlm-status').value      = b['상태']       || '예정';
  document.getElementById('dlm-active').value      = b['사용여부']   || 'TRUE';
  document.getElementById('dlm-title').textContent = '📺 방송 수정';
  document.getElementById('dealer-live-modal').classList.add('active');
}

function closeDealerLiveModal(){ document.getElementById('dealer-live-modal').classList.remove('active'); }

async function saveDealerLive() {
  var title   = document.getElementById('dlm-title-input').value.trim();
  var youtube = document.getElementById('dlm-youtube').value.trim();
  var start   = document.getElementById('dlm-start').value;
  if(!title)   { showToast('방송 제목을 입력하세요','warn'); return; }
  if(!youtube) { showToast('유튜브 URL을 입력하세요','warn'); return; }
  if(!start)   { showToast('시작 일시를 입력하세요','warn'); return; }

  var data = {
    번호:         document.getElementById('dlm-no').value || '',
    방송제목:     title,
    방송설명:     document.getElementById('dlm-desc').value,
    유튜브URL:    youtube,
    썸네일이미지: document.getElementById('dlm-thumb').value,
    시작일시:     start.replace('T',' '),
    종료일시:     document.getElementById('dlm-end').value.replace('T',' '),
    쿠폰코드:     document.getElementById('dlm-coupon').value,
    쿠폰할인율:   document.getElementById('dlm-rate').value,
    상태:         document.getElementById('dlm-status').value,
    사용여부:     document.getElementById('dlm-active').value,
    대리점ID:     DEALER.id,
    알림신청수:   document.getElementById('dlm-no').value ? undefined : '0'
  };
  try {
    await fetch(SCRIPT_URL,{method:'POST',mode:'no-cors',body:JSON.stringify({action:'saveLiveBroadcast',data:data})});
    showToast('✅ 방송이 저장됐습니다!','ok');
    closeDealerLiveModal();
    setTimeout(loadDealerLive, 1500);
  } catch(e){ showToast('오류: '+e.message,''); }
}

// ── 알림 신청자 ───────────────────────────────────────────────
async function loadDealerAlarm() {
  document.getElementById('dealer-alarm-list').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  try {
    var res = await fetch(sheetUrl('라이브알림'));
    var csv = await res.text();
    dealerAlarmAll = parseCSV(csv);
    filterDealerAlarm();
  } catch(e) {
    document.getElementById('dealer-alarm-list').innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">데이터 없음 (첫 신청 후 자동 생성)</div>';
  }
}

function updateDealerAlarmFilter() {
  var sel = document.getElementById('dealer-alarm-filter');
  if(!sel) return;
  var myLives = dealerLiveAll.filter(function(b){return b['대리점ID']===DEALER.id;});
  sel.innerHTML = '<option value="">전체 방송</option>'
    +myLives.map(function(b){return '<option value="'+b['번호']+'">'+b['방송제목']+'</option>';}).join('');
}

function filterDealerAlarm() {
  var no       = document.getElementById('dealer-alarm-filter').value;
  var filtered = no ? dealerAlarmAll.filter(function(a){return a['방송번호']===no;}) : dealerAlarmAll;
  var el       = document.getElementById('dealer-alarm-list');
  if(!filtered.length){ el.innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">알림 신청자가 없습니다</div>'; return; }
  el.innerHTML = '<table>'+TH(['이름','연락처','이메일','방송번호','신청일시'])+'<tbody>'
    +filtered.map(function(a){
      return '<tr>'
        +'<td style="font-weight:600;">'+(a['이름']||'-')+'</td>'
        +'<td>'+(a['연락처']||'-')+'</td>'
        +'<td>'+(a['이메일']||'-')+'</td>'
        +'<td style="text-align:center;">'+(a['방송번호']||'-')+'</td>'
        +'<td style="font-size:11px;color:#aaa;">'+(a['신청일시']||'-')+'</td>'
        +'</tr>';
    }).join('')+'</tbody></table>'
    +'<div style="padding:10px 14px;font-size:12px;color:#888;border-top:1px solid var(--border);">총 '+filtered.length+'명</div>';
}

// ── 쿠폰 발급 내역 ────────────────────────────────────────────
async function loadDealerCoupon() {
  document.getElementById('dealer-coupon-list').innerHTML = '<div class="loading"><div class="lspin">⏳</div></div>';
  try {
    var res  = await fetch(sheetUrl('라이브쿠폰'));
    var csv  = await res.text();
    var data = parseCSV(csv);
    var el   = document.getElementById('dealer-coupon-list');
    if(!data.length){ el.innerHTML='<div style="padding:30px;text-align:center;color:#aaa;">발급된 쿠폰이 없습니다</div>'; return; }
    el.innerHTML = '<table>'+TH(['이름','연락처','쿠폰코드','할인율','발급일시','사용여부'])+'<tbody>'
      +data.map(function(c){
        return '<tr>'
          +'<td style="font-weight:600;">'+(c['이름']||'-')+'</td>'
          +'<td>'+(c['연락처']||'-')+'</td>'
          +'<td><span style="background:#fff8f6;color:#e85a2b;padding:2px 8px;border-radius:4px;font-weight:700;">'+(c['쿠폰코드']||'-')+'</span></td>'
          +'<td style="text-align:center;">'+(c['할인율']||0)+'%</td>'
          +'<td style="font-size:11px;color:#aaa;">'+(c['발급일시']||'-')+'</td>'
          +'<td><span style="color:'+(c['사용여부']==='TRUE'?'#e85a2b':'#888')+'">'+(c['사용여부']==='TRUE'?'✅ 사용':'미사용')+'</span></td>'
          +'</tr>';
      }).join('')+'</tbody></table>'
      +'<div style="padding:10px 14px;font-size:12px;color:#888;border-top:1px solid var(--border);">총 '+data.length+'건</div>';
  } catch(e) {
    document.getElementById('dealer-coupon-list').innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">데이터 없음</div>';
  }
}
