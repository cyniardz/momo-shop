// 모든 페이지 공통: 데이터 불러오기, 헤더/푸터, 왼쪽 패널(이벤트·검색·퀵메뉴), 검색 오버레이,
// 일체형 모달, 임시 로그인, 찜, 장바구니. 각 페이지 스크립트는 ready.then(...) 안에서 실행한다.
const $ = id => document.getElementById(id);
const store = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const won = n => n.toLocaleString('ko-KR') + '원';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const br = s => esc(s).replace(/\n/g, '<br>');
const params = new URLSearchParams(location.search);
const stars = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const heartSvg = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
const searchSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

let DB, EV;   // data/product.json, data/event.json
const byId = id => DB.products.find(p => p.id === Number(id));
const catLabel = id => DB.categories.find(c => c.id === id)?.label ?? '';

// ===== 찜 · 장바구니 · 로그인 상태 (이 브라우저에만 저장) =====
let user = store.get('momoUser', null);
let wish = store.get('momoWish', []);
let cart = store.get('momoCart', []);   // [{id, opt, qty, wrap}]
const wished = id => !!user && wish.includes(id);
const maxQty = p => Math.min(p.maxQuantity, p.stock);

function saveCart(){
  cart = cart.filter(i => byId(i.id));   // 데이터에서 사라진 상품은 정리
  store.set('momoCart', cart);
  const n = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.js-cart-count').forEach(b => b.textContent = n);
}
function addToCart(id, opt, qty, wrap){
  const same = cart.find(i => i.id === id && i.opt === opt && i.wrap === wrap);
  if (same) same.qty = Math.min(maxQty(byId(id)), same.qty + qty);
  else cart.push({id, opt, qty, wrap});
  saveCart();
}
function unitPrice(i){
  const p = byId(i.id), o = p.options?.find(o => o.id === i.opt);
  return p.price + (o?.extraPrice ?? 0) + (i.wrap ? DB.shippingPolicy.giftWrap.fee : 0);
}

// 상품 카드 (목록·메인·위시·연관상품 공통)
// 피그마 시안(sub.png) 카드: 사진 270×223 비율, 하트는 사진 밖 카테고리 오른쪽.
// BEST/NEW 뱃지는 따로 달지 않음: 사진 파일에 그려진 것을 그대로 씀
function card(p){
  const on = wished(p.id);
  return `<div class="card">
    <div class="pic"><a href="detail.html?id=${p.id}"><img src="${p.images.main}" alt="${esc(p.name)}" loading="lazy"></a></div>
    <div class="cate-row"><span class="cate">${catLabel(p.category)}</span>
      <button class="heart${on ? ' on' : ''}" data-wish="${p.id}" aria-label="${esc(p.name)} 찜하기" aria-pressed="${on}">${heartSvg}</button></div>
    <a class="name" href="detail.html?id=${p.id}">${esc(p.name)}</a>
    ${p.discountRate ? `<div class="old">${won(p.originalPrice)}</div>` : ''}
    <div class="price">${won(p.price)}${p.discountRate ? `<em>${p.discountRate}%</em>` : ''}</div>
  </div>`;
}

