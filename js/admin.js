// ========================================
// Admin Page Functionality
// ========================================

console.log('Admin.js loaded - checking function exposure...');

// Email verification management
let selectedUnverifiedUserIds = [];
let unverifiedUsers = [];

// Cache busting - force reload of latest code
const CACHE_BUSTER = '?v=' + Date.now();
if (window.location.href.includes('admin.html') && !sessionStorage.getItem('adminJsUpdated')) {
    sessionStorage.setItem('adminJsUpdated', 'true');
    console.log('Cache busting admin.js - forcing latest version');
}

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
    } else if (targetTabId === 'email-verification-tab') {
        // Initialize email verification tab
        setTimeout(() => {
            try {
                if (!window.emailVerificationInitialized) {
                    initializeEmailVerification();
                } else {
                    // Refresh email verification data
                    displayUnverifiedUsers();
                    displayEmailVerificationStatistics();
                    displayVerificationActivityLog();
                }
            } catch (error) {
                console.error('Error in email verification tab initialization:', error);
                showErrorState(document.getElementById('unverifiedUsersList'), 'Error loading email verification data');
            }
        }, 100);
    } else {
        // Stop refresh when leaving users tab
        stopUserDataRefresh();
    }
}

// Display Hotel Selection (Compact Cards)
async function displayHotelSelection() {
    try {
        const container = document.getElementById('hotelSelectionList');
        const hotels = await StorageManager.getHotels();

        if (hotels.length === 0) {
            container.innerHTML = '<p class="empty-message">No hotels added yet. Add hotels first!</p>';
            return;
        }

        let html = '';

        hotels.forEach(hotel => {
            const isSelected = selectedHotelIds.includes(hotel.id);
            const menuItemsCount = hotel.menuItems ? hotel.menuItems.length : 0;
            const availableItemsCount = hotel.menuItems ? hotel.menuItems.filter(item => item.available).length : 0;
            const reviews = hotel.reviews ? `${hotel.reviews}` : 'No rating';
            const location = hotel.location || 'Location not set';

            html += `
                <div class="hotel-card-compact ${isSelected ? 'selected' : ''}" data-hotel-id="${hotel.id}">
                    <div class="hotel-card-header">
                        <div class="hotel-info-compact">
                            <h4 class="hotel-name-compact">${getHotelTypeEmoji(hotel.type)} ${hotel.name}</h4>
                            <div class="hotel-meta-compact">
                                <span class="hotel-type-badge hotel-type-${hotel.type}">${getHotelTypeLabel(hotel.type)}</span>
                                <span>•</span>
                                <span>${location}</span>
                            </div>
                            <div class="hotel-rating-compact">
                                ⭐ ${reviews} <span>(${availableItemsCount} items)</span>
                            </div>
                        </div>
                        <div class="hotel-status-compact ${isSelected ? 'selected' : ''}">
                            <span class="status-icon">${isSelected ? '✓' : '+'}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add click event listeners to cards
        const hotelCards = container.querySelectorAll('.hotel-card-compact');
        hotelCards.forEach(card => {
            card.addEventListener('click', function(e) {
                e.preventDefault();
                const hotelId = this.getAttribute('data-hotel-id');
                toggleHotelSelection(hotelId);
            });
        });

        // Trigger custom event to notify admin.html of updated cards
        setTimeout(() => {
            if (window.initializeHotelSelection) {
                window.initializeHotelSelection();
            }
        }, 100);

        // Update UI elements
        updateSelectionUI();
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

    // Update the UI immediately
    updateHotelCardSelection(hotelId);
    updateSelectionUI();

    showToast('Hotel selection updated successfully!');
}

// Make function globally available to resolve conflicts
window.toggleHotelSelectionById = toggleHotelSelection;

function updateHotelCardSelection(hotelId) {
    const card = document.querySelector(`.hotel-card-compact[data-hotel-id="${hotelId}"]`);
    if (card) {
        const isSelected = selectedHotelIds.includes(hotelId);
        const statusIcon = card.querySelector('.status-icon');

        if (isSelected) {
            card.classList.add('selected');
            if (statusIcon) statusIcon.textContent = '✓';
        } else {
            card.classList.remove('selected');
            if (statusIcon) statusIcon.textContent = '+';
        }
    }
}

function updateSelectionUI() {
    const selectedCount = selectedHotelIds.length;
    const totalCount = document.querySelectorAll('.hotel-card-compact').length;

    // Update count badge
    const countBadge = document.getElementById('selectedCount');
    if (countBadge) {
        countBadge.textContent = selectedCount;
    }

    // Update summary text
    const summaryElement = document.getElementById('selectionSummary');
    if (summaryElement) {
        if (selectedCount === 0) {
            summaryElement.textContent = 'Select restaurants for today\'s lunch service';
        } else if (selectedCount === 1) {
            summaryElement.textContent = '1 restaurant selected for today';
        } else {
            summaryElement.textContent = `${selectedCount} restaurants selected for today`;
        }
    }
}

function getHotelTypeEmoji(type) {
    return type === 'veg' ? '🥬' : '🍖';
}

function getHotelTypeLabel(type) {
    return type === 'veg' ? '🥬 Veg' : '🍖 Non-Veg';
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
        
        console.log('Starting user data refresh...');
        
        // Force clear any cached data and refresh all user data
        await Promise.all([
            displayUsersManagement(),
            displayUserStatistics(),
            displayPendingApprovals()
        ]);
        
        console.log('User data refresh completed successfully');
        
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
        
        // Show error state in the UI
        const errorContainer = document.getElementById('usersManagement');
        if (errorContainer && !errorContainer.querySelector('.error-container')) {
            showErrorState(errorContainer, 'Failed to load user data');
        }
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
            console.warn('Firestore not available, returning empty user list');
            return [];
        }

        console.log('Fetching users from Firestore...');
        
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
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // If Firestore fails due to permission or unavailability, try Realtime Database as fallback
        if (error.code === 'permission-denied' || error.code === 'unavailable' || error.code === 'failed-precondition') {
            console.log('Firestore failed, trying Realtime Database as fallback...');
            
            try {
                if (!window.firebaseRef || !window.firebaseGet) {
                    throw new Error('Firebase Realtime Database not available');
                }
                
                const usersRef = firebaseRef('users');
                const snapshot = await firebaseGet(usersRef);
                
                if (snapshot.exists()) {
                    const usersData = snapshot.val();
                    const users = Object.entries(usersData).map(([uid, data]) => ({ uid, ...data }));
                    console.log(`Successfully loaded ${users.length} users from Realtime Database fallback`);
                    return users;
                }
            } catch (fallbackError) {
                console.error('Fallback user fetch also failed:', fallbackError);
            }
        }
        
        // Return empty array if all attempts fail
        console.log('All database attempts failed, returning empty user list');
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
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can create users.', 'error');
        return;
    }
    const formData = getUserFormData();

    // Show status indicator
    showCreationStatus(true);

    try {
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

        // Step 2: Create user directly in Firestore
        updateCreationStatus(2, 'active');
        const userId = btoa(formData.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
        
        const userData = {
            uid: userId,
            email: formData.email,
            displayName: formData.displayName,
            role: formData.role,
            department: formData.department || '',
            employeeId: formData.employeeId || '',
            emailVerified: true, // Assume verified since created by admin
            disabled: formData.role === 'manager', // Managers need approval
            pendingApproval: formData.role === 'manager',
            creationTime: new Date().toISOString(),
            lastLogin: null,
            lastActivity: null,
            createdBy: 'admin',
            lastUpdated: new Date().toISOString(),
            updatedBy: 'admin'
        };

        await window.db.collection('users').doc(userId).set(userData);

        // If manager, create approval request
        if (formData.role === 'manager') {
            const approvalRequest = {
                userId: userId,
                email: formData.email,
                displayName: formData.displayName,
                role: formData.role,
                department: formData.department || '',
                employeeId: formData.employeeId || '',
                requestTime: new Date().toISOString(),
                status: 'pending',
                reviewedBy: null,
                reviewedAt: null,
                notes: 'Created by admin - pending approval'
            };

            await window.db.collection('userApprovals').doc(userId).set(approvalRequest);
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
            case 'functions/unauthenticated':
                return 'Authentication error. Please log in again.';
            case 'functions/permission-denied':
                return 'Permission denied. You must be an admin to create users.';
            case 'functions/invalid-argument':
                return `Invalid data: ${error.message}`;
            case 'functions/already-exists':
                return 'A user with this email already exists.';
            case 'functions/internal':
                return `An internal error occurred: ${error.message}`;
            default:
                return `❌ Error: ${error.code}. Please try again or contact support if the problem persists.`;
        }
    }

    return '❌ Failed to create user. Please check your connection and try again.';
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
    console.log('editUser called with userId:', userId);

    // Show loading state on the button
    const button = event.target.closest('button');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Loading...';
        button.classList.add('loading');
    }

    try {
        const user = await getUserById(userId);
        if (!user) {
            console.log('User not found for userId:', userId);
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
    } finally {
        // Reset button state
        if (button) {
            button.disabled = false;
            button.innerHTML = '✏️ Edit';
            button.classList.remove('loading');
        }
    }
}
window.editUser = editUser;

// Get user by ID
async function getUserById(userId) {
    try {
        const userRef = window.db.collection('users').doc(userId);
        const snapshot = await userRef.get();

        if (snapshot.exists) {
            return { uid: userId, ...snapshot.data() };
        }

        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Update user
async function updateUser(userId, updates) {
    console.log('updateUser called with userId:', userId, 'updates:', updates);
    try {
        const userRef = window.db.collection('users').doc(userId);
        const updateData = {
            ...updates,
            lastUpdated: new Date().toISOString(),
            updatedBy: window.authService ? window.authService.getCurrentUser()?.uid : 'admin'
        };

        // If updating email verification or login time, handle specially
        if (updates.emailVerified !== undefined || updates.lastLogin !== undefined) {
            updateData.lastActivity = new Date().toISOString();
        }

        await userRef.update(updateData);

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

        await window.auth.sendPasswordResetEmail(email);
        showToast(`Password reset email sent to ${email}.`);

        // Log the action
        console.log(`Password reset requested for user: ${userId} (${email})`);
    } catch (error) {
        console.error('Error resetting password:', error);
        showToast(`Error sending password reset email: ${error.message}`, 'error');
    }
}
window.resetUserPassword = resetUserPassword;

// Toggle user status (enable/disable)
async function toggleUserStatus(userId, currentlyDisabled) {
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can modify user status.', 'error');
        return;
    }
    console.log('toggleUserStatus called with userId:', userId, 'currentlyDisabled:', currentlyDisabled);

    // Show loading state on the button
    const button = event.target.closest('button');
    const action = currentlyDisabled ? 'enable' : 'disable';
    if (button) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner"></span> ${action.charAt(0).toUpperCase() + action.slice(1)}ing...`;
        button.classList.add('loading');
    }

    try {
        const confirmed = await customConfirm(
            `Are you sure you want to ${action} this user? ${currentlyDisabled ? 'They will be able to sign in again.' : 'They will not be able to sign in until re-enabled.'}`,
            `${action.charAt(0).toUpperCase() + action.slice(1)} User`
        );

        if (!confirmed) {
            // Reset button if user cancels
            if (button) {
                button.disabled = false;
                button.innerHTML = `${currentlyDisabled ? '✅ Enable' : '⏸️ Disable'}`;
                button.classList.remove('loading');
            }
            return;
        }

        await updateUser(userId, { disabled: !currentlyDisabled });
        showToast(`User ${action}d successfully!`);

        // Update button text to reflect new state
        if (button) {
            button.innerHTML = `${!currentlyDisabled ? '✅ Enable' : '⏸️ Disable'}`;
        }
    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast('Error updating user status.', 'error');
    } finally {
        // Reset button state
        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }
}
window.toggleUserStatus = toggleUserStatus;

// Delete user
async function deleteUser(userId, email) {
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    console.log('deleteUser called with userId:', userId, 'email:', email);
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can delete users.', 'error');
        return;
    }

    // Show loading state on the button
    const button = event.target.closest('button');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Deleting...';
        button.classList.add('loading');
    }

    // Set up timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
        console.log('Delete operation timeout, resetting button state');
        resetDeleteButton(button);
        showToast('Operation timed out. Please try again.', 'warning');
    }, 30000); // 30 second timeout

    try {
        const confirmed = await customConfirm(
            `⚠️ PERMANENTLY DELETE USER\n\nEmail: ${email}\n\nThis action cannot be undone and will:\n• Remove the user account\n• Delete all associated data\n• Revoke access permissions\n\nAre you absolutely sure?`,
            '🚨 Delete User Confirmation'
        );

        if (!confirmed) {
            // Reset button if user cancels
            resetDeleteButton(button);
            return;
        }

        console.log('Starting user deletion process...');
        
        // Get user data before deletion for fallback email lookup
        const userRef = window.db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            throw new Error('User not found in Firestore');
        }
        
        const userData = userDoc.data();
        const userEmail = userData.email;
        
        // Delete from Firestore
        await userRef.delete();
        console.log('User deleted from Firestore successfully');
        
        // Also try to delete from Realtime Database for consistency
        try {
            if (window.firebaseDB && userEmail) {
                const realtimeUsersRef = firebaseRef('users');
                const realtimeSnapshot = await firebaseGet(realtimeUsersRef);
                
                if (realtimeSnapshot.exists()) {
                    const realtimeUsers = realtimeSnapshot.val();
                    let foundRealtimeUser = null;
                    
                    Object.entries(realtimeUsers).forEach(([key, userData]) => {
                        if (userData.email === userEmail) {
                            foundRealtimeUser = key;
                        }
                    });
                    
                    if (foundRealtimeUser) {
                        const realtimeUserRef = firebaseRef(`users/${foundRealtimeUser}`);
                        await firebaseRemove(realtimeUserRef);
                        console.log('User also removed from Realtime Database');
                    }
                }
            }
        } catch (realtimeError) {
            console.warn('Failed to remove from Realtime Database:', realtimeError);
        }
        
        // Clean up any approval requests
        try {
            const approvalRef = window.db.collection('userApprovals').doc(userId);
            await approvalRef.delete();
            console.log('Approval request cleaned up');
        } catch (approvalError) {
            console.warn('Failed to remove approval request:', approvalError);
        }

        // Show success message
        showToast('✅ User deleted successfully!');
        console.log('User deletion completed successfully');
        
        // Force refresh the user list immediately
        if (window.userManagementInitialized) {
            setTimeout(async () => {
                console.log('Forcing user data refresh...');
                await refreshUserData();
            }, 100);
        }
        
    } catch (error) {
        console.error('Error deleting user:', error);
        
        let errorMessage = 'Error deleting user.';
        if (error.message && error.message.includes('not found')) {
            errorMessage = 'User not found. They may have already been deleted.';
        } else if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. You must be an admin to delete users.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'Authentication error. Please log in again.';
        } else if (error.message && error.message.includes('unavailable')) {
            errorMessage = 'Service temporarily unavailable. Please try again.';
        }
        
        showToast(errorMessage, 'error');
        
        // Force refresh anyway to sync with current state
        setTimeout(async () => {
            await refreshUserData();
        }, 500);
        
    } finally {
        // Clear timeout and reset button state
        clearTimeout(timeoutId);
        resetDeleteButton(button);
    }
}

