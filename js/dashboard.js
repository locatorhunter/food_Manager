// ========================================
// Dashboard Page Functionality
// ========================================

let currentOrders = [];
let filteredOrders = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    // Check if we're on the dashboard page
    if (!document.getElementById('dateFilter')) return;

    await loadOrders();
    await populateHotelFilter();
    await setupControls();
    displayOrders();
    await displayOrderSummary();
    await displayDistributionChecklist();
    await displayPopularItems();

    window.addEventListener('orderAdded', refreshDashboard);
    window.addEventListener('orderDeleted', refreshDashboard);
    window.addEventListener('orderStatusUpdated', async () => {
        await loadOrders();
        displayOrders();
        await displayOrderSummary();
    });
}

async function loadOrders() {
    const dateFilterElement = document.getElementById('dateFilter');
    if (!dateFilterElement) return; // Not on dashboard page

    const dateFilter = dateFilterElement.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        switch(dateFilter) {
            case 'today':
                currentOrders = await StorageManager.getTodaysOrders();
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const allOrdersYesterday = await StorageManager.getOrders();
                currentOrders = allOrdersYesterday.filter(order => {
                    const orderDate = new Date(order.timestamp);
                    orderDate.setHours(0, 0, 0, 0);
                    return orderDate.getTime() === yesterday.getTime();
                });
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                const allOrdersWeek = await StorageManager.getOrders();
                currentOrders = allOrdersWeek.filter(order =>
                    new Date(order.timestamp) >= weekAgo
                );
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                const allOrdersMonth = await StorageManager.getOrders();
                currentOrders = allOrdersMonth.filter(order =>
                    new Date(order.timestamp) >= monthAgo
                );
                break;
            case 'all':
                currentOrders = await StorageManager.getOrders();
                break;
            default:
                currentOrders = await StorageManager.getTodaysOrders();
        }

        filteredOrders = [...currentOrders];
        applyFilters();
    } catch (error) {
        console.error('Error loading orders:', error);
        currentOrders = [];
        filteredOrders = [];
    }
}

async function populateHotelFilter() {
    const hotelFilter = document.getElementById('hotelFilter');
    if (!hotelFilter) return; // Not on dashboard page

    try {
        const hotels = await StorageManager.getHotels();
        let options = '<option value="all">All Hotels</option>';
        if (hotels && Array.isArray(hotels)) {
            hotels.forEach(hotel => {
                options += `<option value="${hotel.name}">${hotel.name}</option>`;
            });
        }
        hotelFilter.innerHTML = options;
    } catch (error) {
        console.error('Error populating hotel filter:', error);
    }
}

async function setupControls() {
    // Date filter with custom range
    const dateFilterElement = document.getElementById('dateFilter');
    if (!dateFilterElement) return; // Not on dashboard page

    dateFilterElement.addEventListener('change', async (e) => {
        const customGroup = document.getElementById('customDateGroup');
        if (e.target.value === 'custom') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
            await loadOrders();
            displayOrders();
            await displayPopularItems();
        }
    });

    // Custom date inputs
    document.getElementById('startDate').addEventListener('change', handleCustomDate);
    document.getElementById('endDate').addEventListener('change', handleCustomDate);

    document.getElementById('hotelFilter').addEventListener('change', applyFilters);
    document.getElementById('searchOrders').addEventListener('input', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    document.getElementById('groupBy').addEventListener('change', displayOrders);

    document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
    document.getElementById('refreshSummaryBtn').addEventListener('click', async () => {
        await displayOrderSummary();
        showToast('Order summary refreshed!');
    });
    document.getElementById('printSummaryBtn').addEventListener('click', printOrderSummary);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('downloadSummaryPDFBtn').addEventListener('click', downloadSummaryPDF);
    document.getElementById('downloadOrdersPDFBtn').addEventListener('click', downloadOrdersPDF);

    // Checklist controls
    document.getElementById('refreshChecklistBtn').addEventListener('click', async () => {
        await displayDistributionChecklist();
        showToast('Distribution checklist refreshed!');
    });
    document.getElementById('printChecklistBtn').addEventListener('click', printDistributionChecklist);
    document.getElementById('downloadChecklistPDFBtn').addEventListener('click', downloadChecklistPDF);
}

