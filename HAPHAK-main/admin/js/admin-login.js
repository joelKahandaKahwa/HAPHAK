/**
 * Admin Login Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  const errorBanner = document.getElementById('login-error-banner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBanner.style.display = 'none';

    const username = form.username.value.trim();
    const password = form.password.value;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        window.location.href = 'dashboard.html';
      } else {
        errorBanner.style.display = 'block';
        errorBanner.textContent = data.message || 'Identifiants incorrects.';
      }
    } catch (err) {
      console.error('Erreur connexion admin:', err);
      errorBanner.style.display = 'block';
      errorBanner.textContent = 'Impossible de contacter le serveur.';
    }
  });
});
