// ============================================================
// 📊 Google Sheets 연동 모듈 - sheets.js (한글 헤더 버전)
// ============================================================

const SheetAPI = {
  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = [];
      let cur = '', inQ = false;
      for (let ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      values.push(cur.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = (values[i] || '').replace(/"/g, '').trim());
      return obj;
    }).filter(row => Object.values(row).some(v => v));
  },

  async fetch(url) {
    try {
      const res = await fetch(url);
      const csv = await res.text();
      return this.parseCSV(csv);
    } catch(e) { console.warn('시트 로드 실패:', url); return []; }
  },

  _cache: {},
  async fetchCached(url, ttl = 300000) {
    const now = Date.now();
    if (this._cache[url] && now - this._cache[url].time < ttl) return this._cache[url].data;
    const data = await this.fetch(url);
    this._cache[url] = { data, time: now };
    return data;
  }
};


// ============================================================
// 🏬 대리점 URL 파라미터 감지 및 상품 통합 로직
// ============================================================

// URL에서 dealer 파라미터 읽기
// 예: gasway.shop?dealer=seoul_01 → 'seoul_01'
// 예: gasway.shop → null (본사)
const DealerContext = {
  _dealer: null,
  _loaded: false,

  getDealerId() {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('dealer') || null;
    if (urlId) {
      // URL에 dealer 있으면 sessionStorage에 저장 후 반환
      try { sessionStorage.setItem('currentDealerId', urlId); } catch(e) {}
      return urlId;
    }
    // ★ URL에 dealer 없어도 sessionStorage에서 꺼내서 반환
    // → order.html, order-complete.html, mypage.html 등 파라미터 없는 페이지에서도 브랜딩 유지
    try {
      const saved = sessionStorage.getItem('currentDealerId');
      if (saved) return saved;
    } catch(e) {}
    return null;
  },

  async load() {
    if (this._loaded) return this._dealer;
    const id = this.getDealerId();
    if (!id) { this._loaded = true; return null; }
    try {
      const SHEET_ID = CONFIG.SHEET_ID || '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
      const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
        + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('대리점') + '&t=' + Date.now();
      const rows = await SheetAPI.fetch(url);
      this._dealer = rows.find(r => (r['대리점ID'] || r['가맹점ID']) === id && r['상태'] !== '해지') || null;
    } catch(e) { this._dealer = null; }
    this._loaded = true;
    return this._dealer;
  },

  // 대리점 브랜딩 쇼핑몰에 적용
  async applyBranding() {
    const dealer = await this.load();
    if (!dealer) return;
    const name = dealer['대리점명'] || '';
    if (!name) return;

    // 1) 헤더 로고 (#store-name) - app.js 덮어쓰기 방지용 MutationObserver 등록
    const storeName = document.getElementById('store-name');
    if (storeName) {
      storeName.textContent = name;
      // app.js가 나중에 바꾸면 다시 되돌림
      if (!storeName._dealerObserver) {
        storeName._dealerObserver = new MutationObserver(() => {
          if (storeName.textContent !== name) storeName.textContent = name;
        });
        storeName._dealerObserver.observe(storeName, { childList: true, subtree: true, characterData: true });
      }
    }

    // 2) 푸터 브랜드명 (#footer-store-name)
    const footerName = document.getElementById('footer-store-name');
    if (footerName) footerName.textContent = '🏪 ' + name;

    // 3) 푸터 저작권 (#footer-copy)
    const footerCopy = document.getElementById('footer-copy');
    if (footerCopy) footerCopy.textContent = '© 2026 ' + name + '. All rights reserved.';

    // 4-1) 푸터 사업자 정보 - 대리점 사업자번호 있으면 대리점 정보, 없으면 본사 정보 그대로
    const dealerBizNo = (dealer['사업자번호'] || '').trim();
    if (dealerBizNo) {
      // 대리점 사업자 있음 → 대리점 정보로 교체
      const fb = document.getElementById('footer-biz');
      if (fb) {
        const parts = [];
        parts.push('상호: ' + name);
        parts.push('사업자번호: ' + dealerBizNo);
        if (dealer['대표자명']) parts.push('대표: ' + dealer['대표자명']);
        if (dealer['통신판매업번호']) parts.push('통신판매업: ' + dealer['통신판매업번호']);
        fb.textContent = parts.join(' | ');
      }
      const fa = document.getElementById('footer-addr');
      if (fa) {
        const ap = [];
        if (dealer['주소']) ap.push('주소: ' + dealer['주소']);
        if (dealer['연락처']) ap.push('TEL: ' + dealer['연락처']);
        if (dealer['이메일']) ap.push('EMAIL: ' + dealer['이메일']);
        fa.textContent = ap.join(' | ');
      }
      const fp = document.getElementById('footer-phone');
      if (fp && dealer['연락처']) fp.textContent = '📞 ' + dealer['연락처'];
      const fe = document.getElementById('footer-email');
      if (fe && dealer['이메일']) fe.textContent = '📧 ' + dealer['이메일'];
    }
    // 사업자번호 없으면 본사 정보 그대로 유지 (loadBizInfo가 이미 채워놓음)

    // 4) 헤더 공지바 (.header-notice)
    const notice = document.querySelector('.header-notice');
    if (notice) notice.textContent = '🏬 ' + name + ' 공식 쇼핑몰에 오신 것을 환영합니다!';

    // 5) 페이지 타이틀
    document.title = document.title.replace(/담누리마켓|비에스컴퍼니|\(주\)비에스컴퍼니/g, name);

    // 6) 테마 색상
    if (dealer['테마색상']) {
      document.documentElement.style.setProperty('--primary', dealer['테마색상']);
      document.documentElement.style.setProperty('--accent', dealer['테마색상']);
      document.documentElement.style.setProperty('--color-primary', dealer['테마색상']);
    }

    // 7) 내부 링크 dealer 파라미터 유지
    this.keepDealerLinks(dealer['대리점ID']);
  },

  // 내부 링크에 dealer 파라미터 자동 추가
  keepDealerLinks(dealerId) {
    if (!dealerId) return;
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      // 내부 링크에만 적용 (http로 시작하지 않고, #만도 아닌)
      if (!href.startsWith('http') && !href.startsWith('#') && href !== '') {
        var sep = href.includes('?') ? '&' : '?';
        a.href = href + sep + 'dealer=' + dealerId;
      }
    }, true);
  }
};

