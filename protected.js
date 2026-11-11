// Password gate for protected project pages.
// The gated content is encrypted with encrypt-util.html (AES-GCM, key from PBKDF2)
// and embedded as #encryptedPayload; it is decrypted entirely in the browser.
// The password length is the input's maxlength (one slot per character).
(function () {
    const gate = document.getElementById('protectedGate');
    if (!gate) return;

    const form    = document.getElementById('gateForm');
    const input   = document.getElementById('gateInput');
    const slotRow = gate.querySelector('.protected-slots');
    const err     = document.getElementById('gateError');
    const divider = document.querySelector('.protected-divider');
    const length  = input.maxLength;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // One slot per character, with a dash splitting even lengths in half (3 – 3).
    const slots = [];
    for (let i = 0; i < length; i++) {
        if (length % 2 === 0 && i === length / 2) {
            const sep = document.createElement('span');
            sep.className = 'protected-sep';
            sep.textContent = '–';
            slotRow.appendChild(sep);
        }
        const slot = document.createElement('span');
        slot.className = 'protected-slot';
        slotRow.appendChild(slot);
        slots.push(slot);
    }

    function render() {
        const n = input.value.length;
        slots.forEach((slot, i) => {
            slot.textContent = i < n ? '•' : '';
            slot.classList.toggle('is-filled', i < n);
            slot.classList.toggle('is-active', i === Math.min(n, length - 1));
        });
    }

    function setError(message) {
        err.textContent = message;
    }

    let payload;
    try {
        payload = JSON.parse(document.getElementById('encryptedPayload').textContent.trim());
    } catch {
        input.disabled = true;
        gate.dataset.state = 'disabled';
        setError('Encrypted content missing or malformed.');
        render();
        return;
    }

    render();

    // Keep the caret at the end so typing always fills the next slot.
    const caretToEnd = () => input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('focus', caretToEnd);
    input.addEventListener('click', caretToEnd);
    input.addEventListener('keyup', caretToEnd);

    input.addEventListener('input', () => {
        input.value = input.value.replace(/\s/g, '').slice(0, length);
        setError('');
        render();
        if (input.value.length === length) unlock();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value.length === length) unlock();
        else setError(`Enter all ${length} characters.`);
    });

    let busy = false;

    async function unlock() {
        if (busy) return;
        busy = true;
        gate.dataset.state = 'checking';
        input.readOnly = true;

        try {
            const html = await decrypt(input.value);
            reveal(html);
        } catch {
            // Wrong password or tampered ciphertext — AES-GCM's auth tag fails, nothing leaks.
            fail();
        }
    }

    async function decrypt(password) {
        const salt       = b64ToBuffer(payload.salt);
        const iv         = b64ToBuffer(payload.iv);
        const ciphertext = b64ToBuffer(payload.ciphertext);
        const iterations = payload.iterations || 100000;

        const keyMaterial = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return new TextDecoder().decode(plaintext);
    }

    function fail() {
        gate.dataset.state = 'error';
        setError('Incorrect password. Try again.');
        slotRow.classList.remove('is-error');
        void slotRow.offsetWidth; // restart the shake animation
        slotRow.classList.add('is-error');

        setTimeout(() => {
            slotRow.classList.remove('is-error');
            input.value = '';
            input.readOnly = false;
            gate.dataset.state = '';
            busy = false;
            render();
            input.focus();
        }, reduceMotion ? 0 : 400);
    }

    function reveal(html) {
        if (divider) divider.classList.add('is-open');

        const content = document.createElement('div');
        content.className = 'protected-content';
        content.innerHTML = html;

        const swap = () => {
            gate.replaceWith(content);
            // Scripts inserted via innerHTML don't run; re-create them so they do.
            content.querySelectorAll('script').forEach((old) => {
                const s = document.createElement('script');
                if (old.src) s.src = old.src;
                else s.textContent = old.textContent;
                old.replaceWith(s);
            });
        };

        if (reduceMotion) {
            swap();
        } else {
            gate.classList.add('is-leaving');
            setTimeout(swap, 250);
        }
    }

    function b64ToBuffer(b64) {
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
})();
