// 상품 상세 (detail.html?id=번호)
ready.then(() => {
  const p = byId(params.get('id'));
  if (!p) { location.replace('404.html'); return; }
  document.title = `${p.name} | momo.`;
  const pol = DB.shippingPolicy, max = maxQty(p);

  $('crumb').innerHTML = `<a href="index.html">홈</a> › <a href="list.html?cat=${p.category}">${esc(catLabel(p.category))}</a> › <span>${esc(p.name)}</span>`;

  // 갤러리: 썸네일을 누르면 큰 사진이 바뀜
  const imgs = [p.images.main, ...p.images.details];
  $('pdMain').innerHTML = `<img id="mainImg" src="${imgs[0]}" alt="${esc(p.pose)}">`;
  $('pdThumbs').innerHTML = imgs.length > 1 ? imgs.map((src, i) =>
    `<button type="button" class="${i ? '' : 'on'}" data-src="${src}" aria-label="${i + 1}번째 사진 보기"><img src="${src}" alt=""></button>`).join('') : '';
  $('pdThumbs').onclick = e => {
    const t = e.target.closest('[data-src]'); if (!t) return;
    $('mainImg').src = t.dataset.src;
    $('pdThumbs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === t));
  };

  const d = p.discountRate;
  $('pdInfo').innerHTML = `
    <p class="pd-cate">${esc(catLabel(p.category))}${p.edition === 'limited' ? ' · 한정판' : ''}</p>
    <h2 class="pd-name title">${esc(p.name)}</h2>
    <a class="pd-rating" href="#tReview" data-tab="bReview"><span class="stars-c">${stars(p.rating.average)}</span> ${p.rating.average} <span>(${p.rating.count}개 후기)</span></a>
    <p class="pd-summary">${esc(p.summary)}</p>
    <div class="pd-price">${d ? `<em>${d}%</em>` : ''}<b>${won(p.price)}</b>${d ? `<span class="old">${won(p.originalPrice)}</span>` : ''}</div>
    <p class="pd-tags">${p.hashtags.map(t => `<a href="list.html?q=${encodeURIComponent(t.slice(1))}">${esc(t)}</a>`).join(' ')}</p>
    ${p.preorder?.isPreorder ? `<div class="notice-box"><b>예약판매 상품</b><p>${esc(p.preorder.notice)}</p><p>${esc(pol.preorderNotice)}</p></div>` : ''}
    <ul class="pd-ship">
      <li>배송비 ${won(pol.domestic.fee)} <span>(${won(pol.domestic.freeThreshold)} 이상 무료)</span></li>
      <li>${p.shipping.international ? '해외배송 가능' : '국내배송 전용'}${p.giftWrap ? ' · 선물포장 가능' : ''}</li>
    </ul>`;

  // 구매 영역: 옵션(S/M/L 등) · 수량 · 선물포장 → 합계
  $('pdBuy').innerHTML = `
    ${p.options ? `<fieldset class="pd-opts"><legend>옵션 선택</legend>${p.options.map((o, i) =>
      `<label><input type="radio" name="opt" value="${o.id}"${i ? '' : ' checked'}><span>${esc(o.label)}${o.extraPrice ? ` <small>+${won(o.extraPrice)}</small>` : ''}</span></label>`).join('')}</fieldset>` : ''}
    <div class="pd-row"><span>수량 <small>(최대 ${max}개)</small></span>
      <div class="stepper"><button type="button" data-step="-1" aria-label="수량 줄이기">−</button><input id="qty" type="number" min="1" max="${max}" value="1" aria-label="수량"><button type="button" data-step="1" aria-label="수량 늘리기">+</button></div></div>
    ${p.giftWrap ? `<label class="pd-row pd-wrap"><span><input type="checkbox" id="wrap"> 선물포장 추가 <small>+${won(pol.giftWrap.fee)}/개</small></span></label>
      <p class="pd-wrap-note">${esc(pol.giftWrap.notice)}</p>` : ''}
    <div class="pd-total"><span>총 상품금액</span><b id="total"></b></div>
    <div class="pd-btns">
      <button type="button" class="heart pd-heart" data-wish="${p.id}" aria-label="찜하기" aria-pressed="false">${heartSvg}</button>
      <button class="btn-primary">${p.preorder?.isPreorder ? '예약 주문 담기' : '장바구니 담기'}</button>
    </div>`;
  syncHearts();
  const form = $('pdBuy'), qty = $('qty');
  const current = () => ({id:p.id, opt:form.opt?.value ?? null, qty:Math.min(max, Math.max(1, +qty.value || 1)), wrap:!!$('wrap')?.checked});
  const update = () => { const c = current(); qty.value = c.qty; $('total').textContent = won(unitPrice(c) * c.qty); };
  form.addEventListener('click', e => { const s = e.target.closest('[data-step]'); if (s) { qty.value = +qty.value + +s.dataset.step; update(); } });
  form.oninput = e => { if (e.target !== qty) update(); };   // 수량은 입력 중에 고치지 않고 change에서 보정
  qty.onchange = update;
  form.onsubmit = e => {
    e.preventDefault();
    const c = current();
    addToCart(c.id, c.opt, c.qty, c.wrap);
    toast('장바구니에 담았어요 🧸');
  };
  update();

  // 탭
  const specLabel = {material:'소재', size:'크기', weight:'무게', care:'관리 방법', components:'구성'};
  $('tDetail').innerHTML = `<p class="pd-story">${esc(p.summary)}</p>
    <div class="pd-detail-imgs">${imgs.map(src => `<img src="${src}" alt="${esc(p.pose)}" loading="lazy">`).join('')}</div>`;
  $('tSpec').innerHTML = `<h4 class="tab-h">상품 정보</h4>${rows(Object.entries(p.specs).map(([k, v]) => [specLabel[k] || esc(k), esc(v)]))}
    <h4 class="tab-h">KC 안전 표기</h4>${rows([['인증 구분', esc(p.safety.kc)], ['인증 번호', esc(p.safety.kcNumber)], ['사용 연령', esc(p.safety.age)]])}
    <p class="warn">⚠ ${esc(p.safety.warning)}</p>`;
  $('tShip').innerHTML = `<h4 class="tab-h">국내 배송</h4>${shipDomesticHTML()}
    <h4 class="tab-h">해외 배송</h4>${p.shipping.international ? shipIntlHTML() : '<p class="muted">이 상품은 해외배송이 되지 않아요.</p>'}
    ${p.giftWrap ? `<h4 class="tab-h">선물 포장</h4><p class="muted">${won(pol.giftWrap.fee)} · ${esc(pol.giftWrap.notice)}</p>` : ''}
    <h4 class="tab-h">교환 · 반품</h4>${exchangeHTML()}
    <a class="more-pill" href="cs.html#exchange">고객센터에서 자세히 보기</a>`;
  $('bReview').textContent = `후기 ${p.rating.count}`;
  $('tReview').innerHTML = `<div class="rv-summary"><b>${p.rating.average}</b><span class="stars-c">${stars(p.rating.average)}</span><p>${p.rating.count}개의 후기</p></div>
    ${p.reviews.map(r => `<article class="rv"><div class="rv-top"><span class="stars-c">${stars(r.rating)}</span><span>${esc(r.author)} · ${r.date}</span></div>
      ${r.option ? `<p class="rv-opt">옵션: ${esc(r.option)}</p>` : ''}<p>${esc(r.content)}</p></article>`).join('')}
    <p class="muted rv-more">최근 후기 ${p.reviews.length}개만 보여드려요.</p>`;

  const tabs = [...$('pdTabs').children];
  function showTab(btn){
    tabs.forEach(t => { const on = t === btn; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); $(t.getAttribute('aria-controls')).hidden = !on; });
  }
  $('pdTabs').onclick = e => { const t = e.target.closest('[role=tab]'); if (t) showTab(t); };
  document.querySelector('[data-tab]').onclick = e => { e.preventDefault(); showTab($('bReview')); $('pdTabs').scrollIntoView({behavior:'smooth'}); };
  if (location.hash === '#reviews') { showTab($('bReview')); history.replaceState(null, '', '#pdTabs'); }   // 스크롤은 common.js가 맞춤

  $('related').innerHTML = p.relatedIds.map(byId).filter(Boolean).map(card).join('');
});
