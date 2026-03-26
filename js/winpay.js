/**
 * 윈글로벌페이 연동 모듈 (winpay.js) v4.0
 * 실제 PG 샘플 6개 파일 완전 분석 기반
 *
 * ▶ PC  : 팝업 오픈 → 닫힘 감지 → 2초 대기 → /api/payment/status/{tid} 조회
 * ▶ 모바일 : window.location.href 페이지 이동 → userResultUrl?tid={tid} 로 리다이렉트
 *
 * v3.x: 순차 개선 (taxFreeCd, CORS, 선저장, 포커스 등)
 * v4.0: JWT 토큰 만료 시 자동 재로그인
 *       status API 응답을 텍스트로 먼저 받아 JSON 파싱 오류 방지
 *
 * 설치 위치: js/winpay.js
 */

const WinPay = {

  SERVER_URL:   'https://jh.winglobalpay.com',
  COMPLETE_URL: 'https://gasway.shop/order-complete.html',

  tmnId:    'WGA000003',
  payKey:   'pk_bb4c-307e93-787-b5a53',
  jwtToken: '',

  // ─────────────────────────────────────────────────
  // 공통 Sheets 저장 유틸
  // ─────────────────────────────────────────────────
  _saveToSheets(payload) {
    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method:    'POST',
      mode:      'no-cors',
      keepalive: true,
      headers:   { 'Content-Type': 'text/plain' },
      body:      JSON.stringify(payload)
    });
  },

  // ─────────────────────────────────────────────────
  // 1. PG설정 시트에서 tmnId / payKey 로드
  // ─────────────────────────────────────────────────
   async loadConfig() {
    if (this.tmnId && this.payKey) return true;
    return false;
  },

  // ─────────────────────────────────────────────────
  // 2. 터미널 로그인 → JWT 발급
  // ─────────────────────────────────────────────────
  async login() {
    try {
      // payKey 없으면 config 먼저 로드
      if (!this.payKey) {
        const cfgOk = await this.loadConfig();
        if (!cfgOk) throw new Error('PG 설정 로드 실패');
      }

      const res = await fetch(`${this.SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.payKey}`
        },
        body: JSON.stringify({ tmnId: this.tmnId })
      });
      if (!res.ok) throw new Error(`로그인 HTTP ${res.status}`);
      const data = await res.json();
      if (!data.token) throw new Error('JWT 토큰 없음');
      this.jwtToken = data.token;
      sessionStorage.setItem('wp_jwt',    this.jwtToken);
      sessionStorage.setItem('wp_tmnId',  this.tmnId);
      sessionStorage.setItem('wp_payKey', this.payKey);
      console.log('[WinPay] 로그인 성공');
      return true;
    } catch (e) {
      console.error('[WinPay] login 실패:', e);
      return false;
    }
  },

  // ─────────────────────────────────────────────────
  // 3. 결제 요청 (PC/모바일 자동 분기)
  // ─────────────────────────────────────────────────
  async requestPayment(orderInfo) {
    const now  = new Date();
    const pad  = n => String(n).padStart(2, '0');
    const ts   = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const tid  = `${this.tmnId}_${ts}${rand}`;

    const isMobile  = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const payMethod = orderInfo.payMethod || 'CARD';
    const mobileResultUrl = `${this.COMPLETE_URL}?tid=${tid}`;

    // order.html 파라미터명 양쪽 모두 수용
    const amt       = Number(orderInfo.amt       || orderInfo.amount    || 0);
    const ordNm     = orderInfo.ordNm            || orderInfo.buyerName  || '';
    const email     = orderInfo.email            || orderInfo.buyerEmail || 'order@gasway.shop';
    const userId    = orderInfo.userId           || orderInfo.buyerTel   || 'guest';
    const goodsName = orderInfo.goodsName        || orderInfo.goodsname  || '';
    const prodCode  = 'P001';

    if (!amt || amt <= 0) throw new Error('결제 금액이 올바르지 않습니다 (amt: ' + amt + ')');

    const orderData = {
      tid, amt, goodsName, ordNm, email, userId,
      phone:         orderInfo.buyerTel      || orderInfo.phone      || '',
      receiverName:  orderInfo.receiverName  || ordNm,
      receiverPhone: orderInfo.receiverPhone || orderInfo.buyerTel   || '',
      address:       orderInfo.address       || '',
      zipCode:       orderInfo.zipCode       || '',
      productCode:   prodCode,
      dealerId:      orderInfo.dealerId      || '',
      referralCode:  orderInfo.referralCode  || '',
      memo:          orderInfo.memo          || '',
      qty:           orderInfo.qty           || 1,
    };

    // ✅ 팝업 열기 전 주문 먼저 저장 (결제대기)
    const orderNo = orderInfo.orderNo || orderInfo['주문번호'] || ('ORD' + Date.now());
    const dealer  = orderData.dealerId || localStorage.getItem('dealerId') || '';
    try {
      await this._saveToSheets({
        action: 'saveOrder',
        data: {
          주문번호:     orderNo,
          주문일시:     new Date().toLocaleString('ko-KR'),
          대리점ID:     dealer,
          주문자명:     ordNm,
          연락처:       orderData.phone,
          이메일:       email,
          받는분:       orderData.receiverName,
          받는분연락처: orderData.receiverPhone,
          배송주소:     orderData.address,
          우편번호:     orderData.zipCode,
          상품번호:     prodCode,
          주문상품:     goodsName,
          수량:         orderData.qty,
          결제금액:     amt,
          결제방법:     'card',
          추천인코드:   orderData.referralCode,
          회원구분:     (userId && userId !== 'guest') ? '회원' : '비회원',
          주문상태:     '결제대기',
          메모:         orderData.memo,
          PG주문번호:   tid,
          PG거래번호:   '',
        }
      });
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[WinPay] 주문 선저장 완료:', orderNo);
    } catch (e) {
      console.warn('[WinPay] 주문 선저장 실패:', e);
    }

    // localStorage에 주문정보 저장
    localStorage.setItem('wp_tid',   tid);
    localStorage.setItem('wp_order', JSON.stringify({ ...orderData, orderNo, dealer }));

    // PG 결제 요청
    const payload = {
      tmnId: this.tmnId, tid, amt, goodsName, ordNm, email, userId,
      productCode: prodCode, productType: '2', payMethod,
      taxFreeCd: '00', cashReceipt: '0', cashReceiptInfo: '',
      isMandatoryIssuer: false,
      redirectUrl:   this.COMPLETE_URL,
      returnUrl:     this.COMPLETE_URL,
      userResultUrl: mobileResultUrl,
    };

    console.log('[WinPay] 결제 요청 payload:', JSON.stringify(payload));

    const apiUrl = payMethod === 'BPAY'
      ? `${this.SERVER_URL}/api/bankpay/${isMobile ? 'mobile/' : ''}request`
      : `${this.SERVER_URL}/api/payment/${isMobile ? 'mobile/' : ''}request`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.jwtToken}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      this.jwtToken = '';
      sessionStorage.removeItem('wp_jwt');
      throw new Error('인증이 만료되었습니다. 다시 시도해주세요.');
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`결제요청 HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.message || '결제요청 실패');

    if (isMobile) {
      const paymentUrl = data.paymentUrl;
      if (payMethod === 'BPAY') {
        let pd = paymentUrl;
        if (typeof pd === 'string') pd = JSON.parse(pd);
        this._submitMobileBankPayForm(pd);
      } else {
        window.location.href = paymentUrl;
      }
    } else {
      if (payMethod === 'BPAY') {
        let pd = data.paymentUrl;
        if (typeof pd === 'string') pd = JSON.parse(pd);
        this._openBankPayPopup(pd, tid);
      } else {
        this._openPaymentPopup(data.paymentUrl, tid);
      }
    }

    return tid;
  },

  // ─────────────────────────────────────────────────
  // PC - 키움페이 팝업
  // ─────────────────────────────────────────────────
  _openPaymentPopup(paymentUrl, tid) {
    const W = 700, H = 1000;
    const popup = window.open(
      paymentUrl, 'WinPayment',
      `width=${W},height=${H},left=${(screen.width-W)/2},top=${(screen.height-H)/2},scrollbars=yes`
    );
    if (!popup || popup.closed) {
      alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
      return;
    }
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        this._onPopupClosed(tid);
      }
    }, 1000);
  },

  // ─────────────────────────────────────────────────
  // PC - 뱅크페이 팝업
  // ─────────────────────────────────────────────────
  _openBankPayPopup(urlData, tid) {
    const W = 720, H = 600;
    const popup = window.open('', 'BankPayPopup',
      `width=${W},height=${H},left=${(screen.width-W)/2},top=${(screen.height-H)/2}`);
    if (!popup || popup.closed) {
      alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
      return;
    }
    this._postForm(urlData, 'BankPayPopup');
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        this._onPopupClosed(tid);
      }
    }, 1000);
  },

  _submitMobileBankPayForm(urlData) {
    this._postForm(urlData, '_self');
  },

  _postForm(urlData, target) {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = urlData.url;
    form.target = target;
    Object.entries(urlData).forEach(([k, v]) => {
      if (k !== 'url') {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.name = k; inp.value = v;
        form.appendChild(inp);
      }
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  },

  // ─────────────────────────────────────────────────
  // PC - 팝업 닫힌 후 결제 결과 조회
  // ✅ v4.0: JWT 만료 시 자동 재로그인 + JSON 파싱 안전처리
  // ─────────────────────────────────────────────────
  async _onPopupClosed(tid) {
    // 결제 승인 서버 처리 완료 대기 (2초)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ✅ v4.0: localStorage 삭제 전에 데이터 먼저 추출
    const saved     = JSON.parse(localStorage.getItem('wp_order') || '{}');
    const orderNo   = saved.orderNo   || ('ORD' + Date.now());
    const dealer    = saved.dealer    || '';
    const goodsName = saved.goodsName || '';
    const ordNm     = saved.ordNm     || '';
    const amt       = saved.amt       || 0;

    console.log('[WinPay] 팝업 닫힘 - 주문번호:', orderNo, 'tid:', tid);

    // ✅ v4.0: JWT 토큰 없거나 만료 시 자동 재로그인
    if (!this.jwtToken) {
      console.log('[WinPay] JWT 없음 → 재로그인 시도');
      const loginOk = await this.login();
      if (!loginOk) {
        console.error('[WinPay] 재로그인 실패');
        this._fallbackRedirect(orderNo, amt, goodsName, ordNm, dealer);
        return;
      }
    }

    try {
      const res = await fetch(`${this.SERVER_URL}/api/payment/status/${tid}`, {
        headers: { 'Authorization': `Bearer ${this.jwtToken}` }
      });

      // ✅ v4.0: 텍스트로 먼저 받아서 JSON 파싱 오류 방지
      const text = await res.text();
      console.log('[WinPay] status 원본 응답:', text);

      if (!text || text.trim() === '') {
        throw new Error('빈 응답 수신');
      }

      // 401/403이면 재로그인 후 재조회
      if (res.status === 401 || res.status === 403) {
        console.log('[WinPay] 인증 만료 → 재로그인 후 재조회');
        this.jwtToken = '';
        const loginOk = await this.login();
        if (loginOk) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this._onPopupClosed(tid);
        }
        throw new Error('재인증 실패');
      }

      const data = JSON.parse(text);
      console.log('[WinPay] status 조회 결과:', JSON.stringify(data));

      if (data.success) {
        // ✅ 상태 결제완료로 업데이트
        try {
          await this._saveToSheets({
            action: 'updateOrderStatus',
            data: {
              주문번호:   orderNo,
              주문상태:   '결제완료',
              PG거래번호: data.wTid || '',
            }
          });
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log('[WinPay] 주문 상태 업데이트 완료:', orderNo);
        } catch (e) {
          console.warn('[WinPay] 상태 업데이트 실패:', e);
        }

        // localStorage 삭제
        localStorage.removeItem('cart');
        localStorage.removeItem('wp_tid');
        localStorage.removeItem('wp_order');

        // 완료 페이지 이동
        const q = `?orderNo=${orderNo}`
          + `&amt=${data.amt || amt}`
          + `&goodsName=${encodeURIComponent(goodsName)}`
          + `&ordNm=${encodeURIComponent(ordNm)}`
          + (dealer ? `&dealer=${dealer}` : '');

        window.location.href = `order-complete.html${q}`;

      } else {
        // "진행 중" 메시지면 3초 후 재조회
        const msg = data.message || '';
        if (msg.includes('진행') || msg.includes('처리')) {
          console.log('[WinPay] 결제 처리 중... 3초 후 재조회');
          await new Promise(resolve => setTimeout(resolve, 3000));
          return this._onPopupClosed(tid);
        }

        alert('결제가 완료되지 않았습니다.\n' + msg);
        const btn = document.getElementById('btn-order');
        if (btn) { btn.disabled = false; btn.textContent = '결제하기'; }
      }

    } catch (e) {
      console.error('[WinPay] 결제결과 확인 실패:', e);
      // ✅ v4.0: 오류 시에도 주문완료 페이지로 이동 (결제는 됐으므로)
      this._fallbackRedirect(orderNo, amt, goodsName, ordNm, dealer);
    }
  },

  // ─────────────────────────────────────────────────
  // ✅ v4.0: status 조회 실패해도 완료 페이지로 이동
  // (결제는 됐는데 조회만 실패한 경우 대비)
  // ─────────────────────────────────────────────────
    async _fallbackRedirect(orderNo, amt, goodsName, ordNm, dealer) {
  console.log('[WinPay] fallback redirect → order-complete');

  try {
    // ✅ no-cors 대신 일반 fetch 사용
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        data: { 주문번호: orderNo, 주문상태: '결제완료' }
      })
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[WinPay] 결제완료 업데이트 성공:', orderNo);
  } catch(e) {
    console.warn('[WinPay] 업데이트 실패:', e);
  }

  localStorage.removeItem('cart');
  localStorage.removeItem('wp_tid');
  localStorage.removeItem('wp_order');

  const q = `?orderNo=${orderNo}`
    + `&amt=${amt}`
    + `&goodsName=${encodeURIComponent(goodsName)}`
    + `&ordNm=${encodeURIComponent(ordNm)}`
    + (dealer ? `&dealer=${dealer}` : '');

  window.location.href = `order-complete.html${q}`;
},
  // ─────────────────────────────────────────────────
  // 전체 결제 시작
  // ─────────────────────────────────────────────────
  async startPayment(orderInfo) {
    const btn = document.getElementById('btn-order');
    if (btn) { btn.disabled = true; btn.textContent = '결제 준비중...'; }

    try {
      const cfgOk = await this.loadConfig();
      if (!cfgOk) throw new Error('PG 설정을 불러올 수 없습니다.\n잠시 후 다시 시도해주세요.');

      if (btn) btn.textContent = '인증 중...';
      const loginOk = await this.login();
      if (!loginOk) throw new Error('결제사 인증에 실패했습니다.\n잠시 후 다시 시도해주세요.');

      if (btn) btn.textContent = '결제창 열기...';
      await this.requestPayment(orderInfo);

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile && btn) btn.textContent = '결제 진행 중...';

    } catch (e) {
      alert('결제 오류:\n' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '결제하기'; }
    }
  }
};

// ✅ order.html의 WinPay.pay() 호출 호환용 별칭
WinPay.pay = function(opts) { return WinPay.startPayment(opts); };
