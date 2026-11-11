// Case-study sidebar: scroll spy plus a tick ruler. The ticks swell around the
// current reading position and glide between section labels as you scroll;
// pressing or dragging on the ruler scrolls the page to match.
(function () {
    const nav = document.querySelector('.project-toc-nav');
    if (!nav) return;

    const entries = [...nav.querySelectorAll('a[href^="#"]')]
        .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
        .filter((entry) => entry.section);
    if (entries.length < 2) return;

    const READ_LINE   = 0.3;  // where on screen "reading" happens (fraction of viewport height)
    const SPACING     = 5;    // px between ticks
    const SWELL       = 9;    // px — how far the swell spreads around the position
    const LABEL_FADE  = 40;   // px — how far label emphasis spreads
    const SNAP        = 3;    // px — dragging this close to a label lands exactly on its section
    const MIN_SCALE   = 0.27; // resting tick length as a fraction of the full length
    const MIN_OPACITY = 0.18;
    const MAX_OPACITY = 0.9;

    nav.classList.add('has-ruler');
    const rail = document.createElement('div');
    rail.className = 'toc-ticks';
    rail.setAttribute('aria-hidden', 'true');
    nav.prepend(rail);

    let ticks = [];
    let labelYs = [];

    // Ticks span from the first label to the last, evenly spaced.
    function layoutTicks() {
        labelYs = entries.map(({ link }) => link.offsetTop + link.offsetHeight / 2);
        const first = labelYs[0];
        const last = labelYs[labelYs.length - 1];
        const count = Math.max(2, Math.round((last - first) / SPACING) + 1);
        const step = (last - first) / (count - 1);

        rail.replaceChildren();
        ticks = Array.from({ length: count }, (_, i) => {
            const el = document.createElement('span');
            el.className = 'toc-tick';
            el.style.top = `${first + i * step}px`;
            rail.appendChild(el);
            return { el, y: first + i * step };
        });
    }

    // Section tops in page coordinates, squeezed so short sections at the very end are still reachable.
    function sectionTops() {
        const maxReadY = document.documentElement.scrollHeight - window.innerHeight * (1 - READ_LINE);
        const tops = entries.map(({ section }) => section.getBoundingClientRect().top + window.scrollY);
        let cap = maxReadY;
        for (let i = tops.length - 1; i >= 0; i--) {
            tops[i] = Math.min(tops[i], cap);
            cap = tops[i] - 1;
        }
        return tops;
    }

    // Where the reader is, as a y-position on the ruler, plus the active section index.
    function readingPosition() {
        const readY = window.scrollY + window.innerHeight * READ_LINE;
        const tops = sectionTops();

        // 1px of tolerance: browsers round scroll offsets, which can land a hair short of a section.
        if (readY + 1 < tops[0]) return { index: -1, y: labelYs[0] };

        let i = 0;
        while (i < tops.length - 1 && readY + 1 >= tops[i + 1]) i++;
        if (i === tops.length - 1) return { index: i, y: labelYs[i] };

        const progress = (readY - tops[i]) / (tops[i + 1] - tops[i]);
        return { index: i, y: labelYs[i] + progress * (labelYs[i + 1] - labelYs[i]) };
    }

    // The inverse of readingPosition: the scroll offset that puts the reader at ruler position y.
    function scrollOffsetFor(y) {
        const tops = sectionTops();
        const last = labelYs.length - 1;
        const clamped = Math.min(Math.max(y, labelYs[0]), labelYs[last]);

        const snapped = labelYs.findIndex((labelY) => Math.abs(labelY - clamped) <= SNAP);
        if (snapped !== -1) return tops[snapped] - window.innerHeight * READ_LINE;

        let i = 0;
        while (i < last - 1 && clamped > labelYs[i + 1]) i++;
        const progress = (clamped - labelYs[i]) / (labelYs[i + 1] - labelYs[i]);
        const readY = tops[i] + progress * (tops[i + 1] - tops[i]);
        return readY - window.innerHeight * READ_LINE;
    }

    const falloff = (d, spread) => Math.exp(-(d * d) / (2 * spread * spread));

    let activeIndex = null;
    let frame = 0;

    function update() {
        frame = 0;
        const { index, y } = readingPosition();

        let peak = null;
        let peakDistance = Infinity;
        for (const tick of ticks) {
            const d = tick.y - y;
            const k = falloff(d, SWELL);
            tick.el.style.transform = `scaleX(${MIN_SCALE + (1 - MIN_SCALE) * k})`;
            tick.el.style.opacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * k;
            if (Math.abs(d) < peakDistance) {
                peakDistance = Math.abs(d);
                peak = tick.el;
            }
        }
        for (const tick of ticks) tick.el.classList.toggle('is-peak', tick.el === peak);

        entries.forEach(({ link }, i) => {
            link.style.setProperty('--label-emphasis', 0.55 + 0.45 * falloff(labelYs[i] - y, LABEL_FADE));
        });

        if (index !== activeIndex) {
            activeIndex = index;
            entries.forEach(({ link }, i) => {
                link.classList.toggle('is-active', i === index);
                if (i === index) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
        }
    }

    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
    };
    const relayout = () => {
        layoutTicks();
        schedule();
    };

    // Press or drag on the ruler to scroll through the case study.
    let dragFrame = 0;
    let dragY = 0;

    function scrollToPointer() {
        dragFrame = 0;
        window.scrollTo(0, scrollOffsetFor(dragY));
    }

    function onDragMove(e) {
        dragY = e.clientY - nav.getBoundingClientRect().top;
        if (!dragFrame) dragFrame = requestAnimationFrame(scrollToPointer);
    }

    function endDrag(e) {
        nav.classList.remove('is-dragging');
        rail.removeEventListener('pointermove', onDragMove);
        rail.removeEventListener('pointerup', endDrag);
        rail.removeEventListener('pointercancel', endDrag);
        if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
    }

    rail.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); // no text selection while dragging
        rail.setPointerCapture(e.pointerId);
        nav.classList.add('is-dragging');
        rail.addEventListener('pointermove', onDragMove);
        rail.addEventListener('pointerup', endDrag);
        rail.addEventListener('pointercancel', endDrag);
        onDragMove(e);
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', relayout);
    window.addEventListener('load', relayout); // images shift section positions as they load
    if (document.fonts) document.fonts.ready.then(relayout);

    layoutTicks();
    update();
})();
