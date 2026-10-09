(function () {
    var OPEN = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    var SHUT = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    function wrap(input) {
        if (input.dataset.eye) return;
        input.dataset.eye = '1';
        var w = document.createElement('div');
        w.style.cssText = 'position:relative;width:100%';
        input.parentNode.insertBefore(w, input);
        w.appendChild(input);
        input.style.paddingRight = '48px';
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Mostrar senha');
        b.title = 'Mostrar senha';
        b.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;background:none;cursor:pointer;color:#8a7f78;display:flex;align-items:center;justify-content:center;border-radius:10px;padding:0';
        b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + OPEN + '</svg>';
        b.addEventListener('click', function () {
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            b.firstChild.innerHTML = show ? SHUT : OPEN;
            b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
            b.title = show ? 'Ocultar senha' : 'Mostrar senha';
        });
        w.appendChild(b);
    }
    function scan() { document.querySelectorAll('input[type="password"]').forEach(wrap); }
    scan();
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