// ============================================================
// 대리점 상품 API
// ============================================================
const DealerProductAPI = {
  async getAll() {
    const SHEET_ID = CONFIG.SHEET_ID || '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('대리점상품') + '&t=' + Date.now();
    const rows = await SheetAPI.fetch(url);
    return rows
      .filter(r => r['사용여부'] !== 'FALSE' && r['상품명'])
      .map(row => this._mapRow(row));
  },

  async getByDealer(dealerId) {
    const SHEET_ID = CONFIG.SHEET_ID || '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('대리점상품') + '&t=' + Date.now();
    const rows = await SheetAPI.fetch(url);
    return rows
      .filter(r => (r['대리점ID']||r['가맹점ID']) === dealerId && r['사용여부'] !== 'FALSE' && r['상품명'])
      .map(row => this._mapRow(row));
  },

  _mapRow(row) {
    return {
      id: 'D_' + (row['번호'] || ''),   // 본사 상품과 ID 충돌 방지
      name: row['상품명'] || '',
      price: parseInt(row['가격']) || 0,
      salePrice: parseInt(row['할인가']) || 0,
      category: row['카테고리'] || '',
      image: resolveImageUrl(row['이미지']) || 'https://via.placeholder.com/400x400?text=상품이미지',
      image2: resolveImageUrl(row['이미지2']) || '',
      image3: resolveImageUrl(row['이미지3']) || '',
      image4: resolveImageUrl(row['이미지4']) || '',
      detailImages: row['상세이미지'] || '',
      description: row['상품설명'] || '',
      options: row['옵션'] || '',
      deliveryFee: row['배송비'] || '무료',
      deliveryDays: row['배송일'] || '1~3일',
      stock: parseInt(row['재고']) || 0,
      badge: row['뱃지'] || '',
      isFeatured: row['추천여부'] === 'TRUE',
      isActive: true,
      salesCount: 0,
      rating: parseFloat(row['별점평균']) || 0,
      reviewCount: parseInt(row['리뷰수']) || 0,
      dealerId: row['대리점ID'] || row['가맹점ID'] || '',
      isDealer: true,
    };
  }
};

// ============================================================
// 🖼️ 이미지 URL 헬퍼
// ============================================================
function resolveImageUrl(val) {
  if (!val) return '';
  if (val.startsWith('http')) return val;
  return CONFIG.IMAGE_BASE + val;
}

