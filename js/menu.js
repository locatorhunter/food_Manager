// ========================================
// Menu Page Functionality
// ========================================

let selectedItems = {};
let expandedHotels = new Set();
let menuSearchTerm = '';
let categoryFilter = '';
let cardSize = 'medium';

// Make functions globally available
window.showItemModal = showItemModal;
window.incrementQuantity = incrementQuantity;
window.decrementQuantity = decrementQuantity;
window.uploadItemImage = uploadItemImage;
window.toggleHotelMenu = toggleHotelMenu;
window.cancelOrder = cancelOrder;
window.showOrderModal = showOrderModal;
window.showGroupOrderModal = showGroupOrderModal;
window.closeGroupOrderModal = closeGroupOrderModal;
window.addParticipant = addParticipant;
window.removeParticipant = removeParticipant;
window.confirmGroupOrder = confirmGroupOrder;
window.showGroupOrderingModal = showGroupOrderingModal;
window.closeGroupOrderingModal = closeGroupOrderingModal;
window.adjustParticipantCount = adjustParticipantCount;
window.confirmGroupOrdering = confirmGroupOrdering;
window.showCartModal = showCartModal;
window.closeCartModal = closeCartModal;
window.removeFromCart = removeFromCart;

document.addEventListener('DOMContentLoaded', function() {
    initializeMenuPage();
});

async function initializeMenuPage() {
    cardSize = localStorage.getItem('menuCardSize') || 'medium';
    const cardSizeElement = document.getElementById('cardSize');
    if (cardSizeElement) {
        cardSizeElement.value = cardSize;
    }

    try {
        // Expand all hotels by default on initial load
        const selectedHotels = await StorageManager.getSelectedHotelsData();
        if (selectedHotels && Array.isArray(selectedHotels)) {
            selectedHotels.forEach(hotel => {
                expandedHotels.add(hotel.id);
            });
        }
    } catch (error) {
        console.error('Error initializing menu page:', error);
    }

    await displayHotelsMenu();
    setupSearch();
    setupItemModal();
    setupEventDelegation();

    window.addEventListener('hotelsUpdated', async () => {
        selectedItems = {};
        expandedHotels.clear();
        try {
            // Re-expand all hotels when hotels are updated
            const updatedHotels = await StorageManager.getSelectedHotelsData();
            if (updatedHotels && Array.isArray(updatedHotels)) {
                updatedHotels.forEach(hotel => {
                    expandedHotels.add(hotel.id);
                });
            }
        } catch (error) {
            console.error('Error updating hotels in menu:', error);
        }
        displayHotelsMenu();
    });
}

function setupEventDelegation() {
    // Event delegation for dynamically added buttons - only for place order button
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('place-order-btn') || e.target.closest('.place-order-btn')) {
            e.preventDefault();
            e.stopPropagation();
            // Close any open cart modal first
            closeCartModal();
            // Wait for DOM to settle before showing order modal
            setTimeout(() => {
                showOrderModal();
            }, 300);
            return;
        }
    });

    // Prevent double-tap zoom on quantity buttons and menu cards
    document.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('quantity-btn') ||
            e.target.classList.contains('btn-upload') ||
            e.target.closest('.menu-item-card') ||
            e.target.classList.contains('menu-item-card')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Improve touch feedback for mobile
    if ('ontouchstart' in window) {
        document.addEventListener('touchstart', function(e) {
            const target = e.target;
            if (target.classList.contains('quantity-btn') ||
                target.classList.contains('btn-upload') ||
                target.closest('.menu-item-card') ||
                target.classList.contains('menu-item-card')) {
                target.style.transform = 'scale(0.95)';
                target.style.transition = 'transform 0.1s ease';
            }
        });

        document.addEventListener('touchend', function(e) {
            const target = e.target;
            if (target.classList.contains('quantity-btn') ||
                target.classList.contains('btn-upload') ||
                target.closest('.menu-item-card') ||
                target.classList.contains('menu-item-card')) {
                target.style.transform = '';
            }
        });
    }
}

function setupItemModal() {
    const modal = document.getElementById('itemModal');
    const closeBtn = document.querySelector('#itemModal .modal-close');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('menuSearch');
    const categorySelect = document.getElementById('categoryFilter');
    const sizeSelect = document.getElementById('cardSize');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            menuSearchTerm = e.target.value;
            await displayHotelsMenu();
        }, 300));
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', async (e) => {
            categoryFilter = e.target.value;
            await displayHotelsMenu();
        });
    }

    if (sizeSelect) {
        sizeSelect.addEventListener('change', async (e) => {
            cardSize = e.target.value;
            localStorage.setItem('menuCardSize', cardSize);
            await displayHotelsMenu();
        });
    }
}

