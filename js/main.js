document.addEventListener('DOMContentLoaded', () => {

    // ===============================================================
    // ============= VALIDACIÓN GLOBAL DE SESIÓN =====================
    // ===============================================================

    const loggedInUserEmail = sessionStorage.getItem('loggedInUser');
    const currentPage = window.location.pathname.split('/').pop();

    // Páginas públicas
    const publicPages = [
        'index.html',
        'register.html',
        'forgot-password.html',
        'reset-password.html',
        'twofactor.html',
        ''
    ];

    // Si NO hay sesión e intenta entrar a una página privada → login
    if (!loggedInUserEmail && !publicPages.includes(currentPage)) {
        window.location.href = 'index.html';
        return;
    }

    // Si hay sesión e intenta ver páginas públicas → dashboard
    if (loggedInUserEmail && publicPages.includes(currentPage)) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Si no hay usuario → detener
    if (!loggedInUserEmail) return;

    // ===============================================================
    // ============= FUNCIONES AUXILIARES / USUARIO ==================
    // ===============================================================

    const getUserData = () =>
        JSON.parse(localStorage.getItem(loggedInUserEmail) || "{}");

    const updateUserData = data =>
        localStorage.setItem(loggedInUserEmail, JSON.stringify(data));

    let currentUser = getUserData();

    const formatCLP = (amount) =>
        new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount || 0);

    // ===============================================================
    // ====================== DASHBOARD ===============================
    // ===============================================================

    if (currentPage === 'dashboard.html') {

        const nameEl = document.getElementById('user-fullname');
        const balanceEl = document.getElementById('user-balance');
        const movementsContainer = document.getElementById('movements-list');

        if (nameEl) nameEl.textContent = currentUser.fullname || "Usuario";
        if (balanceEl) balanceEl.textContent = formatCLP(currentUser.balance || 0);

        if (movementsContainer) {
            movementsContainer.innerHTML = "";

            const recent = [...(currentUser.movements || [])]
                .reverse()
                .slice(0, 3);

            recent.forEach(mov => {
                const isSent = mov.type === "sent";
                movementsContainer.innerHTML += `
                    <div class="movement-item">
                        <div class="movement-icon ${isSent ? 'sent' : 'received'}">
                            <i class="fa-solid ${isSent ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        </div>

                        <div class="movement-details">
                            <p>${mov.description}</p>
                            <span>${new Date(mov.date).toLocaleString("es-CL")}</span>
                        </div>

                        <p class="movement-amount ${isSent ? 'sent' : 'received'}">
                            ${isSent ? '-' : '+'}${formatCLP(mov.amount)}
                        </p>
                    </div>
                `;
            });
        }
    }

    // ===============================================================
    // ===================== TRANSFERENCIAS ==========================
    // ===============================================================

    if (currentPage === 'transfer.html') {

        const form = document.getElementById('transfer-form');
        const amountInput = document.getElementById('transfer-amount');

        // Formateo dinámico del monto
        if (amountInput) {
            amountInput.addEventListener('input', () => {
                let raw = amountInput.value.replace(/\D/g, '');
                if (!raw) return (amountInput.value = "");

                const num = parseInt(raw, 10);
                amountInput.value = new Intl.NumberFormat('es-CL', {
                    minimumFractionDigits: 0
                }).format(num);
            });
        }

        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();

                const toEmail = document.getElementById('recipient-email').value.trim();
                const amountStr = amountInput.value || "";
                const amount = Number(amountStr.replace(/\D/g, ""));

                if (!toEmail || !amount || amount <= 0) {
                    Swal.fire('Error', 'Datos inválidos.', 'error');
                    return;
                }

                if (toEmail === loggedInUserEmail) {
                    Swal.fire('Error', 'No puedes enviarte dinero a ti mismo.', 'error');
                    return;
                }

                if (currentUser.balance < amount) {
                    Swal.fire('Saldo insuficiente', 'No tienes saldo suficiente.', 'error');
                    return;
                }

                const receiverRaw = localStorage.getItem(toEmail);
                if (!receiverRaw) {
                    Swal.fire('Usuario no encontrado', 'Ese correo no existe.', 'error');
                    return;
                }

                const receiverUser = JSON.parse(receiverRaw);
                const movementId = Date.now();
                const now = new Date().toISOString();

                // Movimiento emisor
                const sentMovement = {
                    id: movementId,
                    type: 'sent',
                    description: `Transferencia a ${toEmail}`,
                    amount,
                    date: now
                };

                // Movimiento receptor
                const receivedMovement = {
                    id: movementId,
                    type: 'received',
                    description: `Transferencia de ${loggedInUserEmail}`,
                    amount,
                    date: now
                };

                // Actualizar emisor
                currentUser.balance -= amount;
                currentUser.movements = currentUser.movements || [];
                currentUser.movements.push(sentMovement);
                updateUserData(currentUser);

                // Actualizar receptor
                receiverUser.balance = (receiverUser.balance || 0) + amount;
                receiverUser.movements = receiverUser.movements || [];
                receiverUser.movements.push(receivedMovement);
                localStorage.setItem(toEmail, JSON.stringify(receiverUser));

                Swal.fire({
                    icon: 'success',
                    title: 'Transferencia exitosa',
                    text: `Has enviado ${formatCLP(amount)} a ${toEmail}`,
                    timer: 1700,
                    showConfirmButton: false
                });

                // Guardar comprobante para recibo (receiptData)
                sessionStorage.setItem("receiptData", JSON.stringify({
                    id: movementId,
                    amount,
                    toEmail,
                    description: `Transferencia a ${toEmail}`,
                    date: new Date().toLocaleString("es-CL")
                }));

                setTimeout(() => {
                    window.location.href = "receipt.html";
                }, 1500);
            });
        }
    }

    // ===============================================================
    // ========================== HISTORIAL ==========================
    // ===============================================================

    if (currentPage === "history.html") {

        const list = document.getElementById("full-history-list");
        if (!list) return;

        list.innerHTML = "";

        const all = [...(currentUser.movements || [])].reverse();

        all.forEach(mov => {
            const isSent = mov.type === "sent";

            list.innerHTML += `
                <a href="#" class="movement-item receipt-link" data-id="${mov.id}">
                    <div class="movement-icon ${isSent ? 'sent' : 'received'}">
                        <i class="fa-solid ${isSent ? "fa-arrow-up" : "fa-arrow-down"}"></i>
                    </div>

                    <div class="movement-details">
                        <p>${mov.description}</p>
                        <span>${new Date(mov.date).toLocaleString("es-CL")}</span>
                    </div>

                    <p class="movement-amount ${isSent ? "sent" : "received"}">
                        ${isSent ? "-" : "+"}${formatCLP(mov.amount)}
                    </p>
                </a>
            `;
        });

        // Evento para cada ítem → abrir comprobante por ID
        document.querySelectorAll(".receipt-link").forEach(link => {
            link.addEventListener("click", function (e) {
                e.preventDefault();
                sessionStorage.setItem("receiptId", this.dataset.id);
                window.location.href = "receipt.html";
            });
        });
    }

    // ===============================================================
    // ======================== TARJETAS =============================
    // ===============================================================

    if (currentPage === "cards.html") {

        const cardNumber = document.getElementById("card-number");
        const cardHolder = document.getElementById("card-holder");
        const expiry = document.getElementById("expiry-date");
        const addForm = document.getElementById("add-card-form");
        const cardList = document.getElementById("cards-list");

        const previewNum = document.getElementById("preview-card-number");
        const previewName = document.getElementById("preview-card-holder");
        const previewExp = document.getElementById("preview-expiry-date");

        function detectType(n) {
            if (/^4/.test(n)) return "visa";
            if (/^5[1-5]/.test(n)) return "mastercard";
            if (/^3[47]/.test(n)) return "amex";
            return "other";
        }

        // Número → formato 1111 2222 3333 4444
        cardNumber.addEventListener("input", () => {
            let raw = cardNumber.value.replace(/\D/g, "");
            cardNumber.value = raw.replace(/(.{4})/g, "$1 ").trim();
            if (previewNum) {
                previewNum.textContent = cardNumber.value || "#### #### #### ####";
            }
        });

        // Nombre en mayúsculas
        cardHolder.addEventListener("input", () => {
            if (previewName) {
                previewName.textContent = cardHolder.value.toUpperCase();
            }
        });

        // Fecha (MM/YY)
        expiry.addEventListener("input", () => {
            let v = expiry.value.replace(/\D/g, "");
            if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
            expiry.value = v;
            if (previewExp) {
                previewExp.textContent = v;
            }
        });

        function renderCards() {
            currentUser = getUserData();
            cardList.innerHTML = "<h3>Tarjetas Guardadas</h3>";

            if (currentUser.cards?.length) {
                currentUser.cards.forEach(c => {
                    const logo =
                        detectType(c.number) !== "other"
                            ? `<i class="fa-brands fa-cc-${detectType(c.number)}"></i>`
                            : `<i class="fa-solid fa-credit-card"></i>`;

                    cardList.innerHTML += `
                        <div class="movement-item">
                            <div class="movement-icon">${logo}</div>
                            <div class="movement-details">
                                <p>${c.holder}</p>
                                <span>**** ${c.number.slice(-4)}</span>
                            </div>
                            <p class="movement-amount">Exp: ${c.expiry}</p>
                        </div>
                    `;
                });
            } else {
                cardList.innerHTML += "<p>No tienes tarjetas guardadas.</p>";
            }
        }

        if (addForm) {
            addForm.addEventListener("submit", e => {
                e.preventDefault();

                const newCard = {
                    holder: cardHolder.value.toUpperCase(),
                    number: cardNumber.value.replace(/\s/g, ""),
                    expiry: expiry.value
                };

                currentUser.cards = currentUser.cards || [];
                currentUser.cards.push(newCard);
                updateUserData(currentUser);

                // 💰 BONO: si el usuario no tiene saldo, se acreditan $500.000 al agregar la tarjeta
                if (!currentUser.balance || currentUser.balance === 0) {
                    currentUser.balance = 500000;
                    updateUserData(currentUser);

                    Swal.fire({
                        icon: "success",
                        title: "Tarjeta guardada",
                        text: "Se han acreditado $500.000 a tu saldo.",
                        timer: 2200,
                        showConfirmButton: false
                    });
                } else {
                    // mensaje original si ya tenía saldo
                    Swal.fire("Tarjeta guardada", "", "success");
                }

                addForm.reset();
                renderCards();
            });
        }

        renderCards();
    }

    // ===============================================================
    // ========================= PERFIL ==============================
    // ===============================================================

    if (currentPage === "profile.html") {

        const name = document.getElementById("profile-name");
        const email = document.getElementById("profile-email");
        const logout = document.getElementById("logout-btn");

        if (name) name.textContent = currentUser.fullname;
        if (email) email.textContent = currentUser.email;

        logout?.addEventListener("click", () => {
            Swal.fire({
                title: "¿Cerrar sesión?",
                showCancelButton: true,
                confirmButtonText: "Sí",
                cancelButtonText: "No"
            }).then(res => {
                if (res.isConfirmed) {
                    sessionStorage.removeItem("loggedInUser");
                    window.location.href = "index.html";
                }
            });
        });
    }

    // ===============================================================
    // ======================= RECIBO / COMPROBANTE ==================
    // ===============================================================

    if (currentPage === "receipt.html") {

        const receiptIdStored = sessionStorage.getItem("receiptId");
        const receiptDataStored = sessionStorage.getItem("receiptData");

        const elId = document.getElementById("receipt-id");
        const elAmount = document.getElementById("receipt-amount");
        const elDesc = document.getElementById("receipt-description");
        const elDate = document.getElementById("receipt-date");
        const elFrom = document.getElementById("receipt-from");
        const elTo = document.getElementById("receipt-to");
        const elType = document.getElementById("receipt-type");

        // 🔹 NUEVO: si viene desde history.js con receiptDataBackend
        const backendReceiptRaw = sessionStorage.getItem("receiptDataBackend");
        if (backendReceiptRaw) {
            try {
                const r = JSON.parse(backendReceiptRaw);

                if (elId) elId.textContent = r.id || "-";
                if (elAmount) elAmount.textContent = formatCLP(r.amount || 0);
                if (elDesc) elDesc.textContent = r.description || "";
                if (elDate) elDate.textContent = r.date || "";
                if (elFrom) elFrom.textContent = r.from || "-";
                if (elTo) elTo.textContent = r.to || "-";
                if (elType) elType.textContent = r.type || "Transacción";

                // Ya llenamos el comprobante, no seguimos con la lógica vieja
                return;
            } catch (e) {
                console.error("Error leyendo receiptDataBackend:", e);
            }
        }

        let finalReceipt = null;

        // 1) Si viene desde historial con un ID específico
        if (receiptIdStored) {
            const idNum = Number(receiptIdStored);
            const mov = (currentUser.movements || []).find(m => m.id === idNum);

            if (mov) {
                const isSent = mov.type === "sent";

                finalReceipt = {
                    id: mov.id,
                    amount: mov.amount,
                    description: mov.description,
                    date: new Date(mov.date).toLocaleString("es-CL"),
                    type: isSent ? "Enviado" : "Recibido",
                    from: isSent ? currentUser.email : (mov.description?.match(/de (.+)$/)?.[1] || "Desconocido"),
                    to: isSent ? (mov.description?.match(/a (.+)$/)?.[1] || "Desconocido") : currentUser.email
                };
            }
        }

        // 2) Si viene directo desde una transferencia recién hecha
        if (!finalReceipt && receiptDataStored) {
            const base = JSON.parse(receiptDataStored);

            finalReceipt = {
                id: base.id,
                amount: base.amount,
                description: base.description,
                date: base.date,
                type: "Enviado",
                from: currentUser.email,
                to: base.toEmail
            };
        }

        // 3) Rellenar el HTML si hay datos
        if (finalReceipt) {
            if (elId) elId.textContent = finalReceipt.id;
            if (elAmount) elAmount.textContent = formatCLP(finalReceipt.amount);
            if (elDesc) elDesc.textContent = finalReceipt.description;
            if (elDate) elDate.textContent = finalReceipt.date;
            if (elFrom) elFrom.textContent = finalReceipt.from || "-";
            if (elTo) elTo.textContent = finalReceipt.to || "-";
            if (elType) elType.textContent = finalReceipt.type || "-";
        } else {
            // Si no hay nada, mostrar mensaje básico en los elementos que existan
            if (elDesc) elDesc.textContent = "No se encontró información del comprobante.";
        }
    }

});
