document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('funCanvasContainer');
    const canvas = document.getElementById('funCanvas');

    if (!container || !canvas) return;

    function centerCanvas() {
        container.scrollLeft = (container.scrollWidth - container.offsetWidth) / 2;
        container.scrollTop = (container.scrollHeight - container.offsetHeight) / 2;
    }

    window.addEventListener('load', centerCanvas);

    // Cursor parallax — nudges canvas opposite to cursor direction
    const MAX_X = 20;
    const MAX_Y = 14;
    let nudgeRaf;

    container.addEventListener('mousemove', (e) => {
        cancelAnimationFrame(nudgeRaf);
        nudgeRaf = requestAnimationFrame(() => {
            const rect = container.getBoundingClientRect();
            const nx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
            const ny = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
            canvas.style.transform = `translate(${-nx * MAX_X}px, ${-ny * MAX_Y}px)`;
        });
    });

    container.addEventListener('mouseleave', () => {
        cancelAnimationFrame(nudgeRaf);
        canvas.style.transform = 'translate(0, 0)';
    });

    // Modal
    const modal = document.getElementById('playgroundModal');
    const backdrop = modal.querySelector('.playground-modal-backdrop');
    const closeBtn = modal.querySelector('.playground-modal-close');
    const iframe = modal.querySelector('.playground-modal-iframe');

    // CSS injected into each project page iframe to strip chrome and strip the details block
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
