// ========================================
// Menu Page Functionality
// ========================================

let selectedItems = {};
let expandedHotels = new Set();
let menuSearchTerm = '';
let categoryFilter = '';
let cardSize = 'medium';

// Cache management
function clearCacheOnReload() {
    // Clear in-memory cart cache
    selectedItems = {};

    // Clear any cached data in localStorage (except user preferences)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Keep user preferences like cardSize, but clear other cache
        if (key && key.startsWith('cache_')) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage cache
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('cache_')) {
            sessionKeysToRemove.push(key);
        }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

    console.log('Cache cleared on page reload');
}

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
window.adjustGroupOrderParticipantCount = adjustGroupOrderParticipantCount;
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
    // Clear cache on page load/reload
    clearCacheOnReload();

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
    const minPeopleNeeded = Math.ceil(total / maxAmount);

    const infoHtml = `
        <div class="limit-exceeded">⚠️ Order Total Exceeds Limit</div>
        <div class="current-total">Your order: ${formatCurrency(total)} (${totalItems} items)</div>
        <div class="limit-info">Individual limit: ${formatCurrency(maxAmount)} per person</div>
        <div style="color: #ff6b6b; margin: 8px 0;"><strong>Minimum people needed:</strong> ${minPeopleNeeded} people</div>
        <div style="margin-top: 8px; color: var(--text-secondary);">
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

    // Initialize with minimum participants needed
    selectedGroupSize = Math.max(2, minPeopleNeeded);
    groupParticipantNames = new Array(selectedGroupSize).fill('');
    participantCount.value = selectedGroupSize;

    // Update hint text with minimum people needed
    const hintElement = document.getElementById('groupSizeHint');
    if (hintElement) {
        hintElement.textContent = `💡 Minimum ${minPeopleNeeded} people needed • Enter the number of people sharing this order (2-20)`;
    }

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

    // Reset hint text
    const hintElement = document.getElementById('groupSizeHint');
    if (hintElement) {
        hintElement.textContent = '💡 Enter the number of people sharing this order (2-20)';
    }
}

async function adjustParticipantCount(change) {
    const currentCount = parseInt(document.getElementById('participantCount').value);
    const newCount = currentCount + change;

    // Calculate minimum needed based on current cart total
    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const maxAmount = await StorageManager.getMaxAmountPerPerson();
    const minPeopleNeeded = Math.ceil(total / maxAmount);
    const minAllowed = Math.max(2, minPeopleNeeded);

    // Validate range (minAllowed-20)
    if (newCount < minAllowed || newCount > 20) {
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

async function updateCountButtonStates() {
    const countInput = document.getElementById('participantCount');
    if (!countInput) return; // Modal not open yet

    const count = parseInt(countInput.value);

    // Calculate minimum needed based on current cart total
    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const maxAmount = await StorageManager.getMaxAmountPerPerson();
    const minPeopleNeeded = Math.ceil(total / maxAmount);
    const minAllowed = Math.max(2, minPeopleNeeded);

    const minusBtn = document.querySelector('.count-btn:first-child');
    const plusBtn = document.querySelector('.count-btn:last-child');

    if (minusBtn) minusBtn.disabled = count <= minAllowed;
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

        // Handle potential errors in menu refresh gracefully
        try {
            await displayHotelsMenu();
        } catch (menuError) {
            console.error('Error refreshing menu after order:', menuError);
            // Don't show error toast for menu refresh failures
        }
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

    // Normal ordering flow - ensure modal exists and is properly configured
    ensureOrderModal();
    
    const orderModal = document.getElementById('orderModal');
    const orderPreview = document.getElementById('orderPreview');
    const orderEmployeeName = document.getElementById('orderEmployeeName');

    if (!orderModal || !orderPreview || !orderEmployeeName) {
        console.error('Order modal elements not found');
        showToast('Error: Order modal not available', 'error');
        return;
    }

    // Now proceed with modal setup
    const preview = `${totalItems} item(s) • Total: ${formatCurrency(total)}`;
    orderPreview.textContent = preview;
    orderEmployeeName.value = '';
    orderModal.style.display = 'flex';
    orderEmployeeName.focus();
}

function ensureOrderModal() {
    let orderModal = document.getElementById('orderModal');
    
    // If modal doesn't exist, create it
    if (!orderModal) {
        console.log('Creating order modal');
        
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
        orderModal = document.getElementById('orderModal');
    }
    
    // Always setup event listeners to ensure they're properly bound
    setupOrderModalEventListeners();
}

function setupOrderModalEventListeners() {
    const orderModal = document.getElementById('orderModal');
    if (!orderModal) return;

    // Remove any existing listeners to prevent duplicates
    const newModal = orderModal.cloneNode(true);
    orderModal.parentNode.replaceChild(newModal, orderModal);
    
    const confirmBtn = newModal.querySelector('#confirmOrderBtn');
    const cancelBtn = newModal.querySelector('#cancelOrderBtn');
    const closeBtn = newModal.querySelector('.modal-close');
    const employeeNameInput = newModal.querySelector('#orderEmployeeName');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            newModal.style.display = 'none';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            newModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    newModal.addEventListener('click', (e) => {
        if (e.target === newModal) {
            newModal.style.display = 'none';
        }
    });

    // Handle Enter key in name input
    if (employeeNameInput) {
        employeeNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (confirmBtn) confirmBtn.click();
            }
        });
    }

    // Handle confirm button click
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmOrder);
    }
}

function handleConfirmOrder() {
    const orderModal = document.getElementById('orderModal');
    const employeeNameInput = document.getElementById('orderEmployeeName');
    
    if (!employeeNameInput) {
        showToast('Error: Name input not found', 'error');
        return;
    }

    const employeeName = sanitizeInput(employeeNameInput.value);

    if (!employeeName) {
        showToast('Please enter your name', 'error');
        employeeNameInput.focus();
        return;
    }

    if (!isValidName(employeeName)) {
        showToast('Name can only contain letters, spaces, hyphens, and apostrophes', 'error');
        employeeNameInput.focus();
        return;
    }

    // Close modal
    orderModal.style.display = 'none';

    // Process the order
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
}

function cancelOrder() {
    // Clear all selected items
    selectedItems = {};
    // Refresh the menu display to hide the floating order summary
    displayHotelsMenu();
    showToast('Order cancelled');
}

async function placeOrders(ordersByHotel, employeeName) {
    try {
        // Create separate order for each hotel
        const orderPromises = Object.entries(ordersByHotel).map(async ([hotelName, hotelItems]) => {
            const hotelTotal = hotelItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const order = {
                employeeName,
                items: hotelItems,
                total: hotelTotal,
                hotelName
            };

            return await StorageManager.addOrder(order);
        });

        // Wait for all orders to be placed
        await Promise.all(orderPromises);
        
        showToast('Order placed successfully!', 'success');

        // Reset
        selectedItems = {};
        await displayHotelsMenu();
    } catch (error) {
        console.error('Error placing orders:', error);
        showToast('Failed to place order. Please try again.', 'error');
    }
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

    // Build cart items HTML
    let itemsHtml = '';
    cartItems.forEach(item => {
        const itemKey = `${item.hotelId}-${item.id}`;
        const itemTotal = item.price * item.quantity;
        const itemImages = item.images || [];
        const hasImages = itemImages.length > 0;
        const mainImage = hasImages ? itemImages[0] : null;

        itemsHtml += `
            <div class="cart-item" data-item-key="${itemKey}" tabindex="0">
                <div class="cart-item-image">
                    ${mainImage ? `<img src="${mainImage}" alt="${item.name}" class="cart-item-thumb">` : '<div class="cart-item-no-image">🍽️</div>'}
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-category">${item.category || 'No category'}</div>
                    <div class="cart-item-details">
                        <span class="cart-item-price">${formatCurrency(item.price)} each</span>
                        <span class="cart-item-hotel">🏨 ${item.hotelName}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-quantity-controls">
                        <button class="quantity-btn quantity-decrease" data-action="decrease" data-item="${itemKey}" aria-label="Decrease quantity">−</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" readonly min="0" aria-label="Quantity">
                        <button class="quantity-btn quantity-increase" data-action="increase" data-item="${itemKey}" aria-label="Increase quantity">+</button>
                    </div>
                    <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
                    <button class="btn btn-danger btn-small cart-remove-btn" data-action="remove" data-item="${itemKey}" aria-label="Remove item">🗑️</button>
                </div>
            </div>
        `;
    });

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal cart-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
        align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: var(--bg-primary); border-radius: 12px; max-width: 600px; width: 90%; height: 80vh; display: flex; flex-direction: column;">
            <div class="cart-modal-header" style="flex-shrink: 0; padding: 20px; border-bottom: 1px solid var(--border-color);">
                <h3>Your Cart (${cartItems.length} items)</h3>
                <span class="cart-close" data-action="close">&times;</span>
            </div>
            <div class="cart-items-list" style="flex: 1; overflow-y: auto; padding: 20px;">
                ${itemsHtml}
            </div>
            <div class="cart-summary" style="flex-shrink: 0; padding: 20px; border-top: 1px solid var(--border-color);">
                <div class="cart-total">
                    <strong>Total: ${formatCurrency(total)} (${totalItems} items)</strong>
                </div>
                <div class="cart-actions">
                    <button class="btn btn-secondary" data-action="continue">Continue Shopping</button>
                    <button class="btn btn-primary" data-action="checkout">Place Order</button>
                </div>
            </div>
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

        // Add keyboard navigation
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCartModal();
            }
        });

        // Focus management
        const firstFocusable = modal.querySelector('.cart-item, .cart-close, [data-action="continue"]');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Add touch/swipe support for mobile
        if ('ontouchstart' in window) {
            let startX = 0;
            let startY = 0;

            modal.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }, { passive: true });

            modal.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;

                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX;
                const diffY = startY - endY;

                // Detect swipe left to remove item
                if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50) {
                    const target = e.target.closest('.cart-item');
                    if (target) {
                        const itemKey = target.getAttribute('data-item-key');
                        if (itemKey && selectedItems[itemKey]) {
                            // Add swipe animation
                            target.style.transform = 'translateX(-100%)';
                            target.style.opacity = '0';
                            target.style.transition = 'all 0.3s ease';
                            setTimeout(() => {
                                removeFromCart(itemKey);
                            }, 300);
                        }
                    }
                }
            });
        }
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
        <div style="background: var(--bg-primary); border-radius: 12px; max-width: 500px; width: 90%; height: 80vh; display: flex; flex-direction: column;">
            <div class="cart-modal-header" style="flex-shrink: 0; padding: 20px; border-bottom: 1px solid var(--border-color);">
                <h3>Your Cart (0 items)</h3>
                <span class="cart-close" data-action="close">&times;</span>
            </div>
            <div class="cart-items-list" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.7;">🛒</div>
                <h3 style="margin-bottom: 10px; color: var(--text-primary); font-size: 24px;">Your Cart is Empty</h3>
                <p style="color: var(--text-secondary); margin-bottom: 30px; font-size: 16px; max-width: 300px;">Discover delicious meals from our partner hotels and start building your perfect lunch order!</p>
                <button class="btn btn-primary" data-action="continue" style="padding: 12px 24px; font-size: 16px; border-radius: 8px;">
                    🍽️ Start Exploring Menu
                </button>
            </div>
            <div class="cart-summary" style="flex-shrink: 0; padding: 20px; border-top: 1px solid var(--border-color); text-align: center;">
                <div class="cart-total" style="color: var(--text-secondary);">
                    <strong>Total: ₹0.00 (0 items)</strong>
                </div>
            </div>
        </div>
    `;

    modal.innerHTML = emptyCartHtml;

    // Add event listeners
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

        // Close modal on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCartModal();
            }
        });
    }, 10);
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
        updateCartModalItem(itemKey, newQuantity); // Update specific item in cart modal
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
            // Cart still has items - remove item from current modal
            removeCartModalItem(itemKey);
            updateCartModalTotals();
        }

        // Always refresh the menu display to update floating summary
        await displayHotelsMenu();
    }
}

