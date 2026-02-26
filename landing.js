document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('card');
    const cardContent = document.querySelector('.card-content');
    const cardWrapper = document.getElementById('card-wrapper');
    const assetsStrip = document.querySelector('.assets-strip');
    const body = document.body;

    //c + p to set ruleset for rest of htmls
    function setBackgroundStippleMouse(clientX, clientY) {
        if (!body.classList.contains('landing-page')) return;
        const x = (clientX / window.innerWidth) * 100;
        const y = (clientY / window.innerHeight) * 100;
        body.style.setProperty('--mouse-x', `${x}%`);
        body.style.setProperty('--mouse-y', `${y}%`);
    }

    document.addEventListener('mousemove', (e) => setBackgroundStippleMouse(e.clientX, e.clientY));

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

    if (cardWrapper && assetsStrip) {
        function checkScroll() {
            const scrollY = window.scrollY;
            // Hide card once user has scrolled past ~60% of viewport height
            const threshold = window.innerHeight * 0.6;
            cardWrapper.classList.toggle('hidden', scrollY > threshold);
        }
        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
    }
});