async function displayHotelsMenu() {
    const container = document.getElementById('hotelsMenuContainer');
    if (!container) return;

    try {
        const selectedHotels = await StorageManager.getSelectedHotelsData();

        if (!selectedHotels || selectedHotels.length === 0) {
            container.innerHTML = '<p class="empty-message">No hotels selected for today. Please contact admin.</p>';
            return;
        }

        let html = '';

        selectedHotels.forEach(hotel => {
            const isExpanded = expandedHotels.has(hotel.id);
            const availableItems = hotel.menuItems ? hotel.menuItems.filter(item => item.available) : [];

            html += `
                <div class="hotel-menu-section">
                    <div class="hotel-header-clickable" onclick="toggleHotelMenu('${hotel.id}')">
                        <h3>🏨 ${hotel.name} <span class="item-count">(${availableItems.length} items)</span></h3>
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>

                    <div class="hotel-menu-items ${isExpanded ? 'expanded' : 'collapsed'}" id="hotel-menu-${hotel.id}">
                        ${displayMenuItems(hotel, availableItems)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying hotels menu:', error);
        container.innerHTML = '<p class="empty-message">Error loading menu. Please refresh.</p>';
    }
}

async function toggleHotelMenu(hotelId) {
    if (expandedHotels.has(hotelId)) {
        expandedHotels.delete(hotelId);
    } else {
        expandedHotels.add(hotelId);
    }
    await displayHotelsMenu();
}

function displayMenuItems(hotel, items) {
    if (items.length === 0) {
        return '<p class="empty-message">No items available today from this hotel.</p>';
    }

    // Filter items based on search term and category
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (filteredItems.length === 0) {
        return '<p class="empty-message">No items match your search.</p>';
    }

    let html = `<div class="menu-items-grid card-size-${cardSize}">`;

    filteredItems.forEach(item => {
        const itemKey = `${hotel.id}-${item.id}`;
        const quantity = selectedItems[itemKey]?.quantity || 0;
        const isSelected = quantity > 0;

        const itemImages = item.images || [];
        const hasImages = itemImages.length > 0;

        const mainImage = hasImages ? itemImages[0] : null;

        html += `
            <div class="menu-item-card ${isSelected ? 'selected' : ''}" id="item-${itemKey}" onclick="showItemModal('${hotel.id}', '${item.id}')">
                ${mainImage ? `<div class="menu-item-main-image" style="background-image: url('${mainImage}')"></div>` : '<div class="menu-item-no-image">🍽️</div>'}
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <div class="menu-item-name">${item.name}</div>
                        <div class="menu-item-price">${formatCurrency(item.price)}</div>
                    </div>
                    <div class="menu-item-category">${item.category || 'No category'}</div>
                    <div class="menu-item-actions">
                        <div class="menu-item-quantity">
                            <button type="button" class="quantity-btn" onclick="event.stopPropagation(); decrementQuantity('${hotel.id}', '${item.id}', '${hotel.name}')">−</button>
                            <input type="number" class="quantity-input" value="${quantity}" readonly>
                            <button type="button" class="quantity-btn" onclick="event.stopPropagation(); incrementQuantity('${hotel.id}', '${item.id}', '${hotel.name}')">+</button>
                        </div>
                        <button type="button" class="btn-upload" onclick="event.stopPropagation(); uploadItemImage('${hotel.id}', '${item.id}')">📷</button>
                    </div>
                </div>
            </div>
        `;
    });

    // Add floating order summary if items selected
    const hasSelectedItems = Object.values(selectedItems).some(item => item.quantity > 0);
    if (hasSelectedItems) {
        const total = Object.values(selectedItems).reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalItems = Object.values(selectedItems).reduce((sum, item) => sum + item.quantity, 0);
        html += `
            <div class="floating-order-summary">
                <button class="cart-btn" onclick="showCartModal()" title="View Cart">🛒</button>
                <div class="order-summary-content">
                    <span>${totalItems} items • ₹${total.toFixed(2)}</span>
                    <div class="floating-order-actions">
                        <button class="cancel-order-btn btn btn-primary" onclick="cancelOrder()">Cancel</button>
                        <button class="place-order-btn btn btn-primary" onclick="showOrderModal()">Place Order</button>
                    </div>
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

async function incrementQuantity(hotelId, itemId, hotelName) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);
        if (!hotel || !hotel.menuItems) {
            console.error('Hotel or menu items not found');
            return;
        }
        const item = hotel.menuItems.find(i => i.id === itemId);

        if (item) {
            const itemKey = `${hotelId}-${itemId}`;

            // Check if this is the first time adding this item
            const isFirstAddition = !selectedItems[itemKey] || selectedItems[itemKey].quantity === 0;

            if (isFirstAddition) {
                // Check if item price exceeds the limit
                const maxAmount = await StorageManager.getMaxAmountPerPerson();
                if (item.price > maxAmount) {
                    // Show group order modal instead of normal increment
                    showGroupOrderModal(item, hotel);
                    return;
                }
            }

            // Normal increment logic
            if (!selectedItems[itemKey]) {
                selectedItems[itemKey] = {
                    ...item,
                    quantity: 0,
                    hotelId,
                    hotelName
                };
            }
            selectedItems[itemKey].quantity++;
            updateMenuDisplay(itemKey);
            await displayHotelsMenu(); // Refresh to show floating summary
        }
    } catch (error) {
        console.error('Error incrementing quantity:', error);
    }
}

async function decrementQuantity(hotelId, itemId, hotelName) {
    const itemKey = `${hotelId}-${itemId}`;

    if (selectedItems[itemKey] && selectedItems[itemKey].quantity > 0) {
        selectedItems[itemKey].quantity--;

        if (selectedItems[itemKey].quantity === 0) {
            delete selectedItems[itemKey];
        }

        updateMenuDisplay(itemKey);
        await displayHotelsMenu(); // Refresh to show floating summary
    }
}

function updateMenuDisplay(itemKey) {
    const card = document.getElementById(`item-${itemKey}`);
    const quantityInput = card?.querySelector('.quantity-input');
    
    if (card && quantityInput) {
        const quantity = selectedItems[itemKey]?.quantity || 0;
        quantityInput.value = quantity;
        
        if (quantity > 0) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }
}

// Group Ordering Modal Functions (for cart total exceeding limit)
let selectedGroupSize = null;
let groupParticipantNames = [];

async function showGroupOrderingModal(total, maxAmount, items) {
    // First check if we're on the menu page
    if (!document.getElementById('hotelsMenuContainer') || !document.getElementById('menuSearch')) {
        console.error('Not on menu page - group ordering modal not available');
        showToast('Error: Please navigate to the menu page to place orders.', 'error');
        return;
    }

    selectedGroupSize = null;
    groupParticipantNames = [];

    const excess = total - maxAmount;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const infoHtml = `
        <div class="limit-exceeded">⚠️ Order Total Exceeds Limit</div>
        <div class="current-total">Your order: ${formatCurrency(total)} (${totalItems} items)</div>
        <div class="limit-info">Individual limit: ${formatCurrency(maxAmount)} per person<br>
        You need ${formatCurrency(excess)} more to place this order.</div>
        <div style="margin-top: 12px; color: var(--text-secondary);">
            💡 <strong>Solution:</strong> Order with friends to share the cost!
        </div>
    `;

    // Try to find existing modal elements
    let groupOrderingModal = document.getElementById('groupOrderingModal');
    let groupOrderingInfo = document.getElementById('groupOrderingInfo');
    let participantNamesSection = document.getElementById('participantNamesSection');
    let confirmGroupOrderingBtn = document.getElementById('confirmGroupOrderingBtn');
    let participantCount = document.getElementById('participantCount');

    // If modal doesn't exist, create it dynamically
    if (!groupOrderingModal) {
        console.log('Creating group ordering modal dynamically');

        const modalHtml = `
            <div id="groupOrderingModal" class="modal" style="display: none;">
                <div class="modal-content group-ordering-modal-content">
                    <span class="modal-close" onclick="closeGroupOrderingModal()">&times;</span>
                    <h2>💰 Amount Limit Exceeded</h2>
                    <div id="groupOrderingInfo" class="group-ordering-info">
                        ${infoHtml}
                    </div>
                    <div class="group-size-selection">
                        <h3>How many people are ordering together?</h3>
                        <div class="participant-count-selector">
                            <button class="count-btn" onclick="adjustParticipantCount(-1)">−</button>
                            <input type="number" id="participantCount" class="participant-count-input" value="2" min="2" max="20" readonly>
                            <button class="count-btn" onclick="adjustParticipantCount(1)">+</button>
                            <span class="count-label">people</span>
                        </div>
                        <div class="group-size-hint">
                            <small>💡 Enter the number of people sharing this order (2-20)</small>
                        </div>
                    </div>
                    <div id="participantNamesSection" class="participant-names-section" style="display: none;">
                        <h3>Enter Participant Names</h3>
                        <div id="participantNamesList" class="participant-names-list">
                            <!-- Name inputs will be added here -->
                        </div>
                        <div class="cost-breakdown" id="costBreakdown">
                            <!-- Cost breakdown will be shown here -->
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="confirmGroupOrderingBtn" class="btn btn-primary" onclick="confirmGroupOrdering()" style="display: none;">Place Group Order</button>
                        <button class="btn btn-secondary" onclick="closeGroupOrderingModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Now get the references to the newly created elements
        groupOrderingModal = document.getElementById('groupOrderingModal');
        groupOrderingInfo = document.getElementById('groupOrderingInfo');
        participantNamesSection = document.getElementById('participantNamesSection');
        confirmGroupOrderingBtn = document.getElementById('confirmGroupOrderingBtn');
        participantCount = document.getElementById('participantCount');
    }

    // Now proceed with modal setup
    groupOrderingInfo.innerHTML = infoHtml;
    participantNamesSection.style.display = 'block';
    confirmGroupOrderingBtn.style.display = 'none';

    // Initialize with 2 participants
    selectedGroupSize = 2;
    groupParticipantNames = ['', ''];
    participantCount.value = selectedGroupSize;

    // Generate initial name inputs
    updateParticipantNameInputs();

    groupOrderingModal.style.display = 'flex';

    // Update button states and cost breakdown after modal is displayed
    setTimeout(() => {
        updateCountButtonStates();
        updateCostBreakdown();

        // Focus on first name input
        setTimeout(() => {
            const firstInput = document.getElementById('participant-name-0');
            if (firstInput) firstInput.focus();
        }, 50);
    }, 10);
}

function closeGroupOrderingModal() {
    console.log('closeGroupOrderingModal called');
    document.getElementById('groupOrderingModal').style.display = 'none';
    selectedGroupSize = null;
    groupParticipantNames = [];
    document.getElementById('participantCount').value = 2;
}

function adjustParticipantCount(change) {
    const currentCount = parseInt(document.getElementById('participantCount').value);
    const newCount = currentCount + change;

    // Validate range (2-20)
    if (newCount < 2 || newCount > 20) {
        return;
    }

    selectedGroupSize = newCount;
    document.getElementById('participantCount').value = newCount;

    // Adjust the names array
    if (change > 0) {
        // Adding participants
        groupParticipantNames.push('');
    } else {
        // Removing participants
        groupParticipantNames.pop();
    }

    updateParticipantNameInputs();
    updateCountButtonStates();
    updateCostBreakdown(); // Recalculate cost breakdown with new group size

    // Clear any existing values when count changes
    groupParticipantNames = new Array(selectedGroupSize).fill('');
}

function updateCountButtonStates() {
    const countInput = document.getElementById('participantCount');
    if (!countInput) return; // Modal not open yet

    const count = parseInt(countInput.value);
    const minusBtn = document.querySelector('.count-btn:first-child');
    const plusBtn = document.querySelector('.count-btn:last-child');

    if (minusBtn) minusBtn.disabled = count <= 2;
    if (plusBtn) plusBtn.disabled = count >= 20;
}

function updateParticipantNameInputs() {
    const namesListHtml = groupParticipantNames.map((name, index) => `
        <input type="text"
               class="participant-name-input"
               placeholder="Enter name for person ${index + 1}"
               value="${name}"
               id="participant-name-${index}">
    `).join('');

    const participantNamesList = document.getElementById('participantNamesList');
    if (!participantNamesList) {
        console.error('participantNamesList element not found');
        return;
    }
    participantNamesList.innerHTML = namesListHtml;
}


async function updateCostBreakdown() {
    if (!selectedGroupSize) return;

    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const perPersonShare = Math.ceil(total / selectedGroupSize); // Round up to ensure coverage

    console.log('updateCostBreakdown:', { total, selectedGroupSize, perPersonShare });

    const maxAmount = await StorageManager.getMaxAmountPerPerson();

    let breakdownHtml = `
        <h4>Cost Breakdown</h4>
        <p><strong>Total Order:</strong> ${formatCurrency(total)}</p>
        <p><strong>Number of People:</strong> ${selectedGroupSize}</p>
        <p class="per-person"><strong>Each Person Pays:</strong> ${formatCurrency(perPersonShare)}</p>
    `;

    if (perPersonShare > maxAmount) {
        breakdownHtml += `
            <p style="color: #ff6b6b; font-weight: bold;">
                ⚠️ Each person would pay ${formatCurrency(perPersonShare)}, which exceeds the limit of ${formatCurrency(maxAmount)}.
            </p>
            <p style="color: var(--text-secondary);">
                Try adding more people or reducing items in your order.
            </p>
        `;
    } else {
        breakdownHtml += `
            <p style="color: #51cf66; font-weight: bold;">
                ✅ Each person pays within the ${formatCurrency(maxAmount)} limit!
            </p>
        `;
    }

    const costBreakdown = document.getElementById('costBreakdown');
    if (!costBreakdown) {
        console.error('costBreakdown element not found');
        return;
    }
    costBreakdown.innerHTML = breakdownHtml;

    // Always enable the button - validation happens on submit
    const button = document.getElementById('confirmGroupOrderingBtn');
    if (button) {
        button.style.display = 'inline-block';
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

async function confirmGroupOrdering() {
    console.log('confirmGroupOrdering called');

    if (!selectedGroupSize) {
        showToast('Please select group size', 'error');
        return;
    }

    // Collect names directly from input fields
    const participantNames = [];
    for (let i = 0; i < selectedGroupSize; i++) {
        const input = document.getElementById(`participant-name-${i}`);
        if (input) {
            const name = input.value.trim();
            if (!name) {
                showToast(`Please enter name for person ${i + 1}`, 'error');
                input.focus();
                return;
            }
            if (!isValidName(name)) {
                showToast('Names can only contain letters, spaces, hyphens, and apostrophes', 'error');
                input.focus();
                return;
            }
            participantNames.push(name);
        } else {
            showToast('Error: Input field not found', 'error');
            return;
        }
    }

    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const perPersonShare = Math.ceil(total / selectedGroupSize);

    const maxAmount = await StorageManager.getMaxAmountPerPerson();
    if (perPersonShare > maxAmount) {
        showToast(`Each person would pay ${formatCurrency(perPersonShare)}, which exceeds the limit`, 'error');
        return;
    }

    // Create participants array
    const participants = participantNames.map(name => ({
        name: name,
        shareAmount: perPersonShare
    }));

    // Adjust the last person's share to account for rounding
    const totalShares = participants.reduce((sum, p) => sum + p.shareAmount, 0);
    if (totalShares > total) {
        participants[participants.length - 1].shareAmount -= (totalShares - total);
    }

    // Group items by hotel for order
    const ordersByHotel = {};
    items.forEach(item => {
        if (!ordersByHotel[item.hotelName]) {
            ordersByHotel[item.hotelName] = [];
        }
        ordersByHotel[item.hotelName].push({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.category
        });
    });

    // Create orders for each hotel
    const orderPromises = Object.entries(ordersByHotel).map(([hotelName, hotelItems]) => {
        const hotelTotal = hotelItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const order = {
            employeeName: participants[0].name, // Primary participant
            items: hotelItems,
            total: hotelTotal,
            hotelName,
            isGroupOrder: true,
            participants: participants
        };

        return StorageManager.addOrder(order);
    });

    try {
        await Promise.all(orderPromises);
        showToast(`Group order placed successfully for ${selectedGroupSize} people!`);

        // Reset and close
        selectedItems = {};
        closeGroupOrderingModal();
        await displayHotelsMenu();
    } catch (error) {
        console.error('Error placing group order:', error);
        showToast('Error placing order. Please try again.', 'error');
    }
}




async function showOrderModal() {
    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Check if total exceeds the limit
    const maxAmount = await StorageManager.getMaxAmountPerPerson();
    if (total > maxAmount) {
        // Close any open cart modal first
        closeCartModal();
        // Wait for DOM to settle before showing group ordering modal
        setTimeout(() => {
            showGroupOrderingModal(total, maxAmount, items);
        }, 300);
        return;
    }

    // Normal ordering flow - try to find existing modal elements
    let orderModal = document.getElementById('orderModal');
    let orderPreview = document.getElementById('orderPreview');
    let orderEmployeeName = document.getElementById('orderEmployeeName');

    // If modal doesn't exist, create it dynamically
    if (!orderModal) {
        console.log('Creating order modal dynamically');

        const modalHtml = `
            <div id="orderModal" class="modal" style="display: none;">
                <div class="modal-content order-modal-content">
                    <h2>Place Your Order</h2>
                    <div class="form-group">
                        <label for="orderEmployeeName">Your Name</label>
                        <input type="text" id="orderEmployeeName" placeholder="Enter your name" required>
                    </div>
                    <div class="order-summary-preview">
                        <p id="orderPreview"></p>
                    </div>
                    <div class="modal-actions">
                        <button id="confirmOrderBtn" class="btn btn-primary">Place Order</button>
                        <button id="cancelOrderBtn" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Now get the references to the newly created elements
        orderModal = document.getElementById('orderModal');
        orderPreview = document.getElementById('orderPreview');
        orderEmployeeName = document.getElementById('orderEmployeeName');

        // Re-setup modal event listeners for the dynamically created modal
        const confirmBtn = document.getElementById('confirmOrderBtn');
        const cancelBtn = document.getElementById('cancelOrderBtn');
        const closeBtn = orderModal.querySelector('.modal-close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                orderModal.style.display = 'none';
            });
        }

        cancelBtn.addEventListener('click', () => {
            orderModal.style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                orderModal.style.display = 'none';
            }
        });

        confirmBtn.addEventListener('click', () => {
            const employeeNameInput = document.getElementById('orderEmployeeName');
            if (!employeeNameInput) {
                showToast('Error: Name input not found', 'error');
                return;
            }

            const employeeName = sanitizeInput(employeeNameInput.value);

            if (!employeeName) {
                showToast('Please enter your name', 'error');
                return;
            }

            if (!isValidName(employeeName)) {
                showToast('Name can only contain letters, spaces, hyphens, and apostrophes', 'error');
                return;
            }

            orderModal.style.display = 'none';

            const items = Object.values(selectedItems).filter(item => item.quantity > 0);
            const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

            // Group items by hotel for order
            const ordersByHotel = {};
            items.forEach(item => {
                if (!ordersByHotel[item.hotelName]) {
                    ordersByHotel[item.hotelName] = [];
                }
                ordersByHotel[item.hotelName].push({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    category: item.category
                });
            });

            placeOrders(ordersByHotel, employeeName);
        });
    }

    // Now proceed with modal setup
    const preview = `${totalItems} item(s) • Total: ${formatCurrency(total)}`;
    orderPreview.textContent = preview;
    orderEmployeeName.value = '';
    orderModal.style.display = 'flex';
    orderEmployeeName.focus();
}

