// js/auth-backend.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.API_URL || 'http://localhost:3000/api';

    const registerForm = document.getElementById('register-form');
    const loginForm    = document.getElementById('login-form');

    // ====== FORTALEZA DE CONTRASEÑA (HU7) ======
    const passwordInput = document.getElementById('password');
    const strengthBox   = document.getElementById('password-strength');

    if (passwordInput && strengthBox) {
        const strengthText = strengthBox.querySelector('.strength-text');
        const strengthFill = strengthBox.querySelector('.strength-bar-fill');

        const calcStrength = (pwd) => {
            let score = 0;
            if (pwd.length >= 6) score++;
            if (/[A-Z]/.test(pwd)) score++;
            if (/[0-9]/.test(pwd)) score++;
            if (/[^A-Za-z0-9]/.test(pwd)) score++;
            return score; // 0-4
        };

        passwordInput.addEventListener('input', () => {
            const pwd = passwordInput.value || '';
            const score = calcStrength(pwd);

            let label = '—';
            let width = '0%';

            switch (score) {
                case 1:
                    label = 'Muy débil';
                    width = '25%';
                    break;
                case 2:
                    label = 'Débil';
                    width = '50%';
                    break;
                case 3:
                    label = 'Media';
                    width = '75%';
                    break;
                case 4:
                    label = 'Fuerte';
                    width = '100%';
                    break;
            }

            strengthText.textContent = `Fortaleza: ${label}`;
            strengthFill.style.width = width;
        });
    }

    // ====== REGISTRO (usa backend) ======
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullname        = document.getElementById('fullname')?.value.trim();
            const rut             = document.getElementById('rut')?.value.trim();
            const phone           = document.getElementById('phone')?.value.trim();
            const email           = document.getElementById('email')?.value.trim();
            const password        = document.getElementById('password')?.value;
            const confirmPassword = document.getElementById('confirm-password')?.value;
            const termsChecked    = document.getElementById('terms')?.checked;

            if (!fullname || !rut || !phone || !email || !password || !confirmPassword) {
                Swal.fire('Error', 'Faltan datos', 'error');
                return;
            }

            if (password !== confirmPassword) {
                Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
                return;
            }

            if (!termsChecked) {
                Swal.fire('Error', 'Debes aceptar los términos y condiciones.', 'error');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, rut, phone, email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    Swal.fire('Error', data.message || 'No se pudo crear la cuenta.', 'error');
                    return;
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Cuenta creada',
                    text: 'Tu cuenta ha sido creada correctamente.',
                    showConfirmButton: false,
                    timer: 2000
                });

                registerForm.reset();

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
            }
        });
    }

    // ====== LOGIN (usa backend) + 2FA simple (HU26) ======
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // soportar id="login-email" o id="email"
            const emailInput    = document.getElementById('login-email') || document.getElementById('email');
            const passwordInput = document.getElementById('login-password') || document.getElementById('password');

            const email    = emailInput?.value.trim();
            const password = passwordInput?.value;

            if (!email || !password) {
                Swal.fire('Error', 'Ingresa tu correo y contraseña.', 'error');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    Swal.fire('Error', data.message || 'Correo o contraseña incorrectos.', 'error');
                    return;
                }

                const { token, user } = data;

                if (token) {
                    sessionStorage.setItem('token', token);
                }

                const userEmail = (user && user.email) ? user.email : email;

                // Guardar usuario para el resto de la app
                sessionStorage.setItem('loggedInUser', userEmail);

                // 🔐 Primera etapa del login superada (para 2FA)
                sessionStorage.setItem('loginFirstStepOk', 'true');
                // Nos aseguramos de que no quede una autenticación vieja
                sessionStorage.removeItem('isAuthenticated');

                // Guardamos una copia simple en localStorage para dashboard, history, etc.
                if (user) {
                    localStorage.setItem(userEmail, JSON.stringify({
                        email: user.email,
                        fullname: user.name || user.fullname || 'Usuario',
                        balance: user.balance || 0,
                        movements: [],
                        cards: [],
                        points: user.points || 0
                    }));
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Inicio de sesión correcto',
                    text: 'Contraseña correcta. Ahora ingresa el código de verificación.',
                    showConfirmButton: false,
                    timer: 1500
                });

                // 👉 En vez de ir directo al dashboard, vamos a twofactor.html
                setTimeout(() => {
                    window.location.href = 'twofactor.html';
                }, 1500);
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
            }
        });
    }
});