// Update specific cart item in the modal without recreating the entire modal
function updateCartModalItem(itemKey, newQuantity) {
    const cartItem = document.querySelector(`.cart-item[data-item-key="${itemKey}"]`);
    if (!cartItem) return;

    // Temporarily disable buttons to prevent rapid clicking issues
    const buttons = cartItem.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    // Update quantity input
    const quantityInput = cartItem.querySelector('.quantity-input');
    if (quantityInput) {
        quantityInput.value = newQuantity;
    }

    // Update item total
    const item = selectedItems[itemKey];
    if (item) {
        const itemTotal = item.price * newQuantity;
        const totalElement = cartItem.querySelector('.cart-item-total');
        if (totalElement) {
            totalElement.textContent = formatCurrency(itemTotal);
        }
    }

    // Update overall totals
    updateCartModalTotals();

    // Re-enable buttons after a short delay
    setTimeout(() => {
        buttons.forEach(btn => btn.disabled = false);
    }, 100);
}

// Remove specific cart item from the modal
function removeCartModalItem(itemKey) {
    const cartItem = document.querySelector(`.cart-item[data-item-key="${itemKey}"]`);
    if (cartItem) {
        // Add fade out animation
        cartItem.style.transition = 'all 0.3s ease';
        cartItem.style.opacity = '0';
        cartItem.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            cartItem.remove();
        }, 300);
    }
}