function cancelOrder() {
    // Clear all selected items
    selectedItems = {};
    // Refresh the menu display to hide the floating order summary
    displayHotelsMenu();
    showToast('Order cancelled');
}

async function placeOrders(ordersByHotel, employeeName) {
    // Create separate order for each hotel
    Object.entries(ordersByHotel).forEach(([hotelName, hotelItems]) => {
        const hotelTotal = hotelItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const order = {
            employeeName,
            items: hotelItems,
            total: hotelTotal,
            hotelName
        };

        StorageManager.addOrder(order);
    });

    showToast('Order placed successfully!');

    // Reset
    selectedItems = {};
    await displayHotelsMenu();
}

async function showItemModal(hotelId, itemId) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);
        if (!hotel || !hotel.menuItems) {
            console.error('Hotel or menu items not found');
            return;
        }

        const item = hotel.menuItems.find(i => i.id === itemId);
        if (!item) {
            console.error('Item not found');
            return;
        }

    const itemKey = `${hotelId}-${itemId}`;
    const quantity = selectedItems[itemKey]?.quantity || 0;
    const hasImages = item.images && item.images.length > 0;

    let modalHtml = `
        <div class="item-modal-large">
            ${hasImages ? `<div class="item-modal-images">${item.images.map(img => `<img src="${img}" alt="${item.name}" class="item-modal-image">`).join('')}</div>` : '<div class="item-modal-no-image">🍽️<br>No images yet</div>'}
            <div class="item-modal-details">
                <h2>${item.name}</h2>
                <p class="item-modal-price">${formatCurrency(item.price)}</p>
                <p class="item-modal-category">Category: ${item.category || 'No category'}</p>
                <p class="item-modal-hotel">From: ${hotel.name}</p>
                <div class="item-modal-actions">
                    <div class="menu-item-quantity">
                        <button type="button" class="quantity-btn" onclick="decrementQuantity('${hotelId}', '${itemId}', '${hotel.name}'); updateModalQuantity('${itemKey}')">−</button>
                        <input type="number" class="quantity-input" id="modal-quantity-${itemKey}" value="${quantity}" readonly>
                        <button type="button" class="quantity-btn" onclick="incrementQuantity('${hotelId}', '${itemId}', '${hotel.name}'); updateModalQuantity('${itemKey}')">+</button>
                    </div>
                    <button type="button" class="btn-upload" onclick="uploadItemImage('${hotelId}', '${itemId}'); refreshModal('${hotelId}', '${itemId}')">📷 Upload Photo</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('itemModalContent').innerHTML = modalHtml;
    document.getElementById('itemModal').style.display = 'flex';
    } catch (error) {
        console.error('Error showing item modal:', error);
    }
}

function updateModalQuantity(itemKey) {
    const quantity = selectedItems[itemKey]?.quantity || 0;
    const input = document.getElementById(`modal-quantity-${itemKey}`);
    if (input) input.value = quantity;
}

function refreshModal(hotelId, itemId) {
    // Refresh the modal content after image upload
    setTimeout(() => showItemModal(hotelId, itemId), 100);
}

async function uploadItemImage(hotelId, itemId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(event) {
                const imageData = event.target.result;
                StorageManager.addImageToMenuItem(hotelId, itemId, imageData);
                showToast('Image uploaded successfully!');
                await displayHotelsMenu(); // Refresh to show new image
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

// Cart Modal Functions
function showCartModal() {
    const cartItems = Object.values(selectedItems).filter(item => item.quantity > 0);

    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    let cartHtml = `
        <div class="cart-modal-header">
            <h3>Your Cart (${cartItems.length} items)</h3>
            <span class="cart-close" data-action="close">&times;</span>
        </div>
        <div class="cart-items-list">
    `;

    cartItems.forEach(item => {
        const itemKey = `${item.hotelId}-${item.id}`;
        const itemTotal = item.price * item.quantity;

        cartHtml += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">
                        <span class="cart-item-price">${formatCurrency(item.price)} each</span>
                        <span class="cart-item-hotel">🏨 ${item.hotelName}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-quantity-controls">
                        <button class="quantity-btn" data-action="decrease" data-item="${itemKey}">−</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" readonly min="0">
                        <button class="quantity-btn" data-action="increase" data-item="${itemKey}">+</button>
                    </div>
                    <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
                    <button class="btn btn-danger btn-small" data-action="remove" data-item="${itemKey}">Remove</button>
                </div>
            </div>
        `;
    });

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    cartHtml += `
        </div>
        <div class="cart-summary">
            <div class="cart-total">
                <strong>Total: ${formatCurrency(total)} (${totalItems} items)</strong>
            </div>
            <div class="cart-actions">
                <button class="btn btn-secondary" data-action="continue">Continue Shopping</button>
                <button class="btn btn-primary" data-action="checkout">Place Order</button>
            </div>
        </div>
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal cart-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
        align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: var(--bg-primary); border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            ${cartHtml}
        </div>
    `;

    // Append modal to DOM first
    document.body.appendChild(modal);

    // Add event listeners after modal is in DOM
    setTimeout(() => {
        // Handle close button
        const closeBtn = modal.querySelector('.cart-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeCartModal();
            });
        }

        // Handle continue shopping button
        const continueBtn = modal.querySelector('[data-action="continue"]');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                closeCartModal();
            });
        }

        // Handle checkout button
        const checkoutBtn = modal.querySelector('[data-action="checkout"]');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                closeCartModal();
                // Wait for DOM to settle before showing order modal
                setTimeout(() => {
                    showOrderModal();
                }, 300);
            });
        }

        // Handle quantity and remove buttons
        const buttons = modal.querySelectorAll('[data-action]');
        buttons.forEach(button => {
            const action = button.getAttribute('data-action');
            const itemKey = button.getAttribute('data-item');

            if (action === 'increase' && itemKey) {
                button.addEventListener('click', async () => {
                    await updateCartQuantity(itemKey, selectedItems[itemKey].quantity + 1);
                });
            } else if (action === 'decrease' && itemKey) {
                button.addEventListener('click', async () => {
                    await updateCartQuantity(itemKey, selectedItems[itemKey].quantity - 1);
                });
            } else if (action === 'remove' && itemKey) {
                button.addEventListener('click', async () => {
                    await removeFromCart(itemKey);
                });
            }
        });

        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCartModal();
            }
        });
    }, 10);
}

