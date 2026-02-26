document.addEventListener('DOMContentLoaded', () => {

    // ── Portfolio filters ──────────────────────────────────────────
    const filterBtns = document.querySelectorAll('.portfolio-filter-btn');
    if (filterBtns.length) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                const filter = btn.dataset.filter;

                // Handle standalone ptiles (hero tile)
                document.querySelectorAll('.portfolio-grid > .ptile').forEach(tile => {
                    const cats = tile.dataset.category || '';
                    tile.classList.toggle('is-hidden', filter !== 'all' && !cats.split(' ').includes(filter));
                });

                // Handle ptile-rows — hide row if all children are hidden
                document.querySelectorAll('.ptile-row').forEach(row => {
                    const tiles = row.querySelectorAll('.ptile');
                    let anyVisible = false;
                    tiles.forEach(tile => {
                        const cats = tile.dataset.category || '';
                        const hidden = filter !== 'all' && !cats.split(' ').includes(filter);
                        tile.classList.toggle('is-hidden', hidden);
                        if (!hidden) anyVisible = true;
                    });
                    row.classList.toggle('is-hidden', !anyVisible);
                });
            });
        });
    }

    // ── Video preview (project pages) ─────────────────────────────
    const preview = document.getElementById('video-preview');
    const previewVideo = document.createElement('video');
    previewVideo.muted = true;
    previewVideo.loop = true;
    preview.appendChild(previewVideo);

    document.querySelectorAll('.project-header').forEach((header, index) => {
        const project = header.closest('.project');
        const video = project.querySelector('.project-video');
        const isFirstTwo = index < 2;

        header.addEventListener('click', () => {
            project.classList.toggle('active');
            if (project.classList.contains('active')) {
                preview.style.display = 'none';
                previewVideo.pause();
                previewVideo.src = '';
            }
        });

        if (!video) return;

        header.addEventListener('mouseenter', () => {
            if (!project.classList.contains('active')) {
                previewVideo.src = video.src;
                preview.style.display = 'block';
                previewVideo.play();
            }
        });

        header.addEventListener('mousemove', (e) => {
            if (project.classList.contains('active')) return;
            preview.style.left = (e.clientX + 20) + 'px';
            preview.style.top = isFirstTwo ? (e.clientY + 20) + 'px' : (e.clientY - 320) + 'px';
        });
        header.addEventListener('mouseleave', () => {
            preview.style.display = 'none';
            previewVideo.pause();
            previewVideo.src = '';
        });
    });
});