function applyFilters() {
    const hotelFilter = document.getElementById('hotelFilter').value;
    const searchTerm = document.getElementById('searchOrders').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;
    
    // Filter by hotel
    filteredOrders = currentOrders.filter(order => {
        if (hotelFilter !== 'all' && order.hotelName !== hotelFilter) {
            return false;
        }
        return true;
    });
    
    // Filter by search term
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(order => 
            order.employeeName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Sort orders
    filteredOrders.sort((a, b) => {
        switch(sortBy) {
            case 'time-desc':
                return new Date(b.timestamp) - new Date(a.timestamp);
            case 'time-asc':
                return new Date(a.timestamp) - new Date(b.timestamp);
            case 'name-asc':
                return a.employeeName.localeCompare(b.employeeName);
            case 'name-desc':
                return b.employeeName.localeCompare(a.employeeName);
            case 'amount-desc':
                return b.total - a.total;
            case 'amount-asc':
                return a.total - b.total;
            default:
                return 0;
        }
    });
    
    displayOrders();
}


function calculateStatistics(orders) {
    const totalOrders = orders.length;
    let totalRevenue = 0;
    let totalItems = 0;
    const uniqueEmployees = new Set();
    
    orders.forEach(order => {
        totalRevenue += order.total;
        totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
        uniqueEmployees.add(order.employeeName);
    });
    
    return {
        totalOrders,
        totalRevenue,
        totalItems,
        uniqueEmployees: uniqueEmployees.size
    };
}

function displayOrders() {
    const container = document.getElementById('ordersTable');
    const groupBy = document.getElementById('groupBy').value;
    
    if (filteredOrders.length === 0) {
        container.innerHTML = '<p class="empty-message">No orders found</p>';
        return;
    }
    
    if (groupBy === 'none') {
        displayOrdersTable(filteredOrders, container);
    } else {
        displayGroupedOrders(filteredOrders, groupBy, container);
    }
}

function displayOrdersTable(orders, container) {
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Employee</th>
                    <th>User Email</th>
                    <th>Hotel</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        const itemsList = order.items.map(item =>
            `${item.name} (${item.quantity})`
        ).join(', ');

        const completedClass = order.completed ? 'completed' : '';
        const checkedAttr = order.completed ? 'checked' : '';
        const isGroupOrder = order.isGroupOrder;
        const groupOrderBadge = isGroupOrder ? '<span class="group-order-badge">👥 Group</span>' : '';

        html += `
            <tr class="${completedClass} ${isGroupOrder ? 'group-order-row' : ''}">
                <td>
                    <input type="checkbox"
                           ${checkedAttr}
                           onchange="toggleOrderStatus('${order.id}')"
                           class="order-checkbox">
                    ${groupOrderBadge}
                </td>
                <td>${formatDate(order.timestamp)}</td>
                <td>
                    ${order.employeeName}
                    ${isGroupOrder ? `<br><small style="color: var(--text-secondary);">+ ${order.participants.length - 1} others</small>` : ''}
                </td>
                <td>
                    ${order.userEmail ? order.userEmail : '<span style="color: var(--text-secondary);">N/A</span>'}
                </td>
                <td>${order.hotelName}</td>
                <td>${itemsList}</td>
                <td><strong>${formatCurrency(order.total)}</strong></td>
                <td>
                    <button class="btn btn-info btn-small" onclick="showGroupOrderDetails('${order.id}')" title="View Details">
                        👁️
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteOrderFromDashboard('${order.id}')">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayGroupedOrders(orders, groupBy, container) {
    const grouped = {};

    if (groupBy === 'item') {
        // Group by food item - collect all unique items and their orders
        const itemOrders = {};

        orders.forEach(order => {
            order.items.forEach(item => {
                const itemName = item.name;
                if (!itemOrders[itemName]) {
                    itemOrders[itemName] = [];
                }
                // Add the order to this item's group (avoid duplicates)
                if (!itemOrders[itemName].find(o => o.id === order.id)) {
                    itemOrders[itemName].push(order);
                }
            });
        });

        // Convert to grouped format
        Object.keys(itemOrders).forEach(itemName => {
            grouped[itemName] = itemOrders[itemName];
        });
    } else {
        // Original grouping logic for hotel, employee, date
        orders.forEach(order => {
            let key;
            switch(groupBy) {
                case 'hotel':
                    key = order.hotelName;
                    break;
                case 'employee':
                    key = order.employeeName;
                    break;
                case 'date':
                    key = formatDateOnly(order.timestamp);
                    break;
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(order);
        });
    }
    
    let html = '';
    
    Object.entries(grouped).forEach(([groupName, groupOrders]) => {
        const groupTotal = groupOrders.reduce((sum, order) => sum + order.total, 0);
        const groupCount = groupOrders.length;
        
        html += `
            <div class="order-group">
                <div class="group-header">
                    <h3>${groupName}</h3>
                    <div class="group-stats">
                        <span class="group-count">${groupCount} orders</span>
                        <span class="group-total">${formatCurrency(groupTotal)}</span>
                    </div>
                </div>
                <div class="group-content">
        `;
        
        html += `<table>
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Employee</th>
                    <th>User Email</th>
                    <th>Hotel</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>`;

        groupOrders.forEach(order => {
            const itemsList = order.items.map(item =>
                `${item.name} (${item.quantity})`
            ).join(', ');

            const completedClass = order.completed ? 'completed' : '';
            const checkedAttr = order.completed ? 'checked' : '';
            const isGroupOrder = order.isGroupOrder;
            const groupOrderBadge = isGroupOrder ? '<span class="group-order-badge">👥 Group</span>' : '';
    
            html += `
                <tr class="${completedClass} ${isGroupOrder ? 'group-order-row' : ''}">
                    <td>
                        <input type="checkbox"
                               ${checkedAttr}
                               onchange="toggleOrderStatus('${order.id}')"
                               class="order-checkbox">
                        ${groupOrderBadge}
                    </td>
                    <td>${formatDate(order.timestamp)}</td>
                    <td>
                        ${order.employeeName}
                        ${isGroupOrder ? `<br><small style="color: var(--text-secondary);">+ ${order.participants.length - 1} others</small>` : ''}
                    </td>
                    <td>
                        ${order.userEmail ? order.userEmail : '<span style="color: var(--text-secondary);">N/A</span>'}
                    </td>
                    <td>${order.hotelName}</td>
                    <td>${itemsList}</td>
                    <td><strong>${formatCurrency(order.total)}</strong></td>
                    <td>
                        <button class="btn btn-info btn-small" onclick="showGroupOrderDetails('${order.id}')" title="View Details">
                            👁️
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteOrderFromDashboard('${order.id}')">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div></div>';
    });

    container.innerHTML = html;
}

