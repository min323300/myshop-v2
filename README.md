# 🛍️ 본사 종합쇼핑몰 - GitHub Pages

> Google Sheets + GitHub Pages 기반의 가맹 쇼핑몰 플랫폼

---

## 📁 파일 구조

```
damnuri/
├─ index.html          ← 메인 페이지 (홈)
├─ products.html       ← 상품 목록 페이지
├─ cart.html           ← 장바구니 페이지
├─ css/
│   └─ style.css       ← 전체 공통 스타일
└─ js/
    ├─ config.js       ← ⚙️ 설정 파일 (여기서 설정)
    ├─ sheets.js       ← Google Sheets 연동 모듈
    └─ app.js          ← 장바구니, 팝업, 검색 기능
```

---

## 🚀 GitHub Pages 올리는 방법

### 1단계 — GitHub 레포지토리 생성
1. GitHub 접속 → **New repository**
2. Repository name: `damnuri` (또는 원하는 이름)
3. **Public** 선택 (GitHub Pages 무료 사용)
4. **Create repository** 클릭

### 2단계 — 파일 업로드
```bash
# 방법 A: 드래그앤드롭 (쉬운 방법)
GitHub 레포지토리 → "uploading an existing file" 클릭
→ 모든 파일 선택 후 드래그앤드롭
→ "Commit changes" 클릭

# 방법 B: Git 명령어
git init
git add .
git commit -m "본사 쇼핑몰 최초 업로드"
git remote add origin https://github.com/아이디/damnuri.git
git push -u origin main
```

### 3단계 — GitHub Pages 활성화
1. 레포지토리 → **Settings** 탭
2. 왼쪽 메뉴 → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **/ (root)** 선택
5. **Save** 클릭
6. 약 1~2분 후 `https://아이디.github.io/damnuri/` 으로 접속 가능!

### 4단계 — 가비아 도메인 연결
```
가비아 DNS 관리에서 CNAME 추가:
- 호스트: @  →  아이디.github.io
- 호스트: www  →  아이디.github.io

GitHub Settings → Pages → Custom domain:
- damnuri.co.kr 입력 후 Save
```

---

## ⚙️ Google Sheets 연동 방법

### 1. 스프레드시트 만들기
Google Sheets에서 새 스프레드시트 생성 후 아래 시트 추가:

#### [products] 시트 (상품 목록)
| id | name | price | sale_price | category | sub_category | image | description | stock | badge | is_featured | is_active |
|----|------|-------|------------|----------|--------------|-------|-------------|-------|-------|-------------|-----------|
| p001 | 반팔 티셔츠 | 29000 | 0 | 의류 | 상의 | https://... | 상품설명 | 100 | NEW | TRUE | TRUE |

#### [categories] 시트 (카테고리)
| id | name | icon | parent_id | order |
|----|------|------|-----------|-------|
| c001 | 의류 | 👗 |  | 1 |
| c002 | 신발 | 👟 |  | 2 |

#### [popup] 시트 (팝업 공지)
| id | title | content | image | link | is_active | start_date | end_date | target | width |
|----|-------|---------|-------|------|-----------|------------|----------|--------|-------|
| pop001 | 이벤트 안내 | 내용 | | /products.html | TRUE | 2025-01-01 | 2025-12-31 | all | 400px |

#### [banners] 시트 (배너)
| id | title | subtitle | image | bg_color | text_color | link | btn_text | order | is_active |
|----|-------|----------|-------|----------|------------|------|----------|-------|-----------|
| b001 | 봄 신상 도착 | 설명 | | #FF5733 | #ffffff | /products.html | 보러가기 | 1 | TRUE |

### 2. 웹에 게시
파일 → 공유 → 웹에 게시 → 전체 문서 → CSV → 게시

### 3. URL을 config.js에 입력
`js/config.js` 파일의 `YOUR_SHEET_ID` 를 실제 ID로 교체

---

## 🎨 커스터마이징

### 브랜드 색상 변경
`css/style.css` 상단 `:root` 에서 수정:
```css
:root {
  --accent: #FF5733;  /* 메인 포인트 컬러 */
}
```

### 쇼핑몰 기본 정보 변경
`js/config.js` 에서 수정:
```js
STORE: {
  NAME: '우리쇼핑몰',
  PHONE: '1588-1234',
  EMAIL: 'help@ourshop.co.kr',
}
```

---

## 🏪 가맹점 쇼핑몰 적용 방법
1. 이 레포지토리를 **Fork** (복제)
2. `js/config.js` 에서 아래 수정:
   ```js
   IS_FRANCHISE: true,
   FRANCHISE_ID: 'franchise_001',
   FRANCHISE_NAME: '강남점',
   ```
3. GitHub Pages로 별도 배포
4. 가비아에서 서브도메인 연결 (예: `gangnam.damnuri.co.kr`)

---

## 📋 향후 추가 예정
- [ ] 상품 상세 페이지 (product.html)
- [ ] 마이페이지 (mypage.html)
- [ ] 주문 완료 페이지 (order-complete.html)
- [ ] 가맹 신청 페이지 (franchise.html)
- [ ] 본사 관리자 대시보드 (admin.html)
- [ ] PG사 결제 연동
- [ ] 회원 로그인 (Google OAuth)

---

> ⚡ 문의사항은 BS Company로 연락주세요