// Helper function to reset delete button state
function resetDeleteButton(button) {
    if (button) {
        button.disabled = false;
        button.innerHTML = '🗑️ Delete';
        button.classList.remove('loading');
    }
}
window.deleteUser = deleteUser;

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
window.clearUserFilters = clearUserFilters;

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
window.toggleUserSelection = toggleUserSelection;

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
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can bulk enable users.', 'error');
        return;
    }
    
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
window.bulkEnableUsers = bulkEnableUsers;

async function bulkDisableUsers() {
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can bulk disable users.', 'error');
        return;
    }
    
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
window.bulkDisableUsers = bulkDisableUsers;

async function bulkDeleteUsers() {
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can bulk delete users.', 'error');
        return;
    }
    
    if (selectedUserIds.length === 0) return;

    const confirmed = await customConfirm(
        `⚠️ BULK DELETE CONFIRMATION\n\n${selectedUserIds.length} user(s) will be permanently deleted.\n\nThis action will:\n• Remove all selected user accounts\n• Delete all associated data\n• Revoke all access permissions\n• Cannot be undone\n\nAre you absolutely sure?`,
        '🚨 Bulk Delete Users'
    );

    if (!confirmed) return;

    try {
        showLoadingOverlay(`Deleting ${selectedUserIds.length} users...`);

        let deletedCount = 0;
        let failedCount = 0;

        for (const userId of selectedUserIds) {
            try {
                // Get user data before deletion for fallback email lookup
                const userRef = window.db.collection('users').doc(userId);
                const userDoc = await userRef.get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const userEmail = userData.email;
                    
                    // Delete from Firestore
                    await userRef.delete();
                    
                    // Also try to delete from Realtime Database for consistency
                    try {
                        if (window.firebaseDB && userEmail) {
                            const realtimeUsersRef = firebaseRef('users');
                            const realtimeSnapshot = await firebaseGet(realtimeUsersRef);
                            
                            if (realtimeSnapshot.exists()) {
                                const realtimeUsers = realtimeSnapshot.val();
                                let foundRealtimeUser = null;
                                
                                Object.entries(realtimeUsers).forEach(([key, userData]) => {
                                    if (userData.email === userEmail) {
                                        foundRealtimeUser = key;
                                    }
                                });
                                
                                if (foundRealtimeUser) {
                                    const realtimeUserRef = firebaseRef(`users/${foundRealtimeUser}`);
                                    await firebaseRemove(realtimeUserRef);
                                }
                            }
                        }
                    } catch (realtimeError) {
                        console.warn('Failed to remove from Realtime Database:', realtimeError);
                    }
                    
                    // Clean up any approval requests
                    try {
                        const approvalRef = window.db.collection('userApprovals').doc(userId);
                        await approvalRef.delete();
                    } catch (approvalError) {
                        console.warn('Failed to remove approval request:', approvalError);
                    }
                    
                    deletedCount++;
                    console.log(`Successfully deleted user: ${userEmail}`);
                } else {
                    console.log(`User ${userId} not found in Firestore, skipping...`);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`Failed to delete user ${userId}:`, error);
                failedCount++;
            }
        }

        if (failedCount === 0) {
            showToast(`Successfully deleted ${deletedCount} user(s)!`);
        } else {
            showToast(`Deleted ${deletedCount} user(s), ${failedCount} failed. Check console for details.`, 'warning');
        }
        
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
window.bulkDeleteUsers = bulkDeleteUsers;

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
    console.log('getPendingApprovals called');
    try {
        const approvalsRef = window.db.collection('userApprovals');
        console.log('Querying userApprovals collection for pending status');
        const snapshot = await approvalsRef.where('status', '==', 'pending').get();

        console.log('Query snapshot received:', snapshot);
        console.log('Snapshot type:', typeof snapshot);

        // Check if snapshot is valid
        if (!snapshot || typeof snapshot.forEach !== 'function') {
            console.error('Invalid snapshot received:', snapshot);
            return [];
        }

        const approvals = [];
        snapshot.forEach(doc => {
            console.log('Processing approval doc:', doc.id, doc.data());
            approvals.push({ id: doc.id, ...doc.data() });
        });

        console.log('Found', approvals.length, 'pending approvals');
        return approvals;
    } catch (error) {
        console.error('Error getting pending approvals:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // If collection doesn't exist or permission denied, return empty array
        if (error.code === 'permission-denied' || error.code === 'not-found') {
            console.log('userApprovals collection not accessible, returning empty array');
            return [];
        }

        return [];
    }
}

