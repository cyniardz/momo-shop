// 메인 페이지 (index.html). 공통 기능은 common.js
ready.then(() => {
  const P = DB.products;
  const bySales = [...P].sort((a, b) => b.salesCount - a.salesCount);

  // 카테고리 원형 메뉴: 카테고리별 첫 상품 사진을 아이콘으로
  $('cats').innerHTML = DB.categories.map(c => {
    const p = P.find(p => p.category === c.id);
    return `<a href="list.html?cat=${c.id}" class="cat"><div class="circle">${p ? `<img src="${p.images.main}" alt="">` : ''}</div>${esc(c.label)}</a>`;
  }).join('');

  $('bestGrid').innerHTML = bySales.slice(0, 6).map(card).join('');
  renderTimesale($('timesale'));

  // 선물 기획전 탭
  const themes = EV.giftThemes;
  $('giftTabs').innerHTML = themes.map((t, i) => `<button class="tab${i ? '' : ' on'}" data-theme="${t.id}">${esc(t.label)}</button>`).join('');
  const renderGift = id => $('giftList').innerHTML = themes.find(t => t.id === id).productIds.map(byId).filter(Boolean).map(card).join('');
  $('giftTabs').onclick = e => {
    const t = e.target.closest('.tab'); if (!t) return;
    $('giftTabs').querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    renderGift(t.dataset.theme);
  };
  renderGift(themes[0].id);

  // 순위 (첫 항목만 펼침)
  $('rankList').innerHTML = bySales.slice(0, 5).map((p, i) => `
    <details ${i === 0 ? 'open' : ''}>
      <summary><span class="num">${i + 1}</span>${esc(p.name)}</summary>
      <a class="body" href="detail.html?id=${p.id}"><div class="pic"><img src="${p.images.main}" alt="${esc(p.name)}" loading="lazy"></div>
        <div><div class="rank-sum">${esc(p.summary)}</div><div class="rank-price">${won(p.price)}</div></div>
      </a>
    </details>`).join('');

  $('couponList').innerHTML = couponsHTML();

  // 베스트 리뷰: 별 5개 리뷰를 최신순으로 6개
  const best = P.flatMap(p => p.reviews.filter(r => r.rating === 5).map(r => ({...r, p})))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  $('reviewList').innerHTML = best.map(r => `
    <a class="review" href="detail.html?id=${r.p.id}#reviews"><div class="pic"><img src="${r.p.images.main}" alt="${esc(r.p.name)}" loading="lazy"></div>
      <div class="stars">${stars(r.rating)}<span>${r.rating.toFixed(1)}</span></div><p>${esc(r.content)}</p><div class="who">${esc(r.author)} · ${esc(r.p.name)}</div></a>`).join('');

  // 인스타: 갤러리 포즈 사진 6장
  $('instaGrid').innerHTML = DB.gallery.items.slice(0, 6).map(g =>
    `<a href="about.html#gallery"><img src="${g.image}" alt="${esc(g.caption)}" loading="lazy"></a>`).join('');
});

// 메인 슬라이드 자동 넘김 (데이터와 무관)
let idx = 0;
const slides = $('slides'), total = slides.children.length;
setInterval(() => {
  idx = (idx + 1) % total;
  slides.style.transform = `translateX(-${idx * 100}%)`;
  $('heroCount').textContent = `${idx + 1} / ${total}`;
}, 4000);