// Update cart modal totals and header
function updateCartModalTotals() {
    const cartItems = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Update header
    const headerTitle = document.querySelector('.cart-modal-header h3');
    if (headerTitle) {
        headerTitle.textContent = `Your Cart (${totalItems} items)`;
    }

    // Update summary
    const totalElement = document.querySelector('.cart-total strong');
    if (totalElement) {
        totalElement.textContent = `Total: ${formatCurrency(total)} (${totalItems} items)`;
    }
}

// Group Order Modal Functions
let currentGroupOrderItem = null;
let groupOrderParticipants = [];
let selectedGroupOrderSize = null;
let groupOrderParticipantNames = [];

async function showGroupOrderModal(item, hotel) {
    currentGroupOrderItem = { ...item, hotelId: hotel.id, hotelName: hotel.name };
    selectedGroupOrderSize = null;
    groupOrderParticipantNames = [];

    const maxAmount = await StorageManager.getMaxAmountPerPerson();
    const minPeopleNeeded = Math.ceil(item.price / maxAmount);

    const itemInfoHtml = `
        <h3>${item.name}</h3>
        <p><strong>Price:</strong> ${formatCurrency(item.price)}</p>
        <p><strong>Hotel:</strong> ${hotel.name}</p>
        <p><strong>Limit per person:</strong> ${formatCurrency(maxAmount)}</p>
        <p style="color: #ff6b6b;"><strong>Minimum people needed:</strong> ${minPeopleNeeded} people</p>
        <p style="color: var(--text-secondary);"><strong>Note:</strong> This item exceeds the ₹${maxAmount} limit and requires group ordering.</p>
    `;

    const groupOrderItemInfo = document.getElementById('groupOrderItemInfo');
    if (!groupOrderItemInfo) {
        console.error('groupOrderItemInfo element not found');
        return;
    }
    groupOrderItemInfo.innerHTML = itemInfoHtml;

    // Initialize with minimum participants needed
    selectedGroupOrderSize = Math.max(2, minPeopleNeeded);
    groupOrderParticipantNames = new Array(selectedGroupOrderSize).fill('');
    document.getElementById('groupOrderParticipantCount').value = selectedGroupOrderSize;

    // Update hint text with minimum people needed
    const hintElement = document.getElementById('groupOrderSizeHint');
    if (hintElement) {
        hintElement.textContent = `💡 Minimum ${minPeopleNeeded} people needed • Enter the number of people sharing this order (2-20)`;
    }

    // Show participant names section and generate inputs
    document.getElementById('groupOrderParticipantNamesSection').style.display = 'block';
    updateGroupOrderParticipantNameInputs();
    updateGroupOrderCostBreakdown();

    document.getElementById('groupOrderModal').style.display = 'flex';

    // Focus on first name input
    setTimeout(() => {
        const firstInput = document.getElementById('group-order-name-0');
        if (firstInput) firstInput.focus();
    }, 50);
}