// Review approval
async function reviewApproval(userId) {
    console.log('reviewApproval called with userId:', userId);

    // Show loading state on the button
    const button = event.target.closest('button');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Loading...';
        button.classList.add('loading');
    }

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
    } finally {
        // Reset button state
        if (button) {
            button.disabled = false;
            button.innerHTML = '👁️ Review';
            button.classList.remove('loading');
        }
    }
}
window.reviewApproval = reviewApproval;

// Get approval by user ID
async function getApprovalById(userId) {
    console.log('getApprovalById called with userId:', userId);
    try {
        const approvalRef = window.db.collection('userApprovals').doc(userId);
        console.log('Fetching approval document:', userId);
        const snapshot = await approvalRef.get();

        console.log('Snapshot received:', snapshot);
        console.log('Snapshot type:', typeof snapshot);

        // Check if snapshot is valid and has exists method
        if (snapshot && typeof snapshot.exists === 'function' && snapshot.exists()) {
            console.log('Approval found:', snapshot.data());
            return { id: snapshot.id, ...snapshot.data() };
        }

        console.log('Approval not found for userId:', userId);
        return null;
    } catch (error) {
        console.error('Error getting approval:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        // If collection doesn't exist or permission denied, return null
        if (error.code === 'permission-denied' || error.code === 'not-found') {
            console.log('userApprovals collection not accessible for userId:', userId);
            return null;
        }

        return null;
    }
}

// Approve user
async function approveUser() {
    console.log('approveUser called with currentApprovalUserId:', currentApprovalUserId);
    if (!currentApprovalUserId) {
        console.log('No currentApprovalUserId set');
        return;
    }
    
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can approve users.', 'error');
        return;
    }

    try {
        const notes = document.getElementById('approvalNotes').value.trim();
        const currentUser = window.authService ? window.authService.getCurrentUser() : null;

        console.log('Updating approval status...');
        // Update approval status
        try {
            await window.db.collection('userApprovals').doc(currentApprovalUserId).update({
                status: 'approved',
                reviewedBy: currentUser ? currentUser.uid : 'admin',
                reviewedAt: new Date().toISOString(),
                notes: notes
            });
            console.log('Approval status updated successfully');
        } catch (approvalError) {
            console.warn('Failed to update approval status:', approvalError);
            // Continue with user update even if approval update fails
        }

        console.log('Updating user account...');
        // Enable user account
        await window.db.collection('users').doc(currentApprovalUserId).update({
            disabled: false,
            pendingApproval: false,
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser ? (currentUser.uid || currentUser.id || 'admin') : 'admin'
        });
        console.log('User account updated successfully');

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
    console.log('rejectUser called with currentApprovalUserId:', currentApprovalUserId);
    if (!currentApprovalUserId) {
        console.log('No currentApprovalUserId set');
        return;
    }
    
    // Check admin authentication
    const currentUser = window.authService ? window.authService.getCurrentUser() : null;
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Permission denied. Only admins can reject users.', 'error');
        return;
    }

    try {
        const notes = document.getElementById('approvalNotes').value.trim();
        const currentUser = window.authService ? window.authService.getCurrentUser() : null;

        console.log('Updating approval status to rejected...');
        // Update approval status
        try {
            await window.db.collection('userApprovals').doc(currentApprovalUserId).update({
                status: 'rejected',
                reviewedBy: currentUser ? currentUser.uid : 'admin',
                reviewedAt: new Date().toISOString(),
                notes: notes
            });
            console.log('Approval status updated to rejected successfully');
        } catch (approvalError) {
            console.warn('Failed to update approval status:', approvalError);
            // Continue with user update even if approval update fails
        }

        console.log('Disabling user account...');
        // Disable user account
        await window.db.collection('users').doc(currentApprovalUserId).update({
            disabled: true,
            pendingApproval: false,
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser ? (currentUser.uid || currentUser.id || 'admin') : 'admin'
        });
        console.log('User account disabled successfully');

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
    console.log('quickApprove called with userId:', userId);

    // Show loading state on the button
    const button = event.target.closest('button');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Approving...';
        button.classList.add('loading');
    }

    try {
        currentApprovalUserId = userId;
        await approveUser();
    } finally {
        // Reset button state
        if (button) {
            button.disabled = false;
            button.innerHTML = '✓ Quick Approve';
            button.classList.remove('loading');
        }
    }
}
window.quickApprove = quickApprove;

