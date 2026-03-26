// ============================================================
// sheets.js 패치 - 공급사/유튜브/이미지URL/스펙/인증/주의사항 자동처리
// ============================================================
(function() {
  if (typeof ProductAPI === 'undefined') return;

  // 이미지 URL 자동완성 함수
  function resolveImg(val) {
    if (!val || !val.trim()) return '';
    var v = val.trim();
    if (v.startsWith('http')) return v;
    var base = (typeof CONFIG !== 'undefined' && CONFIG.IMAGE_BASE)
      ? CONFIG.IMAGE_BASE
      : 'https://min323300.github.io/myshop/images/';
    return base + v;
  }

  var _origGetAll = ProductAPI.getAll.bind(ProductAPI);
  ProductAPI.getAll = function() {
    return _origGetAll().then(function(products) {
      return products.map(function(p) {
        // 공급사
        if (!p.supplier && p['공급사']) p.supplier = p['공급사'];
        // 유튜브
        if (!p.youtube && p['유튜브']) p.youtube = p['유튜브'];
        // 상세스펙
        if (!p.specs && p['상세스펙']) p.specs = p['상세스펙'];
        // 인증이미지
        if (!p.certImage && p['인증이미지']) p.certImage = p['인증이미지'];
        // 주의사항
        if (!p.caution && p['주의사항']) p.caution = p['주의사항'];
        // 이미지 URL 자동완성
        p.image         = resolveImg(p.image);
        p.detailImages  = resolveImg(p.detailImages);
        p.detailImages2 = resolveImg(p.detailImages2);
        p.certImage     = resolveImg(p.certImage);
        return p;
      });
    });
  };
})();
