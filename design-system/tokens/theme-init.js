/* Musy theming — manual toggle only, persisted. Load this SYNCHRONOUSLY in
   <head>, before any stylesheet, so the attribute is set before first paint
   (FOUC prevention). The system preference is deliberately not consulted.   */
(function () {
  var KEY = 'musy-theme';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
  window.musyTheme = {
    get: function () { return document.documentElement.getAttribute('data-theme'); },
    set: function (t) {
      document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
      try { localStorage.setItem(KEY, t === 'dark' ? 'dark' : 'light'); } catch (e) {}
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); }
  };
})();
/* Nested override: put data-theme="dark" on any element. Because every token
   is declared on `:root, [data-theme]`, the subtree re-declares the whole set
   and light-dark() re-resolves against that element's color-scheme.         */
