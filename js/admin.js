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

// Initialize admin page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Ensure admin page specific initialization only runs once
    if (!window.adminPageInitialized) {
        window.adminPageInitialized = true;
        initializeAdminPage();
    }
});

async function initializeAdminPage() {
    try {
        setupTabSwitching();
        
        selectedHotelIds = await StorageManager.getSelectedHotels();
        await displayHotelSelection();
        setupHotelForm();
        await displayHotelsManagement();
        setupMenuModal();
        setupEditHotelForm();
        await setupGroupSettings();
        setupDangerZone();
        setupSearchAndFilters();
        
        // Initialize user management functions
        initializeUserManagement();
        initializeUserApprovals();

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

// ========================================
// Tab Switching Functionality
// ========================================

function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach((button, index) => {
        const targetTab = button.getAttribute('data-tab');
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(targetTab);
        });
    });

    // Initialize with hotels tab active
    switchTab('hotels-tab');
}

function switchTab(targetTabId) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Remove active class from all tabs and panels
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));

    // Add active class to selected tab and panel
    const activeButton = document.querySelector(`[data-tab="${targetTabId}"]`);
    const activePanel = document.getElementById(targetTabId);

    if (activeButton) activeButton.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    // Initialize content based on active tab
    if (targetTabId === 'users-tab') {
        // Start real-time refresh for users tab
        startUserDataRefresh();
        
        // Re-initialize user management when switching to users tab
        setTimeout(() => {
            try {
                if (window.userManagementInitialized) {
                    // Show loading states and refresh data
                    showLoadingState(document.getElementById('usersManagement'), generateUserCardSkeleton, 'Loading users...');
                    showLoadingState(document.getElementById('userStatistics'), generateStatisticsSkeleton, 'Loading statistics...');
                    showLoadingState(document.getElementById('pendingApprovals'), generateApprovalsSkeleton, 'Loading approvals...');
                    
                    // Refresh with slight delays for better UX
                    setTimeout(() => displayUsersManagement(), 200);
                    setTimeout(() => displayUserStatistics(), 400);
                    setTimeout(() => displayPendingApprovals(), 600);
                } else {
                    initializeUserManagementTab();
                }
            } catch (error) {
                console.error('Error in users tab initialization:', error);
                showErrorState(document.getElementById('usersManagement'), 'Error loading user data');
            }
        }, 100);
    } else {
        // Stop refresh when leaving users tab
        stopUserDataRefresh();
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

// ========================================
// User Management System
// ========================================

let currentUserFilters = {
    search: '',
    role: 'all',
    status: 'all'
};

let selectedUserIds = [];
let userActivityLog = [];
let userRefreshInterval = null;
let isLoadingUsers = false;
let lastDataRefresh = null;
const REFRESH_INTERVAL = 30000; // 30 seconds

// Skeleton screen generators
function generateUserCardSkeleton() {
    return `
        <div class="user-card skeleton-card">
            <div class="user-select-wrapper skeleton-element"></div>
            <div class="user-header">
                <div class="user-avatar">
                    <div class="user-avatar-placeholder skeleton-circle"></div>
                </div>
                <div class="user-info">
                    <div class="skeleton-text skeleton-element" style="height: 20px; width: 60%; margin-bottom: 8px;"></div>
                    <div class="skeleton-text skeleton-element" style="height: 16px; width: 80%; margin-bottom: 12px;"></div>
                    <div class="skeleton-rect skeleton-element" style="height: 24px; width: 100px; border-radius: 12px;"></div>
                </div>
                <div class="user-status">
                    <div class="skeleton-rect skeleton-element" style="height: 32px; width: 80px; border-radius: 16px;"></div>
                </div>
            </div>
            <div class="user-details">
                <div class="user-detail">
                    <div class="skeleton-text skeleton-element" style="height: 14px; width: 40%;"></div>
                    <div class="skeleton-text skeleton-element" style="height: 14px; width: 30%;"></div>
                </div>
                <div class="user-detail">
                    <div class="skeleton-text skeleton-element" style="height: 14px; width: 45%;"></div>
                    <div class="skeleton-text skeleton-element" style="height: 14px; width: 35%;"></div>
                </div>
                <div class="user-detail">
                    <div class="skeleton-text skeleton-element" style="height: 14px; width: 50%;"></div>
                    <div class="skeleton-text skeleton-element" style="height: 14px; width: 25%;"></div>
                </div>
            </div>
            <div class="user-actions">
                <div class="skeleton-rect skeleton-element" style="height: 32px; width: 70px; border-radius: 6px; margin-right: 8px;"></div>
                <div class="skeleton-rect skeleton-element" style="height: 32px; width: 90px; border-radius: 6px; margin-right: 8px;"></div>
                <div class="skeleton-rect skeleton-element" style="height: 32px; width: 80px; border-radius: 6px; margin-right: 8px;"></div>
                <div class="skeleton-rect skeleton-element" style="height: 32px; width: 70px; border-radius: 6px;"></div>
            </div>
        </div>
    `;
}

function generateStatisticsSkeleton() {
    return `
        <div class="stats-grid">
            ${Array(6).fill().map(() => `
                <div class="stat-card skeleton-card">
                    <div class="stat-icon skeleton-circle skeleton-element" style="width: 60px; height: 60px;"></div>
                    <div class="stat-content">
                        <div class="skeleton-text skeleton-element" style="height: 32px; width: 60px; margin-bottom: 8px;"></div>
                        <div class="skeleton-text skeleton-element" style="height: 16px; width: 80px;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function generateApprovalsSkeleton() {
    return `
        <div class="approvals-list">
            ${Array(3).fill().map(() => `
                <div class="approval-card skeleton-card">
                    <div class="approval-header">
                        <div class="approval-user-info">
                            <div class="skeleton-text skeleton-element" style="height: 20px; width: 50%; margin-bottom: 8px;"></div>
                            <div class="skeleton-text skeleton-element" style="height: 16px; width: 70%; margin-bottom: 12px;"></div>
                            <div class="skeleton-rect skeleton-element" style="height: 24px; width: 100px; border-radius: 12px;"></div>
                        </div>
                        <div class="approval-meta">
                            <div class="skeleton-text skeleton-element" style="height: 14px; width: 80px;"></div>
                        </div>
                    </div>
                    <div class="approval-details">
                        ${Array(2).fill().map(() => `
                            <div class="approval-detail">
                                <div class="skeleton-text skeleton-element" style="height: 14px; width: 40%;"></div>
                                <div class="skeleton-text skeleton-element" style="height: 14px; width: 30%;"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="approval-actions">
                        <div class="skeleton-rect skeleton-element" style="height: 32px; width: 70px; border-radius: 6px; margin-right: 8px;"></div>
                        <div class="skeleton-rect skeleton-element" style="height: 32px; width: 80px; border-radius: 6px; margin-right: 8px;"></div>
                        <div class="skeleton-rect skeleton-element" style="height: 32px; width: 70px; border-radius: 6px;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Loading state management
function showLoadingState(container, skeletonGenerator, message = 'Loading...') {
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="loading-message">${message}</p>
                </div>
                <div class="skeleton-container">
                    ${skeletonGenerator()}
                </div>
            </div>
        `;
    }
}

function showErrorState(container, message = 'Error loading data', showRetry = true) {
    if (container) {
        container.innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <p class="error-message">${message}</p>
                ${showRetry ? `
                    <button class="btn btn-primary" onclick="retryLoad()">
                        🔄 Retry
                    </button>
                ` : ''}
            </div>
        `;
    }
}

function showEmptyState(container, message = 'No data found', showAction = false, actionText = 'Add New', actionCallback = null) {
    if (container) {
        const actionButton = showAction && actionCallback ? 
            `<button class="btn btn-primary" onclick="${actionCallback}">${actionText}</button>` : '';
        
        container.innerHTML = `
            <div class="empty-container">
                <div class="empty-icon">📝</div>
                <p class="empty-message">${message}</p>
                ${actionButton}
            </div>
        `;
    }
}

// Start/stop real-time refresh
function startUserDataRefresh() {
    if (userRefreshInterval) {
        clearInterval(userRefreshInterval);
    }
    
    userRefreshInterval = setInterval(async () => {
        if (!isLoadingUsers && document.querySelector('.tab-panel.active[id="users-tab"]')) {
            console.log('Auto-refreshing user data...');
            await refreshUserData();
        }
    }, REFRESH_INTERVAL);
    
    console.log('User data auto-refresh started (30s interval)');
}

function stopUserDataRefresh() {
    if (userRefreshInterval) {
        clearInterval(userRefreshInterval);
        userRefreshInterval = null;
        console.log('User data auto-refresh stopped');
    }
}

// Refresh user data
async function refreshUserData() {
    try {
        isLoadingUsers = true;
        lastDataRefresh = new Date();
        
        // Update refresh indicator if exists
        const refreshIndicator = document.getElementById('refreshIndicator');
        if (refreshIndicator) {
            refreshIndicator.textContent = '🔄 Syncing...';
            refreshIndicator.classList.add('syncing');
        }
        
        // Refresh all user data
        await Promise.all([
            displayUsersManagement(),
            displayUserStatistics(),
            displayPendingApprovals()
        ]);
        
        // Update refresh indicator
        if (refreshIndicator) {
            refreshIndicator.textContent = '✅ Synced';
            setTimeout(() => {
                refreshIndicator.textContent = '📋 Last updated: ' + getTimeAgo(lastDataRefresh);
                refreshIndicator.classList.remove('syncing');
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error refreshing user data:', error);
        showToast('Error refreshing data. Please try again.', 'error');
    } finally {
        isLoadingUsers = false;
    }
}

// Manual refresh function for retry
async function retryLoad() {
    await refreshUserData();
}

// Initialize user management
async function initializeUserManagement() {
    try {
        if (window.userManagementInitialized) {
            return; // Already initialized
        }
        
        // Start real-time refresh
        startUserDataRefresh();
        
        await displayUserStatistics();
        await displayUsersManagement();
        setupUserForm();
        setupUserSearchAndFilters();
        setupUserModal();
        setupBulkActions();
        
        window.userManagementInitialized = true;
        window.userApprovalsInitialized = true;
    } catch (error) {
        console.error('Error initializing user management:', error);
        showToast('Error loading user management.', 'error');
    }
}

// Display Users Management
async function displayUsersManagement() {
    try {
        const container = document.getElementById('usersManagement');
        if (!container) return;

        // Show loading state
        showLoadingState(container, generateUserCardSkeleton, 'Loading users...');

        // Get all users from Firebase Auth
        const users = await getAllUsers();

        if (!users || users.length === 0) {
            showEmptyState(container, 'No users found. Users will appear here when they register.', false);
            return;
        }

        // Apply filters
        let filteredUsers = users.filter(user => {
            // Search filter
            if (currentUserFilters.search) {
                const searchTerm = currentUserFilters.search.toLowerCase();
                const matchesSearch = user.email.toLowerCase().includes(searchTerm) ||
                                    user.displayName?.toLowerCase().includes(searchTerm) ||
                                    user.role?.toLowerCase().includes(searchTerm);
                if (!matchesSearch) return false;
            }

            // Role filter
            if (currentUserFilters.role !== 'all' && user.role !== currentUserFilters.role) {
                return false;
            }

            // Status filter
            if (currentUserFilters.status !== 'all') {
                const isActive = user.emailVerified && !user.disabled;
                if (currentUserFilters.status === 'active' && !isActive) return false;
                if (currentUserFilters.status === 'inactive' && isActive) return false;
            }

            return true;
        });

        if (filteredUsers.length === 0) {
            showEmptyState(container, 'No users match your current filters.', true, 'Clear Filters', 'clearUserFilters()');
            return;
        }

        let html = '<div class="users-grid">';

        filteredUsers.forEach(user => {
            const isActive = user.emailVerified && !user.disabled;
            const lastSignIn = user.lastSignInTime ? new Date(user.lastSignInTime) : null;
            const createdAt = user.creationTime ? new Date(user.creationTime) : null;
            const role = user.role || 'employee';

            html += `
                <div class="user-card ${isActive ? 'active' : 'inactive'}">
                    <div class="user-header">
                        <div class="user-avatar">
                            ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName || user.email}">` :
                              `<div class="user-avatar-placeholder">${(user.displayName || user.email).charAt(0).toUpperCase()}</div>`}
                        </div>
                        <div class="user-info">
                            <h4>${user.displayName || 'No Name'}</h4>
                            <p class="user-email">${user.email}</p>
                            <span class="user-role role-${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
                        </div>
                        <div class="user-status">
                            <span class="status-indicator ${isActive ? 'active' : 'inactive'}">
                                ${isActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                        </div>
                    </div>

                    <div class="user-details">
                        <div class="user-detail">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${createdAt ? getTimeAgo(createdAt) : 'Unknown'}</span>
                        </div>
                        <div class="user-detail">
                            <span class="detail-label">Last Sign In:</span>
                            <span class="detail-value">${lastSignIn ? getTimeAgo(lastSignIn) : 'Never'}</span>
                        </div>
                        <div class="user-detail">
                            <span class="detail-label">Email Verified:</span>
                            <span class="detail-value">${user.emailVerified ? 'Yes' : 'No'}</span>
                        </div>
                    </div>

                    <div class="user-actions">
                        <button class="btn btn-info btn-small" onclick="editUser('${user.uid}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-warning btn-small" onclick="resetUserPassword('${user.uid}', '${user.email}')">
                            🔑 Reset Password
                        </button>
                        <button class="btn ${user.disabled ? 'btn-success' : 'btn-warning'} btn-small"
                                onclick="toggleUserStatus('${user.uid}', ${user.disabled})">
                            ${user.disabled ? '✓ Enable' : '⏸️ Disable'}
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteUser('${user.uid}', '${user.email}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying users management:', error);
        showToast('Error loading users management.', 'error');
    }
}

// Get all users from Firebase Auth and Firestore
async function getAllUsers() {
    try {
        // Check if Firebase is available
        if (!window.db) {
            console.warn('Firebase not available, returning empty user list');
            return [];
        }

        // Get users from Firestore (client-side approach)
        const usersRef = window.db.collection('users');
        const snapshot = await usersRef.get();

        const users = [];
        snapshot.forEach(doc => {
            users.push({ uid: doc.id, ...doc.data() });
        });

        console.log(`Successfully loaded ${users.length} users from Firestore`);
        return users;
    } catch (error) {
        console.error('Error getting users from Firestore:', error);
        
        // Fallback to Firebase Realtime Database if Firestore fails
        try {
            if (!window.firebaseRef || !window.firebaseGet) {
                throw new Error('Firebase Realtime Database not available');
            }
            
            const usersRef = firebaseRef('users');
            const snapshot = await firebaseGet(usersRef);
            
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const users = Object.entries(usersData).map(([uid, data]) => ({ uid, ...data }));
                console.log(`Successfully loaded ${users.length} users from Realtime Database`);
                return users;
            }
        } catch (fallbackError) {
            console.error('Fallback user fetch also failed:', fallbackError);
        }
        
        // Return empty array if all attempts fail
        return [];
    }
}

