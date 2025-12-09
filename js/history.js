// js/history.js
document.addEventListener("DOMContentLoaded", () => {
    const loggedInUser = sessionStorage.getItem("loggedInUser");
    const tbody = document.getElementById("transactions-body");
    const noDataMessage = document.getElementById("no-data-message");

    if (!loggedInUser) {
        // Si no hay usuario en sesión, mandamos al login
        window.location.href = "index.html";
        return;
    }

    const formatDate = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (isNaN(date.getTime())) return value; // por si ya viene formateada
        return date.toLocaleString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatAmount = (amount) => {
        if (amount == null) return "-";
        return new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: "CLP",
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatStatus = (status) => {
        if (!status) return "Exitoso";
        const s = String(status).toLowerCase();
        if (s.includes("pend")) return "Pendiente";
        if (s.includes("rechaz") || s.includes("fail")) return "Rechazado";
        return "Exitoso";
    };

    const paintRows = (transactions) => {
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = "";
            noDataMessage.style.display = "block";
            return;
        }

        noDataMessage.style.display = "none";
        tbody.innerHTML = "";

        transactions.forEach(tx => {
            const tr = document.createElement("tr");
            tr.classList.add("history-row");

            // Datos base
            const rawDate = tx.date || tx.fecha || tx.createdAt;
            const formattedDate = formatDate(rawDate);

            const description =
                tx.description || tx.detalle || tx.type || "Transacción";

            const rawAmount = Number(
                tx.amount ?? tx.monto ?? tx.total ?? 0
            );

            const formattedAmount = formatAmount(rawAmount);
            const formattedStatus = formatStatus(tx.status || tx.estado);

            // Detectar tipo / origen / destino según descripción
            let type = "Otro";
            let from = "";
            let to = "";

            if (/transferencia a/i.test(description)) {
                type = "Enviado";
                const match = description.match(/a\s+(.+)$/i);
                to = match ? match[1].trim() : "";
                from = loggedInUser;
            } else if (/transferencia de/i.test(description)) {
                type = "Recibido";
                const match = description.match(/de\s+(.+)$/i);
                from = match ? match[1].trim() : "";
                to = loggedInUser;
            }

            // data-* para usar en el comprobante
            tr.dataset.id = tx.id || tx._id || Date.now();
            tr.dataset.date = formattedDate;
            tr.dataset.description = description;
            tr.dataset.amount = rawAmount;
            tr.dataset.status = formattedStatus;
            tr.dataset.type = type;
            tr.dataset.from = from;
            tr.dataset.to = to;

            // Celdas visibles
            const tdFecha = document.createElement("td");
            tdFecha.textContent = formattedDate;

            const tdDesc = document.createElement("td");
            tdDesc.textContent = description;

            const tdMonto = document.createElement("td");
            tdMonto.textContent = formattedAmount;

            const tdEstado = document.createElement("td");
            tdEstado.textContent = formattedStatus;

            tr.appendChild(tdFecha);
            tr.appendChild(tdDesc);
            tr.appendChild(tdMonto);
            tr.appendChild(tdEstado);

            tbody.appendChild(tr);
        });
    };

    const loadFromLocalStorage = () => {
        const raw = localStorage.getItem(loggedInUser);
        if (!raw) return [];
        try {
            const user = JSON.parse(raw);
            if (Array.isArray(user.movements)) {
                return user.movements;
            }
        } catch (e) {
            console.error("Error leyendo movements de localStorage", e);
        }
        return [];
    };

    // Por ahora usamos solo localStorage (lo que guardes desde transfer.js)
    const transactions = loadFromLocalStorage();
    paintRows(transactions);

    // ================================================
    // CLICK EN FILA → GUARDAR COMPROBANTE Y REDIRIGIR
    // ================================================
    tbody.addEventListener("click", (e) => {
        const row = e.target.closest("tr");
        if (!row) return;

        const receiptData = {
            id: row.dataset.id,
            date: row.dataset.date,
            description: row.dataset.description,
            amount: Number(row.dataset.amount || 0),
            status: row.dataset.status,
            type: row.dataset.type,
            from: row.dataset.from || "",
            to: row.dataset.to || ""
        };

        sessionStorage.setItem("receiptDataBackend", JSON.stringify(receiptData));
        window.location.href = "receipt.html";
    });
});
