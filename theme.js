/* Blocking head bootstrap: choose the palette before CSS or the first paint. */
(() => {
    'use strict';
    const key = 'physics-sim-theme';
    const media = matchMedia('(prefers-color-scheme: dark)');
    let preference = null;
    try { preference = localStorage.getItem(key); } catch { /* Private/blocked storage. */ }
    if (preference !== 'light' && preference !== 'dark') preference = null;
    const root = document.documentElement;
    root.dataset.theme = preference || (media.matches ? 'dark' : 'light');
    const palette = {};
    const tokens = ['scene','grid','axis','ink','muted','blue','purple','teal','red','amber','body','track','trail'];
    function readPalette() {
        const css = getComputedStyle(root);
        for (const token of tokens) palette[token] = css.getPropertyValue('--sim-' + token).trim();
    }
    function sync() {
        const dark = root.dataset.theme === 'dark';
        document.querySelectorAll('.theme-toggle').forEach(button => {
            button.setAttribute('aria-checked', String(dark));
            button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        });
    }
    function apply(value) {
        root.dataset.theme = value;
        readPalette(); sync();
        document.dispatchEvent(new Event('themechange'));
    }
    function mount(scope = document) {
        scope.querySelectorAll('[data-theme-brand]').forEach(brand => {
            if (brand.querySelector('.theme-toggle')) return;
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'theme-toggle';
            button.setAttribute('role', 'switch');
            button.setAttribute('aria-label', 'Dark mode');
            button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g class="theme-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></g><path class="theme-moon" d="M20.5 14A8.7 8.7 0 0 1 10 3.5 8.7 8.7 0 1 0 20.5 14Z"/></svg>';
            button.onclick = () => {
                preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
                try { localStorage.setItem(key, preference); } catch { /* Still usable. */ }
                apply(preference);
            };
            brand.append(button);
        });
        sync();
    }
    media.addEventListener('change', () => { if (!preference) apply(media.matches ? 'dark' : 'light'); });
    window.addEventListener('storage', event => {
        if (event.key !== key && event.key !== null) return;
        preference = event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : null;
        apply(preference || (media.matches ? 'dark' : 'light'));
    });
    window.Theme = { palette, mount, readPalette };
    document.addEventListener('DOMContentLoaded', () => { readPalette(); mount(); });
})();
