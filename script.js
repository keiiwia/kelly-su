document.addEventListener('DOMContentLoaded', () => {
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

