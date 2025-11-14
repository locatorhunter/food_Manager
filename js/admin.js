// ========================================
// Admin Page Functionality
// ========================================

let selectedHotelIds = [];
let currentHotelFilters = {
    search: '',
    type: 'all',
    status: 'all'
};
let hotelExpandedStates = {}; // Track which hotels are expanded

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
        await setupGroupSettings();
        setupDangerZone();
        setupSearchAndFilters();

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
        let hotels = await StorageManager.getHotels();

        if (hotels.length === 0) {
            container.innerHTML = '<p class="empty-message">No hotels yet. Add your first hotel!</p>';
            return;
        }

        // Apply filters
        hotels = hotels.filter(hotel => {
            // Search filter
            if (currentHotelFilters.search && !hotel.name.toLowerCase().includes(currentHotelFilters.search.toLowerCase())) {
                return false;
            }

            // Type filter
            if (currentHotelFilters.type !== 'all' && hotel.type !== currentHotelFilters.type) {
                return false;
            }

            // Status filter
            if (currentHotelFilters.status !== 'all') {
                const isSelected = selectedHotelIds.includes(hotel.id);
                if (currentHotelFilters.status === 'selected' && !isSelected) {
                    return false;
                }
                if (currentHotelFilters.status === 'not-selected' && isSelected) {
                    return false;
                }
            }

            return true;
        });

        if (hotels.length === 0) {
            container.innerHTML = '<p class="empty-message">No hotels match your filters.</p>';
            return;
        }

        let html = '';

        hotels.forEach(hotel => {
            const isExpanded = hotelExpandedStates[hotel.id] !== false; // Default to expanded
            const expandIcon = isExpanded ? '📂' : '📁';
            const expandText = isExpanded ? 'Collapse' : 'Expand';
            const totalItems = hotel.menuItems ? hotel.menuItems.length : 0;
            const availableItems = hotel.menuItems ? hotel.menuItems.filter(item => item.available).length : 0;

            html += `
                <div class="hotel-management-card">
                    <div class="hotel-header">
                        <div class="hotel-info">
                            <h3>${getHotelTypeEmoji(hotel.type)} ${hotel.name} <span class="hotel-item-count">(${availableItems}/${totalItems} items)</span></h3>
                            ${selectedHotelIds.includes(hotel.id) ? '<span class="hotel-status selected">Selected for Today</span>' : '<span class="hotel-status not-selected">Not Selected</span>'}
                        </div>
                        <div class="hotel-actions">
                            <button class="btn btn-info btn-small" onclick="editHotelDetails('${hotel.id}')">
                                ✏️ Edit Details
                            </button>
                            <button class="btn btn-primary btn-small" onclick="openMenuModal('${hotel.id}')">
                                + Add Menu Item
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="openImportModal('${hotel.id}')">
                                Import CSV
                            </button>
                            <button class="btn btn-outline btn-small" onclick="toggleHotelExpansion('${hotel.id}')" title="${expandText} Menu">
                                ${expandIcon} ${expandText}
                            </button>
                            <button class="btn btn-danger btn-small" onclick="deleteHotel('${hotel.id}')">
                                Delete Hotel
                            </button>
                        </div>
                    </div>

                    <div class="menu-items-container" id="menu-container-${hotel.id}" style="display: ${isExpanded ? 'block' : 'none'};">
                        ${displayHotelMenuItems(hotel)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Update expand/collapse button states
        setTimeout(updateExpandCollapseButtons, 100);
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
                <div class="menu-item-admin-category">${item.category || 'No category'}</div>
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

        if (!itemName || !itemPriceStr) {
            showToast('Please fill name and price fields', 'error');
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
Veg Thali,130,Main Course,true
Simple Rice,80,,true
Plain Naan,30,,true`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Template downloaded! (Category is optional)');
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
            if (parts.length < 3) continue; // Need at least name, price, available

            const name = parts[0]?.trim();
            const priceStr = parts[1]?.trim();
            const category = parts.length >= 4 ? parts[2]?.trim() : ''; // Category is optional, default to empty
            const availableStr = parts.length >= 4 ? parts[3]?.trim() : parts[2]?.trim(); // Available can be in position 2 or 3

            const price = parseFloat(priceStr);
            const available = availableStr?.toLowerCase() === 'true';

            if (name && !isNaN(price)) {
                const item = {
                    name: sanitizeInput(name),
                    price: price,
                    category: category || '', // Empty string if not provided
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
            // Get current hotel data
            const hotel = await StorageManager.getHotelById(hotelId);
            if (!hotel) {
                showToast('Hotel not found. Please refresh and try again.', 'error');
                return;
            }

            // Check for duplicates against existing items
            const existingNames = new Set((hotel.menuItems || []).map(item => item.name.toLowerCase()));
            const uniqueItems = [];
            const duplicates = [];

            items.forEach(item => {
                const itemNameLower = item.name.toLowerCase();
                if (existingNames.has(itemNameLower)) {
                    duplicates.push(item.name);
                } else {
                    existingNames.add(itemNameLower);
                    uniqueItems.push(item);
                }
            });

            if (uniqueItems.length === 0) {
                showToast('All items already exist in this hotel.', 'error');
                return;
            }

            // Prepare items with IDs
            const itemsWithIds = uniqueItems.map(item => ({
                ...item,
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9)
            }));

            // Add all items to hotel's menuItems array
            hotel.menuItems = hotel.menuItems || [];
            hotel.menuItems.push(...itemsWithIds);

            // Update hotel with all items at once
            await StorageManager.updateHotel(hotelId, { menuItems: hotel.menuItems });

            let message = `Imported ${uniqueItems.length} menu items successfully!`;
            if (duplicates.length > 0) {
                message += ` (${duplicates.length} duplicates skipped)`;
            }
            showToast(message);
        } catch (error) {
            console.error('Error importing CSV items:', error);
            showToast('Error importing items. Please check the data and try again.', 'error');
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

async function setupGroupSettings() {
    // Load current setting
    const currentLimit = await StorageManager.getMaxAmountPerPerson();
    document.getElementById('maxAmountPerPerson').value = currentLimit;
    document.getElementById('currentLimitValue').textContent = `₹${currentLimit}`;

    // Load the full settings object to get update time
    try {
        const settingsRef = firebaseRef('settings/maxAmountPerPerson');
        const snapshot = await firebaseGet(settingsRef);
        const settingsData = snapshot.val();

        if (settingsData && settingsData.lastUpdated) {
            const lastUpdated = new Date(settingsData.lastUpdated);
            const timeAgo = getTimeAgo(lastUpdated);
            document.getElementById('currentLimitUpdated').textContent = timeAgo;
        } else {
            document.getElementById('currentLimitUpdated').textContent = 'Recently';
        }
    } catch (error) {
        console.error('Error loading settings timestamp:', error);
        document.getElementById('currentLimitUpdated').textContent = 'Recently';
    }

    // Handle form submission
    document.getElementById('groupSettingsForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const newLimit = parseFloat(document.getElementById('maxAmountPerPerson').value);

        if (!newLimit || newLimit < 50 || newLimit > 2000) {
            showToast('Please enter a valid amount between ₹50 and ₹2000', 'error');
            return;
        }

        await StorageManager.setMaxAmountPerPerson(newLimit);

        // Update display
        document.getElementById('currentLimitValue').textContent = `₹${newLimit}`;
        document.getElementById('currentLimitUpdated').textContent = 'Just now';
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

// Setup search and filter controls
function setupSearchAndFilters() {
    // Search input
    document.getElementById('hotelSearch').addEventListener('input', function(e) {
        currentHotelFilters.search = e.target.value.trim();
        displayHotelsManagement();
    });

    // Type filter
    document.getElementById('hotelTypeFilter').addEventListener('change', function(e) {
        currentHotelFilters.type = e.target.value;
        displayHotelsManagement();
    });

    // Status filter
    document.getElementById('hotelStatusFilter').addEventListener('change', function(e) {
        currentHotelFilters.status = e.target.value;
        displayHotelsManagement();
    });

    // Expand/Collapse all buttons
    document.getElementById('expandAllBtn').addEventListener('click', function() {
        const hotels = document.querySelectorAll('[id^="menu-container-"]');
        hotels.forEach(container => {
            container.style.display = 'block';
            const hotelId = container.id.replace('menu-container-', '');
            hotelExpandedStates[hotelId] = true;
        });
        // Update button states
        updateExpandCollapseButtons();
    });

    document.getElementById('collapseAllBtn').addEventListener('click', function() {
        const hotels = document.querySelectorAll('[id^="menu-container-"]');
        hotels.forEach(container => {
            container.style.display = 'none';
            const hotelId = container.id.replace('menu-container-', '');
            hotelExpandedStates[hotelId] = false;
        });
        // Update button states
        updateExpandCollapseButtons();
    });
}

// Toggle individual hotel expansion
function toggleHotelExpansion(hotelId) {
    const container = document.getElementById(`menu-container-${hotelId}`);
    if (container) {
        const isExpanded = container.style.display !== 'none';
        container.style.display = isExpanded ? 'none' : 'block';
        hotelExpandedStates[hotelId] = !isExpanded;
        updateExpandCollapseButtons();
    }
}

// Update expand/collapse button states based on current expansion state
function updateExpandCollapseButtons() {
    const containers = document.querySelectorAll('[id^="menu-container-"]');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');

    if (containers.length === 0) return;

    let allExpanded = true;
    let allCollapsed = true;

    containers.forEach(container => {
        if (container.style.display === 'none') {
            allExpanded = false;
        } else {
            allCollapsed = false;
        }
    });

    expandAllBtn.disabled = allExpanded;
    collapseAllBtn.disabled = allCollapsed;

    expandAllBtn.style.opacity = allExpanded ? '0.5' : '1';
    collapseAllBtn.style.opacity = allCollapsed ? '0.5' : '1';
}

// Helper function to format time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString();
}
