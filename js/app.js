// ============================================================
// 🔗 대리점 URL 생성 함수
// ============================================================
function dealerUrl(path) {
  const storeId = new URLSearchParams(location.search).get('store');
  if (storeId) return path + (path.includes('?') ? '&' : '?') + 'store=' + storeId;
  return path;
}

// ============================================================
// 🛒 장바구니 모듈 - cart.js
// ============================================================

const Cart = {
  _items: [],

  init() {
    const saved = sessionStorage.getItem('cart');
    this._items = saved ? JSON.parse(saved) : [];
    this.updateBadge();
  },

  save() {
    sessionStorage.setItem('cart', JSON.stringify(this._items));
    this.updateBadge();
  },

  add(product, qty = 1) {
    const existing = this._items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this._items.push({
        id:             product.id,
        name:           product.name,
        price:          product.salePrice || product.price,
        image:          product.image,
        qty,
        shippingMethod: product.shippingMethod || '',
        shippingFee:    product.shippingFee !== undefined ? product.shippingFee : 3000
      });
    }
    this.save();
    this.showToast(`"${product.name}" 장바구니에 담겼습니다!`);
  },

  remove(id) {
    this._items = this._items.filter(i => i.id !== id);
    this.save();
  },

  updateQty(id, qty) {
    const item = this._items.find(i => i.id === id);
    if (item) {
      item.qty = Math.max(1, qty);
      this.save();
    }
  },

  clear() {
    this._items = [];
    this.save();
  },

  getItems() { return this._items; },

  getCount() { return this._items.reduce((sum, i) => sum + i.qty, 0); },

  getTotal() { return this._items.reduce((sum, i) => sum + i.price * i.qty, 0); },

  updateBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `<span>🛒</span> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

// ============================================================
// 🪟 팝업 모듈 - popup.js
// ============================================================

const Popup = {

  // 팝업 표시
  show(popup) {
    const closed = JSON.parse(sessionStorage.getItem('closedPopups') || '[]');
    const closedToday = JSON.parse(localStorage.getItem('closedPopupsToday') || '{}');
    const today = new Date().toDateString();

    if (closed.includes(popup.id)) return;
    if (closedToday[popup.id] === today) return;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = `popup-${popup.id}`;
    overlay.innerHTML = `
      <div class="popup-box" style="max-width:${popup.width}">
        <button class="popup-close" onclick="Popup.close('${popup.id}', false)">✕</button>
        ${popup.image
          ? `<a href="${popup.link || '#'}"><img src="${popup.image}" alt="${popup.title}" style="width:100%;display:block;border-radius:8px 8px 0 0"></a>`
          : `<div class="popup-content">
               <h3>${popup.title}</h3>
               <p>${popup.content}</p>
               ${popup.link ? `<a href="${popup.link}" class="popup-btn">자세히 보기</a>` : ''}
             </div>`
        }
        <div class="popup-footer">
          <label class="popup-today">
            <input type="checkbox" id="today-${popup.id}"> 오늘 하루 보지 않기
          </label>
          <button onclick="Popup.close('${popup.id}', document.getElementById('today-${popup.id}').checked)">닫기</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  close(id, todayClose = false) {
    const overlay = document.getElementById(`popup-${id}`);
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }

    if (todayClose) {
      const closedToday = JSON.parse(localStorage.getItem('closedPopupsToday') || '{}');
      closedToday[id] = new Date().toDateString();
      localStorage.setItem('closedPopupsToday', JSON.stringify(closedToday));
    } else {
      const closed = JSON.parse(sessionStorage.getItem('closedPopups') || '[]');
      closed.push(id);
      sessionStorage.setItem('closedPopups', JSON.stringify(closed));
    }
  },

  // 팝업 상품 상세 (상품 클릭 시)
  showProduct(product) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = 'product-popup';
    const discount = product.salePrice
      ? Math.round((1 - product.salePrice / product.price) * 100) : 0;

    overlay.innerHTML = `
      <div class="popup-box popup-product">
        <button class="popup-close" onclick="this.closest('.popup-overlay').remove()">✕</button>
        <div class="popup-product-inner">
          <div class="popup-product-img">
            <img src="${product.image}" alt="${product.name}">
            ${product.badge ? `<span class="product-badge badge-${product.badge.toLowerCase()}">${product.badge}</span>` : ''}
          </div>
          <div class="popup-product-info">
            <div class="popup-category">${product.category}</div>
            <h2 class="popup-product-name">${product.name}</h2>
            <div class="popup-price">
              ${product.salePrice
                ? `<span class="price-sale">${product.salePrice.toLocaleString()}원</span>
                   <span class="price-original">${product.price.toLocaleString()}원</span>
                   <span class="price-discount">${discount}%</span>`
                : `<span class="price-sale">${product.price.toLocaleString()}원</span>`
              }
            </div>
            <p class="popup-desc">${product.description}</p>
            <div class="popup-qty">
              <label>수량</label>
              <div class="qty-control">
                <button onclick="this.nextElementSibling.value=Math.max(1,+this.nextElementSibling.value-1)">−</button>
                <input type="number" value="1" min="1" id="popup-qty-input">
                <button onclick="this.previousElementSibling.value=+this.previousElementSibling.value+1">+</button>
              </div>
            </div>
            <div class="popup-actions">
              <button class="btn-cart" onclick="Cart.add(${JSON.stringify(product).replace(/"/g, '&quot;')}, +document.getElementById('popup-qty-input').value); this.closest('.popup-overlay').remove()">
                🛒 장바구니 담기
              </button>
              <button class="btn-buy" onclick="alert('PG사 연동 후 결제 진행됩니다')">
                바로 구매
              </button>
            </div>
            <a href="product.html?id=${product.id}" class="popup-detail-link">상세 페이지 보기 →</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  // 공지 팝업 자동 로드
  async loadAndShow() {
    try {
      const popups = await PopupAPI.getActive();
      popups.forEach((p, i) => {
        setTimeout(() => this.show(p), i * 200);
      });
    } catch(e) {
      console.log('팝업 로드 스킵');
    }
  }
};

// ============================================================
// 🔍 검색 모듈
// ============================================================
const Search = {
  open() {
    document.getElementById('search-modal').classList.add('active');
    document.getElementById('search-input').focus();
  },
  close() {
    document.getElementById('search-modal').classList.remove('active');
  },
  async run(query) {
    if (!query.trim()) return;
    const results = await ProductAPI.search(query);
    const container = document.getElementById('search-results');
    if (!results.length) {
      container.innerHTML = `<p class="search-empty">검색 결과가 없습니다</p>`;
      return;
    }
    container.innerHTML = results.slice(0, 8).map(p => `
      <div class="search-item" onclick="Popup.showProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">
        <img src="${p.image}" alt="${p.name}">
        <div>
          <div class="search-item-name">${p.name}</div>
          <div class="search-item-price">${(p.salePrice || p.price).toLocaleString()}원</div>
        </div>
      </div>
    `).join('');
  }
};