// Setup user creation form
function setupUserForm() {
    const form = document.getElementById('createUserForm');
    if (!form) return;

    // Setup password strength checking
    setupPasswordStrengthForUserForm();

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleUserCreation();
    });
}

// Check if Firestore is available and properly configured
async function checkFirestoreAvailability() {
    try {
        if (!window.db) {
            console.warn('Firestore not initialized');
            return false;
        }

        // Check if user is authenticated
        if (!window.auth.currentUser) {
            console.warn('User not authenticated - cannot access Firestore');
            return false;
        }

        // Since the user reached the admin page, they passed authentication
        // Try a basic Firestore operation to check if it's working
        const testCollection = window.db.collection('users');
        const testQuery = testCollection.limit(1);

        // This will fail if Firestore is not enabled or rules block access
        await testQuery.get();

        console.log('Firestore is available and accessible');
        return true;
    } catch (error) {
        console.error('Firestore availability check failed:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // Check specific error types
        if (error.code === 'permission-denied') {
            console.warn('Firestore permission denied - check if Firestore is enabled and security rules are published');
            return false;
        } else if (error.code === 'unavailable') {
            console.warn('Firestore service unavailable - may not be enabled yet');
            return false;
        } else if (error.code === 'failed-precondition') {
            console.warn('Firestore not properly configured - database may still be provisioning');
            return false;
        } else if (error.code === 'not-found') {
            console.warn('Firestore database not found - may not be created yet');
            return false;
        }

        return false;
    }
}

// Setup password strength checking for user creation form
function setupPasswordStrengthForUserForm() {
    const passwordInput = document.getElementById('userPassword');
    const strengthContainer = document.getElementById('passwordStrengthContainer');
    const strengthFill = document.getElementById('passwordStrengthFill');
    const strengthText = document.getElementById('passwordStrengthText');

    if (!passwordInput || !strengthContainer) return;

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        if (password.length === 0) {
            strengthContainer.style.display = 'none';
            return;
        }

        strengthContainer.style.display = 'block';

        const validationResult = SecurityFramework.validatePassword(password);
        let percentage = 0;
        let text = 'Password strength: ';
        let color = '#ef4444'; // red

        switch (validationResult.strength) {
            case 'weak':
                percentage = 25;
                text += 'Weak - Add uppercase, numbers, or symbols';
                color = '#ef4444';
                break;
            case 'medium':
                percentage = 50;
                text += 'Medium - Add more variety';
                color = '#f59e0b';
                break;
            case 'strong':
                percentage = 100;
                text += 'Strong - Good to go!';
                color = '#10b981';
                break;
        }

        strengthFill.style.width = percentage + '%';
        strengthFill.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    });
}

