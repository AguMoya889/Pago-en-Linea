document.addEventListener("DOMContentLoaded", () => {
  // No dejar entrar aquí si no pasó por el login
  const firstStep = sessionStorage.getItem("loginFirstStepOk");
  if (!firstStep) {
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("twofactor-form");
  const codeInput = document.getElementById("code");
  const codeError = document.getElementById("code-error");

  // correo temporal guardado en el login (si lo usas)
  const tempEmail =
    sessionStorage.getItem("tempUserEmail") ||
    sessionStorage.getItem("loggedInUser") ||
    null;

  const CODIGO_2FA_DE_PRUEBA = "123456";

  const validarCodigo = () => {
    const value = codeInput.value.trim();

    if (value === "") {
      codeError.textContent = "El código es obligatorio.";
      codeInput.classList.add("input-error");
      return false;
    }

    if (value.length !== 6 || !/^\d+$/.test(value)) {
      codeError.textContent = "El código debe tener 6 dígitos.";
      codeInput.classList.add("input-error");
      return false;
    }

    codeError.textContent = "";
    codeInput.classList.remove("input-error");
    return true;
  };

  codeInput.addEventListener("input", validarCodigo);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validarCodigo()) return;

    const value = codeInput.value.trim();

    if (value !== CODIGO_2FA_DE_PRUEBA) {
      Swal.fire({
        icon: "error",
        title: "Código incorrecto",
        text: "El código ingresado no es válido. Inténtalo nuevamente.",
      });
      return;
    }

    // ✅ Segundo factor OK → usuario completamente autenticado
    // aseguramos que exista loggedInUser
    if (tempEmail) {
      sessionStorage.setItem("loggedInUser", tempEmail);
    }

    sessionStorage.setItem("isAuthenticated", "true");

    // limpiamos flags temporales del flujo 2FA
    sessionStorage.removeItem("loginFirstStepOk");
    sessionStorage.removeItem("tempUserEmail");

    Swal.fire({
      icon: "success",
      title: "Verificación correcta",
      text: "Acceso concedido a tu cuenta.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      window.location.href = "dashboard.html";
    });
  });
});