// ============================================================
// 상품 데이터
// ============================================================
const ProductAPI = {
  async getAll() {
    // 본사 상품 로드
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.상품목록);
    const hqProducts = rows.map(row => ({
      id: row['번호'] || '',
      name: row['상품명'] || '',
      price: parseInt(row['가격']) || 0,
      salePrice: parseInt(row['할인가']) || 0,
      category: row['카테고리'] || '',
      subCategory: row['세부카테고리'] || '',
      image: resolveImageUrl(row['이미지']) || 'https://via.placeholder.com/400x400?text=상품이미지',
      description: row['상품설명'] || '',
      stock: parseInt(row['재고']) || 0,
      badge: row['뱃지'] || '',
      isFeatured: row['추천여부'] === 'TRUE',
      isActive: row['사용여부'] !== 'FALSE',
      salesCount: parseInt(row['판매수량']) || 0,
      rating: parseFloat(row['별점평균']) || 0,
      reviewCount: parseInt(row['리뷰수']) || 0,
      detailImages: row['상세이미지'] ? row['상세이미지'].split('|').map(s => resolveImageUrl(s.trim())).join('|') : '',
      detailImages2: row['상세이미지2'] ? row['상세이미지2'].split('|').map(s => resolveImageUrl(s.trim())).join('|') : '',
      certImage: resolveImageUrl(row['인증이미지']),
      colors: row['색상'] || '',
      sizes: row['사이즈'] || '',
      supplier: row['공급사'] || '',
      youtube: row['유튜브'] || '',
      specs: row['상세스펙'] || '',
      caution: row['주의사항'] || '',
      shippingMethod: row['배송방법'] || '',      // ✅ 이 줄 추가
      shippingFee: row['배송방법'] === '무료배송' ? 0 : (parseInt(row['배송비']) || 3000),
      isDealer: false,
    }))
    .filter(p => p.isActive && p.name);

    // 대리점 URL 파라미터 감지
    // - dealer=ID 있으면 해당 대리점 상품만 추가
    // - dealer 없으면 (본사) 모든 대리점 상품 추가
    const dealerId = DealerContext.getDealerId();
    try {
      const dealerProducts = dealerId
        ? await DealerProductAPI.getByDealer(dealerId)   // 특정 대리점
        : await DealerProductAPI.getAll();               // 본사: 전체 대리점 상품
      const combined = [...hqProducts, ...dealerProducts];
      return combined.sort((a, b) => {
        const scoreA = (a.salesCount * 0.4) + (a.rating * 20 * 0.4) + (a.reviewCount * 0.2);
        const scoreB = (b.salesCount * 0.4) + (b.rating * 20 * 0.4) + (b.reviewCount * 0.2);
        return scoreB - scoreA;
      });
    } catch(e) { /* 대리점 상품 로드 실패 시 본사 상품만 */ }

    return hqProducts.sort((a, b) => {
      const scoreA = (a.salesCount * 0.4) + (a.rating * 20 * 0.4) + (a.reviewCount * 0.2);
      const scoreB = (b.salesCount * 0.4) + (b.rating * 20 * 0.4) + (b.reviewCount * 0.2);
      return scoreB - scoreA;
    });
  },

  async getById(id) {
    const all = await this.getAll();
    return all.find(p => p.id === id) || null;
  },

  async getByCategory(category) {
    const all = await this.getAll();
    return all.filter(p => p.category === category);
  },

  async getFeatured() {
    const all = await this.getAll();
    return all.filter(p => p.isFeatured).slice(0, 8);
  },

  async search(query) {
    const all = await this.getAll();
    const q = query.toLowerCase();
    return all.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
};

// ============================================================
// 카테고리 데이터
// ============================================================
const CategoryAPI = {
  _icons: {
    '의류':'👗','신발':'👟','뷰티':'💄','생활':'🏠',
    '전자':'📱','식품':'🍕','스포츠':'🏃','도서':'📚',
    '가방':'👜','액세서리':'💍','반려동물':'🐾','유아':'🍼',
    '가전':'🖥️','주방':'🍳','침구':'🛏️','욕실':'🚿',
  },
  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.카테고리);
    return rows.map(row => ({
      id: row['번호'] || '',
      name: row['카테고리명'] || '',
      icon: this._icons[row['카테고리명']] || '📦',
      parentId: row['상위카테고리'] || '',
      order: parseInt(row['순서']) || 0,
    })).sort((a, b) => a.order - b.order);
  },
  async getMain() {
    const all = await this.getAll();
    return all.filter(c => !c.parentId);
  },
  async getSubs(parentId) {
    const all = await this.getAll();
    return all.filter(c => c.parentId === parentId);
  }
};