// Handle user creation
async function handleUserCreation() {
    const formData = getUserFormData();

    // Show status indicator
    showCreationStatus(true);

    try {
        // Step 0: Check Firestore availability
        updateCreationStatus(0, 'active');
        const firestoreAvailable = await checkFirestoreAvailability();
        if (!firestoreAvailable) {
            showToast('❌ Firestore is not available. Please enable Firestore in your Firebase project first.', 'error');
            updateCreationStatus(0, 'error');
            return;
        }
        updateCreationStatus(0, 'completed');

        // Step 1: Validation
        updateCreationStatus(1, 'active');
        const validation = validateUserFormData(formData);
        if (!validation.isValid) {
            showToast(validation.errors[0], 'error');
            highlightFormErrors(validation.fieldErrors);
            updateCreationStatus(1, 'error');
            return;
        }
        updateCreationStatus(1, 'completed');

        showUserCreationLoading(true);

        // Step 2: Check existing user
        updateCreationStatus(2, 'active');
        const existingUser = await checkExistingUser(formData.email);
        if (existingUser) {
            showToast('A user with this email already exists', 'error');
            document.getElementById('userEmail').focus();
            updateCreationStatus(2, 'error');
            return;
        }

        // Create user data
        const userData = createUserDataObject(formData);

        // Store user data in database
        await saveUserToDatabase(userData);

        // Handle role-specific logic
        if (formData.role === 'manager') {
            await createManagerApprovalRequest(userData);
        }

        // Step 3: Complete
        updateCreationStatus(2, 'completed');
        updateCreationStatus(3, 'completed');

        showToast('✅ User created successfully! They will receive login instructions via email.');

        // Show success details
        showUserCreationSuccess(formData);

        resetUserForm();
        await refreshUserData();

        // Hide status after success
        setTimeout(() => showCreationStatus(false), 5000);

    } catch (error) {
        console.error('Error creating user:', error);
        const errorMessage = getUserCreationErrorMessage(error);
        showToast(errorMessage, 'error');

        // Show error state
        updateCreationStatus(2, 'error');
    } finally {
        showUserCreationLoading(false);
    }
}

// Get form data
function getUserFormData() {
    return {
        email: document.getElementById('userEmail').value.trim(),
        password: document.getElementById('userPassword').value,
        displayName: document.getElementById('userDisplayName').value.trim(),
        role: document.getElementById('userRole').value,
        department: document.getElementById('userDepartment').value.trim(),
        employeeId: document.getElementById('userEmployeeId').value.trim()
    };
}

// Validate form data
function validateUserFormData(formData) {
    const errors = [];
    const fieldErrors = {};

    // Required fields
    if (!formData.email) {
        errors.push('Email address is required');
        fieldErrors.email = true;
    }
    if (!formData.password) {
        errors.push('Password is required');
        fieldErrors.password = true;
    }
    if (!formData.displayName) {
        errors.push('Display name is required');
        fieldErrors.displayName = true;
    }
    if (!formData.role) {
        errors.push('Role selection is required');
        fieldErrors.role = true;
    }

    if (errors.length > 0) {
        return { isValid: false, errors, fieldErrors };
    }

    // Email validation
    if (typeof SecurityFramework !== 'undefined' && SecurityFramework.validateEmail) {
        const emailValidation = SecurityFramework.validateEmail(formData.email);
        if (!emailValidation.isValid) {
            errors.push(emailValidation.errors[0]);
            fieldErrors.email = true;
        }
    }

    // Password validation
    if (typeof SecurityFramework !== 'undefined' && SecurityFramework.validatePassword) {
        const passwordValidation = SecurityFramework.validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            errors.push(passwordValidation.errors[0]);
            fieldErrors.password = true;
        }
    }

    // Display name validation
    if (typeof isValidName === 'function') {
        const nameValidation = isValidName(formData.displayName);
        if (!nameValidation.isValid) {
            errors.push(nameValidation.errors[0]);
            fieldErrors.displayName = true;
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        fieldErrors
    };
}