async function displayPopularItems() {
    const container = document.getElementById('popularItems');
    if (!container) return; // Not on page with popular items

    const itemCounts = {};
    const itemDetails = {};

    try {
        // Get details from menu items first
        const hotels = await StorageManager.getHotels();
        if (hotels && Array.isArray(hotels)) {
            hotels.forEach(hotel => {
                if (hotel.menuItems) {
                    hotel.menuItems.forEach(item => {
                        itemDetails[item.name] = {
                            images: item.images || [],
                            price: item.price,
                            hotel: hotel.name
                        };
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error fetching hotels for popular items:', error);
        container.innerHTML = '<p class="empty-message">Error loading popular items</p>';
        return;
    }

    // Use all orders for popular items, not just filtered ones
    try {
        const allOrders = await StorageManager.getOrders();
        if (allOrders && Array.isArray(allOrders)) {
            allOrders.forEach(order => {
                if (order.items) {
                    order.items.forEach(item => {
                        if (!itemCounts[item.name]) {
                            itemCounts[item.name] = 0;
                        }
                        itemCounts[item.name] += item.quantity;
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error fetching orders for popular items:', error);
    }

    const popularItems = Object.entries(itemCounts)
        .map(([name, count]) => ({
            name,
            count,
            ...itemDetails[name]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12); // Show more items in grid

    if (popularItems.length === 0) {
        container.innerHTML = '<p class="empty-message">No items ordered</p>';
        return;
    }

    let html = '';
    popularItems.forEach((item, index) => {
        const hasImages = item.images && item.images.length > 0;
        const mainImage = hasImages ? item.images[0] : null;

        html += `
            <div class="popular-item-card" onclick="scrollToMenu()">
                <div class="popular-item-image">
                    ${mainImage ? `<img src="${mainImage}" alt="${item.name}">` : '<div class="no-image">🍽️</div>'}
                </div>
                <div class="popular-item-info">
                    <h4>${item.name}</h4>
                    <div class="popular-item-details">
                        <span class="popular-item-hotel">🏨 ${item.hotel}</span>
                        <span class="popular-item-price">${formatCurrency(item.price)}</span>
                    </div>
                    <div class="popular-item-count">${item.count} orders</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}


async function toggleOrderStatus(orderId) {
    try {
        const orders = await StorageManager.getOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            const newStatus = !order.completed;
            StorageManager.updateOrderStatus(orderId, newStatus);
            showToast(`Order marked as ${newStatus ? 'completed' : 'pending'}!`);
            // Reload orders to reflect the status change
            await loadOrders();
            displayOrders();
        }
    } catch (error) {
        console.error('Error toggling order status:', error);
    }
}

async function deleteOrderFromDashboard(orderId) {
    const confirmed = await customConfirm('Delete this order?', 'Confirm Delete');
    if (confirmed) {
        StorageManager.deleteOrder(orderId);
        showToast('Order deleted!');
    }
}

async function displayOrderSummary() {
    const container = document.getElementById('orderSummary');
    if (!container) return; // Not on page with order summary

    try {
        const todaysOrders = await StorageManager.getTodaysOrders();
        const orders = todaysOrders.filter(order => !order.completed);

        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-message">No pending orders to summarize</p>';
            return;
        }

        // Group orders by hotel and aggregate item quantities
        const hotelSummaries = {};

        orders.forEach(order => {
            if (!hotelSummaries[order.hotelName]) {
                hotelSummaries[order.hotelName] = {};
            }

            order.items.forEach(item => {
                if (!hotelSummaries[order.hotelName][item.name]) {
                    hotelSummaries[order.hotelName][item.name] = {
                        quantity: 0,
                        price: item.price
                    };
                }
                hotelSummaries[order.hotelName][item.name].quantity += item.quantity;
            });
        });

        const hotels = await StorageManager.getHotels();
        let html = '';

        Object.entries(hotelSummaries).forEach(([hotelName, items]) => {
            const itemEntries = Object.entries(items).sort(([,a], [,b]) => b.quantity - a.quantity); // Sort by quantity descending
            const totalItems = itemEntries.reduce((sum, [, itemData]) => sum + itemData.quantity, 0);
            const totalValue = itemEntries.reduce((sum, [, itemData]) => sum + (itemData.quantity * itemData.price), 0);

            const hotel = hotels.find(h => h.name === hotelName);
            const typeEmoji = hotel ? getHotelTypeEmoji(hotel.type) : '🏨';

            html += `<div class="hotel-order-summary">
                <h3>${typeEmoji} ${hotelName}</h3>
                <div class="summary-stats">
                    <span class="stat-badge">${totalItems} items</span>
                    <span class="stat-badge">${formatCurrency(totalValue)}</span>
                </div>
                <div class="orders-table-container">
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th style="width: 60px;">S.No</th>
                                <th>Item Name</th>
                                <th style="width: 100px;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>`;

            itemEntries.forEach(([itemName, itemData], index) => {
                html += `<tr>
                    <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                    <td>${itemName}</td>
                    <td style="text-align: center; font-weight: 600;">${itemData.quantity}</td>
                </tr>`;
            });

            html += `</tbody>
                        <tfoot>
                            <tr style="background: var(--bg-tertiary);">
                                <td colspan="2" style="text-align: right; font-weight: 700;">Total Items:</td>
                                <td style="text-align: center; font-weight: 700; color: var(--primary-color);">${totalItems}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying order summary:', error);
        container.innerHTML = '<p class="empty-message">Error loading order summary</p>';
    }
}

async function displayDistributionChecklist() {
    const container = document.getElementById('distributionChecklist');
    if (!container) return; // Not on page with checklist

    try {
        const todaysOrders = await StorageManager.getTodaysOrders();
        const orders = todaysOrders.filter(order => !order.completed);

        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-message">No pending orders to distribute</p>';
            return;
        }

        // Group orders by employee and collect their items
        const employeeOrders = {};

        orders.forEach(order => {
            const employeeKey = order.isGroupOrder ? `group_${order.id}` : order.employeeName;

            if (!employeeOrders[employeeKey]) {
                employeeOrders[employeeKey] = {
                    employeeName: order.employeeName,
                    userEmail: order.userEmail,
                    hotelName: order.hotelName,
                    items: [],
                    total: 0,
                    orderTime: order.timestamp,
                    isGroupOrder: order.isGroupOrder,
                    participants: order.participants || []
                };
            }

            // Add items to employee's order
            order.items.forEach(item => {
                employeeOrders[employeeKey].items.push({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    hotel: order.hotelName
                });
            });

            employeeOrders[employeeKey].total += order.total;
        });

        // Sort employees alphabetically (groups at the end)
        const sortedEmployees = Object.keys(employeeOrders).sort((a, b) => {
            const aIsGroup = a.startsWith('group_');
            const bIsGroup = b.startsWith('group_');

            if (aIsGroup && !bIsGroup) return 1;
            if (!aIsGroup && bIsGroup) return -1;

            return a.localeCompare(b);
        });

        let html = '<div class="checklist-header"><h3>📋 Distribution Checklist - ' + new Date().toLocaleDateString() + '</h3></div>';
        html += '<div class="checklist-items">';

        sortedEmployees.forEach(employeeKey => {
            const employeeData = employeeOrders[employeeKey];
            const orderTime = new Date(employeeData.orderTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            // For group orders, show all participants
            const displayName = employeeData.isGroupOrder
                ? `👥 Group Order (${employeeData.participants.length} people)`
                : employeeData.employeeName;

            const participantsList = employeeData.isGroupOrder
                ? employeeData.participants.map(p => p.name).join(', ')
                : '';

            html += `
                <div class="checklist-employee ${employeeData.isGroupOrder ? 'group-order' : ''}">
                    <div class="employee-header">
                        <div class="employee-info">
                            <h4>${displayName}</h4>
                            ${employeeData.isGroupOrder ? `<div class="group-participants">Participants: ${participantsList}</div>` : ''}
                            <div class="employee-details">
                                <span class="hotel-badge">${employeeData.hotelName}</span>
                                <span class="order-time">Ordered at ${orderTime}</span>
                                ${employeeData.userEmail ? `<span class="email-info">${employeeData.userEmail}</span>` : ''}
                            </div>
                        </div>
                        <div class="distribution-status">
                            <input type="checkbox" class="distribution-checkbox" data-employee="${employeeKey}">
                            <label>Distributed</label>
                        </div>
                    </div>
                    <div class="employee-items">
                        <div class="checklist-compact">
            `;

            employeeData.items.forEach((item, index) => {
                html += `
                    <div class="checklist-item-row">
                        <span class="item-number">${index + 1}</span>
                        <span class="item-name">${item.name}</span>
                        <span class="item-qty">${item.quantity}</span>
                        <span class="item-amount">${formatCurrency(item.price * item.quantity)}</span>
                    </div>
                `;
            });

            html += `
                            <div class="checklist-total">
                                <span class="total-label">Total:</span>
                                <span class="total-amount">${formatCurrency(employeeData.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        html += '<div class="checklist-footer"><p><strong>Total Orders:</strong> ' + sortedEmployees.length + ' | <strong>Total Items:</strong> ' + orders.length + '</p></div>';

        container.innerHTML = html;

        // Add event listeners for distribution checkboxes
        document.querySelectorAll('.distribution-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const employeeCard = this.closest('.checklist-employee');
                if (this.checked) {
                    employeeCard.classList.add('distributed');
                } else {
                    employeeCard.classList.remove('distributed');
                }
            });
        });

    } catch (error) {
        console.error('Error displaying distribution checklist:', error);
        container.innerHTML = '<p class="empty-message">Error loading distribution checklist</p>';
    }
}

async function refreshDashboard() {
    await loadOrders();
    displayOrders();
    await displayOrderSummary();
    await displayDistributionChecklist();
}

async function handleCustomDate() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day

        try {
            const allOrders = await StorageManager.getOrders();
            currentOrders = allOrders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= start && orderDate <= end;
            });

            filteredOrders = [...currentOrders];
            applyFilters();
            displayOrders();
        } catch (error) {
            console.error('Error handling custom date:', error);
        }
    }
}

function printOrderSummary() {
    const summaryElement = document.getElementById('orderSummary');
    if (!summaryElement || summaryElement.innerHTML.includes('No pending orders')) {
        showToast('No orders to print', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hotel Order Summary - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .hotel-order-summary { margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
                .hotel-order-summary h3 { margin-top: 0; color: #333; border-bottom: 2px solid #ff6f61; padding-bottom: 10px; }
                .summary-stats { display: flex; gap: 15px; margin-bottom: 15px; }
                .stat-badge { background: #ffe3dc; color: #ff6f61; padding: 5px 12px; border-radius: 15px; font-weight: bold; }
                .order-items-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
                .order-items-list li { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8f8f8; border-radius: 6px; }
                .item-name { font-weight: 500; }
                .item-qty { background: #ff6f61; color: white; padding: 4px 8px; border-radius: 12px; font-weight: bold; min-width: 30px; text-align: center; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h1>🏨 Hotel Order Summary</h1>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <hr>
            ${summaryElement.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function printDistributionChecklist() {
    const checklistElement = document.getElementById('distributionChecklist');
    if (!checklistElement || checklistElement.innerHTML.includes('No pending orders')) {
        showToast('No checklist to print', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Food Distribution Checklist - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; line-height: 1.4; }
                .checklist-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
                .checklist-header h3 { margin: 0; color: #333; font-size: 16px; }
                .checklist-employee { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
                .employee-header { background: #f8f9fa; padding: 10px; border-bottom: 1px solid #dee2e6; }
                .employee-info h4 { margin: 0 0 4px 0; color: #333; font-size: 14px; }
                .group-participants { font-size: 11px; color: #666; background: #fff3cd; padding: 3px 6px; border-radius: 3px; margin-bottom: 4px; }
                .employee-details { display: flex; gap: 10px; flex-wrap: wrap; font-size: 11px; color: #666; }
                .hotel-badge { background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 8px; font-weight: 500; }
                .order-time, .email-info { color: #666; }
                .distribution-status { margin-top: 6px; }
                .distribution-status input[type="checkbox"] { margin-right: 6px; transform: scale(1.1); }
                .employee-items { padding: 10px; }
                .checklist-compact { background: white; border: 1px solid #ddd; border-radius: 4px; }
                .checklist-item-row { display: flex; align-items: center; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
                .checklist-item-row:last-child { border-bottom: none; }
                .item-number { width: 25px; text-align: center; font-weight: 600; color: #2563eb; }
                .item-name { flex: 1; font-weight: 500; }
                .item-qty { width: 35px; text-align: center; font-weight: 600; background: #f8f9fa; padding: 2px 4px; border-radius: 3px; margin: 0 6px; }
                .item-amount { width: 60px; text-align: right; font-weight: 600; }
                .checklist-total { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f8f9fa; border-top: 1px solid #dee2e6; font-weight: 700; }
                .checklist-footer { text-align: center; margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 11px; }
                .distributed { background: #d4edda !important; }
                .group-order { border-left: 3px solid #ffc107; }
                @media print {
                    body { margin: 0; font-size: 11px; }
                    .distribution-status { display: none !important; }
                    .checklist-employee { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="checklist-header">
                <h3>📋 Food Distribution Checklist</h3>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            </div>
            ${checklistElement.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportToCSV() {
    if (filteredOrders.length === 0) {
        showToast('No orders to export', 'error');
        return;
    }

    let csv = 'Date,Time,Employee,User Email,Hotel,Items,Total\n';

    filteredOrders.forEach(order => {
        const date = formatDateOnly(order.timestamp);
        const time = new Date(order.timestamp).toLocaleTimeString('en-IN');
        const items = order.items.map(item => `${item.name} (${item.quantity})`).join('; ');
        const userEmail = order.userEmail || 'N/A';

        if (order.isGroupOrder) {
            // For group orders, include participant details
            const participants = order.participants.map(p => `${p.name}(${formatCurrency(p.shareAmount)})`).join('; ');
            csv += `"${date}","${time}","${order.employeeName} (Group)","${userEmail}","${order.hotelName}","${items} [Group: ${participants}]",${order.total}\n`;
        } else {
            csv += `"${date}","${time}","${order.employeeName}","${userEmail}","${order.hotelName}","${items}",${order.total}\n`;
        }
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunch-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Orders exported successfully!');
}

async function downloadSummaryPDF() {
    const summaryElement = document.getElementById('orderSummary');
    if (!summaryElement || summaryElement.innerHTML.includes('No pending orders')) {
        showToast('No orders to download', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('Hotel Order Summary', 20, 30);

        // Add date
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);

        let yPosition = 60;

        // Get order summary data
        const todaysOrders = await StorageManager.getTodaysOrders();
        const orders = todaysOrders.filter(order => !order.completed);

        // Group orders by hotel
        const hotelSummaries = {};
        orders.forEach(order => {
            if (!hotelSummaries[order.hotelName]) {
                hotelSummaries[order.hotelName] = {};
            }

            order.items.forEach(item => {
                if (!hotelSummaries[order.hotelName][item.name]) {
                    hotelSummaries[order.hotelName][item.name] = {
                        quantity: 0,
                        price: item.price
                    };
                }
                hotelSummaries[order.hotelName][item.name].quantity += item.quantity;
            });
        });

        // Generate PDF content
        Object.entries(hotelSummaries).forEach(([hotelName, items]) => {
            // Check if we need a new page
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 30;
            }

            // Hotel header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`${hotelName}`, 20, yPosition);
            yPosition += 10;

            // Items table
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');

            const itemEntries = Object.entries(items).sort(([,a], [,b]) => b.quantity - a.quantity);
            const totalItems = itemEntries.reduce((sum, [, itemData]) => sum + itemData.quantity, 0);

            // Table headers
            doc.setFont('helvetica', 'bold');
            doc.text('S.No', 20, yPosition);
            doc.text('Item Name', 40, yPosition);
            doc.text('Quantity', 150, yPosition);
            yPosition += 8;

            // Table rows
            doc.setFont('helvetica', 'normal');
            itemEntries.forEach(([itemName, itemData], index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 30;
                }

                doc.text(`${index + 1}`, 20, yPosition);
                doc.text(itemName, 40, yPosition);
                doc.text(`${itemData.quantity}`, 150, yPosition);
                yPosition += 8;
            });

            // Total
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Items: ${totalItems}`, 20, yPosition + 5);
            yPosition += 20;
        });

        // Save the PDF
        const fileName = `order-summary-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        showToast('Order summary PDF downloaded successfully!');

    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error generating PDF', 'error');
    }
}

async function downloadOrdersPDF() {
    if (filteredOrders.length === 0) {
        showToast('No orders to download', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('All Orders Details', 20, 30);

        // Add date
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
        doc.text(`Total Orders: ${filteredOrders.length}`, 20, 55);

        let yPosition = 70;

        // Table headers
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Date & Time', 15, yPosition);
        doc.text('Employee', 50, yPosition);
        doc.text('Email', 80, yPosition);
        doc.text('Hotel', 105, yPosition);
        doc.text('Items', 135, yPosition);
        doc.text('Total', 165, yPosition);
        yPosition += 8;

        // Table rows
        doc.setFont('helvetica', 'normal');
        filteredOrders.forEach(order => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 30;

                // Repeat headers on new page
                doc.setFont('helvetica', 'bold');
                doc.text('Date & Time', 15, yPosition);
                doc.text('Employee', 50, yPosition);
                doc.text('Email', 80, yPosition);
                doc.text('Hotel', 105, yPosition);
                doc.text('Items', 135, yPosition);
                doc.text('Total', 165, yPosition);
                yPosition += 8;
                doc.setFont('helvetica', 'normal');
            }

            const date = formatDateOnly(order.timestamp);
            const time = new Date(order.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const dateTime = `${date} ${time}`;

            const items = order.items.map(item => `${item.name}(${item.quantity})`).join(', ');
            const total = formatCurrency(order.total);
            const userEmail = order.userEmail || 'N/A';

            let employeeName = order.employeeName;
            if (order.isGroupOrder) {
                employeeName += ` (Group: ${order.participants.length})`;
            }

            // Handle long text wrapping
            const maxWidth = 25;
            const wrappedItems = doc.splitTextToSize(items, maxWidth);

            doc.text(dateTime, 15, yPosition);
            doc.text(employeeName, 50, yPosition);
            doc.text(userEmail, 80, yPosition);
            doc.text(order.hotelName, 105, yPosition);
            doc.text(wrappedItems[0], 135, yPosition); // First line of items
            doc.text(total, 165, yPosition);

            yPosition += 8;

            // Add additional lines for wrapped items
            for (let i = 1; i < wrappedItems.length; i++) {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 30;
                }
                doc.text(wrappedItems[i], 135, yPosition);
                yPosition += 8;
            }

            // Add participant details for group orders
            if (order.isGroupOrder && order.participants) {
                const participantsText = `Participants: ${order.participants.map(p => `${p.name}(${formatCurrency(p.shareAmount)})`).join(', ')}`;
                const wrappedParticipants = doc.splitTextToSize(participantsText, 140);

                wrappedParticipants.forEach((line, index) => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 30;
                    }
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100); // Gray color for participants
                    doc.text(line, 15, yPosition);
                    yPosition += 6;
                });

                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0); // Reset to black
                yPosition += 2; // Add some spacing
            }
        });

        // Save the PDF
        const fileName = `all-orders-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        showToast('Orders PDF downloaded successfully!');

    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Error generating PDF', 'error');
    }
}

async function downloadChecklistPDF() {
    const checklistElement = document.getElementById('distributionChecklist');
    if (!checklistElement || checklistElement.innerHTML.includes('No pending orders')) {
        showToast('No checklist to download', 'error');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('Food Distribution Checklist', 20, 30);

        // Add date
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
        doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 55);

        let yPosition = 70;

        // Get checklist data
        const todaysOrders = await StorageManager.getTodaysOrders();
        const orders = todaysOrders.filter(order => !order.completed);

        // Group orders by employee
        const employeeOrders = {};

        orders.forEach(order => {
            const employeeKey = order.isGroupOrder ? `group_${order.id}` : order.employeeName;

            if (!employeeOrders[employeeKey]) {
                employeeOrders[employeeKey] = {
                    employeeName: order.employeeName,
                    userEmail: order.userEmail,
                    hotelName: order.hotelName,
                    items: [],
                    total: 0,
                    orderTime: order.timestamp,
                    isGroupOrder: order.isGroupOrder,
                    participants: order.participants || []
                };
            }

            order.items.forEach(item => {
                employeeOrders[employeeKey].items.push({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                });
            });

            employeeOrders[employeeKey].total += order.total;
        });

        // Sort employees alphabetically (groups at the end)
        const sortedEmployees = Object.keys(employeeOrders).sort((a, b) => {
            const aIsGroup = a.startsWith('group_');
            const bIsGroup = b.startsWith('group_');

            if (aIsGroup && !bIsGroup) return 1;
            if (!aIsGroup && bIsGroup) return -1;

            return a.localeCompare(b);
        });

        // Generate PDF content
        sortedEmployees.forEach(employeeKey => {
            // Check if we need a new page
            if (yPosition > 220) {
                doc.addPage();
                yPosition = 30;
            }

            const employeeData = employeeOrders[employeeKey];
            const orderTime = new Date(employeeData.orderTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            // Employee header
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');

            const displayName = employeeData.isGroupOrder
                ? `👥 Group Order (${employeeData.participants.length} people)`
                : employeeData.employeeName;

            doc.text(`${displayName}`, 20, yPosition);
            yPosition += 8;

            // Group participants
            if (employeeData.isGroupOrder) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const participantsList = employeeData.participants.map(p => p.name).join(', ');
                doc.text(`Participants: ${participantsList}`, 20, yPosition);
                yPosition += 6;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Hotel: ${employeeData.hotelName} | Ordered at: ${orderTime}`, 20, yPosition);
            if (employeeData.userEmail) {
                yPosition += 6;
                doc.text(`Email: ${employeeData.userEmail}`, 20, yPosition);
            }
            yPosition += 10;

            // Items table
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');

            // Table headers
            doc.text('S.No', 20, yPosition);
            doc.text('Food Item', 35, yPosition);
            doc.text('Qty', 140, yPosition);
            doc.text('Amount', 160, yPosition);
            yPosition += 6;

            // Table rows
            doc.setFont('helvetica', 'normal');
            employeeData.items.forEach((item, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 30;
                }

                doc.text(`${index + 1}`, 20, yPosition);
                doc.text(item.name, 35, yPosition);
                doc.text(`${item.quantity}`, 140, yPosition);
                doc.text(formatCurrency(item.price * item.quantity), 160, yPosition);
                yPosition += 6;
            });

            // Total
            doc.setFont('helvetica', 'bold');
            doc.text(`Total: ${formatCurrency(employeeData.total)}`, 20, yPosition + 5);
            yPosition += 15;
        });

        // Add summary at the end
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 30;
        }

        doc.setFontSize(12);
        doc.text(`Summary: ${sortedEmployees.length} orders, ${orders.length} items`, 20, yPosition);

        // Save the PDF
        const fileName = `distribution-checklist-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        showToast('Distribution checklist PDF downloaded successfully!');

    } catch (error) {
        console.error('Error generating checklist PDF:', error);
        showToast('Error generating PDF', 'error');
    }
}

async function showGroupOrderDetails(orderId) {
    try {
        const orders = await StorageManager.getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order || !order.isGroupOrder) {
            showToast('Order details not found', 'error');
            return;
        }

        let detailsHtml = `
            <div style="padding: 20px;">
                <h3>👥 Group Order Details</h3>
                <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p><strong>Item:</strong> ${order.items[0].name}</p>
                    <p><strong>Total Amount:</strong> ${formatCurrency(order.total)}</p>
                    <p><strong>Hotel:</strong> ${order.hotelName}</p>
                    <p><strong>Order Time:</strong> ${formatDate(order.timestamp)}</p>
                    <p><strong>User Email:</strong> ${order.userEmail || 'N/A'}</p>
                </div>

                <h4>Participants (${order.participants.length})</h4>
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
        `;

        order.participants.forEach((participant, index) => {
            detailsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${participant.name}</strong>
                        ${index === 0 ? ' <small style="color: var(--text-secondary);">(Primary)</small>' : ''}
                    </div>
                    <div style="font-weight: bold; color: var(--primary-color);">
                        ${formatCurrency(participant.shareAmount)}
                    </div>
                </div>
            `;
        });

        detailsHtml += `
                </div>
            </div>
        `;

        // Create a simple modal for details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;
        modal.innerHTML = `
            <div style="background: var(--bg-primary); border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                ${detailsHtml}
                <div style="padding: 20px; text-align: right;">
                    <button onclick="this.closest('.modal').remove()" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });

    } catch (error) {
        console.error('Error showing group order details:', error);
        showToast('Error loading order details', 'error');
    }
}

function scrollToMenu() {
    // Check if we're on the home page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        // Scroll to the featured section on home page
        const featuredSection = document.getElementById('featured');
        if (featuredSection) {
            featuredSection.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // On other pages, redirect to menu page
        window.location.href = 'menu.html';
    }
}

// Expose functions globally for use in other scripts
window.displayPopularItems = displayPopularItems;
window.scrollToMenu = scrollToMenu;
