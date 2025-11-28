document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return; // si no estamos en index.html, no hace nada

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            Swal.fire({
                icon: 'error',
                title: 'Campos incompletos',
                text: 'Ingresa tu correo y contraseña.'
            });
            return;
        }

        // Buscar usuario en localStorage
        const userRaw = localStorage.getItem(email);
        if (!userRaw) {
            Swal.fire({
                icon: 'error',
                title: 'Usuario no encontrado',
                text: 'El correo ingresado no está registrado.'
            });
            return;
        }

        const userData = JSON.parse(userRaw);

        // Comprobar contraseña
        if (userData.password !== password) {
            Swal.fire({
                icon: 'error',
                title: 'Contraseña incorrecta',
                text: 'Verifica tu contraseña e inténtalo nuevamente.'
            });
            return;
        }

        // ✅ PRIMER FACTOR OK
        // Guardamos quién es el usuario logeado
        sessionStorage.setItem('loggedInUser', email);
        // Marcamos que pasó el primer paso del login (para 2FA)
        sessionStorage.setItem('loginFirstStepOk', 'true');
        // (opcional) limpiamos flag de autenticación completa
        sessionStorage.removeItem('isAuthenticated');

        Swal.fire({
            icon: 'success',
            title: '¡Bienvenido!',
            text: 'Contraseña correcta, continuemos con la verificación.',
            showConfirmButton: false,
            timer: 1500
        });

        // Ahora en vez de ir al dashboard, vamos a twofactor.html
        setTimeout(() => {
            window.location.href = 'twofactor.html';
        }, 1500);
    });
});