function closeCartModal() {
    const modal = document.querySelector('.cart-modal');
    if (modal) {
        modal.remove();
    }
}

function showEmptyCartModal() {
    // Replace current cart modal content with empty message
    const modal = document.querySelector('.cart-modal');
    if (!modal) return;

    const emptyCartHtml = `
        <div style="background: var(--bg-primary); border-radius: 12px; max-width: 400px; width: 90%; padding: 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px;">🛒</div>
            <h3 style="margin-bottom: 10px; color: var(--text-primary);">Your Cart is Empty</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Add some delicious items to get started!</p>
            <button class="btn btn-primary" data-action="continue" style="width: 100%;">Continue Shopping</button>
        </div>
    `;

    modal.innerHTML = emptyCartHtml;

    // Add event listener for continue shopping button
    modal.addEventListener('click', function(e) {
        const target = e.target;
        const action = target.getAttribute('data-action');

        if (action === 'continue' || target === modal) {
            closeCartModal();
        }
    });
}

async function updateCartQuantity(itemKey, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(itemKey);
        return;
    }

    if (selectedItems[itemKey]) {
        selectedItems[itemKey].quantity = newQuantity;
        updateMenuDisplay(itemKey);
        await displayHotelsMenu(); // Refresh floating summary
        showCartModal(); // Refresh cart modal
    }
}