// Highlight form errors
function highlightFormErrors(fieldErrors) {
    // Clear previous errors
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    // Add error class to invalid fields
    Object.keys(fieldErrors).forEach(field => {
        const element = document.getElementById(`user${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (element) {
            element.classList.add('is-invalid');
        }
    });
}

// Create user data object
function createUserDataObject(formData) {
    const now = new Date().toISOString();
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;

    return {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        department: formData.department || '',
        employeeId: formData.employeeId || '',
        emailVerified: false,
        disabled: formData.role === 'manager', // Managers need approval
        pendingApproval: formData.role === 'manager',
        creationTime: now,
        lastLogin: null,
        lastActivity: null,
        createdBy: currentUser ? currentUser.id : 'admin',
        lastUpdated: now,
        updatedBy: currentUser ? currentUser.id : 'admin'
    };
}

// Save user to database
async function saveUserToDatabase(userData) {
    // Generate a unique ID for the user
    const uid = generateUserId(userData.email);

    // Store in Firestore first (preferred)
    try {
        await window.db.collection('users').doc(uid).set({
            ...userData,
            uid: uid
        });
        console.log('User saved to Firestore:', uid);
    } catch (firestoreError) {
        console.warn('Firestore save failed, trying Realtime Database:', firestoreError);

        // Fallback to Realtime Database
        const usersRef = firebaseRef('users');
        const newUserRef = firebasePush(usersRef);
        await firebaseSet(newUserRef, {
            ...userData,
            uid: newUserRef.key
        });
        console.log('User saved to Realtime Database:', newUserRef.key);
    }
}

// Generate unique user ID
function generateUserId(email) {
    // Create a hash-like ID from email for consistency
    const hash = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
    return hash;
}

// Create approval request for managers
async function createManagerApprovalRequest(userData) {
    try {
        const approvalRequest = {
            userId: userData.uid || generateUserId(userData.email),
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            department: userData.department,
            employeeId: userData.employeeId,
            requestTime: new Date().toISOString(),
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            notes: 'Created by admin'
        };

        await window.db.collection('userApprovals').doc(approvalRequest.userId).set(approvalRequest);
        console.log('Approval request created for manager');
    } catch (error) {
        console.warn('Failed to create approval request:', error);
        // Don't fail the whole operation for this
    }
}

// Show/hide loading state for user creation
function showUserCreationLoading(isLoading) {
    const btn = document.getElementById('createUserBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    if (isLoading) {
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
    } else {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Get user-friendly error message
function getUserCreationErrorMessage(error) {
    console.error('User creation error details:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);

    if (error && error.code) {
        switch (error.code) {
            case 'permission-denied':
                return '❌ Firestore Access Denied: Firestore API may not be enabled or security rules are blocking access. Please enable Firestore first by going to Firebase Console > Firestore Database > Create database.';
            case 'unavailable':
                return '🔄 Service temporarily unavailable. Please check your internet connection and try again.';
            case 'invalid-argument':
                return '⚠️ Invalid data provided. Please check your inputs and try again.';
            case 'not-found':
                return '📁 Database not found. Please ensure Firestore is properly configured.';
            case 'already-exists':
                return '👤 User already exists with this email address.';
            case 'resource-exhausted':
                return '⏰ Too many requests. Please wait a moment and try again.';
            case 'failed-precondition':
                return '⚙️ Firestore is not properly configured. Please check your Firebase project settings.';
            case 'cancelled':
                return '🚫 Operation was cancelled. Please try again.';
            case 'deadline-exceeded':
                return '⏱️ Request timed out. Please check your connection and try again.';
            default:
                return `❌ Error: ${error.code}. Please try again or contact support if the problem persists.`;
        }
    }

    // Check for common error patterns in the message
    if (error && error.message) {
        const message = error.message.toLowerCase();
        if (message.includes('firestore') && message.includes('not enabled')) {
            return '❌ Firestore Not Enabled: Please enable Firestore API in your Firebase project first.';
        }
        if (message.includes('permission') || message.includes('denied')) {
            return '❌ Permission Denied: Firestore security rules may be blocking access. Please check your Firestore rules.';
        }
        if (message.includes('network') || message.includes('connection')) {
            return '🔌 Network Error: Please check your internet connection and try again.';
        }
    }

    return '❌ Failed to create user. Please check your connection and try again. If the problem persists, ensure Firestore is enabled in your Firebase project.';
}

// Preview user creation
function previewUserCreation() {
    const formData = getUserFormData();
    const validation = validateUserFormData(formData);

    if (!validation.isValid) {
        showToast(validation.errors[0], 'error');
        highlightFormErrors(validation.fieldErrors);
        return;
    }

    const previewContent = document.getElementById('userPreviewContent');
    const roleEmojis = {
        employee: '👤',
        manager: '👔',
        admin: '⚡'
    };

    previewContent.innerHTML = `
        <div class="user-preview-card">
            <div class="preview-header">
                <div class="preview-avatar">
                    <div class="user-avatar-placeholder">${formData.displayName.charAt(0).toUpperCase()}</div>
                </div>
                <div class="preview-info">
                    <h4>${formData.displayName}</h4>
                    <p>${formData.email}</p>
                    <span class="user-role role-${formData.role}">${roleEmojis[formData.role]} ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</span>
                </div>
            </div>
            <div class="preview-details">
                ${formData.department ? `<div class="preview-detail"><strong>Department:</strong> ${formData.department}</div>` : ''}
                ${formData.employeeId ? `<div class="preview-detail"><strong>Employee ID:</strong> ${formData.employeeId}</div>` : ''}
                <div class="preview-detail"><strong>Status:</strong> ${formData.role === 'manager' ? 'Pending Approval' : 'Active'}</div>
                <div class="preview-detail"><strong>Email Verification:</strong> Required after creation</div>
            </div>
        </div>
    `;

    document.getElementById('userPreviewModal').style.display = 'flex';
}

// Confirm user creation from preview
async function confirmUserCreation() {
    closeUserPreviewModal();
    await handleUserCreation();
}

// Close preview modal
function closeUserPreviewModal() {
    document.getElementById('userPreviewModal').style.display = 'none';
}

// Show/hide creation status indicator
function showCreationStatus(show) {
    const statusEl = document.getElementById('creationStatus');
    if (statusEl) {
        statusEl.style.display = show ? 'flex' : 'none';
        if (show) {
            // Reset all steps
            document.querySelectorAll('.status-step').forEach(step => {
                step.classList.remove('active', 'completed', 'error');
            });
        }
    }
}

// Update creation status step
function updateCreationStatus(step, status) {
    const stepEl = document.querySelector(`.status-step[data-step="${step}"]`);
    if (stepEl) {
        // Remove all status classes
        stepEl.classList.remove('active', 'completed', 'error');

        // Add new status class
        if (status === 'active' || status === 'completed' || status === 'error') {
            stepEl.classList.add(status);
        }
    }
}

// Show user creation success message with details
function showUserCreationSuccess(formData) {
    const successHtml = `
        <div class="user-creation-success">
            <div class="success-header">
                <span class="success-icon">🎉</span>
                <h4>User Created Successfully!</h4>
            </div>
            <div class="success-details">
                <div class="success-item">
                    <strong>Name:</strong> ${formData.displayName}
                </div>
                <div class="success-item">
                    <strong>Email:</strong> ${formData.email}
                </div>
                <div class="success-item">
                    <strong>Role:</strong> ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                </div>
                ${formData.department ? `<div class="success-item"><strong>Department:</strong> ${formData.department}</div>` : ''}
                ${formData.employeeId ? `<div class="success-item"><strong>Employee ID:</strong> ${formData.employeeId}</div>` : ''}
                <div class="success-item">
                    <strong>Status:</strong> ${formData.role === 'manager' ? 'Pending Approval' : 'Active'}
                </div>
            </div>
            <div class="success-actions">
                <button class="btn btn-secondary btn-small" onclick="copyUserDetails('${formData.email}', '${formData.displayName}')">
                    📋 Copy Details
                </button>
                <button class="btn btn-primary btn-small" onclick="this.parentElement.parentElement.remove()">
                    ✓ Got it
                </button>
            </div>
        </div>
    `;

    // Create and show success message
    const successDiv = document.createElement('div');
    successDiv.innerHTML = successHtml;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        background: var(--bg-primary, white);
        border: 2px solid var(--success-color, #10b981);
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        animation: slideInRight 0.5s ease-out;
    `;

    document.body.appendChild(successDiv);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 10000);
}

// Copy user details to clipboard
async function copyUserDetails(email, name) {
    const details = `Name: ${name}\nEmail: ${email}\nCreated: ${new Date().toLocaleString()}`;

    try {
        await navigator.clipboard.writeText(details);
        showToast('✅ User details copied to clipboard!');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = details;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('✅ User details copied to clipboard!');
    }
}

// Password visibility toggle function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.parentNode.querySelector('.password-toggle');

    if (input && toggleBtn) {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.textContent = '🙈';
            toggleBtn.title = 'Hide password';
        } else {
            input.type = 'password';
            toggleBtn.textContent = '👁️';
            toggleBtn.title = 'Show password';
        }
    }
}

