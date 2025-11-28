document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');

    // --- LÓGICA PARA LA PÁGINA 'OLVIDÉ MI CONTRASEÑA' ---
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const userExists = localStorage.getItem(email);

            if (userExists) {
                // Guardamos en la sesión qué usuario está recuperando su contraseña
                sessionStorage.setItem('resetPasswordUser', email);

                // SIMULACIÓN: Mostramos un mensaje de éxito y redirigimos
                Swal.fire({
                    icon: 'success',
                    title: 'Correo Enviado',
                    text: 'Hemos enviado las instrucciones a tu correo. Serás redirigido.',
                    showConfirmButton: false,
                    timer: 2500
                });
                setTimeout(() => {
                    window.location.href = 'reset-password.html';
                }, 2500);

            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Usuario no encontrado',
                    text: 'El correo ingresado no está registrado.'
                });
            }
        });
    }

    // --- LÓGICA PARA LA PÁGINA 'NUEVA CONTRASEÑA' ---
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Verificamos qué usuario estamos modificando
            const userEmail = sessionStorage.getItem('resetPasswordUser');
            if (!userEmail) {
                // Si no hay usuario, no se puede continuar
                window.location.href = 'index.html';
                return;
            }

            if (newPassword !== confirmPassword) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Las contraseñas no coinciden.' });
                return;
            }

            // Actualizamos la contraseña en localStorage
            const userData = JSON.parse(localStorage.getItem(userEmail));
            userData.password = newPassword;
            localStorage.setItem(userEmail, JSON.stringify(userData));

            // Limpiamos la sesión y mostramos mensaje final
            sessionStorage.removeItem('resetPasswordUser');
            Swal.fire({
                icon: 'success',
                title: 'Contraseña actualizada correctamente',
                showConfirmButton: false,
                timer: 2000
            });
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        });
    }
});