// 타임세일 · 쿠폰 (메인과 기획전이 같이 씀)
function renderTimesale(el){
  const t = EV.timesale, p = byId(t.productId), d = p.discountRate;
  el.innerHTML = `<div class="sec-head"><div><h3 class="title">${esc(t.title)}</h3><p>${esc(t.tags)}</p></div></div>
    <a class="timesale" href="detail.html?id=${p.id}">
      <div class="pic"><img src="${p.images.main}" alt="${esc(p.name)}"><span class="timer">남은 시간 <span class="js-timer">00:00:00</span></span></div>
      <div class="info"><div class="name">${esc(p.name)}</div>
        <div class="price">${d ? `<em>${d}%</em>` : ''}${won(p.price)}${d ? `<span class="old">${won(p.originalPrice)}</span>` : ''}</div></div>
    </a>`;
  tick();
}
function tick(){   // 오늘 자정까지 남은 시간
  const now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
  const s = Math.floor((end - now) / 1000);
  const txt = [s / 3600, s % 3600 / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':');
  document.querySelectorAll('.js-timer').forEach(el => el.textContent = txt);
}
setInterval(tick, 1000);
// action:"join"인 쿠폰은 누르면 회원가입 창이 열림
const couponsHTML = () => EV.coupons.map(c => {
  const inner = `<div><small>${esc(c.small)}</small><strong>${br(c.title)}</strong>${c.cta ? `<span class="ev-cta">${esc(c.cta)} ›</span>` : ''}</div><span class="big">${esc(c.big)}</span>`;
  return c.action === 'join' ? `<button type="button" class="event ${c.tone}" data-join>${inner}</button>` : `<div class="event ${c.tone}">${inner}</div>`;
}).join('');

