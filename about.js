document.addEventListener('DOMContentLoaded', () => {
    const stack = document.querySelector('.about-photo-stack');
    const caption = document.querySelector('.about-photo-caption');

    /* Start with On my birthday, then the rest */
    const photos = [
        { src: 'images/profilepics/onmybirthday.jpg', caption: 'On my birthday' },
        { src: 'images/profilepics/atharvardyale.jpg', caption: 'At Harvard Yale' },
        { src: 'images/profilepics/atparsons.JPG', caption: 'At Parsons' },
        { src: 'images/profilepics/awe2025.png', caption: 'AWE 2025' },
        { src: 'images/profilepics/foodwithfriends.jpg', caption: 'Food with friends' },
        { src: 'images/profilepics/halloweenasamushroom.JPG', caption: 'Halloween as a mushroom' },
        { src: 'images/profilepics/lockedindoingwork.JPEG', caption: 'Locked in doing work' },
        { src: 'images/profilepics/matcharun.jpg', caption: 'Matcha run' }
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
        caption.style.display = '';
        index = nextIndex;

        // Defer removal so caption and new layer paint first; then cap stack and freeze size
        requestAnimationFrame(() => {
            const layers = stack.querySelectorAll('.about-photo-layer');
            const toRemove = layers.length - maxLayers;
            if (toRemove <= 0) return;

            const stackWidth = stack.offsetWidth;
            const stackHeight = stack.offsetHeight;

            for (let i = 0; i < toRemove; i++) {
                stack.removeChild(stack.firstElementChild);
            }

            stack.style.width = stackWidth + 'px';
            stack.style.height = stackHeight + 'px';

            const newFirst = stack.firstElementChild;
            if (newFirst && newFirst.dataset.rotation !== undefined) {
                newFirst.style.transform = `rotate(${newFirst.dataset.rotation}deg)`;
            }
        });
    }

    setInterval(goToNext, intervalMs);
});