// ============================================================
// 리뷰 데이터
// ============================================================
const ReviewAPI = {
  async getByProduct(productId) {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.리뷰, 60000);
    return rows
      .filter(row => row['상품번호'] === String(productId) && row['공개여부'] !== 'FALSE')
      .map(row => ({
        id: row['번호'],
        productId: row['상품번호'],
        author: row['작성자'],
        rating: parseInt(row['별점']) || 0,
        content: row['리뷰내용'],
        image: resolveImageUrl(row['리뷰이미지']),
        date: row['작성일'],
        reply: row['답글내용'],
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async getAvgRating(productId) {
    const reviews = await this.getByProduct(productId);
    if (!reviews.length) return 0;
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  }
};

// ============================================================
// 팝업 데이터
// ============================================================
const PopupAPI = {
  async getActive() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.팝업, 60000);
    const today = new Date().toISOString().split('T')[0];
    return rows.filter(row => {
      const isActive = row['사용여부'] === 'TRUE';
      const startOk = !row['시작일'] || row['시작일'] <= today;
      const endOk = !row['종료일'] || row['종료일'] >= today;
      return isActive && startOk && endOk;
    }).map(row => ({
      id: row['번호'],
      title: row['제목'],
      content: row['내용'],
      image: resolveImageUrl(row['이미지']),
      link: row['링크'],
      width: row['팝업너비'] || '500px',
    }));
  }
};

// ============================================================
// 배너 데이터
// ============================================================
const BannerAPI = {
  async getActive() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.배너);
    const today = new Date().toISOString().split('T')[0];
    return rows.filter(row => {
      const isActive = row['사용여부'] === 'TRUE';
      const startOk = !row['시작일'] || row['시작일'] <= today;
      const endOk = !row['종료일'] || row['종료일'] >= today;
      return isActive && startOk && endOk;
    }).map(row => ({
      id: row['번호'],
      title: row['제목'],
      subtitle: row['부제목'],
      image: resolveImageUrl(row['이미지']),
      bgColor: row['배경색'] || '#FF5733',
      textColor: row['글자색'] || '#ffffff',
      link: row['링크'] || '#',
      btnText: row['버튼텍스트'] || '자세히 보기',
    })).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
};

// ============================================================
// 가맹점 데이터
// ============================================================
const FranchiseAPI = {
  async getById(id) {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.대리점);
    return rows.find(row => row['대리점ID'] === id) || null;
  },

  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.대리점);
    return rows.map(row => ({
      id: row['대리점ID'],
      name: row['대리점명'],
      owner: row['대표자명'],
      phone: row['연락처'],
      email: row['이메일'],
      address: row['주소'],
      domain: row['도메인'],
      color: row['테마색상'],
      logo: resolveImageUrl(row['로고이미지']),
      contractStart: row['계약일'],
      contractEnd: row['계약종료일'],
      status: row['상태'],
      commissionRate: parseFloat(row['수수료율']) || 2,
      bankAccount: row['정산계좌'],
    })).filter(f => f.status !== '해지');
  }
};

// ============================================================
// 👥 공동구매 API
// ============================================================
// 구글시트 "공동구매" 시트 컬럼:
// 번호 | 상품번호 | 제목 | 공동구매가 | 목표수량 | 현재참여 |
// 시작일시 | 종료일시 | 배송예정일 | 사용여부 | 설명
// ============================================================
const GroupBuyAPI = {

  parseDateTime(str) {
    if (!str) return null;
    return new Date(str.replace(' ', 'T'));
  },

  getStatus(item) {
    const now = new Date();
    if (!item.isActive) return 'disabled';
    if (item.startAt && now < item.startAt) return 'upcoming';
    if (item.endAt && now > item.endAt) return 'ended';
    return 'active';
  },

  getRemaining(endAt) {
    if (!endAt) return '';
    const diff = endAt - new Date();
    if (diff <= 0) return '마감';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return (d > 0 ? d + '일 ' : '')
      + String(h).padStart(2,'0') + ':'
      + String(m).padStart(2,'0') + ':'
      + String(s).padStart(2,'0');
  },

  getPct(current, target) {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  },

  async getAll() {
    const SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('공동구매');
    const rows = await SheetAPI.fetch(url);
    return rows.map(row => ({
      id:           row['번호'] || '',
      productId:    row['상품번호'] || '',
      title:        row['제목'] || '',
      groupPrice:   parseInt(row['공동구매가']) || 0,
      targetQty:    parseInt(row['목표수량']) || 100,
      currentQty:   parseInt(row['현재참여']) || 0,
      startAt:      this.parseDateTime(row['시작일시']),
      endAt:        this.parseDateTime(row['종료일시']),
      deliveryDate: row['배송예정일'] || '',
      isActive:     row['사용여부'] !== 'FALSE',
      description:  row['설명'] || '',
    }));
  },

  // 진행중인 공동구매 + 상품정보 병합 (쇼핑몰 메인용)
  async getActive() {
    const [all, products] = await Promise.all([this.getAll(), ProductAPI.getAll()]);
    return all
      .filter(g => this.getStatus(g) === 'active')
      .map(g => {
        const prod = products.find(p => String(p.id) === String(g.productId)) || {};
        return Object.assign({}, g, {
          name:          g.title || prod.name || '',
          image:         prod.image || '',
          category:      prod.category || '',
          originalPrice: prod.price || 0,
          pct:           this.getPct(g.currentQty, g.targetQty),
        });
      });
  },

  // 전체 상태 포함 + 상품정보 병합 (관리자용)
  async getAllWithProduct() {
    const [all, products] = await Promise.all([this.getAll(), ProductAPI.getAll()]);
    return all.map(g => {
      const prod = products.find(p => String(p.id) === String(g.productId)) || {};
      return Object.assign({}, g, {
        name:          g.title || prod.name || '',
        image:         prod.image || '',
        category:      prod.category || '',
        originalPrice: prod.price || 0,
        pct:           this.getPct(g.currentQty, g.targetQty),
        status:        this.getStatus(g),
      });
    });
  }
};


