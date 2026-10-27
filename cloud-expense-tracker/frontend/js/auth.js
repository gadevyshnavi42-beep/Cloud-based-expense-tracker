if (getToken()) location.href = 'dashboard.html';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if ($('loginForm')) {
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email').value.trim();
    const password = $('password').value;
    if (!EMAIL_RE.test(email) || !password) return toast('Enter a valid email and password', 'error');
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      saveSession(data.token, data.user);
      location.href = 'dashboard.html';
    } catch (err) { toast(err.message, 'error'); }
  });
}

if ($('registerForm')) {
  $('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('name').value.trim();
    const email = $('email').value.trim();
    const password = $('password').value;
    if (name.length < 2) return toast('Name must be at least 2 characters', 'error');
    if (!EMAIL_RE.test(email)) return toast('Enter a valid email', 'error');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return toast('Password needs 8+ characters with a letter and a number', 'error');
    if (password !== $('confirm').value) return toast('Passwords do not match', 'error');
    try {
      const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
      saveSession(data.token, data.user);
      location.href = 'dashboard.html';
    } catch (err) { toast(err.message, 'error'); }
  });
}
