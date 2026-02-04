import { handleLogin, loginWithSteam } from './auth.service';

// Setup login form handler
handleLogin();

// Setup Steam login button
const steamBtn = document.querySelector('.steam-btn');
if (steamBtn) {
  steamBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginWithSteam();
  });
}