// ============================================================
// 📢 공지사항 API
// ============================================================
const NoticeAPI = {
  _SHEET_ID: '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI',

  async getAll() {
    const url = 'https://docs.google.com/spreadsheets/d/' + this._SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('공지사항') + '&t=' + Date.now();
    const rows = await SheetAPI.fetch(url);
    return rows.map(row => ({
      id:        row['번호'] || '',
      title:     row['제목'] || '',
      content:   row['내용'] || '',
      type:      row['구분'] || '공지',       // 공지 / 매뉴얼 / FAQ
      priority:  row['중요도'] || '보통',     // 보통 / 중요 / 긴급
      isActive:  row['사용여부'] !== 'FALSE',
      date:      row['작성일'] || '',
    }));
  },

  // 공지사항만 (대리점 공지용)
  async getNotices() {
    const all = await this.getAll();
    return all.filter(n => n.isActive && n.type !== '매뉴얼');
  },

  // 운영매뉴얼만
  async getManuals() {
    const all = await this.getAll();
    return all.filter(n => n.isActive && n.type === '매뉴얼');
  }
};

// ============================================================
// 🏬 페이지 로드 시 브랜딩 자동 적용
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
  const dealerId = DealerContext.getDealerId();

  if (dealerId) {
    // ── 대리점 모드: 대리점 브랜딩 적용 ──
    await DealerContext.applyBranding();
    setTimeout(() => DealerContext.applyBranding(), 1000);
    setTimeout(() => DealerContext.applyBranding(), 2500);
  } else {
    // ── 본사 모드: 브랜드명 항상 "담누리마켓" 고정 ──
    const BRAND = '담누리마켓';

    function fixBrandName() {
      // 헤더 로고
      const storeName = document.getElementById('store-name');
      if (storeName && storeName.textContent !== BRAND) storeName.textContent = BRAND;

      // 푸터 브랜드명
      const footerName = document.getElementById('footer-store-name');
      if (footerName && !footerName.textContent.includes(BRAND)) footerName.textContent = '🏪 ' + BRAND;

      // 푸터 저작권
      const footerCopy = document.getElementById('footer-copy');
      if (footerCopy && !footerCopy.textContent.includes(BRAND)) {
        footerCopy.textContent = '© 2026 ' + BRAND + '. All rights reserved.';
      }

      // 페이지 타이틀
      if (document.title.includes('비에스컴퍼니')) {
        document.title = document.title.replace(/\(주\)비에스컴퍼니|비에스컴퍼니/g, BRAND);
      }
    }

    // 즉시 + app.js 로드 후 반복 보정
    fixBrandName();
    setTimeout(fixBrandName, 500);
    setTimeout(fixBrandName, 1500);
    setTimeout(fixBrandName, 3000);

    // MutationObserver로 app.js 덮어쓰기 방지
    const storeName = document.getElementById('store-name');
    if (storeName) {
      const obs = new MutationObserver(() => {
        if (storeName.textContent !== BRAND) storeName.textContent = BRAND;
      });
      obs.observe(storeName, { childList: true, subtree: true, characterData: true });
    }
  }
});
