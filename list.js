// 상품 목록 (list.html?cat=&q=&sort=&price=&edition=&cond=&page=)
ready.then(() => {
  const F = DB.filters;
  // 상태는 주소창과 같이 움직임 → 새로고침·뒤로가기·링크 공유해도 같은 화면
  const st = {
    cat: params.get('cat') || '',
    q: params.get('q') || '',
    sort: params.get('sort') || F.sortOptions[0].id,
    price: params.get('price') || '',
    edition: params.getAll('edition'),
    cond: params.getAll('cond'),
    page: +params.get('page') || 1,
  };
  const norm = s => s.replace(/\s/g, '').toLowerCase();   // "미니키링" = "미니 키링"
  const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);
  const condOk = {giftWrap: p => p.giftWrap, preorder: p => p.preorder?.isPreorder, international: p => p.shipping.international};

  const radio = (name, id, label, on) => `<label class="opt"><input type="radio" name="${name}" value="${id}"${on ? ' checked' : ''}> ${esc(label)}</label>`;
  const check = (name, id, label, on) => `<label class="opt"><input type="checkbox" name="${name}" value="${id}"${on ? ' checked' : ''}> ${esc(label)}</label>`;
  $('fPrice').innerHTML = radio('price', '', '전체', !st.price) + F.priceRanges.map(r => radio('price', r.id, r.label, st.price === r.id)).join('');
  $('fEdition').innerHTML = F.edition.map(r => check('edition', r.id, r.label, st.edition.includes(r.id))).join('');
  $('fCond').innerHTML = F.conditions.map(r => check('cond', r.id, r.label, st.cond.includes(r.id))).join('');
  $('sort').innerHTML = F.sortOptions.map(o => `<option value="${o.id}"${o.id === st.sort ? ' selected' : ''}>${esc(o.label)}</option>`).join('');

  function render(){
    const range = F.priceRanges.find(r => r.id === st.price);
    const q = norm(st.q), so = F.sortOptions.find(o => o.id === st.sort) || F.sortOptions[0];
    const list = DB.products.filter(p =>
      (!st.cat || p.category === st.cat) &&
      (!q || norm([p.name, catLabel(p.category), ...p.hashtags].join('')).includes(q)) &&
      (!range || (p.price >= range.min && (range.max == null || p.price < range.max))) &&
      (!st.edition.length || st.edition.includes(p.edition)) &&
      st.cond.every(c => condOk[c]?.(p))
    ).sort((a, b) => {
      const x = get(a, so.key), y = get(b, so.key), r = x < y ? -1 : x > y ? 1 : 0;
      return so.order === 'desc' ? -r : r;
    });

    const size = DB.meta.pageSize, pages = Math.max(1, Math.ceil(list.length / size));
    st.page = Math.min(Math.max(1, st.page), pages);

    $('catChips').innerHTML = [{id:'', label:'전체'}, ...DB.categories].map(c =>
      `<button class="tab${st.cat === c.id ? ' on' : ''}" data-cat="${c.id}">${esc(c.label)}</button>`).join('');
    $('listTitle').textContent = st.q ? `'${st.q}' 검색 결과` : st.cat ? catLabel(st.cat) : '모두의 일상에 작은 행복을';
    $('listSub').textContent = st.q || st.cat ? '마음에 드는 친구를 찾아보세요' : '모모 친구들을 모두 만나보세요';
    $('listCount').textContent = `총 ${list.length}개`;
    const n = (st.price ? 1 : 0) + st.edition.length + st.cond.length;
    $('filterCount').textContent = n ? `(${n})` : '';

    $('grid').innerHTML = list.length
      ? list.slice((st.page - 1) * size, st.page * size).map(card).join('')
      : `<p class="empty">찾는 친구가 아직 없어요 🧸<br><button class="more-btn" id="clearAll">조건 모두 지우기</button></p>`;
    $('pager').innerHTML = pages > 1 ? Array.from({length:pages}, (_, i) =>
      `<button data-page="${i + 1}"${i + 1 === st.page ? ' class="on" aria-current="page"' : ''}>${i + 1}</button>`).join('') : '';

    const u = new URLSearchParams();
    if (st.cat) u.set('cat', st.cat); if (st.q) u.set('q', st.q);
    if (st.sort !== F.sortOptions[0].id) u.set('sort', st.sort); if (st.price) u.set('price', st.price);
    st.edition.forEach(v => u.append('edition', v)); st.cond.forEach(v => u.append('cond', v));
    if (st.page > 1) u.set('page', st.page);
    history.replaceState(null, '', 'list.html' + (u.toString() ? '?' + u : ''));
  }

  $('catChips').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; st.cat = b.dataset.cat; st.page = 1; render(); };
  $('sort').onchange = e => { st.sort = e.target.value; st.page = 1; render(); };
  $('filters').onchange = () => {
    const fd = new FormData($('filters'));
    st.price = fd.get('price') || ''; st.edition = fd.getAll('edition'); st.cond = fd.getAll('cond'); st.page = 1; render();
  };
  $('filterBtn').onclick = () => { const f = $('filters'); f.hidden = !f.hidden; $('filterBtn').setAttribute('aria-expanded', !f.hidden); };
  // reset()은 처음 그린 상태(주소창 조건)로 되돌리므로 직접 비움
  const clear = () => { $('filters').querySelectorAll('input').forEach(i => i.checked = i.name === 'price' && !i.value); Object.assign(st, {cat:'', q:'', price:'', edition:[], cond:[], page:1}); render(); };
  $('resetBtn').onclick = clear;
  $('grid').addEventListener('click', e => { if (e.target.id === 'clearAll') clear(); });
  $('pager').onclick = e => {
    const b = e.target.closest('[data-page]'); if (!b) return;
    st.page = +b.dataset.page; render(); $('catChips').scrollIntoView({behavior:'smooth'});
  };
  render();
});
