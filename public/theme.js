const themeKey = 'themePreference';
const root = document.documentElement;

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.textContent = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  });
}

function initTheme() {
  const saved = localStorage.getItem(themeKey);
  const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(preferred);
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
}

document.addEventListener('DOMContentLoaded', initTheme);