// 배송 · 교환 안내 (상품 상세와 고객센터가 같이 씀). rows 값은 이미 이스케이프된 HTML
const rows = arr => `<table class="info-table">${arr.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</table>`;
const bullets = arr => `<ul class="dot-list">${arr.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
function shipDomesticHTML(){
  const d = DB.shippingPolicy.domestic;
  return rows([['배송 방법', esc(`${d.carrier} · ${d.method}`)], ['배송비', `${won(d.fee)} (${won(d.freeThreshold)} 이상 무료)`],
    ['추가 배송비', `제주 ${won(d.extraFee.jeju)} · 도서산간 ${won(d.extraFee.island)}`], ['배송 기간', esc(d.leadTime)]]);
}
function shipIntlHTML(){
  const i = DB.shippingPolicy.international;
  return rows([['배송 방법', esc(`${i.carrier} · ${i.method}`)], ['배송 기간', esc(i.leadTime)],
    ...i.regions.map(r => [esc(r.label), won(r.fee)])]) + bullets(i.notices);
}
function exchangeHTML(){
  const x = DB.shippingPolicy.exchange;
  return rows([['신청 기간', esc(x.period)], ['반품 배송비', won(x.returnFee)], ['교환 배송비', `${won(x.exchangeFee)} (왕복)`], ['문의', esc(x.contact)]])
    + `<h5 class="sub-h">교환·반품 가능</h5>${bullets(x.allowed)}<h5 class="sub-h">교환·반품 불가</h5>${bullets(x.notAllowed)}`;
}

// ===== 화면 뼈대: 각 페이지는 <main class="app"> 안에 본문만 쓰면 됨 =====
const page = location.pathname.split('/').pop() || 'index.html';
const ico = {
  best:'<path d="M20 4l4.5 9 10 1.4-7.2 7 1.7 10L20 26.8 11 31.4l1.7-10-7.2-7 10-1.4z"/>',
  gift:'<rect x="6" y="15" width="28" height="8"/><rect x="9" y="23" width="22" height="13"/><path d="M20 15v21M20 15c-3-6-10-6-9-1 1 3 9 1 9 1zM20 15c3-6 10-6 9-1-1 3-9 1-9 1z"/>',
  event:'<path d="M6 34l8-22 14 14z"/><path d="M10 23l7 7M24 6c2 2 0 4 2 6s4 0 6 2M30 4l1 3M34 10l3-1"/>',
  photo:'<rect x="5" y="12" width="30" height="21" rx="3"/><path d="M14 12l3-5h6l3 5"/><circle cx="20" cy="22" r="6"/>',
  cart:'<path d="M8 14h24l-2 20H10z"/><path d="M15 14v-3a5 5 0 0 1 10 0v3"/>',
  heart:'<path d="M20 33s-12-7.5-12-16a6.5 6.5 0 0 1 12-3.5A6.5 6.5 0 0 1 32 17c0 8.5-12 16-12 16z"/>',
  cs:'<path d="M7 20a11 10 0 1 1 6 9l-6 3 2-6a10 10 0 0 1-2-6z"/><circle cx="14" cy="20" r="1" fill="currentColor"/><circle cx="19" cy="20" r="1" fill="currentColor"/><circle cx="24" cy="20" r="1" fill="currentColor"/>',
  insta:'<rect x="7" y="7" width="26" height="26" rx="8"/><circle cx="20" cy="20" r="6"/><circle cx="28" cy="12" r="1" fill="currentColor"/>',
};
const quickMenu = [['베스트','best','list.html?sort=popular'],['신상품','event','list.html?sort=newest'],['기획전','gift','event.html'],['모모 소개','photo','about.html'],
                   ['장바구니','cart','cart.html'],['위시리스트','heart','wish.html'],['고객센터','cs','cs.html'],['인스타그램','insta','index.html#insta']];
const gnb = [['list.html','전체상품'],['event.html','기획전'],['about.html','모모 소개'],['wish.html','위시'],['cs.html','고객센터']];

const searchHTML = () => `
  <form class="s-box js-search" role="search"><input type="search" name="q" placeholder="어떤 친구를 찾으세요?" aria-label="상품 검색"><button aria-label="검색">${searchSvg}</button></form>
  <p class="s-label">최근 검색어</p><div class="recent js-recent"></div>
  <div class="s-line"></div>
  <p class="s-label">추천 태그</p><div class="chips js-popular"></div>`;

(function mountShell(){
  const app = document.querySelector('.app');
  const wrap = document.createElement('div'); wrap.className = 'wrap';
  app.before(wrap);
  wrap.innerHTML = `<aside class="side">
    <div class="side-tabs" role="tablist">
      <button class="side-tab on" data-panel="pEvent" role="tab">이벤트</button>
      <button class="side-tab" data-panel="pSearch" role="tab">검색</button>
      <button class="side-tab" data-panel="pQuick" role="tab">퀵메뉴</button>
    </div>
    <div class="panel on" id="pEvent"></div>
    <div class="panel" id="pSearch">${searchHTML()}</div>
    <div class="panel" id="pQuick"><nav class="quick">${quickMenu.map(([n, k, href]) =>
      `<a href="${href}"><div class="q-ico"><svg viewBox="0 0 40 40">${ico[k]}</svg></div>${n}</a>`).join('')}</nav></div>
  </aside>
  <button class="intro-btn" id="introBtn">인트로</button>`;
  wrap.append(app);

  app.insertAdjacentHTML('afterbegin', `
    <div class="topbar"><button type="button" class="topbar-join" data-join>신규 회원가입 시 3,000원 적립금 즉시 지급! <u>가입하기</u></button><button class="topbar-x" aria-label="닫기" onclick="this.parentNode.remove()">×</button></div>
    <header class="header">
      <div class="header-top">
        <button class="icon-btn" id="searchOpen" aria-label="검색 열기">${searchSvg}</button>
        <a href="index.html" class="logo">momo.</a>
        <div class="hd-right">
          <button class="icon-btn" id="userBtn" aria-label="로그인"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg><span class="user-dot" id="userDot" hidden></span></button>
          <a href="cart.html" class="icon-btn" aria-label="장바구니"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span class="badge js-cart-count">0</span></a>
        </div>
      </div>
      <nav class="gnb">${gnb.map(([href, n]) => `<a href="${href}"${page === href ? ' class="on" aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
    </header>`);

  app.insertAdjacentHTML('beforeend', `
    <footer class="footer" id="footer">
      <div class="footer-links"><a href="about.html">브랜드 소개</a><a href="cs.html">이용안내</a><a href="cs.html#exchange">교환·반품</a><a href="cs.html#faq">FAQ</a></div>
      <h4>고객센터</h4>
      <div class="tel">02-1234-5678</div>
      <p>평일 10:00 - 17:00 (점심 12:00 - 13:00) · 주말 및 공휴일 휴무</p>
      <div class="info">상호 모모 스튜디오 · 대표 donghoon<br>사업자등록번호 123-45-67890<br>서울특별시 성동구 성수이로 00 · <a href="mailto:cyniardz@gmail.com">cyniardz@gmail.com</a></div>
      <p class="draft" id="draftNotice"></p>
      <p class="copy">© 2026 MOMO STUDIO. ALL RIGHTS RESERVED.</p>
    </footer>`);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" id="searchModal" role="dialog" aria-modal="true" aria-label="상품 검색" hidden>
      <div class="search-sheet"><button class="login-x" data-close aria-label="닫기">×</button>${searchHTML()}</div>
    </div>
    <div class="modal" id="loginModal" role="dialog" aria-modal="true" aria-labelledby="loginTitle" hidden>
      <div class="login-card">
        <button class="login-x" data-close aria-label="닫기">×</button>
        <div id="loginOut">
          <p class="login-logo">momo.</p>
          <h2 class="title" id="loginTitle">로그인</h2>
          <form id="loginForm" novalidate>
            <label>아이디<input id="loginId" autocomplete="username"></label>
            <label>비밀번호<input id="loginPw" type="password" autocomplete="current-password"></label>
            <p class="login-err" id="loginErr" role="alert"></p>
            <button class="login-submit">로그인</button>
          </form>
          <button class="login-demo" id="loginDemo">테스트 계정으로 채우기 (momo / momo1234)</button>
          <p class="login-join">아직 회원이 아니신가요? <button type="button" data-view="join">회원가입</button></p>
        </div>
        <div id="joinView" hidden>
          <p class="login-logo">momo.</p>
          <h2 class="title" id="joinTitle">회원가입</h2>
          <p class="join-perk">가입하면 웰컴 쿠폰 3,000원을 바로 드려요 🎁</p>
          <form id="joinForm" novalidate>
            <label>아이디<input id="joinId" autocomplete="username" placeholder="영문 소문자·숫자 4~12자"></label>
            <label>이름<input id="joinName" autocomplete="name" maxlength="20"></label>
            <label>비밀번호<input id="joinPw" type="password" autocomplete="new-password" placeholder="영문·숫자 섞어 8자 이상"></label>
            <label>비밀번호 확인<input id="joinPw2" type="password" autocomplete="new-password"></label>
            <label class="join-agree"><input type="checkbox" id="joinAgree"> <span>[필수] 이용약관 및 개인정보 수집·이용에 동의해요</span></label>
            <p class="login-err" id="joinErr" role="alert"></p>
            <button class="login-submit">가입하고 쿠폰 받기</button>
          </form>
          <p class="login-join">이미 회원이신가요? <button type="button" data-view="login">로그인</button></p>
        </div>
        <div class="login-in" id="loginIn" hidden>
          <p class="login-logo">momo.</p>
          <h2 class="title" id="loginInTitle"><span id="loginName"></span>님, 반가워요!</h2>
          <p>이제 찜하기를 이용할 수 있어요.</p>
          <button class="login-submit" id="logoutBtn">로그아웃</button>
        </div>
      </div>
    </div>
    <div class="modal" id="modal" role="dialog" aria-modal="true" aria-label="모모 이벤트 안내" hidden>
      <div class="m-inner">
        <button class="m-close" data-close aria-label="닫기">×</button>
        <button class="m-arrow prev" data-move="-1" aria-label="이전 슬라이드"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <button class="m-arrow next" data-move="1" aria-label="다음 슬라이드"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
        <div class="m-track"><div class="m-slides" id="mSlides"></div></div>
        <div class="m-foot"><div class="m-dots" id="mDots"></div><button class="m-today" id="mToday">오늘 하루 보지 않기</button></div>
      </div>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
})();