async function removeFromCart(itemKey) {
    if (selectedItems[itemKey]) {
        delete selectedItems[itemKey];

        // Check if cart is now empty after removal
        const remainingItems = Object.values(selectedItems).filter(item => item.quantity > 0);
        if (remainingItems.length === 0) {
            // Cart is now empty - show empty cart modal
            showEmptyCartModal();
        } else {
            // Cart still has items - refresh cart modal
            showCartModal();
        }

        // Always refresh the menu display to update floating summary
        await displayHotelsMenu();
    }
}

// Group Order Modal Functions
let currentGroupOrderItem = null;
let groupOrderParticipants = [];

async function showGroupOrderModal(item, hotel) {
    currentGroupOrderItem = { ...item, hotelId: hotel.id, hotelName: hotel.name };
    groupOrderParticipants = [{
        name: '',
        shareAmount: item.price
    }];

    const maxAmount = await StorageManager.getMaxAmountPerPerson();

    const itemInfoHtml = `
        <h3>${item.name}</h3>
        <p><strong>Price:</strong> ${formatCurrency(item.price)}</p>
        <p><strong>Hotel:</strong> ${hotel.name}</p>
        <p><strong>Limit per person:</strong> ${formatCurrency(maxAmount)}</p>
        <p style="color: #ff6b6b;"><strong>Note:</strong> This item exceeds the ₹${maxAmount} limit and requires group ordering.</p>
    `;

    const groupOrderItemInfo = document.getElementById('groupOrderItemInfo');
    if (!groupOrderItemInfo) {
        console.error('groupOrderItemInfo element not found');
        return;
    }
    groupOrderItemInfo.innerHTML = itemInfoHtml;
    updateParticipantsList();
    updateGroupOrderSummary();

    document.getElementById('groupOrderModal').style.display = 'flex';
}

