document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        // ================== CONFIG GLOBAL ==================
        const API_URL = 'http://localhost:3000';

        const loggedInUserEmail = sessionStorage.getItem('loggedInUser'); // solo para mostrar/cotejar
        const token = localStorage.getItem('token'); // 🔑 viene del login real (backend)
        const currentPage = window.location.pathname.split('/').pop();

        const PUBLIC_PAGES = [
            'index.html',
            'register.html',
            'forgot-password.html',
            'reset-password.html',
            'twofactor.html',
            ''
        ];

        // Si NO hay token y quiere entrar a páginas privadas -> al login
        if (!token && !PUBLIC_PAGES.includes(currentPage)) {
            window.location.href = 'index.html';
            return;
        }

        // Si hay token y quiere entrar a páginas públicas -> al dashboard
        if (token && PUBLIC_PAGES.includes(currentPage)) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Desde aquí hacia abajo, solo corre si hay sesión real (token)
        if (!token) return;

        // =============== FUNCIONES AUXILIARES ===============
        function formatCurrencyCLP(amount) {
            if (typeof amount !== 'number') {
                amount = 0;
            }
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0
            }).format(amount);
        }

        async function fetchJSON(url, options = {}) {
            const resp = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });

            if (!resp.ok) {
                let msg = 'Error de servidor';
                try {
                    const errData = await resp.json();
                    msg = errData.message || msg;
                } catch (_) { /* ignore */ }

                throw new Error(msg);
            }

            return resp.json();
        }

        // Datos de la cuenta actual (saldo, movimientos básicos, etc.)
        let currentUser = null;

        async function loadCurrentAccount() {
            if (currentUser) return currentUser;

            try {
                const data = await fetchJSON(`${API_URL}/api/accounts/me`, {
                    method: 'GET'
                });
                // Espero algo tipo { email, name, balance, ... }
                currentUser = data;
                return currentUser;
            } catch (err) {
                console.error('Error cargando cuenta:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Sesión expirada',
                    text: 'Vuelve a iniciar sesión.'
                }).then(() => {
                    sessionStorage.removeItem('loggedInUser');
                    localStorage.removeItem('token');
                    window.location.href = 'index.html';
                });
            }
        }

        // ================== PÁGINA DE TRANSFERENCIA ==================
        if (currentPage === 'transfer.html') {
            const transferForm = document.getElementById('transfer-form');

            if (transferForm) {
                // Cargamos usuario de la BD
                currentUser = await loadCurrentAccount();
                if (!currentUser) return;

                transferForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const recipientEmail = document.getElementById('recipient-email').value.trim();
                    const amount = parseFloat(document.getElementById('transfer-amount').value);

                    if (!recipientEmail || isNaN(amount) || amount <= 0) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Datos inválidos',
                            text: 'Verifica el correo del destinatario y el monto.'
                        });
                        return;
                    }

                    if (loggedInUserEmail && recipientEmail === loggedInUserEmail) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Destinatario inválido',
                            text: 'No puedes transferirte dinero a ti mismo.'
                        });
                        return;
                    }

                    try {
                        // Enviamos la transferencia al backend
                        const data = await fetchJSON(`${API_URL}/api/transactions/transfer`, {
                            method: 'POST',
                            body: JSON.stringify({
                                toEmail: recipientEmail,      // 🔁 adapta el nombre al backend
                                amount: amount,
                                description: `Transferencia a ${recipientEmail}`
                            })
                        });

                        // Opcional: si el backend devuelve el nuevo saldo, lo actualizamos
                        if (typeof data.newBalance === 'number') {
                            currentUser.balance = data.newBalance;
                        }

                        Swal.fire({
                            icon: 'success',
                            title: 'Transferencia Exitosa',
                            text: 'La transacción se ha completado correctamente.',
                            showConfirmButton: false,
                            timer: 2000
                        });

                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 2000);
                    } catch (err) {
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error en la transferencia',
                            text: err.message || 'No se pudo completar la transacción.'
                        });
                    }
                });
            }
        }

        // ==================== PÁGINA DE TARJETAS ====================
        if (currentPage === 'cards.html') {
            // Las tarjetas siguen siendo locales (no tocan la BD)
            const flipCard = document.querySelector('.flip-card');
            const cardPreviewFront = document.querySelector('.flip-card-front');
            const cardPreviewLogo = document.getElementById('card-type-logo');
            const cardPreviewNumber = document.getElementById('preview-card-number');
            const cardPreviewHolder = document.getElementById('preview-card-holder');
            const cardPreviewExpiry = document.getElementById('preview-expiry-date');
            const cardPreviewCvc = document.getElementById('preview-cvc');

            const cardNumberInput = document.getElementById('card-number');
            const cardHolderInput = document.getElementById('card-holder');
            const expiryDateInput = document.getElementById('expiry-date');
            const cvcInput = document.getElementById('cvv');

            const addCardForm = document.getElementById('add-card-form');
            const cardsList = document.getElementById('cards-list');

            // Guardamos tarjetas por usuario logueado
            const CARDS_KEY = `cards_${loggedInUserEmail || 'anon'}`;

            function getCards() {
                const raw = localStorage.getItem(CARDS_KEY);
                return raw ? JSON.parse(raw) : [];
            }

            function saveCards(cards) {
                localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
            }

            function detectCardType(number) {
                if (/^4/.test(number)) return 'visa';
                if (/^5[1-5]/.test(number)) return 'mastercard';
                if (/^3[47]/.test(number)) return 'amex';
                return null;
            }

            cardNumberInput.addEventListener('input', () => {
                let value = cardNumberInput.value.replace(/\D/g, '');
                let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
                cardNumberInput.value = formattedValue;

                cardPreviewNumber.textContent = formattedValue || '#### #### #### ####';

                const type = detectCardType(value);
                cardPreviewLogo.innerHTML = type ? `<i class="fa-brands fa-cc-${type}"></i>` : '';
                cardPreviewFront.className = 'flip-card-front';
                if (type) cardPreviewFront.classList.add(`${type}-bg`);
            });

            cardHolderInput.addEventListener('input', () => {
                cardPreviewHolder.textContent = cardHolderInput.value.toUpperCase() || 'NOMBRE APELLIDO';
            });

            expiryDateInput.addEventListener('input', () => {
                let value = expiryDateInput.value.replace(/\D/g, '');
                if (value.length > 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                expiryDateInput.value = value;
                cardPreviewExpiry.textContent = value || 'MM/AA';
            });

            cvcInput.addEventListener('focus', () => flipCard.classList.add('is-flipped'));
            cvcInput.addEventListener('blur', () => flipCard.classList.remove('is-flipped'));
            cvcInput.addEventListener('input', () => {
                cardPreviewCvc.textContent = cvcInput.value;
            });

            const renderCards = () => {
                const cards = getCards();
                cardsList.innerHTML = '<h3>Tarjetas Guardadas</h3>';

                if (cards.length > 0) {
                    cards.forEach(card => {
                        const type = detectCardType(card.number);
                        const logo = type
                            ? `<i class="fa-brands fa-cc-${type}"></i>`
                            : `<i class="fa-solid fa-credit-card"></i>`;

                        cardsList.innerHTML += `
                            <div class="movement-item">
                                <div class="movement-icon">
                                    ${logo}
                                </div>
                                <div class="movement-details">
                                    <p>${card.holder}</p>
                                    <span>**** ${card.number.slice(-4)}</span>
                                </div>
                                <p class="movement-amount">Exp: ${card.expiry}</p>
                            </div>`;
                    });
                } else {
                    cardsList.innerHTML += '<p>No tienes tarjetas guardadas.</p>';
                }
            };

            if (addCardForm) {
                addCardForm.addEventListener('submit', e => {
                    e.preventDefault();

                    const cards = getCards();

                    const newCard = {
                        holder: cardHolderInput.value.toUpperCase(),
                        number: cardNumberInput.value.replace(/\s/g, ''),
                        expiry: expiryDateInput.value
                    };

                    cards.push(newCard);
                    saveCards(cards);
                    renderCards();

                    addCardForm.reset();
                    cardPreviewNumber.textContent = '#### #### #### ####';
                    cardPreviewHolder.textContent = 'NOMBRE APELLIDO';
                    cardPreviewExpiry.textContent = 'MM/AA';
                    cardPreviewLogo.innerHTML = '';
                    cardPreviewFront.className = 'flip-card-front';

                    Swal.fire({
                        icon: 'success',
                        title: '¡Tarjeta guardada!',
                        showConfirmButton: false,
                        timer: 2000
                    });
                });
            }

            renderCards();
        }

        // ==================== PÁGINA DE HISTORIAL ===================
        if (currentPage === 'history.html') {
            const historyList = document.getElementById('full-history-list');

            if (historyList) {
                historyList.innerHTML = '';

                try {
                    // Pido el historial real al backend
                    const movimientos = await fetchJSON(`${API_URL}/api/transactions/history`, {
                        method: 'GET'
                    });

                    if (Array.isArray(movimientos) && movimientos.length > 0) {
                        movimientos
                            .slice()
                            .reverse()
                            .forEach(mov => {
                                const isSent = mov.type === 'sent';

                                historyList.innerHTML += `
                                    <a href="#" class="movement-item receipt-link" data-id="${mov.id}">
                                        <div class="movement-icon ${isSent ? 'sent' : 'received'}">
                                            <i class="fa-solid ${isSent ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                        </div>
                                        <div class="movement-details">
                                            <p>${mov.description}</p>
                                            <span>${new Date(mov.date).toLocaleString()}</span>
                                        </div>
                                        <p class="movement-amount ${isSent ? 'sent' : 'received'}">
                                            ${isSent ? '-' : '+'}${formatCurrencyCLP(mov.amount)}
                                        </p>
                                    </a>`;
                            });

                        // Si sigues usando receipt.html, puedes guardar el id
                        document.querySelectorAll('.receipt-link').forEach(link => {
                            link.addEventListener('click', function (e) {
                                e.preventDefault();
                                sessionStorage.setItem('receiptId', this.dataset.id);
                                window.location.href = 'receipt.html';
                            });
                        });
                    } else {
                        historyList.innerHTML = '<p>Aún no tienes movimientos.</p>';
                    }
                } catch (err) {
                    console.error(err);
                    historyList.innerHTML = '<p>Error al cargar el historial.</p>';
                }
            }
        }

        // ===================== PÁGINA DE PERFIL =====================
        if (currentPage === 'profile.html') {
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const logoutBtn = document.getElementById('logout-btn');

            currentUser = await loadCurrentAccount();
            if (!currentUser) return;

            if (profileName) {
                profileName.textContent =
                    currentUser.fullName ||
                    currentUser.fullname ||
                    currentUser.name ||
                    'Usuario';
            }
            if (profileEmail) {
                profileEmail.textContent = currentUser.email || loggedInUserEmail || '';
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    Swal.fire({
                        title: '¿Cerrar sesión?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, cerrar sesión',
                        cancelButtonText: 'Cancelar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            sessionStorage.removeItem('loggedInUser');
                            localStorage.removeItem('token');
                            window.location.href = 'index.html';
                        }
                    });
                });
            }
        }
    })();
});
