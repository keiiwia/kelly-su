document.addEventListener('DOMContentLoaded', () => {
    const stack = document.querySelector('.about-photo-stack');
    const caption = document.querySelector('.about-photo-caption');
    const body = document.body;

    function setStippleMouse(clientX, clientY) {
        const x = (clientX / window.innerWidth) * 100;
        const y = (clientY / window.innerHeight) * 100;
        body.style.setProperty('--mouse-x', `${x}%`);
        body.style.setProperty('--mouse-y', `${y}%`);
    }
    document.addEventListener('mousemove', (e) => setStippleMouse(e.clientX, e.clientY));

    /* Start with On my birthday, then the rest */
    const photos = [
        { src: 'images/profilepics/web/onmybirthday.jpg', caption: 'On my birthday' },
        { src: 'images/profilepics/web/atharvardyale.jpg', caption: 'At Harvard Yale' },
        { src: 'images/profilepics/web/atparsons.jpg', caption: 'At Parsons' },
        { src: 'images/profilepics/web/awe2025.jpg', caption: 'AWE 2025' },
        { src: 'images/profilepics/web/lockedindoingwork.jpg', caption: 'Locked in doing work' },
        { src: 'images/profilepics/web/matcharun.jpg', caption: 'Matcha run' }
    ];

    let index = 0;
    let nextZ = 2;
    const intervalMs = 4000;
    const maxLayers = photos.length;

    function randomRotation() {
        const deg = 5 + Math.random() * 3;
        return Math.random() < 0.5 ? deg : -deg;
    }

    const firstLayer = stack.querySelector('.about-photo-layer');
    const initialRotation = randomRotation();
    firstLayer.dataset.rotation = String(initialRotation);
    firstLayer.style.transform = `rotate(${initialRotation}deg)`;
    firstLayer.style.zIndex = '1';
    caption.textContent = photos[0].caption;
    caption.style.transform = `rotate(${initialRotation}deg)`;

    function goToNext() {
        const nextIndex = (index + 1) % photos.length;
        const rotation = randomRotation();
        const photo = photos[nextIndex];

        const layer = document.createElement('div');
        layer.className = 'about-photo-layer';
        layer.dataset.rotation = String(rotation);
        layer.style.zIndex = String(nextZ++);
        layer.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

        const img = document.createElement('img');
        img.className = 'about-photo-img';
        img.src = photo.src;
        img.alt = photo.caption;

        layer.appendChild(img);
        stack.appendChild(layer);

        caption.textContent = photo.caption;
        caption.style.transform = `rotate(${rotation}deg)`;
        index = nextIndex;

        // Defer removal so caption and new layer paint first; then cap stack and freeze size
        requestAnimationFrame(() => {
            const layers = stack.querySelectorAll('.about-photo-layer');
            const toRemove = layers.length - maxLayers;
            if (toRemove <= 0) return;

            const stackHeight = stack.offsetHeight;

            for (let i = 0; i < toRemove; i++) {
                stack.removeChild(stack.firstElementChild);
            }

            stack.style.height = stackHeight + 'px';

            const newFirst = stack.firstElementChild;
            if (newFirst && newFirst.dataset.rotation !== undefined) {
                newFirst.style.transform = `rotate(${newFirst.dataset.rotation}deg)`;
            }
        });
    }

    setInterval(goToNext, intervalMs);
});
