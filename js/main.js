/* ==========================================================================
   main.js — 渲染与交互
   职责：
     1) 依据 data.js 渲染项目列表（编号、技术栈、展开说明自动生成）
     2) 从项目数据派生分类筛选按钮并实现筛选
     3) 导航：吸顶阴影、当前区块高亮、移动端菜单
     4) 滚动显现动画（尊重 prefers-reduced-motion）
   ========================================================================== */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 工具 ---------- */
  const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  };
  const pad2 = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- 1. 渲染项目 ---------- */
  const list = document.getElementById('worksList');

  // 按完成时间倒序（data.js 中已按倒序书写，这里再排一次保证新增时无序也能正确）
  const works = PROJECTS.slice().sort((a, b) =>
    String(b.date).localeCompare(String(a.date)));

  works.forEach((p, i) => {
    const fig = pad2(i + 1);
    const card = el('article', `work work--${p.layout}${p.flip ? ' work--flip' : ''}`);
    card.dataset.category = p.category;
    card.id = `work-${p.id}`;

    // 图片
    const media = el('div', 'work__media');
    media.appendChild(el('span', 'work__fig', `FIG.${fig}`));
    const img = document.createElement('img');
    img.src = p.image;
    img.alt = `${p.title} 项目配图`;
    img.loading = 'lazy';
    media.appendChild(img);

    // 文字
    const body = el('div', 'work__body');
    body.appendChild(el('div', 'work__head',
      `<span class="work__num">${fig}</span>` +
      `<span class="work__cat">${esc(p.category)}</span>` +
      `<span class="work__date">${esc(p.date)}</span>`));

    body.appendChild(el('h3', 'work__title', esc(p.title)));
    if (p.sub) body.appendChild(el('p', 'work__sub', esc(p.sub)));

    // 标签（tags），显示在标题下方、简介上方
    if (p.tags && p.tags.length) {
      const tagRow = el('div', 'work__tags');
      p.tags.forEach((t) => tagRow.appendChild(el('span', 'work__tag', esc(t))));
      body.appendChild(tagRow);
    }

    if (p.desc) body.appendChild(el('p', 'work__desc', esc(p.desc)));

    // 技术栈（点线式定义列表）
    if (p.stack && p.stack.length) {
      const stack = el('dl', 'work__stack');
      stack.appendChild(el('dt', null, '技术栈'));
      p.stack.forEach((s, idx) => {
        if (idx) stack.appendChild(el('dd', 'sep', '/'));
        stack.appendChild(el('dd', null, esc(s)));
      });
      body.appendChild(stack);
    }

    // 局部色块指标
    if (p.stat) {
      body.appendChild(el('span', 'work__stat',
        `<b>${esc(p.stat.value)}</b>${esc(p.stat.label)}`));
    }

    // 展开详情
    if (p.detail && p.detail.length) {
      const detail = el('div', 'work__detail');
      const inner = el('div');
      p.detail.forEach((t) => inner.appendChild(el('p', null, esc(t))));
      detail.appendChild(inner);

      const btn = el('button', 'work__more', '展开设计说明');
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => {
        const open = detail.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? '收起设计说明' : '展开设计说明';
      });

      body.appendChild(btn);
      body.appendChild(detail);
    }

    card.appendChild(media);
    card.appendChild(body);
    list.appendChild(card);
  });

  /* ---------- 2. 分类筛选 ---------- */
  const filterBar = document.getElementById('filter');
  const cats = ['全部', ...new Set(works.map((p) => p.category))];
  const countOf = (c) => (c === '全部' ? works.length : works.filter((p) => p.category === c).length);

  cats.forEach((c, i) => {
    const btn = el('button', `filter__btn${i === 0 ? ' is-active' : ''}`,
      `${esc(c)}<sup>${pad2(countOf(c))}</sup>`);
    btn.type = 'button';
    btn.dataset.filter = c;
    btn.setAttribute('aria-pressed', String(i === 0));
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('.filter__btn').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      applyFilter(c);
    });
    filterBar.appendChild(btn);
  });

  function applyFilter(cat) {
    list.querySelectorAll('.work').forEach((card) => {
      const show = cat === '全部' || card.dataset.category === cat;
      card.classList.toggle('is-hidden', !show);
    });
    const visible = list.querySelectorAll('.work:not(.is-hidden)');
    // 重新编号，让筛选后的序号保持连续
    visible.forEach((card, i) => {
      const num = card.querySelector('.work__num');
      const fig = card.querySelector('.work__fig');
      if (num) num.textContent = pad2(i + 1);
      if (fig) fig.textContent = `FIG.${pad2(i + 1)}`;
    });
    const end = document.getElementById('worksEnd');
    if (end) end.textContent = visible.length
      ? `— 共 ${pad2(visible.length)} 件作品 —`
      : '— 该分类暂无作品 —';
  }

  /* ---------- 3. 导航交互 ---------- */
  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('navLinks');
  const navToggle = document.getElementById('navToggle');

  // 吸顶阴影
  const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 移动端菜单
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  });
  navLinks.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      navLinks.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // 当前区块高亮
  const linkMap = new Map();
  navLinks.querySelectorAll('.nav__link').forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    const sec = document.getElementById(id);
    if (sec) linkMap.set(sec, a);
  });

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      linkMap.forEach((a) => a.classList.remove('is-active'));
      const active = linkMap.get(e.target);
      if (active) active.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  linkMap.forEach((_a, sec) => spy.observe(sec));

  /* ---------- 4. 滚动显现 ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if (REDUCED || !('IntersectionObserver' in window)) {
    reveals.forEach((r) => r.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach((r) => io.observe(r));
    // JS 渲染出的项目卡片也加入显现动画
    list.querySelectorAll('.work').forEach((card, i) => {
      card.classList.add('reveal');
      card.style.setProperty('--d', `${Math.min(i, 3) * 0.05}s`);
      io.observe(card);
    });
  }
})();
