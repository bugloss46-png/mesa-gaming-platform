import { handleRegistration, loginWithSteam } from './auth.service';

// Setup registration form handler
handleRegistration();

// Setup Steam login button
const steamBtn = document.querySelector('.steam-btn');
if (steamBtn) {
  steamBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginWithSteam();
  });
}
