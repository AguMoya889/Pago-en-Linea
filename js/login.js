// js/login.js
document.addEventListener('DOMContentLoaded', () => {
    // misma URL que usas en auth-backend.js
    const API_URL = window.API_URL || 'http://localhost:3000/api';

    const loginForm = document.getElementById('login-form');
    if (!loginForm) return; // si no estamos en index.html, no hace nada

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // soportar id="login-email" o id="email"
        const emailInput    = document.getElementById('login-email') || document.getElementById('email');
        const passwordInput = document.getElementById('login-password') || document.getElementById('password');

        const email    = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            Swal.fire({
                icon: 'error',
                title: 'Campos incompletos',
                text: 'Ingresa tu correo y contraseña.'
            });
            return;
        }

        try {
            // 🔐 ahora usamos el BACKEND
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al iniciar sesión',
                    text: data.message || 'Correo o contraseña incorrectos.'
                });
                return;
            }

            const { token, user } = data;

            // 👉 GUARDAMOS TOKEN PARA LAS TRANSFERENCIAS / HISTORIAL
            if (token) {
                sessionStorage.setItem('token', token);
            }

            // correo que usaremos en el resto de la app
            const userEmail = (user && user.email) ? user.email : email;

            // quién está logeado
            sessionStorage.setItem('loggedInUser', userEmail);

            // guardamos una copia simple en localStorage para dashboard, history, etc.
            if (user) {
                localStorage.setItem(userEmail, JSON.stringify({
                    email: user.email,
                    fullname: user.name || user.fullname || 'Usuario',
                    balance: user.balance || 0,
                    movements: [],   // se siguen viendo los movimientos locales
                    cards: [],
                    points: user.points || 0
                }));
            }

            // (opcional) marcar primera etapa OK para tu 2FA
            sessionStorage.setItem('loginFirstStepOk', 'true');
            sessionStorage.removeItem('isAuthenticated');

            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: 'Contraseña correcta. Ahora ingresa el código de verificación.',
                showConfirmButton: false,
                timer: 1500
            });

            // si usas twofactor.html, dejamos esto:
            setTimeout(() => {
                window.location.href = 'twofactor.html';
            }, 1500);

            // Si prefieres ir directo al dashboard, cambia la línea de arriba por:
            // window.location.href = 'dashboard.html';

        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'No se pudo conectar con el servidor.'
            });
        }
    });
});
