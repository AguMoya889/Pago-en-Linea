// js/auth-backend.js
document.addEventListener("DOMContentLoaded", () => {
    const API_URL = window.API_URL || "http://localhost:3000/api";

    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");

    // ==========================
    // CAMPOS DEL FORMULARIO
    // ==========================
    const fullnameInput = document.getElementById("fullname");
    const rutInput = document.getElementById("rut");
    const phoneInput = document.getElementById("phone");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");
    const strengthBox = document.getElementById("password-strength");

    // ==========================
    // HELPERS
    // ==========================
    const setFieldError = (input, msg) => {
        const err = input?.parentElement.querySelector(".input-error");
        if (err) err.textContent = msg;
    };

    const clearAllErrors = () => {
        document.querySelectorAll(".input-error").forEach((e) => {
            e.textContent = "";
        });
    };

    // ==========================
    // BLOQUEAR NÚMEROS EN NOMBRE
    // ==========================
    if (fullnameInput) {
        fullnameInput.addEventListener("input", () => {
            fullnameInput.value = fullnameInput.value.replace(/[0-9]/g, "");
        });
    }

    // ==========================
    // RUT (NO TOCAR)
    // ==========================
    function cleanRut(value) {
        return (value || "").replace(/[^0-9kK]/g, "").toUpperCase();
    }

    function formatRut(value) {
        let v = cleanRut(value);
        if (v.length <= 1) return v;
        if (v.length > 9) v = v.slice(0, 9);

        const body = v.slice(0, -1);
        const dv = v.slice(-1);

        const bodyDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        return `${bodyDots}-${dv}`;
    }

    if (rutInput) {
        rutInput.addEventListener("input", () => {
            rutInput.value = formatRut(rutInput.value);
        });
    }

    // ==========================
    // FORMATO TELÉFONO CHILENO
    // ==========================
    function formatPhoneCL(rawDigits) {
        let d = rawDigits.replace(/\D/g, "").slice(0, 11);

        if (!d) return "";
        let out = "+";

        if (d.length <= 2) return out + d;
        out += d.slice(0, 2); // 56

        if (d.length <= 3) return out + " " + d.slice(2);
        out += " " + d.slice(2, 3); // 9

        const rest = d.slice(3);
        if (!rest) return out;

        if (rest.length <= 4) return out + " " + rest;

        return out + " " + rest.slice(0, 4) + " " + rest.slice(4);
    }

    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            const digits = phoneInput.value.replace(/\D/g, "");
            phoneInput.value = formatPhoneCL(digits);
        });
    }

    // ==========================
    // FORTALEZA CONTRASEÑA
    // ==========================
    if (passwordInput && strengthBox) {
        const strengthText = strengthBox.querySelector(".strength-text");
        const strengthFill = strengthBox.querySelector(".strength-bar-fill");

        const calc = (pwd) => {
            let s = 0;
            if (pwd.length >= 6) s++;
            if (/[A-Z]/.test(pwd)) s++;
            if (/[0-9]/.test(pwd)) s++;
            if (/[^A-Za-z0-9]/.test(pwd)) s++;
            return s;
        };

        passwordInput.addEventListener("input", () => {
            const score = calc(passwordInput.value);
            const labels = ["—", "Muy débil", "Débil", "Media", "Fuerte"];
            const widths = ["0%", "25%", "50%", "75%", "100%"];

            strengthText.textContent = `Fortaleza: ${labels[score]}`;
            strengthFill.style.width = widths[score];
        });
    }

    // ==========================
    // CONFIRMAR CONTRASEÑA EN VIVO
    // ==========================
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", () => {
            if (
                confirmPasswordInput.value &&
                confirmPasswordInput.value !== passwordInput.value
            ) {
                setFieldError(
                    confirmPasswordInput,
                    "Las contraseñas no coinciden."
                );
            } else {
                setFieldError(confirmPasswordInput, "");
            }
        });
    }

    // ==========================
    // ========== REGISTRO ======
    // ==========================
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearAllErrors();

            const fullname = fullnameInput.value.trim();
            const rutRaw = cleanRut(rutInput.value);
            const phoneFormatted = phoneInput.value.trim();
            const phoneDigits = phoneFormatted.replace(/\D/g, "");
            const email = document.getElementById("email").value.trim().toLowerCase();
            const password = passwordInput.value;
            const confirm = confirmPasswordInput.value;
            const terms = document.getElementById("terms").checked;

            let err = false;

            if (!fullname) {
                setFieldError(fullnameInput, "Ingresa tu nombre completo.");
                err = true;
            }

            if (!rutRaw || rutRaw.length < 8) {
                setFieldError(rutInput, "Ingresa un RUT válido.");
                err = true;
            }

            if (phoneDigits.length < 9) {
                setFieldError(phoneInput, "Formato de teléfono inválido.");
                err = true;
            }

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFieldError(document.getElementById("email"), "Correo inválido.");
                err = true;
            }

            if (!password || password.length < 6) {
                setFieldError(passwordInput, "Debe tener mínimo 6 caracteres.");
                err = true;
            }

            if (password !== confirm) {
                setFieldError(confirmPasswordInput, "Las contraseñas no coinciden.");
                err = true;
            }

            if (!terms) {
                Swal.fire("Términos", "Debes aceptar los términos.", "error");
                err = true;
            }

            if (err) return;

            // OPCIONAL: Enviar al backend
            try {
                await fetch(`${API_URL}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: fullname,
                        email,
                        password,
                        rut: rutRaw,
                        phone: phoneDigits,
                    }),
                });
            } catch {}

            // Crear usuario local sin saldo inicial
            const userLocal = {
                fullname,
                rut: rutRaw,
                phone: phoneDigits,
                email,
                password,   // 👈 AQUÍ ESTÁ LO NUEVO
                balance: 0,
                movements: [],
                cards: [],
                points: 0,
            };

            localStorage.setItem(email, JSON.stringify(userLocal));

            Swal.fire({
                icon: "success",
                title: "Cuenta creada",
                timer: 1500,
                showConfirmButton: false,
            });

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        });
    }

    // 👇 aquí antes estaba TODO el bloque de LOGIN
    //     if (loginForm) { ... }
    //     → lo borramos completo para que el login lo maneje solo js/login.js
});