function closeGroupOrderModal() {
    console.log('closeGroupOrderModal called');
    document.getElementById('groupOrderModal').style.display = 'none';
    currentGroupOrderItem = null;
    groupOrderParticipants = [];
}

function addParticipant() {
    groupOrderParticipants.push({
        name: '',
        shareAmount: 0
    });
    updateParticipantsList();
    updateGroupOrderSummary();
}

function removeParticipant(index) {
    if (groupOrderParticipants.length > 1) {
        groupOrderParticipants.splice(index, 1);
        updateParticipantsList();
        updateGroupOrderSummary();
    }
}

function updateParticipantsList() {
    const listHtml = groupOrderParticipants.map((participant, index) => `
        <div class="participant-item">
            <input type="text"
                   placeholder="Participant name"
                   value="${participant.name}"
                   oninput="updateParticipantName(${index}, this.value)">
            <input type="number"
                   placeholder="Share amount"
                   value="${participant.shareAmount}"
                   min="0"
                   step="0.01"
                   oninput="updateParticipantShare(${index}, this.value)">
            ${groupOrderParticipants.length > 1 ?
                `<button class="btn btn-danger btn-small" onclick="removeParticipant(${index})">Remove</button>` :
                ''}
        </div>
    `).join('');

    const participantsList = document.getElementById('participantsList');
    if (!participantsList) {
        console.error('participantsList element not found');
        return;
    }
    participantsList.innerHTML = listHtml;
}

