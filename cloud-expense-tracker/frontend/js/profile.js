// Used by both profile.html and settings.html
initPrivatePage(document.body.dataset.page);
const user = getUser();

if ($('profileForm')) {
  $('name').value = user.name;
  $('email').value = user.email;
  $('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const d = await api('/auth/profile', { method: 'PUT', body: { name: $('name').value.trim() } });
      saveSession(null, d.user); renderNav('profile'); toast('Profile updated');
    } catch (err) { toast(err.message, 'error'); }
  });
}

if ($('passwordForm')) {
  $('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = $('newPassword').value;
    if (newPassword !== $('confirmPassword').value) return toast('New passwords do not match', 'error');
    try {
      await api('/auth/change-password', { method: 'PUT', body: { currentPassword: $('currentPassword').value, newPassword } });
      $('passwordForm').reset(); toast('Password changed');
    } catch (err) { toast(err.message, 'error'); }
  });
}

if ($('settingsForm')) {
  $('currency').value = user.currency || 'INR';
  $('dateFormat').value = user.dateFormat || 'DD/MM/YYYY';
  $('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const d = await api('/auth/profile', { method: 'PUT', body: { currency: $('currency').value, dateFormat: $('dateFormat').value } });
      saveSession(null, d.user); toast('Settings saved');
    } catch (err) { toast(err.message, 'error'); }
  });
}
if ($('logoutBtn2')) $('logoutBtn2').addEventListener('click', logout);
