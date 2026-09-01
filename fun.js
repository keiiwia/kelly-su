document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('funCanvasContainer');
    const canvas = document.getElementById('funCanvas');

    if (!container || !canvas) return;

    // --- Dense grid fill ---
    // Collect visible cards from the original markup, then flood-fill the canvas
    // with clones (cycling) so every grid cell is populated.
    // Scatter is deterministic (sin-based) so cloned tiles are visually identical.
    const sourceCards = [...canvas.querySelectorAll('.fun-card')];
    const FILL_COUNT = 48; // 6 cols × 8 rows

    // Remove existing card children; keep .fun-intro hidden for aria/structure
    sourceCards.forEach(c => c.remove());

    for (let i = 0; i < FILL_COUNT; i++) {
        const clone = sourceCards[i % sourceCards.length].cloneNode(true);
        // Pseudo-random scatter that stays the same across all tiled copies
        const sx = (Math.sin(i * 1.6180339) * 1.4).toFixed(2);
        const sy = (Math.sin(i * 2.7182818) * 1.8).toFixed(2);
        clone.style.transform = `translate(${sx}rem, ${sy}rem)`;
        canvas.appendChild(clone);
    }

    // --- 3×3 infinite tiler ---
    // Clone the fully-populated canvas 9 times (inline styles copy too, so scatter
    // is identical in every tile — the teleport jump is invisible).
    const tiler = document.createElement('div');
    tiler.id = 'funCanvasTiler';

    for (let i = 0; i < 9; i++) {
        const tile = canvas.cloneNode(true);
        tile.removeAttribute('id');
        tiler.appendChild(tile);
    }

    container.replaceChild(tiler, canvas);

    let tileW = 0, tileH = 0;

    function updateTileSize() {
        const tile = tiler.firstElementChild;
        tileW = tile.offsetWidth;
        tileH = tile.offsetHeight;
    }

    function centerCanvas() {
        updateTileSize();
        container.scrollLeft = (container.scrollWidth - container.offsetWidth) / 2;
        container.scrollTop  = (container.scrollHeight - container.offsetHeight) / 2;
    }

    window.addEventListener('load', centerCanvas);
    window.addEventListener('resize', updateTileSize);

    // Teleport back to center tile when the user scrolls into an adjacent tile —
    // content is identical so the jump is invisible
    container.addEventListener('scroll', () => {
        if (!tileW) return;

        if (container.scrollLeft < tileW) {
            container.scrollLeft += tileW;
        } else if (container.scrollLeft >= tileW * 2) {
            container.scrollLeft -= tileW;
        }

        if (container.scrollTop < tileH) {
            container.scrollTop += tileH;
        } else if (container.scrollTop >= tileH * 2) {
            container.scrollTop -= tileH;
        }
    }, { passive: true });

    // --- Cursor parallax ---
    // depth 1 = foreground (counteracts tiler move), depth 0 = rides with tiler
    const MAX_X = 55;
    const MAX_Y = 40;
    const DEPTHS = [0.85, 0.55, 0.3, 0.75, 0.5, 0.9, 0.4, 0.65];

    const parallaxCards = [];
    tiler.querySelectorAll('.fun-canvas').forEach(tile => {
        [...tile.querySelectorAll('.fun-card')].forEach((card, i) => {
            card._depth = DEPTHS[i % DEPTHS.length];
            parallaxCards.push(card);
        });
    });

    let nudgeRaf;

    container.addEventListener('mousemove', (e) => {
        cancelAnimationFrame(nudgeRaf);
        nudgeRaf = requestAnimationFrame(() => {
            const rect = container.getBoundingClientRect();
            const nx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
            const ny = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);

            tiler.style.transform = `translate(${-nx * MAX_X}px, ${-ny * MAX_Y}px)`;

            parallaxCards.forEach(card => {
                const d = card._depth;
                card.style.translate = `${nx * MAX_X * d}px ${ny * MAX_Y * d}px`;
            });
        });
    });

    container.addEventListener('mouseleave', () => {
        cancelAnimationFrame(nudgeRaf);
        tiler.style.transform = 'translate(0, 0)';
        parallaxCards.forEach(card => { card.style.translate = '0px 0px'; });
    });

    // --- Modal ---
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
        iframe.src = url;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('is-open');
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => { iframe.src = ''; }, 220);
    }

    document.querySelectorAll('a.fun-card').forEach(card => {
        card.addEventListener('click', e => {
            e.preventDefault();
            openModal(card.href);
        });
    });

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });
});