function closeGroupOrderModal() {
    console.log('closeGroupOrderModal called');
    document.getElementById('groupOrderModal').style.display = 'none';
    currentGroupOrderItem = null;
    selectedGroupOrderSize = null;
    groupOrderParticipantNames = [];
    document.getElementById('groupOrderParticipantCount').value = 2;

    // Reset hint text
    const hintElement = document.getElementById('groupOrderSizeHint');
    if (hintElement) {
        hintElement.textContent = '💡 Enter the number of people sharing this order (2-20)';
    }
}

async function adjustGroupOrderParticipantCount(change) {
    const currentCount = parseInt(document.getElementById('groupOrderParticipantCount').value);
    const newCount = currentCount + change;

    // Calculate minimum needed
    const maxAmount = await StorageManager.getMaxAmountPerPerson();
    const minPeopleNeeded = Math.ceil(currentGroupOrderItem.price / maxAmount);
    const minAllowed = Math.max(2, minPeopleNeeded);

    // Validate range (minAllowed-20)
    if (newCount < minAllowed || newCount > 20) {
        return;
    }

    selectedGroupOrderSize = newCount;
    document.getElementById('groupOrderParticipantCount').value = newCount;

    // Adjust the names array
    if (change > 0) {
        // Adding participants
        groupOrderParticipantNames.push('');
    } else {
        // Removing participants
        groupOrderParticipantNames.pop();
    }

    updateGroupOrderParticipantNameInputs();
    updateGroupOrderCostBreakdown();
}