// Reset user form
function resetUserForm() {
    const form = document.getElementById('createUserForm');
    if (form) {
        form.reset();
    }

    // Clear validation errors
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    // Hide password strength
    const strengthContainer = document.getElementById('passwordStrengthContainer');
    if (strengthContainer) {
        strengthContainer.style.display = 'none';
    }

    // Reset password toggle
    const passwordInput = document.getElementById('userPassword');
    if (passwordInput) {
        passwordInput.type = 'password';
        const toggleBtn = passwordInput.parentNode.querySelector('.password-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = '👁️';
            toggleBtn.title = 'Show password';
        }
    }

    // Hide creation status
    showCreationStatus(false);
}

// Refresh user data after creation
async function refreshUserData() {
    await Promise.all([
        displayUsersManagement(),
        displayUserStatistics(),
        displayPendingApprovals()
    ]);
}

// Edit user
async function editUser(userId) {
    try {
        const user = await getUserById(userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        document.getElementById('editUserId').value = user.uid || userId;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserDisplayName').value = user.displayName || '';
        document.getElementById('editUserRole').value = user.role || 'employee';

        document.getElementById('editUserModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showToast('Error loading user details.', 'error');
    }
}

// Get user by ID
async function getUserById(userId) {
    try {
        // Try Firestore first
        const userRef = window.db.collection('users').doc(userId);
        const snapshot = await userRef.get();

        if (snapshot.exists) {
            return { uid: userId, ...snapshot.data() };
        }

        // Fallback to Firebase Realtime Database
        const usersRef = firebaseRef(`users/${userId}`);
        const dbSnapshot = await firebaseGet(usersRef);

        if (dbSnapshot.exists()) {
            return { uid: userId, ...dbSnapshot.val() };
        }

        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Update user
async function updateUser(userId, updates) {
    try {
        const userRef = firebaseRef(`users/${userId}`);
        const updateData = {
            ...updates,
            lastUpdated: new Date().toISOString(),
            updatedBy: window.authService ? window.authService.getCurrentUser()?.id : 'admin'
        };

        // If updating email verification or login time, handle specially
        if (updates.emailVerified !== undefined || updates.lastLogin !== undefined) {
            updateData.lastActivity = new Date().toISOString();
        }

        await firebaseUpdate(userRef, updateData);

        showToast('User updated successfully!');
        await displayUsersManagement();
        await displayUserStatistics();
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error updating user.', 'error');
    }
}

// Reset user password
async function resetUserPassword(userId, email) {
    try {
        const confirmed = await customConfirm(`Send password reset email to ${email}?`, 'Reset Password');
        if (!confirmed) return;

        // In a real implementation, this would call Firebase Admin SDK
        // For now, we'll just show a message
        showToast(`Password reset email would be sent to ${email}. (Feature requires server-side implementation)`);

        // Log the action
        console.log(`Password reset requested for user: ${userId} (${email})`);
    } catch (error) {
        console.error('Error resetting password:', error);
        showToast('Error sending password reset email.', 'error');
    }
}

// Toggle user status (enable/disable)
async function toggleUserStatus(userId, currentlyDisabled) {
    try {
        const action = currentlyDisabled ? 'enable' : 'disable';
        const confirmed = await customConfirm(
            `Are you sure you want to ${action} this user? ${currentlyDisabled ? 'They will be able to sign in again.' : 'They will not be able to sign in until re-enabled.'}`,
            `${action.charAt(0).toUpperCase() + action.slice(1)} User`
        );

        if (!confirmed) return;

        await updateUser(userId, { disabled: !currentlyDisabled });
        showToast(`User ${action}d successfully!`);
    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast('Error updating user status.', 'error');
    }
}

// Delete user
async function deleteUser(userId, email) {
    try {
        const confirmed = await customConfirm(
            `Permanently delete user ${email}? This action cannot be undone and will remove all associated data.`,
            'Delete User'
        );

        if (!confirmed) return;

        const confirmed2 = await customConfirm(
            'This is irreversible. Are you absolutely sure?',
            'Final Confirmation'
        );

        if (!confirmed2) return;

        // Delete from Firestore
        const userRef = firebaseRef(`users/${userId}`);
        await firebaseRemove(userRef);

        showToast('User deleted successfully!');
        await displayUsersManagement();
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user.', 'error');
    }
}

// Setup user modal
function setupUserModal() {
    const modal = document.getElementById('editUserModal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Setup edit form
    const form = document.getElementById('editUserForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const userId = document.getElementById('editUserId').value;
            const displayName = document.getElementById('editUserDisplayName').value.trim();
            const role = document.getElementById('editUserRole').value;

            if (!displayName) {
                showToast('Display name is required', 'error');
                return;
            }

            const nameValidation = isValidName(displayName);
            if (!nameValidation.isValid) {
                showToast(nameValidation.errors[0], 'error');
                return;
            }

            await updateUser(userId, {
                displayName: displayName,
                role: role
            });

            modal.style.display = 'none';
        });
    }
}

// Clear user filters
function clearUserFilters() {
    currentUserFilters = {
        search: '',
        role: 'all',
        status: 'all'
    };

    // Reset form elements
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('userRoleFilter');
    const statusFilter = document.getElementById('userStatusFilter');

    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';

    displayUsersManagement();
    showToast('Filters cleared!');
}

// Setup user search and filters
function setupUserSearchAndFilters() {
    // Search input with debouncing
    const searchInput = document.getElementById('userSearch');
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentUserFilters.search = e.target.value.trim();
                displayUsersManagement();
            }, 300); // 300ms debounce
        });
    }

    // Role filter
    const roleFilter = document.getElementById('userRoleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', function(e) {
            currentUserFilters.role = e.target.value;
            displayUsersManagement();
        });
    }

    // Status filter
    const statusFilter = document.getElementById('userStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function(e) {
            currentUserFilters.status = e.target.value;
            displayUsersManagement();
        });
    }

    // Add refresh button functionality
    const refreshBtn = document.getElementById('refreshUsersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            showToast('Refreshing user data...');
            await refreshUserData();
        });
    }
}