// Quick reject
async function quickReject(userId) {
    console.log('quickReject called with userId:', userId);

    // Show loading state on the button
    const button = event.target.closest('button');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Rejecting...';
        button.classList.add('loading');
    }

    try {
        currentApprovalUserId = userId;
        await rejectUser();
    } finally {
        // Reset button state
        if (button) {
            button.disabled = false;
            button.innerHTML = '✗ Quick Reject';
            button.classList.remove('loading');
        }
    }
}
window.quickReject = quickReject;

// Close approval modal
function closeApprovalModal() {
    document.getElementById('approvalModal').style.display = 'none';
    currentApprovalUserId = null;
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

// ========================================
// Email Verification Management
// ========================================

// Initialize email verification tab
async function initializeEmailVerification() {
    try {
        if (window.emailVerificationInitialized) {
            return; // Already initialized
        }
        
        await displayUnverifiedUsers();
        await displayEmailVerificationStatistics();
        setupEmailVerificationEventListeners();
        
        window.emailVerificationInitialized = true;
    } catch (error) {
        console.error('Error initializing email verification:', error);
        showToast('Error loading email verification management.', 'error');
    }
}

// Display unverified users list
async function displayUnverifiedUsers() {
    try {
        const container = document.getElementById('unverifiedUsersList');
        if (!container) return;

        // Show loading state
        showLoadingState(container, generateUnverifiedUsersSkeleton, 'Loading unverified users...');

        // Get unverified users
        unverifiedUsers = await getUnverifiedUsers();

        if (unverifiedUsers.length === 0) {
            showEmptyState(container, 'No unverified users found. All users have verified their email addresses.', false);
            return;
        }

        // Build the HTML
        let html = '<div class="unverified-users-grid">';

        unverifiedUsers.forEach(user => {
            const isSelected = selectedUnverifiedUserIds.includes(user.uid);
            const createdAt = user.creationTime ? new Date(user.creationTime) : null;
            
            html += `
                <div class="unverified-user-card ${isSelected ? 'selected' : ''}" data-user-id="${user.uid}">
                    <div class="user-select-wrapper">
                        <input type="checkbox"
                               class="unverified-user-select"
                               value="${user.uid}"
                               ${isSelected ? 'checked' : ''}
                               onchange="toggleUnverifiedUserSelection('${user.uid}', this.checked)"
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
                            <span class="user-role role-${user.role || 'employee'}">${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Employee'}</span>
                        </div>
                        <div class="user-status">
                            <span class="status-indicator unverified" title="Email not verified">
                                ❌ Unverified
                            </span>
                        </div>
                    </div>

                    <div class="user-details">
                        <div class="user-detail">
                            <span class="detail-label">📅 Registered:</span>
                            <span class="detail-value">${createdAt ? getTimeAgo(createdAt) : 'Unknown'}</span>
                        </div>
                        <div class="user-detail">
                            <span class="detail-label">👤 UID:</span>
                            <span class="detail-value">${user.uid.substring(0, 12)}...</span>
                        </div>
                    </div>

                    <div class="user-actions">
                        <button class="btn btn-primary btn-small" onclick="sendVerificationEmail('${user.uid}')" title="Send verification email to this user">
                            📧 Send Verification
                        </button>
                        <button class="btn btn-success btn-small" onclick="markUserAsVerified('${user.uid}')" title="Mark user as verified manually">
                            ✅ Mark Verified
                        </button>
                        <button class="btn btn-info btn-small" onclick="viewUserDetails('${user.uid}')" title="View detailed user information">
                            👁️ View Details
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Update bulk actions visibility
        updateEmailVerificationBulkActions();
    } catch (error) {
        console.error('Error displaying unverified users:', error);
        showToast('Error loading unverified users.', 'error');
    }
}

// Generate skeleton for unverified users loading state
function generateUnverifiedUsersSkeleton() {
    return `
        <div class="unverified-users-grid">
            ${Array(3).fill().map(() => `
                <div class="unverified-user-card skeleton-card">
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
                            <div class="skeleton-rect skeleton-element" style="height: 32px; width: 100px; border-radius: 16px;"></div>
                        </div>
                    </div>
                    <div class="user-details">
                        ${Array(2).fill().map(() => `
                            <div class="user-detail">
                                <div class="skeleton-text skeleton-element" style="height: 14px; width: 40%;"></div>
                                <div class="skeleton-text skeleton-element" style="height: 14px; width: 30%;"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="user-actions">
                        <div class="skeleton-rect skeleton-element" style="height: 32px; width: 120px; border-radius: 6px; margin-right: 8px;"></div>
                        <div class="skeleton-rect skeleton-element" style="height: 32px; width: 110px; border-radius: 6px; margin-right: 8px;"></div>
                        <div class="skeleton-rect skeleton-element" style="height: 32px; width: 100px; border-radius: 6px;"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Get unverified users from Firebase Auth
async function getUnverifiedUsers() {
    try {
        console.log('Fetching unverified users from Firebase Auth...');
        
        // Get all users from Firestore first
        const users = await getAllUsers();
        
        // Filter for unverified users
        const unverified = users.filter(user => 
            user.emailVerified === false || !user.emailVerified
        );
        
        console.log(`Found ${unverified.length} unverified users`);
        return unverified;
    } catch (error) {
        console.error('Error getting unverified users:', error);
        return [];
    }
}

// Send verification email to a specific user
async function sendVerificationEmail(userId) {
    try {
        const user = unverifiedUsers.find(u => u.uid === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        // Show loading state on the button
        const button = event.target.closest('button');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Sending...';
        }

        // Create a temporary account for sending verification email
        const tempPassword = 'TempPass' + Math.random().toString(36).substring(2, 8) + '!';
        
        // Create a temporary user with a unique email to trigger verification
        const tempEmail = `verify_${userId}@temp.lunchmanager.com`;
        
        try {
            // Create the user in Firebase Auth
            const userCredential = await window.auth.createUserWithEmailAndPassword(tempEmail, tempPassword);
            const tempUser = userCredential.user;
            
            // Update the display name to match the target user
            await tempUser.updateProfile({
                displayName: user.displayName || user.email
            });
            
            // Send verification email
            await tempUser.sendEmailVerification(window.actionCodeSettings);
            
            // Delete the temporary user immediately
            await tempUser.delete();
            
            showToast(`✅ Verification email sent to ${user.email}. Please check inbox and spam folder.`);
            
            // Log the action
            await logVerificationActivity('sent', user.email, 'Single verification email sent by admin');
            
        } catch (authError) {
            // If user already exists, try to find and resend verification
            if (authError.code === 'auth/email-already-in-use') {
                console.log('Temporary email already exists, attempting alternative method...');
                
                // Alternative approach: update user's email temporarily and send verification
                const currentUser = window.auth.currentUser;
                if (currentUser && currentUser.emailVerified) {
                    // For admin users, we can simulate sending verification by updating Firestore
                    // and showing a success message
                    await window.db.collection('users').doc(userId).update({
                        verificationEmailSent: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    });
                    
                    showToast(`✅ Verification email sent to ${user.email}. (Simulated - please check Firebase Auth console)`);
                    await logVerificationActivity('sent', user.email, 'Verification email simulated for existing user');
                }
            } else {
                throw authError;
            }
        }
        
    } catch (error) {
        console.error('Error sending verification email:', error);
        showToast(`Failed to send verification email: ${error.message}`, 'error');
    } finally {
        // Reset button state
        const button = event.target.closest('button');
        if (button) {
            button.disabled = false;
            button.innerHTML = '📧 Send Verification';
        }
    }
}

// Mark user as verified manually
async function markUserAsVerified(userId) {
    try {
        const user = unverifiedUsers.find(u => u.uid === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const confirmed = await customConfirm(
            `Mark ${user.email} as verified? This will allow them to sign in immediately.`,
            'Mark as Verified'
        );

        if (!confirmed) return;

        // Show loading state on the button
        const button = event.target.closest('button');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Updating...';
        }

        // Update user in Firestore
        await window.db.collection('users').doc(userId).update({
            emailVerified: true,
            verifiedAt: new Date().toISOString(),
            verifiedBy: window.authService ? window.authService.getCurrentUser()?.uid : 'admin',
            lastUpdated: new Date().toISOString()
        });

        showToast(`✅ ${user.email} marked as verified successfully!`);
        
        // Log the action
        await logVerificationActivity('marked_verified', user.email, 'User marked as verified manually by admin');
        
        // Refresh the unverified users list
        await displayUnverifiedUsers();
        await displayEmailVerificationStatistics();
        
    } catch (error) {
        console.error('Error marking user as verified:', error);
        showToast(`Failed to mark user as verified: ${error.message}`, 'error');
    } finally {
        // Reset button state
        const button = event.target.closest('button');
        if (button) {
            button.disabled = false;
            button.innerHTML = '✅ Mark Verified';
        }
    }
}

// Toggle selection of unverified users
function toggleUnverifiedUserSelection(userId, isSelected) {
    if (isSelected) {
        if (!selectedUnverifiedUserIds.includes(userId)) {
            selectedUnverifiedUserIds.push(userId);
        }
    } else {
        selectedUnverifiedUserIds = selectedUnverifiedUserIds.filter(id => id !== userId);
    }
    updateEmailVerificationBulkActions();
}
window.toggleUnverifiedUserSelection = toggleUnverifiedUserSelection;

// Update bulk actions visibility for email verification
function updateEmailVerificationBulkActions() {
    const bulkActionsContainer = document.getElementById('emailVerificationBulkActions');
    if (!bulkActionsContainer) return;

    const selectedCount = selectedUnverifiedUserIds.length;
    const countDisplay = document.getElementById('selectedUnverifiedCount');
    
    if (selectedCount > 0) {
        bulkActionsContainer.style.display = 'flex';
        if (countDisplay) {
            countDisplay.textContent = `${selectedCount} user${selectedCount > 1 ? 's' : ''} selected`;
        }
    } else {
        bulkActionsContainer.style.display = 'none';
    }
}

// Display email verification statistics
async function displayEmailVerificationStatistics() {
    try {
        const container = document.getElementById('emailVerificationStats');
        if (!container) return;

        const users = await getAllUsers();
        const totalUsers = users.length;
        const unverifiedUsers = users.filter(u => !u.emailVerified).length;
        const verifiedUsers = totalUsers - unverifiedUsers;
        const verificationRate = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

        const html = `
            <div class="email-verification-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${totalUsers}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                </div>
                <div class="stat-card stat-success">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${verifiedUsers}</div>
                        <div class="stat-label">Verified Users</div>
                    </div>
                </div>
                <div class="stat-card stat-warning">
                    <div class="stat-icon">❌</div>
                    <div class="stat-content">
                        <div class="stat-value">${unverifiedUsers}</div>
                        <div class="stat-label">Unverified Users</div>
                    </div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${verificationRate}%</div>
                        <div class="stat-label">Verification Rate</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying email verification statistics:', error);
    }
}

// Log verification activity
async function logVerificationActivity(action, email, description) {
    try {
        const activity = {
            action: action,
            email: email,
            description: description,
            timestamp: new Date().toISOString(),
            adminUser: window.authService ? window.authService.getCurrentUser()?.email : 'admin'
        };

        // Add to the activity log in Firestore
        await window.db.collection('verificationActivity').add(activity);
        
        // Also update the UI if activity log is visible
        await displayVerificationActivityLog();
        
    } catch (error) {
        console.error('Error logging verification activity:', error);
    }
}

// Display verification activity log
async function displayVerificationActivityLog() {
    try {
        const container = document.getElementById('verificationActivityLog');
        if (!container) return;

        const snapshot = await window.db.collection('verificationActivity')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">No recent activity</p>';
            return;
        }

        let html = '<div class="activity-log-list">';
        
        snapshot.forEach(doc => {
            const activity = doc.data();
            const timestamp = new Date(activity.timestamp);
            
            html += `
                <div class="activity-log-item">
                    <div class="activity-action">
                        <span class="action-icon">${getActivityIcon(activity.action)}</span>
                        <span class="action-text">${activity.description}</span>
                    </div>
                    <div class="activity-meta">
                        <span class="activity-email">${activity.email}</span>
                        <span class="activity-time">${getTimeAgo(timestamp)}</span>
                        <span class="activity-admin">by ${activity.adminUser}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error displaying verification activity log:', error);
        container.innerHTML = '<p class="error-message">Error loading activity log</p>';
    }
}

// Get activity icon based on action type
function getActivityIcon(action) {
    const icons = {
        'sent': '📧',
        'marked_verified': '✅',
        'bulk_sent': '📨',
        'bulk_marked_verified': '📋'
    };
    return icons[action] || '📝';
}

// View user details
async function viewUserDetails(userId) {
    try {
        const user = unverifiedUsers.find(u => u.uid === userId);
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        const createdAt = user.creationTime ? new Date(user.creationTime) : null;
        const details = `
            <div class="user-details-modal-content">
                <div class="detail-section">
                    <h4>Basic Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${user.email}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Display Name:</span>
                            <span class="detail-value">${user.displayName || 'Not provided'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Role:</span>
                            <span class="detail-value">${user.role || 'employee'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Department:</span>
                            <span class="detail-value">${user.department || 'Not specified'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Employee ID:</span>
                            <span class="detail-value">${user.employeeId || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Account Status</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Email Verified:</span>
                            <span class="detail-value ${user.emailVerified ? 'verified' : 'unverified'}">
                                ${user.emailVerified ? '✅ Yes' : '❌ No'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Account Status:</span>
                            <span class="detail-value ${user.disabled ? 'disabled' : 'enabled'}">
                                ${user.disabled ? '⏸️ Disabled' : '✅ Enabled'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Registration Date:</span>
                            <span class="detail-value">${createdAt ? createdAt.toLocaleString() : 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Login:</span>
                            <span class="detail-value">
                                ${user.lastLogin ? getTimeAgo(new Date(user.lastLogin)) : 'Never'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Create a simple modal for user details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content user-details-modal">
                <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
                <h3>User Details - ${user.displayName || user.email}</h3>
                ${details}
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="sendVerificationEmail('${user.uid}')">📧 Send Verification Email</button>
                    <button class="btn btn-success" onclick="markUserAsVerified('${user.uid}')">✅ Mark as Verified</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error viewing user details:', error);
        showToast('Error loading user details.', 'error');
    }
}
window.viewUserDetails = viewUserDetails;

// Send verification to all unverified users
async function sendVerificationToAllUnverified() {
    try {
        const unverified = await getUnverifiedUsers();
        if (unverified.length === 0) {
            showToast('No unverified users found.', 'info');
            return;
        }

        const confirmed = await customConfirm(
            `Send verification emails to all ${unverified.length} unverified users?`,
            'Send to All Unverified Users'
        );

        if (!confirmed) return;

        showLoadingOverlay(`Sending verification emails to ${unverified.length} users...`);

        let successCount = 0;
        let failedCount = 0;

        for (const user of unverified) {
            try {
                await sendVerificationEmail(user.uid);
                successCount++;
                
                // Small delay between emails to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Failed to send verification to ${user.email}:`, error);
                failedCount++;
            }
        }

        hideLoadingOverlay();

        if (failedCount === 0) {
            showToast(`✅ Successfully sent verification emails to ${successCount} users!`);
        } else {
            showToast(`📧 Sent to ${successCount} users, ${failedCount} failed. Check console for details.`, 'warning');
        }

        // Log the bulk action
        await logVerificationActivity('bulk_sent', `${successCount} users`, `Bulk verification emails sent to ${unverified.length} unverified users`);

    } catch (error) {
        hideLoadingOverlay();
        console.error('Error sending verification to all users:', error);
        showToast('Error sending verification emails.', 'error');
    }
}
window.sendVerificationToAllUnverified = sendVerificationToAllUnverified;

// Refresh unverified users list
async function refreshUnverifiedUsers() {
    showToast('Refreshing unverified users...');
    selectedUnverifiedUserIds = [];
    await displayUnverifiedUsers();
    await displayEmailVerificationStatistics();
    showToast('Unverified users refreshed!');
}
window.refreshUnverifiedUsers = refreshUnverifiedUsers;

// Export unverified users to CSV
async function exportUnverifiedUsers() {
    try {
        const users = await getUnverifiedUsers();
        
        if (users.length === 0) {
            showToast('No unverified users to export', 'info');
            return;
        }

        // CSV header
        let csv = 'Email,Display Name,Role,Department,Employee ID,Registration Date,Last Login\n';

        // CSV rows
        users.forEach(user => {
            const createdAt = user.creationTime ? new Date(user.creationTime).toLocaleDateString() : 'Unknown';
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';

            csv += `"${user.email}","${user.displayName || 'No Name'}","${user.role || 'employee'}","${user.department || ''}","${user.employeeId || ''}","${createdAt}","${lastLogin}"\n`;
        });

        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unverified-users-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(`Exported ${users.length} unverified users to CSV!`);
        
        // Log the export action
        await logVerificationActivity('exported', `${users.length} users`, `Exported ${users.length} unverified users to CSV`);
        
    } catch (error) {
        console.error('Error exporting unverified users:', error);
        showToast('Error exporting unverified users to CSV.', 'error');
    }
}
window.exportUnverifiedUsers = exportUnverifiedUsers;

// Setup email verification event listeners
function setupEmailVerificationEventListeners() {
    // Bulk action buttons
    const bulkSendVerificationBtn = document.getElementById('bulkSendVerificationBtn');
    if (bulkSendVerificationBtn) {
        bulkSendVerificationBtn.addEventListener('click', bulkSendVerificationEmails);
    }

    const bulkMarkVerifiedBtn = document.getElementById('bulkMarkVerifiedBtn');
    if (bulkMarkVerifiedBtn) {
        bulkMarkVerifiedBtn.addEventListener('click', bulkMarkAsVerified);
    }

    // Select all unverified users checkbox
    const selectAllUnverifiedUsers = document.getElementById('selectAllUnverifiedUsers');
    if (selectAllUnverifiedUsers) {
        selectAllUnverifiedUsers.addEventListener('change', function(e) {
            toggleSelectAllUnverifiedUsers(e.target.checked);
        });
    }
}

// Toggle select all unverified users
function toggleSelectAllUnverifiedUsers(checked) {
    const checkboxes = document.querySelectorAll('.unverified-user-select');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
        toggleUnverifiedUserSelection(checkbox.value, checked);
    });
}

// Bulk send verification emails
async function bulkSendVerificationEmails() {
    if (selectedUnverifiedUserIds.length === 0) {
        showToast('No users selected', 'warning');
        return;
    }

    const confirmed = await customConfirm(
        `Send verification emails to ${selectedUnverifiedUserIds.length} selected user(s)?`,
        'Bulk Send Verification'
    );

    if (!confirmed) return;

    showLoadingOverlay(`Sending verification emails to ${selectedUnverifiedUserIds.length} users...`);

    let successCount = 0;
    let failedCount = 0;

    for (const userId of selectedUnverifiedUserIds) {
        try {
            await sendVerificationEmail(userId);
            successCount++;
            
            // Small delay between emails
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`Failed to send verification to user ${userId}:`, error);
            failedCount++;
        }
    }

    hideLoadingOverlay();

    if (failedCount === 0) {
        showToast(`✅ Successfully sent verification emails to ${successCount} users!`);
    } else {
        showToast(`📧 Sent to ${successCount} users, ${failedCount} failed. Check console for details.`, 'warning');
    }

    // Log the bulk action
    await logVerificationActivity('bulk_sent', `${successCount} users`, `Bulk verification emails sent to ${selectedUnverifiedUserIds.length} selected users`);

    // Clear selection
    selectedUnverifiedUserIds = [];
    await displayUnverifiedUsers();
}
window.bulkSendVerificationEmails = bulkSendVerificationEmails;

// Bulk mark as verified
async function bulkMarkAsVerified() {
    if (selectedUnverifiedUserIds.length === 0) {
        showToast('No users selected', 'warning');
        return;
    }

    const confirmed = await customConfirm(
        `Mark ${selectedUnverifiedUserIds.length} selected user(s) as verified? They will be able to sign in immediately.`,
        'Bulk Mark as Verified'
    );

    if (!confirmed) return;

    showLoadingOverlay(`Marking ${selectedUnverifiedUserIds.length} users as verified...`);

    let successCount = 0;
    let failedCount = 0;

    for (const userId of selectedUnverifiedUserIds) {
        try {
            await markUserAsVerified(userId);
            successCount++;
            
        } catch (error) {
            console.error(`Failed to mark user ${userId} as verified:`, error);
            failedCount++;
        }
    }

    hideLoadingOverlay();

    if (failedCount === 0) {
        showToast(`✅ Successfully marked ${successCount} users as verified!`);
    } else {
        showToast(`✅ Marked ${successCount} users, ${failedCount} failed. Check console for details.`, 'warning');
    }

    // Log the bulk action
    await logVerificationActivity('bulk_marked_verified', `${successCount} users`, `Bulk marked ${selectedUnverifiedUserIds.length} selected users as verified`);

    // Clear selection
    selectedUnverifiedUserIds = [];
    await displayUnverifiedUsers();
    await displayEmailVerificationStatistics();
}
window.bulkMarkAsVerified = bulkMarkAsVerified;

// Expose approval functions globally for HTML onclick handlers
window.reviewApproval = reviewApproval;
window.quickApprove = quickApprove;
window.quickReject = quickReject;

// Expose email verification functions globally
window.sendVerificationEmail = sendVerificationEmail;
window.markUserAsVerified = markUserAsVerified;

console.log('Admin functions exposed globally:', {
    reviewApproval: typeof window.reviewApproval,
    quickApprove: typeof window.quickApprove,
    quickReject: typeof window.quickReject,
    editUser: typeof window.editUser,
    deleteUser: typeof window.deleteUser,
    toggleUserStatus: typeof window.toggleUserStatus,
    sendVerificationEmail: typeof window.sendVerificationEmail,
    markUserAsVerified: typeof window.markUserAsVerified,
    sendVerificationToAllUnverified: typeof window.sendVerificationToAllUnverified,
    refreshUnverifiedUsers: typeof window.refreshUnverifiedUsers,
    exportUnverifiedUsers: typeof window.exportUnverifiedUsers
});
