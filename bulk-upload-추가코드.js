// ============================================================
// ✅ v5.0 상품 일괄(대량) 등록 - 이 코드를 Apps Script 맨 아래에 붙여넣으세요
// ============================================================

// ── 본사 상품 일괄 등록 ──
function saveBulkProducts(data) {
  var products = data.products || [];
  if (!products.length) return { status: 'error', message: '등록할 상품이 없습니다.' };

  var sheet = SS.getSheetByName('상품목록');
  if (!sheet) return { status: 'error', message: '상품목록 시트 없음' };

  var deliveryCols = ['배송방법', '배송비', '무료배송조건'];
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  deliveryCols.forEach(function(col) {
    if (headerRow.indexOf(col) === -1) {
      var newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(col).setFontWeight('bold').setBackground('#e8f4fd');
      headerRow.push(col);
    }
  });

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var nextNo = getNextNo(sheet);
  var success = 0, failed = 0, errors = [];

  products.forEach(function(prod, idx) {
    try {
      var rowData = headers.map(function(h) {
        if (h === '번호') return nextNo;
        if (h === '사용여부' && !prod[h]) return 'TRUE';
        if (h === '판매수량' && !prod[h]) return '0';
        if (h === '별점평균' && !prod[h]) return '0';
        if (h === '리뷰수' && !prod[h]) return '0';
        return prod[h] || '';
      });
      sheet.appendRow(rowData);
      nextNo++;
      success++;
    } catch(e) {
      failed++;
      errors.push({ row: idx + 1, message: e.toString() });
    }
  });

  return {
    status: 'ok',
    message: '총 ' + products.length + '건 중 ' + success + '건 등록, ' + failed + '건 실패',
    success: success,
    failed: failed,
    errors: errors
  };
}

// ── 대리점 상품 일괄 등록 ──
function saveBulkDealerProducts(data) {
  var products = data.products || [];
  var dealerId = String(data.dealerId || '').trim();
  if (!dealerId) return { status: 'error', message: '대리점ID가 없습니다.' };
  if (!products.length) return { status: 'error', message: '등록할 상품이 없습니다.' };

  var headers = getDealerProductHeaders();
  var sheet   = getOrCreateSheet('대리점상품', headers);

  if (String(sheet.getRange(1, 1).getValue()).trim() !== '번호') {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
  }

  var prefix = getDealerPhonePrefix(dealerId);
  var success = 0, failed = 0, errors = [];

  products.forEach(function(prod, idx) {
    try {
      prod['대리점ID'] = dealerId;
      var nextNo = getNextDealerNo(sheet, prefix, dealerId);
      prod['번호'] = nextNo;
      if (!prod['사용여부']) prod['사용여부'] = 'TRUE';
      if (!prod['위탁여부']) prod['위탁여부'] = 'FALSE';
      if (!prod['본사승인']) prod['본사승인'] = '';
      var newRow = headers.map(function(h) { return prod[h] || ''; });
      sheet.appendRow(newRow);
      success++;
    } catch(e) {
      failed++;
      errors.push({ row: idx + 1, message: e.toString() });
    }
  });

  return {
    status: 'ok',
    message: '총 ' + products.length + '건 중 ' + success + '건 등록, ' + failed + '건 실패',
    success: success,
    failed: failed,
    errors: errors
  };
}