function updateGroupOrderParticipantNameInputs() {
    const namesListHtml = groupOrderParticipantNames.map((name, index) => `
        <input type="text"
               class="participant-name-input"
               placeholder="Enter name for person ${index + 1}"
               value="${name}"
               id="group-order-name-${index}">
    `).join('');

    const participantNamesList = document.getElementById('groupOrderParticipantNamesList');
    if (!participantNamesList) {
        console.error('groupOrderParticipantNamesList element not found');
        return;
    }
    participantNamesList.innerHTML = namesListHtml;
}

async function updateGroupOrderCostBreakdown() {
    if (!selectedGroupOrderSize || !currentGroupOrderItem) return;

    const itemPrice = currentGroupOrderItem.price;
    const perPersonShare = Math.ceil(itemPrice / selectedGroupOrderSize); // Round up to ensure coverage

    const maxAmount = await StorageManager.getMaxAmountPerPerson();

    let breakdownHtml = `
        <h4>Cost Breakdown</h4>
        <p><strong>Item Total:</strong> ${formatCurrency(itemPrice)}</p>
        <p><strong>Number of People:</strong> ${selectedGroupOrderSize}</p>
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

    const costBreakdown = document.getElementById('groupOrderCostBreakdown');
    if (!costBreakdown) {
        console.error('groupOrderCostBreakdown element not found');
        return;
    }
    costBreakdown.innerHTML = breakdownHtml;

    // Enable the button
    const button = document.getElementById('confirmGroupOrderBtn');
    if (button) {
        button.style.display = 'inline-block';
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}


async function confirmGroupOrder() {
    try {
        if (!currentGroupOrderItem || !selectedGroupOrderSize) return;

        // Collect names directly from input fields
        const participantNames = [];
        for (let i = 0; i < selectedGroupOrderSize; i++) {
            const input = document.getElementById(`group-order-name-${i}`);
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

        const itemPrice = currentGroupOrderItem.price;
        const perPersonShare = Math.ceil(itemPrice / selectedGroupOrderSize);

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
        if (totalShares > itemPrice) {
            participants[participants.length - 1].shareAmount -= (totalShares - itemPrice);
        }

        // Create the group order
        const order = {
            employeeName: participants[0].name, // Primary participant
            items: [{
                name: currentGroupOrderItem.name,
                price: currentGroupOrderItem.price,
                quantity: 1,
                category: currentGroupOrderItem.category
            }],
            total: currentGroupOrderItem.price,
            hotelName: currentGroupOrderItem.hotelName,
            isGroupOrder: true,
            participants: participants
        };

        const result = await StorageManager.addOrder(order);
        if (result) {
            showToast('Group order placed successfully!');

            // Handle potential errors in post-order operations gracefully
            try {
                closeGroupOrderModal();

                // Add to selected items for UI consistency
                const itemKey = `${currentGroupOrderItem.hotelId}-${currentGroupOrderItem.id}`;
                selectedItems[itemKey] = {
                    ...currentGroupOrderItem,
                    quantity: 1
                };

                await displayHotelsMenu();
            } catch (postOrderError) {
                console.error('Error in post-order operations:', postOrderError);
                // Don't show error toast for post-order operation failures
            }
        }
    } catch (error) {
        console.error('Error placing group order:', error);
        showToast('Error placing order. Please try again.', 'error');
    }
}

