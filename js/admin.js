// ========================================
// Admin Page Functionality
// ========================================

let selectedHotelIds = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPage();
});

async function initializeAdminPage() {
    try {
        selectedHotelIds = await StorageManager.getSelectedHotels();
        await displayHotelSelection();
        setupHotelForm();
        await displayHotelsManagement();
        setupMenuModal();
        setupEditHotelForm();
        setupDangerZone();

        window.addEventListener('storageReset', () => {
            selectedHotelIds = [];
            displayHotelSelection();
            displayHotelsManagement();
        });
    } catch (error) {
        console.error('Error initializing admin page:', error);
        showToast('Error loading admin page. Please refresh.', 'error');
    }
}

// Display Hotel Selection (Checkboxes)
async function displayHotelSelection() {
    try {
        const container = document.getElementById('hotelSelectionList');
        const hotels = await StorageManager.getHotels();

        if (hotels.length === 0) {
            container.innerHTML = '<p class="empty-message">No hotels added yet. Add hotels first!</p>';
            return;
        }

        let html = '<div class="hotel-selection-grid">';

        hotels.forEach(hotel => {
            const isChecked = selectedHotelIds.includes(hotel.id);
            const menuItemsCount = hotel.menuItems ? hotel.menuItems.length : 0;
            const availableItemsCount = hotel.menuItems ? hotel.menuItems.filter(item => item.available).length : 0;
            const reviews = hotel.reviews ? `⭐${hotel.reviews}` : 'No rating';
            const location = hotel.location || 'Location not set';

            html += `
                <div class="hotel-selection-card ${isChecked ? 'selected' : ''}">
                    <div class="hotel-selection-header">
                        <label class="hotel-checkbox-label">
                            <input type="checkbox"
                                   value="${hotel.id}"
                                   ${isChecked ? 'checked' : ''}
                                   onchange="toggleHotelSelection('${hotel.id}')">
                            <span class="hotel-name">${getHotelTypeEmoji(hotel.type)} ${hotel.name}</span>
                        </label>
                        ${isChecked ? '<span class="selection-indicator">✓ Selected</span>' : ''}
                    </div>

                    <div class="hotel-details">
                        <div class="hotel-stat">
                            <span class="stat-label">Menu Items:</span>
                            <span class="stat-value">${availableItemsCount}/${menuItemsCount} available</span>
                        </div>
                        <div class="hotel-stat">
                            <span class="stat-label">Rating:</span>
                            <span class="stat-value">${reviews}</span>
                        </div>
                        <div class="hotel-stat">
                            <span class="stat-label">Location:</span>
                            <span class="stat-value">${location}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying hotel selection:', error);
        showToast('Error loading hotel selection.', 'error');
    }
}

function toggleHotelSelection(hotelId) {
    if (selectedHotelIds.includes(hotelId)) {
        selectedHotelIds = selectedHotelIds.filter(id => id !== hotelId);
    } else {
        selectedHotelIds.push(hotelId);
    }
    // Auto-save selection
    StorageManager.setSelectedHotels(selectedHotelIds);
    showToast('Hotel selection updated successfully!');
}

// Setup Hotel Form
function setupHotelForm() {
    const hotelForm = document.getElementById('hotelForm');

    hotelForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const hotelName = sanitizeInput(document.getElementById('hotelName').value);
        const hotelType = document.getElementById('hotelType').value;

        if (!hotelName) {
            showToast('Please enter hotel name', 'error');
            return;
        }

        if (!isValidName(hotelName)) {
            showToast('Hotel name can only contain letters, spaces, hyphens, and apostrophes', 'error');
            return;
        }

        try {
            const hotels = await StorageManager.getHotels();
            if (hotels.some(h => h.name.toLowerCase() === hotelName.toLowerCase())) {
                showToast('Hotel with this name already exists', 'error');
                return;
            }

            await StorageManager.addHotel({
                name: hotelName,
                reviews: null,
                location: '',
                type: hotelType,
                menuItems: []
            });
            showToast('Hotel added successfully!');

            hotelForm.reset();
            displayHotelSelection();
            displayHotelsManagement();
        } catch (error) {
            console.error('Error adding hotel:', error);
            showToast('Error adding hotel. Please try again.', 'error');
        }
    });
}

// Display Hotels Management
async function displayHotelsManagement() {
    try {
        const container = document.getElementById('hotelsManagement');
        const hotels = await StorageManager.getHotels();

        if (hotels.length === 0) {
            container.innerHTML = '<p class="empty-message">No hotels yet. Add your first hotel!</p>';
            return;
        }

        let html = '';

        hotels.forEach(hotel => {
            html += `
                <div class="hotel-management-card">
                    <div class="hotel-header">
                        <div>
                            <h3>${getHotelTypeEmoji(hotel.type)} ${hotel.name}</h3>
                            ${selectedHotelIds.includes(hotel.id) ? '<span class="hotel-status selected">Selected for Today</span>' : '<span class="hotel-status not-selected">Not Selected</span>'}
                        </div>
                        <div>
                            <button class="btn btn-info btn-small" onclick="editHotelDetails('${hotel.id}')">
                                ✏️ Edit Details
                            </button>
                            <button class="btn btn-primary btn-small" onclick="openMenuModal('${hotel.id}')">
                                + Add Menu Item
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="openImportModal('${hotel.id}')">
                                Import CSV
                            </button>
                            <button class="btn btn-danger btn-small" onclick="deleteHotel('${hotel.id}')">
                                Delete Hotel
                            </button>
                        </div>
                    </div>

                    <div class="menu-items-container">
                        ${displayHotelMenuItems(hotel)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying hotels management:', error);
        showToast('Error loading hotels management.', 'error');
    }
}

function displayHotelMenuItems(hotel) {
    if (!hotel.menuItems || hotel.menuItems.length === 0) {
        return '<p class="empty-message">No menu items. Click "Add Menu Item" to add items.</p>';
    }

    let html = '<div class="menu-items-grid-admin">';

    hotel.menuItems.forEach(item => {
        const hasImages = item.images && item.images.length > 0;
        const imagesHtml = hasImages ? item.images.map((img, index) => `
            <div class="admin-item-image">
                <img src="${img}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                <button class="btn btn-danger btn-small" onclick="removeItemImage('${hotel.id}', '${item.id}', ${index})" style="margin-left: 5px;">×</button>
            </div>
        `).join('') : '';

        html += `
            <div class="menu-item-admin-card">
                <div class="menu-item-admin-header">
                    <strong>${item.name}</strong>
                    <span class="menu-item-price">${formatCurrency(item.price)}</span>
                </div>
                <div class="menu-item-admin-category">${item.category}</div>
                <div class="menu-item-admin-status ${item.available ? 'available' : 'unavailable'}">
                    ${item.available ? '✓ Available' : '✗ Unavailable'}
                </div>
                ${hasImages ? `<div class="admin-item-images">${imagesHtml}</div>` : ''}
                <div class="menu-item-admin-actions">
                    <button class="btn btn-secondary btn-small"
                            onclick="toggleItemAvailability('${hotel.id}', '${item.id}')">
                        ${item.available ? 'Mark Unavailable' : 'Mark Available'}
                    </button>
                    <button class="btn btn-danger btn-small"
                            onclick="deleteMenuItem('${hotel.id}', '${item.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Modal Functions
function setupMenuModal() {
    const modal = document.getElementById('menuModal');
    const closeBtn = document.querySelector('#menuModal .modal-close');
    const form = document.getElementById('menuItemForm');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Setup import modal
    const importModal = document.getElementById('importModal');
    const importCloseBtn = document.querySelector('#importModal .modal-close');

    importCloseBtn.addEventListener('click', () => {
        importModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === importModal) {
            importModal.style.display = 'none';
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const hotelId = document.getElementById('currentHotelId').value;
        const itemName = sanitizeInput(document.getElementById('itemName').value);
        const itemPriceStr = document.getElementById('itemPrice').value;
        const itemCategory = document.getElementById('itemCategory').value;
        const itemAvailable = document.getElementById('itemAvailable').checked;

        if (!itemName || !itemPriceStr || !itemCategory) {
            showToast('Please fill all fields', 'error');
            return;
        }

        if (!isValidPrice(itemPriceStr)) {
            showToast('Please enter a valid price (e.g., 150 or 150.50)', 'error');
            return;
        }

        const itemPrice = parseFloat(itemPriceStr);

        try {
            const hotel = await StorageManager.getHotelById(hotelId);
            if (hotel?.menuItems?.some(item => item.name.toLowerCase() === itemName.toLowerCase())) {
                showToast('Menu item with this name already exists for this hotel', 'error');
                return;
            }

            const menuItem = {
                name: itemName,
                price: itemPrice,
                category: itemCategory,
                available: itemAvailable
            };

            await StorageManager.addMenuItemToHotel(hotelId, menuItem);
            showToast('Menu item added successfully!');

            form.reset();
            document.getElementById('itemAvailable').checked = true;
            modal.style.display = 'none';

            displayHotelsManagement();
        } catch (error) {
            console.error('Error adding menu item:', error);
            showToast('Error adding menu item.', 'error');
        }
    });
}

function openMenuModal(hotelId) {
    document.getElementById('currentHotelId').value = hotelId;
    document.getElementById('menuModal').style.display = 'flex';
    document.getElementById('menuItemForm').reset();
    document.getElementById('itemAvailable').checked = true;
}

async function toggleItemAvailability(hotelId, itemId) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);
        const item = hotel?.menuItems?.find(i => i.id === itemId);

        if (item) {
            await StorageManager.updateMenuItem(hotelId, itemId, { available: !item.available });
            showToast(`${item.name} is now ${!item.available ? 'available' : 'unavailable'}`);
            displayHotelsManagement();
        }
    } catch (error) {
        console.error('Error toggling item availability:', error);
        showToast('Error updating item availability.', 'error');
    }
}

async function deleteMenuItem(hotelId, itemId) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);
        const item = hotel?.menuItems?.find(i => i.id === itemId);

        if (item) {
            const confirmed = await customConfirm(`Delete "${item.name}"?`, 'Confirm Delete');
            if (confirmed) {
                await StorageManager.deleteMenuItem(hotelId, itemId);
                showToast('Menu item deleted!');
                displayHotelsManagement();
            }
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showToast('Error deleting menu item.', 'error');
    }
}

async function removeItemImage(hotelId, itemId, imageIndex) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);
        const item = hotel?.menuItems?.find(i => i.id === itemId);

        if (item && item.images && item.images[imageIndex]) {
            item.images.splice(imageIndex, 1);
            await StorageManager.updateMenuItem(hotelId, itemId, { images: item.images });
            showToast('Image removed!');
            displayHotelsManagement();
        }
    } catch (error) {
        console.error('Error removing image:', error);
        showToast('Error removing image.', 'error');
    }
}

async function deleteHotel(hotelId) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);

        if (hotel) {
            const confirmed = await customConfirm(`Delete "${hotel.name}" and all its menu items?`, 'Confirm Delete');
            if (confirmed) {
                await StorageManager.deleteHotel(hotelId);
                selectedHotelIds = selectedHotelIds.filter(id => id !== hotelId);
                showToast('Hotel deleted!');
                displayHotelSelection();
                displayHotelsManagement();
            }
        }
    } catch (error) {
        console.error('Error deleting hotel:', error);
        showToast('Error deleting hotel.', 'error');
    }
}

function openImportModal(hotelId) {
    document.getElementById('importHotelId').value = hotelId;
    document.getElementById('importModal').style.display = 'flex';
}

function downloadCSVTemplate() {
    const csv = `name,price,category,available
Chicken Biryani,150,Main Course,true
Paneer Butter Masala,120,Curry,true
Garlic Naan,45,Bread,true
Masala Chai,20,Beverage,true
Veg Thali,130,Main Course,true`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Template downloaded!');
}

async function importCSV() {
    const hotelId = document.getElementById('importHotelId').value;
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select a CSV file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const csv = e.target.result;
        const lines = csv.trim().split('\n');
        const items = [];

        for (let i = 1; i < lines.length; i++) { // skip header
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(',');
            if (parts.length < 4) continue;
            const [name, priceStr, category, availableStr] = parts;
            const price = parseFloat(priceStr);
            const available = availableStr.toLowerCase() === 'true';

            if (name && !isNaN(price) && category) {
                const item = {
                    name: sanitizeInput(name.trim()),
                    price: price,
                    category: category.trim(),
                    available: available
                };
                items.push(item);
            }
        }

        if (items.length === 0) {
            showToast('No valid items found in CSV', 'error');
            return;
        }

        try {
            // Import items sequentially to avoid overwhelming Firebase
            for (const item of items) {
                await StorageManager.addMenuItemToHotel(hotelId, item);
            }
            showToast(`Imported ${items.length} menu items successfully!`);
        } catch (error) {
            console.error('Error importing CSV items:', error);
            showToast('Error importing some items. Please check the data.', 'error');
        }

        document.getElementById('importModal').style.display = 'none';
        fileInput.value = '';
        displayHotelsManagement();
    };

    reader.readAsText(file);
}

async function editHotelDetails(hotelId) {
    try {
        const hotel = await StorageManager.getHotelById(hotelId);
        if (!hotel) return;

        document.getElementById('editHotelId').value = hotel.id;
        document.getElementById('editHotelName').value = hotel.name;
        document.getElementById('editHotelReviews').value = hotel.reviews || '';
        document.getElementById('editHotelLocation').value = hotel.location || '';
        document.getElementById('editHotelType').value = hotel.type || 'veg';

        document.getElementById('editHotelModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading hotel details:', error);
        showToast('Error loading hotel details.', 'error');
    }
}

function closeEditHotelModal() {
    document.getElementById('editHotelModal').style.display = 'none';
}

function setupEditHotelForm() {
    const form = document.getElementById('editHotelForm');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const hotelId = document.getElementById('editHotelId').value;
        const hotelName = sanitizeInput(document.getElementById('editHotelName').value);
        const reviewsStr = document.getElementById('editHotelReviews').value;
        const location = sanitizeInput(document.getElementById('editHotelLocation').value);
        const type = document.getElementById('editHotelType').value;

        if (!hotelName) {
            showToast('Please enter hotel name', 'error');
            return;
        }

        if (!isValidName(hotelName)) {
            showToast('Hotel name can only contain letters, spaces, hyphens, and apostrophes', 'error');
            return;
        }

        const reviews = reviewsStr ? parseFloat(reviewsStr) : null;
        if (reviews !== null && (isNaN(reviews) || reviews < 1 || reviews > 5)) {
            showToast('Reviews must be a number between 1 and 5', 'error');
            return;
        }

        StorageManager.updateHotel(hotelId, {
            name: hotelName,
            reviews: reviews,
            location: location,
            type: type
        });

        showToast('Hotel details updated successfully!');
        closeEditHotelModal();
        displayHotelSelection();
        displayHotelsManagement();
    });
}

async function setupDangerZone() {
    document.getElementById('clearOrdersBtn').addEventListener('click', async function() {
        const confirmed = await customConfirm('Clear all orders? This cannot be undone!', 'Danger Zone');
        if (confirmed) {
            StorageManager.clearAllOrders();
            showToast('All orders cleared!');
        }
    });

    document.getElementById('resetAllBtn').addEventListener('click', async function() {
        const confirmed1 = await customConfirm('Reset EVERYTHING? This will delete all data!', 'Danger Zone');
        if (confirmed1) {
            const confirmed2 = await customConfirm('Last chance! This is IRREVERSIBLE!', 'Final Warning');
            if (confirmed2) {
                StorageManager.resetAll();
                showToast('All data has been reset!');
                location.reload();
            }
        }
    });
}