// ========================================
// User Statistics Display
// ========================================

async function displayUserStatistics() {
    try {
        const container = document.getElementById('userStatistics');
        if (!container) return;

        const users = await getAllUsers();
        
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.emailVerified && !u.disabled).length;
        const pendingUsers = users.filter(u => u.pendingApproval).length;
        const adminUsers = users.filter(u => u.role === 'admin').length;
        const managerUsers = users.filter(u => u.role === 'manager').length;
        const employeeUsers = users.filter(u => u.role === 'employee').length;

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${totalUsers}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                </div>
                <div class="stat-card stat-success">
                    <div class="stat-icon">✓</div>
                    <div class="stat-content">
                        <div class="stat-value">${activeUsers}</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                </div>
                <div class="stat-card stat-warning">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${pendingUsers}</div>
                        <div class="stat-label">Pending Approval</div>
                    </div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-icon">⚡</div>
                    <div class="stat-content">
                        <div class="stat-value">${adminUsers}</div>
                        <div class="stat-label">Admins</div>
                    </div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-icon">👔</div>
                    <div class="stat-content">
                        <div class="stat-value">${managerUsers}</div>
                        <div class="stat-label">Managers</div>
                    </div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-icon">👤</div>
                    <div class="stat-content">
                        <div class="stat-value">${employeeUsers}</div>
                        <div class="stat-label">Employees</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying user statistics:', error);
    }
}

// ========================================
// Bulk User Actions
// ========================================

function setupBulkActions() {
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function(e) {
            toggleSelectAllUsers(e.target.checked);
        });
    }

    const bulkEnableBtn = document.getElementById('bulkEnableBtn');
    if (bulkEnableBtn) {
        bulkEnableBtn.addEventListener('click', bulkEnableUsers);
    }

    const bulkDisableBtn = document.getElementById('bulkDisableBtn');
    if (bulkDisableBtn) {
        bulkDisableBtn.addEventListener('click', bulkDisableUsers);
    }

    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', bulkDeleteUsers);
    }

    const exportUsersBtn = document.getElementById('exportUsersBtn');
    if (exportUsersBtn) {
        exportUsersBtn.addEventListener('click', exportUsersToCSV);
    }
}

function toggleSelectAllUsers(checked) {
    const checkboxes = document.querySelectorAll('.user-select-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
        toggleUserSelection(checkbox.value, checked);
    });
    updateBulkActionButtons();
}

function toggleUserSelection(userId, isSelected) {
    if (isSelected) {
        if (!selectedUserIds.includes(userId)) {
            selectedUserIds.push(userId);
        }
    } else {
        selectedUserIds = selectedUserIds.filter(id => id !== userId);
    }
    updateBulkActionButtons();
}

function updateBulkActionButtons() {
    const bulkActionsContainer = document.getElementById('bulkActionsContainer');
    if (!bulkActionsContainer) return;

    const selectedCount = selectedUserIds.length;
    const countDisplay = document.getElementById('selectedUserCount');
    
    if (selectedCount > 0) {
        bulkActionsContainer.style.display = 'flex';
        if (countDisplay) {
            countDisplay.textContent = `${selectedCount} user${selectedCount > 1 ? 's' : ''} selected`;
        }
    } else {
        bulkActionsContainer.style.display = 'none';
    }
}