// 왼쪽 탭 전환
document.querySelector('.side-tabs').onclick = e => {
  const t = e.target.closest('.side-tab'); if (!t) return;
  document.querySelectorAll('.side-tab').forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === t.dataset.panel));
};

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t.timer); t.timer = setTimeout(() => t.classList.remove('on'), 2200);
}

// ===== 모달 공통: 열려 있는 모달이 있으면 배경 스크롤 잠금 =====
const syncLock = () => document.body.style.overflow = document.querySelector('.modal:not([hidden])') ? 'hidden' : '';
function openLayer(m, focusEl){ m.hidden = false; syncLock(); (focusEl || m.querySelector('[data-close]')).focus(); }
function closeLayer(m){ m.hidden = true; syncLock(); if (m.id === 'modal') clearInterval(mTimer); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m || e.target.closest('[data-close]')) closeLayer(m);
}));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = [...document.querySelectorAll('.modal:not([hidden])')].pop();
  if (open) closeLayer(open);
});

// ===== 검색: 최근 검색어 저장 후 목록 페이지로 이동 =====
let recent = store.get('momoRecent', []);
function renderRecent(){
  const html = recent.length
    ? recent.map(w => `<button class="chip" data-q="${esc(w)}">${esc(w)} <span data-del="${esc(w)}" aria-label="${esc(w)} 삭제">×</span></button>`).join('')
    : '<p class="recent-empty">최근 검색어가 없습니다.</p>';
  document.querySelectorAll('.js-recent').forEach(el => el.innerHTML = html);
}
function search(q){
  q = q.trim(); if (!q) return;
  recent = [q, ...recent.filter(w => w !== q)].slice(0, 8); store.set('momoRecent', recent);
  location.href = 'list.html?q=' + encodeURIComponent(q);
}
document.addEventListener('submit', e => {
  if (!e.target.matches('.js-search')) return;
  e.preventDefault(); search(e.target.q.value);
});
document.addEventListener('click', e => {
  const del = e.target.dataset.del;
  if (del) { recent = recent.filter(w => w !== del); store.set('momoRecent', recent); renderRecent(); return; }
  const c = e.target.closest('[data-q]'); if (c) search(c.dataset.q);
});
$('searchOpen').onclick = () => openLayer($('searchModal'), $('searchModal').querySelector('input'));
renderRecent();