function updateParticipantName(index, name) {
    // Bounds checking to prevent accessing undefined array indices
    if (index >= 0 && index < groupOrderParticipants.length) {
        groupOrderParticipants[index].name = sanitizeInput(name);
        updateGroupOrderSummary();
    }
}

function updateParticipantShare(index, shareAmount) {
    groupOrderParticipants[index].shareAmount = parseFloat(shareAmount) || 0;
    updateGroupOrderSummary();
}

async function updateGroupOrderSummary() {
    if (!currentGroupOrderItem) return;

    const totalShares = groupOrderParticipants.reduce((sum, p) => sum + p.shareAmount, 0);
    const itemPrice = currentGroupOrderItem.price;
    const maxAmount = await StorageManager.getMaxAmountPerPerson();

    let summaryHtml = `
        <h4>Order Summary</h4>
        <p><strong>Item Total:</strong> ${formatCurrency(itemPrice)}</p>
        <p><strong>Total Participant Shares:</strong> ${formatCurrency(totalShares)}</p>
    `;

    // Check for validation issues
    const issues = [];

    // Check if total shares match item price
    if (Math.abs(totalShares - itemPrice) > 0.01) {
        issues.push(`Total shares (${formatCurrency(totalShares)}) must equal item price (${formatCurrency(itemPrice)})`);
    }

    // Check individual limits
    groupOrderParticipants.forEach((participant, index) => {
        if (participant.shareAmount > maxAmount) {
            issues.push(`${participant.name || `Participant ${index + 1}`} exceeds limit of ${formatCurrency(maxAmount)}`);
        }
        if (!participant.name.trim()) {
            issues.push(`Participant ${index + 1} name is required`);
        }
    });

    if (issues.length > 0) {
        summaryHtml += '<div style="color: #ff6b6b; margin-top: 10px;">';
        summaryHtml += '<strong>Issues to fix:</strong><ul>';
        issues.forEach(issue => {
            summaryHtml += `<li>${issue}</li>`;
        });
        summaryHtml += '</ul></div>';
        document.getElementById('confirmGroupOrderBtn').disabled = true;
    } else {
        summaryHtml += '<p style="color: #51cf66; margin-top: 10px;"><strong>✓ All validations passed!</strong></p>';
        document.getElementById('confirmGroupOrderBtn').disabled = false;
    }

    const groupOrderSummary = document.getElementById('groupOrderSummary');
    if (!groupOrderSummary) {
        console.error('groupOrderSummary element not found');
        return;
    }
    groupOrderSummary.innerHTML = summaryHtml;
}

