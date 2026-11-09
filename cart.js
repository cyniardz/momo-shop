// 장바구니 (localStorage 'momoCart')
ready.then(() => {
  const pol = DB.shippingPolicy;

  function render(){
    if (!cart.length) {
      $('cartSub').textContent = '';
      $('cartList').innerHTML = `<div class="empty-box"><img src="images/product_17.png" alt="앉아서 쉬는 모모"><p>장바구니가 비어 있어요.<br>모모 친구들을 데려가 보세요!</p><a class="btn-primary" href="list.html">상품 보러 가기</a></div>`;
      $('cartSum').innerHTML = '';
      return;
    }
    $('cartSub').textContent = `${cart.reduce((s, i) => s + i.qty, 0)}개 상품`;
    $('cartList').innerHTML = cart.map((i, k) => {
      const p = byId(i.id), o = p.options?.find(o => o.id === i.opt);
      return `<div class="cart-item">
        <a class="pic" href="detail.html?id=${p.id}"><img src="${p.images.main}" alt="${esc(p.name)}"></a>
        <div class="ci-body">
          <a class="ci-name" href="detail.html?id=${p.id}">${esc(p.name)}</a>
          <p class="ci-opt">${[o && o.label, i.wrap && '선물포장', p.preorder?.isPreorder && '예약판매'].filter(Boolean).map(esc).join(' · ') || '기본 구성'}</p>
          <div class="ci-row">
            <div class="stepper sm"><button data-k="${k}" data-step="-1" aria-label="수량 줄이기">−</button><span aria-live="polite">${i.qty}</span><button data-k="${k}" data-step="1" aria-label="수량 늘리기">+</button></div>
            <b>${won(unitPrice(i) * i.qty)}</b>
          </div>
        </div>
        <button class="ci-del" data-del-item="${k}" aria-label="${esc(p.name)} 삭제">×</button>
      </div>`;
    }).join('');

    // 배송비는 상품금액(옵션 포함, 포장비 제외) 기준
    const goods = cart.reduce((s, i) => s + (unitPrice(i) - (i.wrap ? pol.giftWrap.fee : 0)) * i.qty, 0);
    const wrapFee = cart.reduce((s, i) => s + (i.wrap ? pol.giftWrap.fee * i.qty : 0), 0);
    const ship = goods >= pol.domestic.freeThreshold ? 0 : pol.domestic.fee;
    const left = pol.domestic.freeThreshold - goods;
    $('cartSum').innerHTML = `
      ${left > 0 ? `<p class="free-hint">${won(left)} 더 담으면 <b>무료배송</b>이에요!</p>` : '<p class="free-hint"><b>무료배송</b> 조건을 채웠어요 🎉</p>'}
      ${cart.some(i => byId(i.id).preorder?.isPreorder) ? `<div class="notice-box"><b>예약판매 상품 포함</b><p>${esc(pol.preorderNotice)}</p></div>` : ''}
      ${rows([['상품금액', won(goods)], ['선물포장', won(wrapFee)], ['배송비', ship ? won(ship) : '무료'], ['<b>결제 예정 금액</b>', `<b class="sum-total">${won(goods + wrapFee + ship)}</b>`]])}
      <p class="muted">제주 ${won(pol.domestic.extraFee.jeju)} · 도서산간 ${won(pol.domestic.extraFee.island)} 추가 배송비는 주문 시 더해져요.</p>
      <button class="btn-primary block" id="orderBtn">주문하기</button>
      <button class="text-btn" id="clearCart">장바구니 비우기</button>`;
  }

  $('cartList').onclick = e => {
    const s = e.target.closest('[data-step]'), d = e.target.closest('[data-del-item]');
    if (s) { const i = cart[s.dataset.k]; i.qty = Math.min(maxQty(byId(i.id)), Math.max(1, i.qty + +s.dataset.step)); }
    else if (d) cart.splice(+d.dataset.delItem, 1);
    else return;
    saveCart(); render();
  };
  $('cartSum').onclick = e => {
    if (e.target.id === 'orderBtn') toast('주문·결제는 포트폴리오 범위 밖이라 여기까지예요 🙏');
    if (e.target.id === 'clearCart' && confirm('장바구니를 모두 비울까요?')) { cart = []; saveCart(); render(); }
  };
  render();
});