async function bulkEnableUsers() {
    if (selectedUserIds.length === 0) return;

    const confirmed = await customConfirm(
        `Enable ${selectedUserIds.length} selected user(s)? They will be able to sign in.`,
        'Bulk Enable Users'
    );

    if (!confirmed) return;

    try {
        showLoadingOverlay(`Enabling ${selectedUserIds.length} users...`);
        
        for (const userId of selectedUserIds) {
            await updateUser(userId, { disabled: false });
        }

        showToast(`Successfully enabled ${selectedUserIds.length} user(s)!`);
        selectedUserIds = [];
        await displayUsersManagement();
        await displayUserStatistics();
        updateBulkActionButtons();
    } catch (error) {
        console.error('Error bulk enabling users:', error);
        showToast('Error enabling some users.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function bulkDisableUsers() {
    if (selectedUserIds.length === 0) return;

    const confirmed = await customConfirm(
        `Disable ${selectedUserIds.length} selected user(s)? They will not be able to sign in until re-enabled.`,
        'Bulk Disable Users'
    );

    if (!confirmed) return;

    try {
        showLoadingOverlay(`Disabling ${selectedUserIds.length} users...`);
        
        for (const userId of selectedUserIds) {
            await updateUser(userId, { disabled: true });
        }

        showToast(`Successfully disabled ${selectedUserIds.length} user(s)!`);
        selectedUserIds = [];
        await displayUsersManagement();
        await displayUserStatistics();
        updateBulkActionButtons();
    } catch (error) {
        console.error('Error bulk disabling users:', error);
        showToast('Error disabling some users.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function bulkDeleteUsers() {
    if (selectedUserIds.length === 0) return;

    const confirmed1 = await customConfirm(
        `Permanently delete ${selectedUserIds.length} selected user(s)? This action cannot be undone!`,
        'Bulk Delete Users'
    );

    if (!confirmed1) return;

    const confirmed2 = await customConfirm(
        'This is irreversible. Are you absolutely sure?',
        'Final Confirmation'
    );

    if (!confirmed2) return;

    try {
        showLoadingOverlay(`Deleting ${selectedUserIds.length} users...`);
        
        for (const userId of selectedUserIds) {
            const userRef = firebaseRef(`users/${userId}`);
            await firebaseRemove(userRef);
        }

        showToast(`Successfully deleted ${selectedUserIds.length} user(s)!`);
        selectedUserIds = [];
        await displayUsersManagement();
        await displayUserStatistics();
        updateBulkActionButtons();
    } catch (error) {
        console.error('Error bulk deleting users:', error);
        showToast('Error deleting some users.', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// ========================================
// Export Users to CSV
// ========================================

async function exportUsersToCSV() {
    try {
        const users = await getAllUsers();
        
        if (users.length === 0) {
            showToast('No users to export', 'error');
            return;
        }

        // CSV header
        let csv = 'Email,Display Name,Role,Status,Email Verified,Created,Last Sign In\n';

        // CSV rows
        users.forEach(user => {
            const isActive = user.emailVerified && !user.disabled;
            const isPending = user.pendingApproval;
            let status = 'Active';
            if (isPending) status = 'Pending Approval';
            else if (!isActive) status = 'Inactive';

            const createdAt = user.creationTime ? new Date(user.creationTime).toLocaleDateString() : 'Unknown';
            const lastSignIn = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';

            csv += `"${user.email}","${user.displayName || 'No Name'}","${user.role || 'employee'}","${status}","${user.emailVerified ? 'Yes' : 'No'}","${createdAt}","${lastSignIn}"\n`;
        });

        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(`Exported ${users.length} users to CSV!`);
    } catch (error) {
        console.error('Error exporting users:', error);
        showToast('Error exporting users to CSV.', 'error');
    }
}

// ========================================
// User Approval System
// ========================================

let currentApprovalUserId = null;

// Initialize user approvals
async function initializeUserApprovals() {
    try {
        if (window.userApprovalsInitialized) {
            return; // Already initialized
        }
        
        await displayPendingApprovals();
        window.userApprovalsInitialized = true;
    } catch (error) {
        console.error('Error initializing user approvals:', error);
        showToast('Error loading user approvals.', 'error');
    }
}

// Display pending user approvals
async function displayPendingApprovals() {
    try {
        const container = document.getElementById('pendingApprovals');
        if (!container) return;

        const pendingApprovals = await getPendingApprovals();

        if (!pendingApprovals || pendingApprovals.length === 0) {
            container.innerHTML = '<p class="empty-message">No pending approvals. All user requests have been processed.</p>';
            return;
        }

        let html = '<div class="approvals-list">';

        pendingApprovals.forEach(approval => {
            html += `
                <div class="approval-card">
                    <div class="approval-header">
                        <div class="approval-user-info">
                            <h4>${approval.displayName}</h4>
                            <p class="approval-email">${approval.email}</p>
                            <span class="approval-role role-${approval.role}">${approval.role.charAt(0).toUpperCase() + approval.role.slice(1)}</span>
                        </div>
                        <div class="approval-meta">
                            <small>Requested: ${getTimeAgo(new Date(approval.requestTime))}</small>
                        </div>
                    </div>

                    <div class="approval-details">
                        ${approval.department ? `<div class="approval-detail"><span class="detail-label">Department:</span> <span class="detail-value">${approval.department}</span></div>` : ''}
                        ${approval.employeeId ? `<div class="approval-detail"><span class="detail-label">Employee ID:</span> <span class="detail-value">${approval.employeeId}</span></div>` : ''}
                    </div>

                    <div class="approval-actions">
                        <button class="btn btn-success btn-small" onclick="reviewApproval('${approval.userId}')">
                            👁️ Review
                        </button>
                        <button class="btn btn-outline btn-small" onclick="quickApprove('${approval.userId}')">
                            ✓ Quick Approve
                        </button>
                        <button class="btn btn-danger btn-small" onclick="quickReject('${approval.userId}')">
                            ✗ Quick Reject
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying pending approvals:', error);
        showToast('Error loading pending approvals.', 'error');
    }
}

// Get pending approvals
async function getPendingApprovals() {
    try {
        const approvalsRef = window.db.collection('userApprovals');
        const snapshot = await approvalsRef.where('status', '==', 'pending').get();

        const approvals = [];
        snapshot.forEach(doc => {
            approvals.push({ id: doc.id, ...doc.data() });
        });

        return approvals;
    } catch (error) {
        console.error('Error getting pending approvals:', error);
        return [];
    }
}

// Review approval
async function reviewApproval(userId) {
    try {
        const approval = await getApprovalById(userId);
        if (!approval) {
            showToast('Approval request not found', 'error');
            return;
        }

        currentApprovalUserId = userId;

        const detailsHtml = `
            <div class="approval-review-details">
                <div class="review-section">
                    <h4>User Information</h4>
                    <div class="review-info">
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span class="info-value">${approval.displayName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">${approval.email}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Role:</span>
                            <span class="info-value">${approval.role.charAt(0).toUpperCase() + approval.role.slice(1)}</span>
                        </div>
                        ${approval.department ? `
                            <div class="info-row">
                                <span class="info-label">Department:</span>
                                <span class="info-value">${approval.department}</span>
                            </div>
                        ` : ''}
                        ${approval.employeeId ? `
                            <div class="info-row">
                                <span class="info-label">Employee ID:</span>
                                <span class="info-value">${approval.employeeId}</span>
                            </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="info-label">Requested:</span>
                            <span class="info-value">${new Date(approval.requestTime).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('approvalDetails').innerHTML = detailsHtml;
        document.getElementById('approvalNotes').value = '';
        document.getElementById('approvalModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading approval details:', error);
        showToast('Error loading approval details.', 'error');
    }
}

// Get approval by user ID
async function getApprovalById(userId) {
    try {
        const approvalRef = window.db.collection('userApprovals').doc(userId);
        const snapshot = await approvalRef.get();

        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }

        return null;
    } catch (error) {
        console.error('Error getting approval:', error);
        return null;
    }
}

// Approve user
async function approveUser() {
    if (!currentApprovalUserId) return;

    try {
        const notes = document.getElementById('approvalNotes').value.trim();
        const currentUser = window.authService ? window.authService.getCurrentUser() : null;

        // Update approval status
        await window.db.collection('userApprovals').doc(currentApprovalUserId).update({
            status: 'approved',
            reviewedBy: currentUser ? currentUser.id : 'admin',
            reviewedAt: new Date().toISOString(),
            notes: notes
        });

        // Enable user account
        await window.db.collection('users').doc(currentApprovalUserId).update({
            disabled: false,
            pendingApproval: false,
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser ? currentUser.id : 'admin'
        });

        showToast('User approved successfully! They can now sign in.');
        closeApprovalModal();
        await displayPendingApprovals();
        await displayUsersManagement();
    } catch (error) {
        console.error('Error approving user:', error);
        showToast('Error approving user.', 'error');
    }
}

// Reject user
async function rejectUser() {
    if (!currentApprovalUserId) return;

    try {
        const notes = document.getElementById('approvalNotes').value.trim();
        const currentUser = window.authService ? window.authService.getCurrentUser() : null;

        // Update approval status
        await window.db.collection('userApprovals').doc(currentApprovalUserId).update({
            status: 'rejected',
            reviewedBy: currentUser ? currentUser.id : 'admin',
            reviewedAt: new Date().toISOString(),
            notes: notes
        });

        // Disable user account
        await window.db.collection('users').doc(currentApprovalUserId).update({
            disabled: true,
            pendingApproval: false,
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser ? currentUser.id : 'admin'
        });

        showToast('User request rejected.');
        closeApprovalModal();
        await displayPendingApprovals();
        await displayUsersManagement();
    } catch (error) {
        console.error('Error rejecting user:', error);
        showToast('Error rejecting user.', 'error');
    }
}

// Quick approve
async function quickApprove(userId) {
    currentApprovalUserId = userId;
    await approveUser();
}

// Quick reject
async function quickReject(userId) {
    currentApprovalUserId = userId;
    await rejectUser();
}

// Close approval modal
function closeApprovalModal() {
    document.getElementById('approvalModal').style.display = 'none';
    currentApprovalUserId = null;
}

// Update getAllUsers to include pending approval status
async function getAllUsers() {
    try {
        const usersRef = window.db.collection('users');
        const snapshot = await usersRef.get();

        const users = [];
        snapshot.forEach(doc => {
            users.push({ uid: doc.id, ...doc.data() });
        });

        return users;
    } catch (error) {
        console.error('Error getting users:', error);
        return [];
    }
}

// Display Users Management
async function displayUsersManagement() {
    try {
        const container = document.getElementById('usersManagement');
        if (!container) return;

        // Show loading state
        showLoadingState(container, generateUserCardSkeleton, 'Loading users...');

        const users = await getAllUsers();

        if (!users || users.length === 0) {
            showEmptyState(container, 'No users found. Users will appear here when they register.', false);
            return;
        }

        // Apply filters
        let filteredUsers = users.filter(user => {
            // Search filter
            if (currentUserFilters.search) {
                const searchTerm = currentUserFilters.search.toLowerCase();
                const matchesSearch = user.email?.toLowerCase().includes(searchTerm) ||
                                    user.displayName?.toLowerCase().includes(searchTerm) ||
                                    user.role?.toLowerCase().includes(searchTerm);
                if (!matchesSearch) return false;
            }

            // Role filter
            if (currentUserFilters.role !== 'all' && user.role !== currentUserFilters.role) {
                return false;
            }

            // Status filter
            if (currentUserFilters.status !== 'all') {
                const isActive = (user.emailVerified !== false) && !user.disabled; // Default to true if not set
                const isPending = user.pendingApproval;

                if (currentUserFilters.status === 'active' && !isActive) return false;
                if (currentUserFilters.status === 'inactive' && isActive) return false;
                if (currentUserFilters.status === 'pending' && !isPending) return false;
            }

            return true;
        });

        if (filteredUsers.length === 0) {
            showEmptyState(container, 'No users match your current filters.', true, 'Clear Filters', 'clearUserFilters()');
            return;
        }

        // Sort users by creation time (newest first)
        filteredUsers.sort((a, b) => {
            const aTime = a.creationTime ? new Date(a.creationTime) : new Date(0);
            const bTime = b.creationTime ? new Date(b.creationTime) : new Date(0);
            return bTime - aTime;
        });

        let html = '<div class="users-grid">';

        filteredUsers.forEach(user => {
            const isActive = (user.emailVerified !== false) && !user.disabled; // Default to active if not specified
            const isPending = user.pendingApproval;
            const lastSignIn = user.lastLogin ? new Date(user.lastLogin) : null;
            const createdAt = user.creationTime ? new Date(user.creationTime) : null;
            const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
            const role = user.role || 'employee';
            const isSelected = selectedUserIds.includes(user.uid);

            let statusText = 'Active';
            let statusClass = 'active';
            if (isPending) {
                statusText = 'Pending Approval';
                statusClass = 'pending';
            } else if (!isActive) {
                statusText = 'Inactive';
                statusClass = 'inactive';
            }

            // Enhanced role badges with better styling
            const roleBadges = {
                admin: '<span class="user-role role-admin" title="Administrator">⚡ Admin</span>',
                manager: '<span class="user-role role-manager" title="Manager">👔 Manager</span>',
                employee: '<span class="user-role role-employee" title="Employee">👤 Employee</span>'
            };

            // Enhanced status indicators
            const statusIcons = {
                active: '🟢',
                inactive: '🔴',
                pending: '🟡'
            };

            html += `
                <div class="user-card ${statusClass} ${isSelected ? 'user-selected' : ''}" data-user-id="${user.uid}">
                    <div class="user-select-wrapper">
                        <input type="checkbox"
                               class="user-select-checkbox"
                               value="${user.uid}"
                               ${isSelected ? 'checked' : ''}
                               onchange="toggleUserSelection('${user.uid}', this.checked)"
                               title="Select user for bulk actions">
                    </div>
                    <div class="user-header">
                        <div class="user-avatar">
                            ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName || user.email}" loading="lazy">` :
                              `<div class="user-avatar-placeholder" title="${user.displayName || user.email}">${(user.displayName || user.email || '?').charAt(0).toUpperCase()}</div>`}
                        </div>
                        <div class="user-info">
                            <h4 title="${user.displayName || 'No Name'}">${user.displayName || 'No Name'}</h4>
                            <p class="user-email" title="${user.email}">${user.email}</p>
                            ${roleBadges[role] || roleBadges.employee}
                        </div>
                        <div class="user-status">
                            <span class="status-indicator ${statusClass}" title="${statusText}">
                                ${statusIcons[statusClass] || '⚪'} ${statusText}
                            </span>
                        </div>
                    </div>

                    <div class="user-details">
                        <div class="user-detail">
                            <span class="detail-label">📅 Created:</span>
                            <span class="detail-value">${createdAt ? getTimeAgo(createdAt) : 'Unknown'}</span>
                        </div>
                        <div class="user-detail">
                            <span class="detail-label">🔑 Last Login:</span>
                            <span class="detail-value">${lastSignIn ? getTimeAgo(lastSignIn) : 'Never'}</span>
                        </div>
                        <div class="user-detail">
                            <span class="detail-label">✉️ Email Verified:</span>
                            <span class="detail-value">${user.emailVerified !== false ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        ${lastActivity ? `
                            <div class="user-detail">
                                <span class="detail-label">⚡ Last Activity:</span>
                                <span class="detail-value">${getTimeAgo(lastActivity)}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="user-actions">
                        <button class="btn btn-info btn-small" onclick="editUser('${user.uid}')" title="Edit user details">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-warning btn-small" onclick="resetUserPassword('${user.uid}', '${user.email}')" title="Send password reset email">
                            🔑 Reset
                        </button>
                        ${!isPending ? `
                            <button class="btn ${user.disabled ? 'btn-success' : 'btn-warning'} btn-small"
                                    onclick="toggleUserStatus('${user.uid}', ${user.disabled})"
                                    title="${user.disabled ? 'Enable user account' : 'Disable user account'}">
                                ${user.disabled ? '✅ Enable' : '⏸️ Disable'}
                            </button>
                        ` : `
                            <button class="btn btn-success btn-small" onclick="reviewApproval('${user.uid}')" title="Review user approval">
                                👁️ Review
                            </button>
                        `}
                        <button class="btn btn-danger btn-small" onclick="deleteUser('${user.uid}', '${user.email}')" title="Permanently delete user">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Update bulk actions visibility
        updateBulkActionButtons();
    } catch (error) {
        console.error('Error displaying users management:', error);
        showErrorState(document.getElementById('usersManagement'), 'Error loading user data');
    }
}

// Initialize user management when tab is switched to users
function initializeUserManagementTab() {
    if (document.getElementById('usersManagement')) {
        // Check if already initialized, if not initialize
        if (!window.userManagementInitialized) {
            initializeUserManagement();
        }
        if (!window.userApprovalsInitialized) {
            initializeUserApprovals();
        }
        
        // Always refresh the data displays when switching to users tab
        setTimeout(async () => {
            try {
                await displayUsersManagement();
                await displayUserStatistics();
                await displayPendingApprovals();
            } catch (error) {
                console.error('Error refreshing user management data:', error);
            }
        }, 100);
    }
}