async function confirmGroupOrder() {
    if (!currentGroupOrderItem) return;

    // Final validation
    const totalShares = groupOrderParticipants.reduce((sum, p) => sum + p.shareAmount, 0);
    const itemPrice = currentGroupOrderItem.price;
    const maxAmount = await StorageManager.getMaxAmountPerPerson();

    if (Math.abs(totalShares - itemPrice) > 0.01) {
        showToast('Total participant shares must equal item price', 'error');
        return;
    }

    // Check individual limits and names
    for (const participant of groupOrderParticipants) {
        if (participant.shareAmount > maxAmount) {
            showToast(`Individual share cannot exceed ${formatCurrency(maxAmount)}`, 'error');
            return;
        }
        if (!participant.name.trim()) {
            showToast('All participant names are required', 'error');
            return;
        }
    }

    // Create the group order
    const order = {
        employeeName: groupOrderParticipants[0].name, // Primary participant
        items: [{
            name: currentGroupOrderItem.name,
            price: currentGroupOrderItem.price,
            quantity: 1,
            category: currentGroupOrderItem.category
        }],
        total: currentGroupOrderItem.price,
        hotelName: currentGroupOrderItem.hotelName,
        isGroupOrder: true,
        participants: groupOrderParticipants.map(p => ({
            name: p.name.trim(),
            shareAmount: p.shareAmount
        }))
    };

    const result = await StorageManager.addOrder(order);
    if (result) {
        showToast('Group order placed successfully!');
        closeGroupOrderModal();

        // Add to selected items for UI consistency
        const itemKey = `${currentGroupOrderItem.hotelId}-${currentGroupOrderItem.id}`;
        selectedItems[itemKey] = {
            ...currentGroupOrderItem,
            quantity: 1
        };
        await displayHotelsMenu();
    }
}