// ===== 임시 로그인 · 회원가입 =====
// shortcut: 가입 정보가 이 브라우저(localStorage)에만 저장되는 가짜 회원 기능. 실제 판매 사이트라면 서버 인증으로 교체
const USERS = [{id:'momo', pw:'momo1234', name:'모모'}];   // 공개된 테스트 계정
const accounts = () => store.get('momoAccounts', []);       // 가입한 계정: 비밀번호는 해시만 저장
async function sha256(s){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const loginModal = $('loginModal');
let view = 'login';   // 'login' | 'join'
function renderUser(){
  $('userDot').hidden = !user;
  $('userBtn').setAttribute('aria-label', user ? `${user.name}님 계정` : '로그인');
  $('loginOut').hidden = !!user || view !== 'login';
  $('joinView').hidden = !!user || view !== 'join';
  $('loginIn').hidden = !user;
  loginModal.setAttribute('aria-labelledby', user ? 'loginInTitle' : view === 'join' ? 'joinTitle' : 'loginTitle');
  if (user) $('loginName').textContent = user.name;
}
function openLogin(v = 'login'){
  view = v; renderUser(); $('loginErr').textContent = $('joinErr').textContent = '';
  openLayer(loginModal, user ? $('logoutBtn') : $(view === 'join' ? 'joinId' : 'loginId'));
}
function signIn(u){
  user = {id:u.id, name:u.name}; store.set('momoUser', user);
  $('loginForm').reset(); $('joinForm').reset(); renderUser(); closeLayer(loginModal); syncHearts();
}
loginModal.addEventListener('click', e => { const v = e.target.closest('[data-view]'); if (v) openLogin(v.dataset.view); });
// 상단 띠배너 · 웰컴 쿠폰 등 [data-join]을 누르면 회원가입 창
document.addEventListener('click', e => {
  if (!e.target.closest('[data-join]')) return;
  if (user) toast(`${user.name}님은 이미 회원이에요. 쿠폰은 주문할 때 적용돼요`);
  else openLogin('join');
});
$('joinForm').onsubmit = async e => {
  e.preventDefault();
  const id = $('joinId').value.trim(), name = $('joinName').value.trim(), pw = $('joinPw').value;
  const err = !/^[a-z0-9]{4,12}$/.test(id) ? '아이디는 영문 소문자·숫자 4~12자로 만들어 주세요.'
    : USERS.some(u => u.id === id) || accounts().some(a => a.id === id) ? '이미 사용 중인 아이디예요.'
    : !name ? '이름을 입력해 주세요.'
    : !(pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw)) ? '비밀번호는 영문과 숫자를 섞어 8자 이상으로 만들어 주세요.'
    : pw !== $('joinPw2').value ? '비밀번호 확인이 일치하지 않아요.'
    : !$('joinAgree').checked ? '필수 약관에 동의해 주세요.' : '';
  if (err) { $('joinErr').textContent = err; return; }
  const acc = {id, name, pwHash: await sha256(id + ':' + pw)};
  store.set('momoAccounts', [...accounts(), acc]);
  signIn(acc);
  toast(`${name}님, 환영해요! 웰컴 쿠폰 3,000원이 발급됐어요 🎁`);
};
function syncHearts(){
  document.querySelectorAll('[data-wish]').forEach(b => { const on = wished(+b.dataset.wish); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  document.dispatchEvent(new Event('wishchange'));
}
$('userBtn').onclick = () => openLogin();   // 클릭 이벤트가 view 인자로 들어가지 않게
$('loginDemo').onclick = () => { $('loginId').value = 'momo'; $('loginPw').value = 'momo1234'; $('loginId').focus(); };
$('loginForm').onsubmit = async e => {
  e.preventDefault();
  const id = $('loginId').value.trim(), pw = $('loginPw').value;
  if (!id || !pw) { $('loginErr').textContent = '아이디와 비밀번호를 입력해 주세요.'; return; }
  const acc = accounts().find(a => a.id === id);
  const found = USERS.find(u => u.id === id && u.pw === pw) || (acc && acc.pwHash === await sha256(id + ':' + pw) ? acc : null);
  if (!found) { $('loginErr').textContent = '아이디 또는 비밀번호가 맞지 않아요.'; $('loginPw').value = ''; return; }
  signIn(found);
};
$('logoutBtn').onclick = () => { user = null; store.set('momoUser', null); renderUser(); closeLayer(loginModal); syncHearts(); };
renderUser();

// 찜 (모든 카드·상세 공통). 찜은 로그인 후에만
document.addEventListener('click', e => {
  const h = e.target.closest('[data-wish]'); if (!h) return;
  if (!user) { openLogin(); return; }
  const id = +h.dataset.wish, add = !wish.includes(id);
  wish = add ? [...wish, id] : wish.filter(x => x !== id);
  store.set('momoWish', wish); syncHearts();
  toast(add ? '위시리스트에 담았어요' : '위시리스트에서 뺐어요');
});

// ===== 일체형 모달: 슬라이드 + 닫기(X, ESC, 바깥 클릭) + 오늘 하루 보지 않기 =====
const modal = $('modal'), mSlides = $('mSlides');
let mIdx = 0, mTimer, mDots = [];
function mGo(i){
  const total = mSlides.children.length;
  mIdx = (i + total) % total;
  mSlides.style.transform = `translateX(-${mIdx * 100}%)`;
  mDots.forEach((d, k) => d.classList.toggle('on', k === mIdx));
}
function restart(){ clearInterval(mTimer); mTimer = setInterval(() => mGo(mIdx + 1), 3500); }
function openModal(){ openLayer(modal); mGo(0); restart(); }
const today = new Date().toDateString();
$('mToday').onclick = () => { store.set('momoHideModal', today); closeLayer(modal); };
// 좌우 화살표 버튼 + 키보드 ←/→
modal.addEventListener('click', e => { const b = e.target.closest('[data-move]'); if (b) { mGo(mIdx + +b.dataset.move); restart(); } });
document.addEventListener('keydown', e => {
  if (modal.hidden || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  mGo(mIdx + (e.key === 'ArrowLeft' ? -1 : 1)); restart();
});
$('introBtn').onclick = openModal;

// ===== 데이터 불러오기 =====
const ready = Promise.all(['data/product.json', 'data/event.json'].map(u =>
  fetch(u).then(r => { if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); })))
  .then(([d, e]) => {
    DB = d; EV = e;
    const s = EV.side;
    $('pEvent').innerHTML = `<p class="ev-eyebrow">${esc(s.eyebrow)}</p><h2 class="ev-title">${esc(s.title)}</h2><p class="ev-sub">${esc(s.sub)}</p>
      <a href="${s.link}" class="ev-visual"><div class="photo"><img src="${s.image}" alt="${esc(s.alt)}"></div><div class="ev-badge"><i>${esc(s.badgeLabel)}</i><b>${esc(s.badgeValue)}</b></div></a>
      <p class="ev-period">${esc(s.period)}</p>`;
    // 추천 태그: 상품 해시태그 중 많이 쓰인 순 (search.json 대신)
    const count = {};
    DB.products.flatMap(p => p.hashtags).filter(t => t !== '#모모').forEach(t => count[t] = (count[t] || 0) + 1);
    const tags = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 10);
    document.querySelectorAll('.js-popular').forEach(el => el.innerHTML =
      tags.map((t, i) => `<button class="chip" data-q="${esc(t.slice(1))}"><em>${i + 1}</em>${esc(t)}</button>`).join(''));

    mSlides.innerHTML = EV.modal.slides.map(m => `<a class="m-slide" href="${m.link}">
      <p class="m-eyebrow">${esc(m.eyebrow)}</p><h2 class="m-title">${br(m.title)}</h2><p class="m-desc">${br(m.desc)}</p>
      <div class="m-photo"><img src="${m.image}" alt="${esc(m.alt)}"></div><div class="m-note">${br(m.note)}</div></a>`).join('');
    $('mDots').innerHTML = EV.modal.slides.map((_, i) => `<button aria-label="${i + 1}번 슬라이드"></button>`).join('');
    mDots = [...$('mDots').children];
    mDots.forEach((d, k) => d.onclick = () => { mGo(k); restart(); });
    // 첫 방문 팝업은 <body data-intro>인 페이지(메인)에서만 자동으로 열림
    if ('intro' in document.body.dataset && store.get('momoHideModal', '') !== today) openModal();

    if (DB.meta.isDraft) $('draftNotice').textContent = '※ ' + DB.meta.draftNotice;
    saveCart(); syncHearts();
    return DB;
  });
// 주소의 #위치는 데이터로 내용이 다 그려진 뒤에 다시 맞춤 (각 페이지 then 다음에 실행)
ready.then(() => setTimeout(() => {
  try { if (location.hash.length > 1) document.querySelector(location.hash)?.scrollIntoView(); } catch {}
}));
ready.catch(err => {
  console.error(err);
  document.querySelector('.header').insertAdjacentHTML('afterend',
    '<p class="load-err">상품 데이터를 불러오지 못했어요.<br>HTML 파일을 더블클릭해서 열었다면 VS Code의 Live Server 같은 로컬 서버로 열어 주세요.</p>');
});
