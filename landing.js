document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('card');
    const cardContent = document.querySelector('.card-content');
    const cardWrapper = document.getElementById('card-wrapper');
    const heroAngel = document.querySelector('.hero-angel');
    const cherubButtons = document.querySelectorAll('.hero-cherub-btn');
    const body = document.body;

    //c + p to set ruleset for rest of htmls
    function setBackgroundStippleMouse(clientX, clientY) {
        if (!body.classList.contains('landing-page')) return;
        // Skip heavy spotlight updates on small screens
        if (window.innerWidth < 900) return;
        const x = (clientX / window.innerWidth) * 100;
        const y = (clientY / window.innerHeight) * 100;
        body.style.setProperty('--mouse-x', `${x}%`);
        body.style.setProperty('--mouse-y', `${y}%`);
    }

    let lastMouseMove = 0;
    document.addEventListener('mousemove', (e) => {
        const now = performance.now();
        if (now - lastMouseMove < 30) return; // ~30fps throttle
        lastMouseMove = now;
        setBackgroundStippleMouse(e.clientX, e.clientY);
    });

    if (!card || !cardContent) return;

    let currentX = 0;
    let currentY = 0;

    function handleMove(clientX, clientY) {
        const rect = card.getBoundingClientRect();
        const xPercent = ((clientX - rect.left) / rect.width) * 100;
        const yPercent = ((clientY - rect.top) / rect.height) * 100;
        cardContent.style.setProperty('--mouse-x', `${xPercent}%`);
        cardContent.style.setProperty('--mouse-y', `${yPercent}%`);
        currentX = ((clientY - rect.top) / rect.height - 0.5) * -15;
        currentY = ((clientX - rect.left) / rect.width - 0.5) * 15;
    }

    function handleLeave() {
        currentX = 0;
        currentY = 0;
    }

    card.addEventListener('mousemove', (e) => {
        handleMove(e.clientX, e.clientY);
    });

    card.addEventListener('mouseleave', () => {
        handleLeave();
        card.style.transform = 'perspective(1500px) rotateX(0deg) rotateY(0deg)';
    });

    function animate() {
        card.style.transform = `
            perspective(1500px)
            rotateX(${currentX}deg)
            rotateY(${currentY}deg)
        `;
        requestAnimationFrame(animate);
    }
    animate();

    card.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
        setBackgroundStippleMouse(touch.clientX, touch.clientY);
    }, { passive: false });

    card.addEventListener('touchend', handleLeave);

    // Fade card out when scrolling past hero region, fade back on return
    if (cardWrapper) {
        function checkScroll() {
            const scrollY = window.scrollY;
            const threshold = window.innerHeight * 0.5;
            const shouldHide = scrollY > threshold;
            cardWrapper.classList.toggle('hidden', shouldHide);
        }

        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
    }

    // Cherub variants: swap main image when activating specific buttons
    if (heroAngel && cherubButtons.length) {
        const defaultSrc = heroAngel.getAttribute('src');
        const variantSrc = {
            camera: 'home-imgs/angel-hold-camera-home.png',
            mic: 'home-imgs/angel-hold-mic-home.png',
            pen: 'home-imgs/angel-hold-pencil-home.png',
        };

        function setVariant(src) {
            if (src && heroAngel.getAttribute('src') !== src) {
                heroAngel.setAttribute('src', src);
            }
        }

        function bounceAngel() {
            heroAngel.classList.remove('hero-angel--bounce');
            // force reflow so animation can restart
            // eslint-disable-next-line no-unused-expressions
            heroAngel.offsetWidth;
            heroAngel.classList.add('hero-angel--bounce');
        }

        cherubButtons.forEach((btn) => {
            const variantKey = btn.dataset.variant;
            const src = variantSrc[variantKey];
            if (!src) return;

            const activate = () => {
                setVariant(src);
                bounceAngel();
            };

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                activate();
            });

            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
        });
    }
});
