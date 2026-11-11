// Playground: projects travel along an arc and lock into the centre.
// Scroll, drag the tick rail or the stage, click a neighbour, or use the arrow keys.
(function () {
    const root = document.getElementById('play');
    if (!root) return;

    const items = [...root.querySelectorAll('.play-item')];
    const n = items.length;
    if (!n) return;

    const rail      = root.querySelector('.play-rail');
    const tickRow   = root.querySelector('.play-ticks');
    const railIndex = root.querySelector('.play-rail-index');
    const hint      = root.querySelector('.play-hint');
    const info      = root.querySelector('.play-info');
    const count     = info.querySelector('.play-count-current');
    const title     = info.querySelector('.play-title');
    const desc      = info.querySelector('.play-desc');
    const link      = info.querySelector('.play-link');
    const peek      = root.querySelector('.play-peek');
    const peekVideo = peek.querySelector('.play-peek-media');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia('(max-width: 820px)');
    const touchscreen = window.matchMedia('(pointer: coarse)').matches;

    // Arc + motion tuning
    // Angle along the arc for a project d steps from the centre: widest spacing around the
    // centre (room to breathe), tightening further out so the outer projects still peek in.
    const ARC_FAR   = 0.26;   // radians per step far from the centre
    const ARC_NEAR  = 0.5;    // extra spread concentrated around the centre
    const arcAngle  = (d) => ARC_FAR * d + ARC_NEAR * Math.tanh(d);
    const SPIRAL    = 0.06;   // how much the arc tightens per step away from the centre
    const SHRINK    = 0.6;    // how quickly projects shrink away from the centre
    const VISIBLE   = 3.4;    // projects further than this from the centre are hidden
    const STIFFNESS = 260;    // lock spring: higher is snappier
    const DAMPING   = 2 * Math.sqrt(STIFFNESS) * 0.75; // slightly under-damped: a quick settle
    // Stage drag distance that moves one project: shorter on phones and short (landscape) screens.
    const dragPx    = () => (compact.matches ? 170 : Math.min(240, root.clientHeight * 0.45));
    const DWELL_MS  = 1200;   // resting on a project this long opens its peek

    // Rail tuning (same swell as the case-study sidebar)
    const TICK_SPACING = 6;
    const SWELL        = 14;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const pad = (i) => String(i).padStart(2, '0');
    const falloff = (d, spread) => Math.exp(-(d * d) / (2 * spread * spread));

    const data = items.map((item) => ({
        title: item.querySelector('h2').textContent,
        desc: item.querySelector('p').textContent,
        href: item.querySelector('a')?.getAttribute('href') || null,
        preview: item.dataset.preview || null,
        poster: item.dataset.poster || null,
    }));

    root.classList.add('is-ready');
    document.body.classList.add('play-active');

    // On touchscreens the main gesture is swiping up, not dragging the rail.
    if (hint && touchscreen) {
        hint.innerHTML = 'swipe <span>&uarr;</span>';
        hint.classList.add('is-up');
    }
    rail.setAttribute('aria-valuemax', n);

    // ── Geometry ────────────────────────────────────────────────────
    let geo = {};
    let ticks = [];

    function layout() {
        const w = root.clientWidth;
        const h = root.clientHeight;
        const small = compact.matches;
        const apexX = w * (small ? 0.56 : 0.44);
        const apexY = h * (small ? 0.38 : 0.5);
        const radius = h * (small ? 0.7 : 0.8);
        geo = { cx: apexX - radius, cy: apexY, radius };
        layoutRail();
        placePeek();
    }

    function layoutRail() {
        const railH = rail.clientHeight;
        const countTicks = Math.max(2, Math.round(railH / TICK_SPACING) + 1);
        const step = railH / (countTicks - 1);
        const projectYs = data.map((_, i) => (i / (n - 1 || 1)) * railH);

        tickRow.replaceChildren();
        ticks = Array.from({ length: countTicks }, (_, k) => {
            const y = k * step;
            const major = projectYs.some((py) => Math.abs(py - y) < step / 2);
            const el = document.createElement('span');
            el.className = major ? 'play-tick is-major' : 'play-tick';
            el.style.top = `${y}px`;
            tickRow.appendChild(el);
            return { el, y, major };
        });
        geo.railH = railH;
    }

    // Position one project at offset d from the centre (d = 0 is locked in).
    function place(item, d) {
        const a = Math.abs(d);
        if (a > VISIBLE) {
            item.style.visibility = 'hidden';
            return;
        }
        // Next projects wait below and rise into the centre, so scrolling down, swiping up and
        // dragging the rail down all move forward, with the content following the gesture.
        const theta = arcAngle(d);
        const r = geo.radius * (1 - SPIRAL * Math.min(a, 4));
        const x = geo.cx + r * Math.cos(theta);
        const y = geo.cy + r * Math.sin(theta);
        const scale = 1 / (1 + SHRINK * a);
        const maxBlur = touchscreen || compact.matches ? 3 : 8; // lighter on phone GPUs
        const blur = reduceMotion ? 0 : Math.min(maxBlur, Math.round(Math.max(0, a - 0.3) * 2.2 * 2) / 2);

        item.style.visibility = '';
        item.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${theta * 24}deg) scale(${scale})`;
        item.style.opacity = clamp(1.6 - 0.55 * a, 0, 1);
        item.style.filter = blur ? `blur(${blur}px)` : '';
        item.style.zIndex = String(100 - Math.round(a * 10));
    }

    // ── Render ──────────────────────────────────────────────────────
    let p = 0;       // current (continuous) position
    let v = 0;       // velocity, projects per second
    let target = 0;  // where the spring is heading
    let shown = -1;

    function render() {
        items.forEach((item, i) => place(item, i - p));

        // Rail: ticks swell around the current position
        const yp = (clamp(p, 0, n - 1) / (n - 1 || 1)) * geo.railH;
        let peak = null;
        let peakDistance = Infinity;
        for (const t of ticks) {
            const d = t.y - yp;
            const k = falloff(d, SWELL);
            const rest = t.major ? 0.42 : 0.22;
            const restOpacity = t.major ? 0.4 : 0.18;
            t.el.style.transform = `scaleX(${rest + (1 - rest) * k})`;
            t.el.style.opacity = restOpacity + (0.95 - restOpacity) * k;
            if (Math.abs(d) < peakDistance) {
                peakDistance = Math.abs(d);
                peak = t;
            }
        }
        for (const t of ticks) t.el.classList.toggle('is-peak', t === peak);
        railIndex.style.transform = `translateY(${yp}px)`;

        showInfo(clamp(Math.round(p), 0, n - 1));
    }

    function showInfo(i) {
        if (i === shown) return;
        shown = i;
        dismissedIndex = -1;
        const d = data[i];
        count.textContent = pad(i + 1);
        railIndex.textContent = pad(i + 1);
        title.textContent = d.title;
        desc.textContent = d.desc;
        link.hidden = !d.href;
        if (d.href) link.href = d.href;
        rail.setAttribute('aria-valuenow', i + 1);
        rail.setAttribute('aria-valuetext', d.title);
        items.forEach((item, j) => item.classList.toggle('is-current', j === i));

        if (!reduceMotion) {
            [title, desc, link].forEach((el, k) => el.animate(
                [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
                { duration: 320, delay: k * 30, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
            ));
        }
    }

    // ── Motion loop ─────────────────────────────────────────────────
    let dragging = null; // 'rail' | 'stage' | null
    let frame = 0;
    let lastTime = 0;

    function tick(time) {
        frame = 0;
        const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60;
        lastTime = time;

        if (!dragging) {
            if (reduceMotion) {
                p = target;
                v = 0;
            } else {
                v += (STIFFNESS * (target - p) - DAMPING * v) * dt;
                p += v * dt;
                if (Math.abs(target - p) < 0.0005 && Math.abs(v) < 0.005) {
                    p = target;
                    v = 0;
                }
            }
        }
        render();

        if (dragging || p !== target) {
            frame = requestAnimationFrame(tick);
        } else {
            lastTime = 0;
            scheduleDwell(); // settled on a project
        }
    }

    // Any movement closes the peek and restarts the dwell clock.
    const kick = () => {
        closePeek();
        if (!frame) frame = requestAnimationFrame(tick);
    };

    // ── Peek: rest on a project for DWELL_MS to see a preview of the work ──
    // Only projects with a preview clip (data-preview) get one.
    let dwellTimer = 0;
    let peekIndex = -1;
    let dismissedIndex = -1; // the project whose peek was dismissed by tapping away

    function scheduleDwell() {
        clearTimeout(dwellTimer);
        if (dragging || p !== target || shown === dismissedIndex || modal.classList.contains('is-open')) return;
        if (!data[shown].preview) return;
        dwellTimer = setTimeout(() => openPeek(shown), DWELL_MS);
    }

    function openPeek(i) {
        const d = data[i];
        peekIndex = i;
        peek.classList.toggle('is-link', !!d.href);

        // Previews load only once someone actually lingers on the project.
        peekVideo.poster = d.poster || '';
        if (peekVideo.getAttribute('src') !== d.preview) peekVideo.src = d.preview;
        if (!reduceMotion) peekVideo.play().catch(() => {});

        placePeek();
        peek.classList.add('is-open');
    }

    // The area the peek fills: from just right of the rail to short of the details text
    // (desktop), or between the header and the details text (phones).
    function peekRegion() {
        const w = root.clientWidth;
        const h = root.clientHeight;
        const left = rail.offsetLeft + rail.offsetWidth + (compact.matches ? 16 : Math.max(24, w * 0.035));
        if (compact.matches) {
            return { left, right: w - 20, top: 12, bottom: info.offsetTop - 16 };
        }
        const height = h * 0.74;
        return { left, right: info.offsetLeft - w * 0.1, top: (h - height) / 2, bottom: (h + height) / 2 };
    }

    // Fit the peek inside its region at the media's own shape (no cropping or letterboxing).
    function placePeek() {
        if (peekIndex === -1) return;
        const r = peekRegion();
        const maxW = r.right - r.left;
        const maxH = r.bottom - r.top;

        const ratio = peekVideo.videoWidth ? peekVideo.videoWidth / peekVideo.videoHeight : 16 / 9;
        const width = Math.min(maxW, maxH * ratio);
        // Size the peek box itself too: otherwise its width shrinks to the space right of its
        // centre point, which on narrow screens squeezed and cropped the clip.
        peek.style.width = `${width}px`;
        peekVideo.style.width = `${width}px`;
        peekVideo.style.height = `${width / ratio}px`;
        peek.style.left = `${(r.left + r.right) / 2}px`;
        peek.style.top = `${(r.top + r.bottom) / 2}px`;
    }

    // The exact shape is known once the clip's metadata arrives (usually during the pop-in).
    peekVideo.addEventListener('loadedmetadata', placePeek);

    function closePeek() {
        clearTimeout(dwellTimer);
        if (peekIndex === -1) return;
        peekIndex = -1;
        peek.classList.remove('is-open');
        peekVideo.pause();
    }

    function go(i) {
        target = clamp(Math.round(i), 0, n - 1);
        kick();
    }

    function dismissHint() {
        hint?.classList.add('is-hidden');
    }

    // ── Rail drag ───────────────────────────────────────────────────
    function railPosition(clientY) {
        const r = rail.getBoundingClientRect();
        return clamp((clientY - r.top) / r.height, 0, 1) * (n - 1);
    }

    rail.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (document.activeElement === rail) rail.blur(); // no keyboard focus ring while dragging
        rail.setPointerCapture(e.pointerId);
        dragging = 'rail';
        root.classList.add('is-dragging');
        dismissHint();
        p = target = railPosition(e.clientY);
        v = 0;
        kick();
    });

    rail.addEventListener('pointermove', (e) => {
        if (dragging !== 'rail') return;
        p = target = railPosition(e.clientY);
        kick();
    });

    function endRailDrag() {
        if (dragging !== 'rail') return;
        dragging = null;
        root.classList.remove('is-dragging');
        go(p);
    }
    rail.addEventListener('pointerup', endRailDrag);
    rail.addEventListener('pointercancel', endRailDrag);

    // ── Stage drag + click ──────────────────────────────────────────
    let press = null; // { id, y, p, moved, samples }

    root.addEventListener('pointerdown', (e) => {
        // One finger at a time: a second touch mid-swipe is ignored rather than hijacking the drag.
        if (e.button !== 0 || !e.isPrimary || press || e.target.closest('.play-rail, .play-info a')) return;
        press = { id: e.pointerId, y: e.clientY, p, moved: false, samples: [[e.timeStamp, p]] };
    });

    root.addEventListener('pointermove', (e) => {
        if (!press || e.pointerId !== press.id) return;
        const dy = e.clientY - press.y;
        if (!press.moved && Math.abs(dy) < 5) return;
        if (!press.moved) {
            press.moved = true;
            root.setPointerCapture(e.pointerId);
            dragging = 'stage';
            root.classList.add('is-dragging');
            dismissHint();
        }
        // Dragging up pulls the next project (waiting below) into the centre.
        p = target = clamp(press.p - dy / dragPx(), -0.4, n - 0.6);
        press.samples.push([e.timeStamp, p]);
        if (press.samples.length > 5) press.samples.shift();
        kick();
    });

    function endPress(e) {
        if (!press || e.pointerId !== press.id) return;
        const wasDrag = press.moved;
        const samples = press.samples;
        press = null;

        if (wasDrag) {
            dragging = null;
            root.classList.remove('is-dragging');
            const [t0, p0] = samples[0];
            const [t1, p1] = samples[samples.length - 1];
            v = t1 > t0 ? ((p1 - p0) / (t1 - t0)) * 1000 : 0;
            go(p + clamp(v * 0.12, -1, 1)); // a flick carries on, at most one project, before locking
            return;
        }

        // A click on the peek opens the project.
        if (e.target.closest?.('.play-peek') && peekIndex !== -1) {
            if (data[peekIndex].href) openModal(data[peekIndex].href);
            return;
        }

        // A click: bring a neighbour to the centre, or open the current project.
        const item = e.target.closest?.('.play-item');
        if (!item) {
            // Tapping empty space dismisses the peek until you move to another project.
            if (peekIndex !== -1) {
                dismissedIndex = shown;
                closePeek();
            }
            return;
        }
        const i = items.indexOf(item);
        if (i !== shown) go(i);
        else if (data[i].href) openModal(data[i].href);
    }
    root.addEventListener('pointerup', endPress);
    root.addEventListener('pointercancel', endPress);

    // ── Wheel / trackpad ────────────────────────────────────────────
    let wheelTimer = 0;
    let lastStep = 0;

    root.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (modal.classList.contains('is-open')) return;
        dismissHint();
        const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;

        if (Math.abs(delta) >= 50) {
            // Mouse wheel notch: one project per notch, rate-limited so fast flicks don't skip everything.
            if (e.timeStamp - lastStep < 220) return;
            lastStep = e.timeStamp;
            go(Math.round(target) + Math.sign(delta));
            return;
        }

        // Trackpad: glide continuously, then lock once the gesture stops.
        target = clamp(target + delta / 380, -0.25, n - 0.75);
        kick();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => go(target), 100);
    }, { passive: false });

    // ── Keyboard ────────────────────────────────────────────────────
    const KEY_STEPS = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 };

    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('is-open')) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;

        if (e.key in KEY_STEPS) {
            e.preventDefault();
            dismissHint();
            go(Math.round(target) + KEY_STEPS[e.key]);
        } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            go(e.key === 'Home' ? 0 : n - 1);
        } else if (e.key === 'Enter' && document.activeElement === rail && data[shown].href) {
            openModal(data[shown].href);
        }
    });

    link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(link.getAttribute('href'));
    });

    // ── Project modal ───────────────────────────────────────────────
    const modal = document.getElementById('playgroundModal');
    const backdrop = modal.querySelector('.playground-modal-backdrop');
    const closeBtn = modal.querySelector('.playground-modal-close');
    const iframe = modal.querySelector('.playground-modal-iframe');

    // CSS injected into each project page iframe to strip chrome and details block
    const MODAL_IFRAME_CSS = `
        .top-nav,
        .site-footer,
        .project-toc,
        .project-details-grid { display: none !important; }

        body.project-page { padding-top: 0 !important; }

        body.project-page .project-layout {
            display: block !important;
            padding: 2rem 2.5rem 3rem !important;
            max-width: 780px !important;
            margin: 0 auto !important;
        }

        /* Phones: room for the close button, less side padding */
        @media (max-width: 600px) {
            body.project-page .project-layout { padding: 4rem 1.25rem 2.5rem !important; }
        }

        html { scrollbar-width: thin; scrollbar-color: rgba(61, 58, 69, 0.2) transparent; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(61, 58, 69, 0.2); border-radius: 3px; }
    `;

    iframe.addEventListener('load', () => {
        try {
            const doc = iframe.contentDocument;
            if (!doc) return;
            const style = doc.createElement('style');
            style.textContent = MODAL_IFRAME_CSS;
            doc.head.appendChild(style);
        } catch (_) {
            // cross-origin guard — shouldn't happen for same-origin pages
        }
    });

    function openModal(url) {
        closePeek();
        iframe.src = url;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('is-open');
        closeBtn.focus();
    }

    // Focus returns to the rail only when closed from the keyboard, so mouse users don't get a focus ring.
    function closeModal(fromKeyboard) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => { iframe.src = ''; }, 220);
        if (fromKeyboard) rail.focus({ preventScroll: true });
        scheduleDwell();
    }

    backdrop.addEventListener('click', () => closeModal(false));
    closeBtn.addEventListener('click', (e) => closeModal(e.detail === 0)); // detail 0: activated with Enter/Space
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(true);
    });

    // ── Start ───────────────────────────────────────────────────────
    const relayout = () => {
        layout();
        render();
    };
    window.addEventListener('resize', relayout);
    compact.addEventListener('change', relayout);

    layout();
    render();
    scheduleDwell();
})();
