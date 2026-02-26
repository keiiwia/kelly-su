document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('funCanvasContainer');
    const canvas = document.getElementById('funCanvas');
    const dragHint = document.getElementById('funDragHint');
    const modeButtons = document.querySelectorAll('.playground-mode-btn');
    const exploreSection = document.querySelector('.playground-section--explore');
    const gridSection = document.querySelector('.playground-section--grid');

    // Default to exploration mode classes on load
    document.body.classList.add('playground-mode-explore');

    // Mode toggle: exploration vs grid
    if (modeButtons.length && exploreSection && gridSection) {
        modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;

                modeButtons.forEach((b) => {
                    b.classList.toggle('is-active', b === btn);
                    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
                });

                const isExplore = mode === 'explore';
                exploreSection.classList.toggle('is-active', isExplore);
                gridSection.classList.toggle('is-active', !isExplore);
                document.body.classList.toggle('playground-mode-explore', isExplore);
                document.body.classList.toggle('playground-mode-grid', !isExplore);
            });
        });
    }

    if (!container || !canvas) return;

    let isDragging = false;
    let startX, startY;
    let scrollLeft, scrollTop;

    // Hide hint after a few seconds
    setTimeout(() => {
        if (dragHint) dragHint.classList.add('hidden');
    }, 3000);

    // Mouse down
    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        container.classList.add('dragging');
        if (dragHint) dragHint.classList.add('hidden');

        startX = e.pageX;
        startY = e.pageY;
        scrollLeft = canvas.offsetLeft;
        scrollTop = canvas.offsetTop;
    });

    // Mouse move
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const walkX = e.pageX - startX;
        const walkY = e.pageY - startY;
        canvas.style.left = `${scrollLeft + walkX}px`;
        canvas.style.top = `${scrollTop + walkY}px`;
    });

    // Mouse up
    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.classList.remove('dragging');
    });

    // Mouse leave
    container.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            container.classList.remove('dragging');
        }
    });

    // Touch support
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        if (dragHint) dragHint.classList.add('hidden');

        startX = e.touches[0].pageX;
        startY = e.touches[0].pageY;
        scrollLeft = canvas.offsetLeft;
        scrollTop = canvas.offsetTop;
    });

    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const walkX = e.touches[0].pageX - startX;
        const walkY = e.touches[0].pageY - startY;
        canvas.style.left = `${scrollLeft + walkX}px`;
        canvas.style.top = `${scrollTop + walkY}px`;
    }, { passive: false });

    container.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Center the canvas on the card spread so the initial view isn’t cut off on one side
    function centerCanvas() {
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const contentCenterX = 1100;
        const contentCenterY = 550;
        canvas.style.left = `${containerWidth / 2 - contentCenterX}px`;
        canvas.style.top = `${containerHeight / 2 - contentCenterY}px`;
    }

    window.addEventListener('load', centerCanvas);
});
