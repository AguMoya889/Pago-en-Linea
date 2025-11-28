// JS/receipt.js
document.addEventListener("DOMContentLoaded", () => {
    const loggedInUserEmail = sessionStorage.getItem("loggedInUser");

    // Si no hay sesión → volver al login
    if (!loggedInUserEmail) {
        window.location.href = "index.html";
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem(loggedInUserEmail) || "{}");

    // Formato CLP
    function formatCLP(amount) {
        const num = Number(String(amount).replace(/\D/g, "")) || 0;
        return new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
            minimumFractionDigits: 0
        }).format(num);
    }

    // ============================
    // 1) Buscar comprobante por ID (desde historial)
    // ============================
    let data = null;

    const receiptId = sessionStorage.getItem("receiptId");

    if (receiptId && Array.isArray(currentUser.movements)) {
        const mov = currentUser.movements.find(m => m.id == receiptId);
        if (mov) {
            data = {
                id: mov.id,
                amount: mov.amount,
                description: mov.description,
                date: new Date(mov.date).toLocaleString("es-CL")
            };
        }
    }

    // ============================
    // 2) Buscar datos desde transfer.html (receiptData)
    // ============================
    if (!data) {
        const raw = sessionStorage.getItem("receiptData");
        if (raw) {
            const r = JSON.parse(raw);
            data = {
                id: r.id || r.movementId || "—",
                amount: r.amount,
                description: r.description || `Transferencia a ${r.toEmail}`,
                date: r.date || new Date().toLocaleString("es-CL")
            };
        }
    }

    // Si seguimos sin datos → no hay comprobante válido
    if (!data) {
        Swal.fire("Sin comprobante", "No se encontraron datos válidos.", "info")
            .then(() => window.location.href = "dashboard.html");
        return;
    }

    // ============================
    // CARGAR DATOS EN EL HTML
    // ============================
    document.getElementById("receipt-amount").textContent = formatCLP(data.amount);
    document.getElementById("receipt-id").textContent = data.id;
    document.getElementById("receipt-date").textContent = data.date;
    document.getElementById("receipt-description").textContent = data.description;

    // ============================
    // BOTÓN PARA IMPRIMIR / PDF
    // ============================
    const pdfBtn = document.getElementById("print-receipt-btn");
    if (pdfBtn) {
        pdfBtn.addEventListener("click", () => {
            window.print(); // Guardar como PDF directo del navegador
        });
    }
});
