// ========================================
// Menu Page Functionality
// ========================================

let selectedItems = {};
let expandedHotels = new Set();
let menuSearchTerm = '';
let categoryFilter = '';
let cardSize = 'medium';

document.addEventListener('DOMContentLoaded', function() {
    initializeMenuPage();
});

function initializeMenuPage() {
    cardSize = localStorage.getItem('menuCardSize') || 'medium';
    document.getElementById('cardSize').value = cardSize;

    // Expand all hotels by default on initial load
    const selectedHotels = StorageManager.getSelectedHotelsData();
    selectedHotels.forEach(hotel => {
        expandedHotels.add(hotel.id);
    });

    displayHotelsMenu();
    setupOrderModal();
    setupSearch();
    setupItemModal();
    setupEventDelegation();

    window.addEventListener('hotelsUpdated', () => {
        selectedItems = {};
        expandedHotels.clear();
        // Re-expand all hotels when hotels are updated
        const updatedHotels = StorageManager.getSelectedHotelsData();
        updatedHotels.forEach(hotel => {
            expandedHotels.add(hotel.id);
        });
        displayHotelsMenu();
    });
}

function setupEventDelegation() {
    // Event delegation for dynamically added buttons
    document.getElementById('hotelsMenuContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('place-order-btn')) {
            showOrderModal();
        }
    });
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
        searchInput.addEventListener('input', debounce((e) => {
            menuSearchTerm = e.target.value;
            displayHotelsMenu();
        }, 300));
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            categoryFilter = e.target.value;
            displayHotelsMenu();
        });
    }

    if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => {
            cardSize = e.target.value;
            localStorage.setItem('menuCardSize', cardSize);
            displayHotelsMenu();
        });
    }
}

function displayHotelsMenu() {
    const container = document.getElementById('hotelsMenuContainer');
    const selectedHotels = StorageManager.getSelectedHotelsData();

    if (selectedHotels.length === 0) {
        container.innerHTML = '<p class="empty-message">No hotels selected for today. Please contact admin.</p>';
        return;
    }

    let html = '';

    selectedHotels.forEach(hotel => {
        const isExpanded = expandedHotels.has(hotel.id);
        const availableItems = hotel.menuItems.filter(item => item.available);

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
}

function toggleHotelMenu(hotelId) {
    if (expandedHotels.has(hotelId)) {
        expandedHotels.delete(hotelId);
    } else {
        expandedHotels.add(hotelId);
    }
    displayHotelsMenu();
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
        console.log('Item:', item.name, 'has images:', hasImages, 'images count:', itemImages.length);

        const mainImage = hasImages ? itemImages[0] : null;

        html += `
            <div class="menu-item-card ${isSelected ? 'selected' : ''}" id="item-${itemKey}" onclick="showItemModal('${hotel.id}', '${item.id}')">
                ${mainImage ? `<div class="menu-item-main-image" style="background-image: url('${mainImage}')"></div>` : '<div class="menu-item-no-image">🍽️</div>'}
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <div class="menu-item-name">${item.name}</div>
                        <div class="menu-item-price">${formatCurrency(item.price)}</div>
                    </div>
                    <div class="menu-item-category">${item.category}</div>
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
                <div class="order-summary-content">
                    <span>${totalItems} items • ₹${total.toFixed(2)}</span>
                    <button class="place-order-btn btn btn-primary">Place Order</button>
                </div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function incrementQuantity(hotelId, itemId, hotelName) {
    const hotel = StorageManager.getHotelById(hotelId);
    const item = hotel.menuItems.find(i => i.id === itemId);
    
    if (item) {
        const itemKey = `${hotelId}-${itemId}`;
        
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
        displayHotelsMenu(); // Refresh to show floating summary
    }
}

function decrementQuantity(hotelId, itemId, hotelName) {
    const itemKey = `${hotelId}-${itemId}`;
    
    if (selectedItems[itemKey] && selectedItems[itemKey].quantity > 0) {
        selectedItems[itemKey].quantity--;
        
        if (selectedItems[itemKey].quantity === 0) {
            delete selectedItems[itemKey];
        }

        updateMenuDisplay(itemKey);
        displayHotelsMenu(); // Refresh to show floating summary
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



function setupOrderModal() {
    const modal = document.getElementById('orderModal');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const cancelBtn = document.getElementById('cancelOrderBtn');
    const closeBtn = document.querySelector('#orderModal .modal-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    confirmBtn.addEventListener('click', () => {
        const employeeName = sanitizeInput(document.getElementById('orderEmployeeName').value);

        if (!employeeName) {
            showToast('Please enter your name', 'error');
            return;
        }

        if (!isValidName(employeeName)) {
            showToast('Name can only contain letters, spaces, hyphens, and apostrophes', 'error');
            return;
        }

        modal.style.display = 'none';

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

function showOrderModal() {
    const items = Object.values(selectedItems).filter(item => item.quantity > 0);
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const preview = `${totalItems} item(s) • Total: ${formatCurrency(total)}`;
    document.getElementById('orderPreview').textContent = preview;
    document.getElementById('orderEmployeeName').value = '';
    document.getElementById('orderModal').style.display = 'flex';
    document.getElementById('orderEmployeeName').focus();
}

function placeOrders(ordersByHotel, employeeName) {
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
    displayHotelsMenu();
}

function showItemModal(hotelId, itemId) {
    console.log('showItemModal called with:', hotelId, itemId);
    const hotel = StorageManager.getHotelById(hotelId);
    if (!hotel) {
        console.log('Hotel not found');
        return;
    }

    const item = hotel.menuItems.find(i => i.id === itemId);
    if (!item) {
        console.log('Item not found');
        return;
    }

    console.log('Item found:', item);
    console.log('Item images:', item.images);

    const itemKey = `${hotelId}-${itemId}`;
    const quantity = selectedItems[itemKey]?.quantity || 0;
    const hasImages = item.images && item.images.length > 0;

    let modalHtml = `
        <div class="item-modal-large">
            ${hasImages ? `<div class="item-modal-images">${item.images.map(img => `<img src="${img}" alt="${item.name}" class="item-modal-image">`).join('')}</div>` : '<div class="item-modal-no-image">🍽️<br>No images yet</div>'}
            <div class="item-modal-details">
                <h2>${item.name}</h2>
                <p class="item-modal-price">${formatCurrency(item.price)}</p>
                <p class="item-modal-category">Category: ${item.category}</p>
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

function uploadItemImage(hotelId, itemId) {
    console.log('uploadItemImage called with:', hotelId, itemId);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        console.log('File selected:', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageData = event.target.result;
                console.log('Image data loaded, length:', imageData.length);
                StorageManager.addImageToMenuItem(hotelId, itemId, imageData);
                showToast('Image uploaded successfully!');
                displayHotelsMenu(); // Refresh to show new image
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

