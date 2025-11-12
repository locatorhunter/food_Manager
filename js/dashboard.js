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
    await displayPopularItems();

    window.addEventListener('orderAdded', refreshDashboard);
    window.addEventListener('orderDeleted', refreshDashboard);
    window.addEventListener('orderStatusUpdated', async () => {
        await loadOrders();
        displayOrders();
        await displayOrderSummary();
        updateStatistics();
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

        html += `
            <tr class="${completedClass}">
                <td>
                    <input type="checkbox"
                           ${checkedAttr}
                           onchange="toggleOrderStatus('${order.id}')"
                           class="order-checkbox">
                </td>
                <td>${formatDate(order.timestamp)}</td>
                <td>${order.employeeName}</td>
                <td>${order.hotelName}</td>
                <td>${itemsList}</td>
                <td><strong>${formatCurrency(order.total)}</strong></td>
                <td>
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

            html += `
                <tr class="${completedClass}">
                    <td>
                        <input type="checkbox"
                               ${checkedAttr}
                               onchange="toggleOrderStatus('${order.id}')"
                               class="order-checkbox">
                    </td>
                    <td>${formatDate(order.timestamp)}</td>
                    <td>${order.employeeName}</td>
                    <td>${order.hotelName}</td>
                    <td>${itemsList}</td>
                    <td><strong>${formatCurrency(order.total)}</strong></td>
                    <td>
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
            <div class="popular-item-card">
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
            const totalItems = Object.values(items).reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = Object.values(items).reduce((sum, item) => sum + (item.quantity * item.price), 0);

            const hotel = hotels.find(h => h.name === hotelName);
            const typeEmoji = hotel ? getHotelTypeEmoji(hotel.type) : '🏨';

            html += `
                <div class="hotel-order-summary">
                    <h3>${typeEmoji} ${hotelName}</h3>
                    <div class="summary-stats">
                        <span class="stat-badge">${totalItems} items</span>
                        <span class="stat-badge">${formatCurrency(totalValue)}</span>
                    </div>
                    <div class="order-items-list">
                        ${Object.entries(items)
                            .sort(([,a], [,b]) => b.quantity - a.quantity) // Sort by quantity descending
                            .map(([itemName, itemData]) => `
                                <div class="order-items-list li">
                                    <span class="item-name">${itemName}</span>
                                    <span class="item-qty">${itemData.quantity}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error displaying order summary:', error);
        container.innerHTML = '<p class="empty-message">Error loading order summary</p>';
    }
}

async function refreshDashboard() {
    await loadOrders();
    updateStatistics();
    displayOrders();
    await displayOrderSummary();
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

function exportToCSV() {
    if (filteredOrders.length === 0) {
        showToast('No orders to export', 'error');
        return;
    }

    let csv = 'Date,Time,Employee,Hotel,Items,Total\n';

    filteredOrders.forEach(order => {
        const date = formatDateOnly(order.timestamp);
        const time = new Date(order.timestamp).toLocaleTimeString('en-IN');
        const items = order.items.map(item => `${item.name} (${item.quantity})`).join('; ');
        csv += `"${date}","${time}","${order.employeeName}","${order.hotelName}","${items}",${order.total}\n`;
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
