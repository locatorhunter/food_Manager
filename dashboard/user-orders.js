// ========================================
// User Orders Page Functionality
// ========================================

let userOrders = [];
let filteredUserOrders = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeUserOrders();
});

async function initializeUserOrders() {
    // Check if we're on the user orders page
    if (!document.getElementById('dateFilter')) return;

    await loadUserOrders();
    setupUserControls();
    displayUserOrders();
}

async function loadUserOrders() {
    const dateFilterElement = document.getElementById('dateFilter');
    if (!dateFilterElement) return; // Not on user orders page

    const user = window.authService ? window.authService.getCurrentUser() : null;
    if (!user || !user.email) {
        console.error('User not authenticated');
        return;
    }

    const dateFilter = dateFilterElement.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        let allOrders = await StorageManager.getOrders();

        // Filter orders by current user's email
        allOrders = allOrders.filter(order => order.userEmail === user.email);

        switch(dateFilter) {
            case 'today':
                userOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.timestamp);
                    orderDate.setHours(0, 0, 0, 0);
                    return orderDate.getTime() === today.getTime();
                });
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                userOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.timestamp);
                    orderDate.setHours(0, 0, 0, 0);
                    return orderDate.getTime() === yesterday.getTime();
                });
                break;
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                userOrders = allOrders.filter(order =>
                    new Date(order.timestamp) >= weekAgo
                );
                break;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                userOrders = allOrders.filter(order =>
                    new Date(order.timestamp) >= monthAgo
                );
                break;
            case 'all':
                userOrders = allOrders;
                break;
            default:
                userOrders = allOrders.filter(order => {
                    const orderDate = new Date(order.timestamp);
                    orderDate.setHours(0, 0, 0, 0);
                    return orderDate.getTime() === today.getTime();
                });
        }

        filteredUserOrders = [...userOrders];
        applyUserFilters();
    } catch (error) {
        console.error('Error loading user orders:', error);
        userOrders = [];
        filteredUserOrders = [];
    }
}

async function setupUserControls() {
    // Date filter with custom range
    const dateFilterElement = document.getElementById('dateFilter');
    if (!dateFilterElement) return; // Not on user orders page

    dateFilterElement.addEventListener('change', async (e) => {
        const customGroup = document.getElementById('customDateGroup');
        if (e.target.value === 'custom') {
            customGroup.style.display = 'block';
        } else {
            customGroup.style.display = 'none';
            await loadUserOrders();
            displayUserOrders();
        }
    });

    // Custom date inputs
    document.getElementById('startDate').addEventListener('change', handleCustomDate);
    document.getElementById('endDate').addEventListener('change', handleCustomDate);

    document.getElementById('statusFilter').addEventListener('change', applyUserFilters);
    document.getElementById('sortBy').addEventListener('change', applyUserFilters);

    document.getElementById('refreshBtn').addEventListener('click', refreshUserOrders);
}

function applyUserFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    // Filter by status
    filteredUserOrders = userOrders.filter(order => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return !order.completed;
        if (statusFilter === 'completed') return order.completed;
        return true;
    });

    // Sort orders
    filteredUserOrders.sort((a, b) => {
        switch(sortBy) {
            case 'time-desc':
                return new Date(b.timestamp) - new Date(a.timestamp);
            case 'time-asc':
                return new Date(a.timestamp) - new Date(b.timestamp);
            case 'amount-desc':
                return b.total - a.total;
            case 'amount-asc':
                return a.total - b.total;
            default:
                return 0;
        }
    });

    displayUserOrders();
}

function displayUserOrders() {
    const container = document.getElementById('ordersTable');

    if (filteredUserOrders.length === 0) {
        container.innerHTML = '<p class="empty-message">No orders found</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Hotel</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredUserOrders.forEach(order => {
        const itemsList = order.items.map(item =>
            `${item.name} (${item.quantity})`
        ).join(', ');

        const completedClass = order.completed ? 'completed' : '';
        const statusText = order.completed ? 'Completed' : 'Pending';
        const statusIcon = order.completed ? '✅' : '⏳';
        const isGroupOrder = order.isGroupOrder;
        const groupOrderBadge = isGroupOrder ? '<span class="group-order-badge">👥 Group</span>' : '';

        html += `
            <tr class="${completedClass} ${isGroupOrder ? 'group-order-row' : ''}">
                <td>
                    ${statusIcon} ${statusText}
                    ${groupOrderBadge}
                </td>
                <td>${formatDate(order.timestamp)}</td>
                <td>${order.hotelName}</td>
                <td>${itemsList}</td>
                <td><strong>${formatCurrency(order.total)}</strong></td>
                <td>
                    <button class="btn btn-info btn-small" onclick="showUserOrderDetails('${order.id}')" title="View Details">
                        👁️
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function refreshUserOrders() {
    await loadUserOrders();
    displayUserOrders();
    showToast('Orders refreshed!');
}

async function handleCustomDate() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day

        try {
            const user = window.authService ? window.authService.getCurrentUser() : null;
            if (!user || !user.email) return;

            let allOrders = await StorageManager.getOrders();
            allOrders = allOrders.filter(order => order.userEmail === user.email);

            userOrders = allOrders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= start && orderDate <= end;
            });

            filteredUserOrders = [...userOrders];
            applyUserFilters();
            displayUserOrders();
        } catch (error) {
            console.error('Error handling custom date:', error);
        }
    }
}

async function showUserOrderDetails(orderId) {
    try {
        const orders = await StorageManager.getOrders();
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            showToast('Order details not found', 'error');
            return;
        }

        let detailsHtml = `
            <div style="padding: 20px;">
                <h3>Order Details</h3>
                <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Date & Time:</strong> ${formatDate(order.timestamp)}</p>
                    <p><strong>Hotel:</strong> ${order.hotelName}</p>
                    <p><strong>Status:</strong> ${order.completed ? 'Completed' : 'Pending'}</p>
                    <p><strong>Total Amount:</strong> ${formatCurrency(order.total)}</p>
                </div>

                <h4>Items Ordered</h4>
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
        `;

        order.items.forEach((item, index) => {
            detailsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <strong>${item.name}</strong>
                        <span style="color: var(--text-secondary); margin-left: 10px;">Quantity: ${item.quantity}</span>
                    </div>
                    <div style="font-weight: bold; color: var(--primary-color);">
                        ${formatCurrency(item.price * item.quantity)}
                    </div>
                </div>
            `;
        });

        if (order.isGroupOrder && order.participants) {
            detailsHtml += `
                </div>

                <h4 style="margin-top: 20px;">Group Order Participants</h4>
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
        }

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
            <div style="background: var(--bg-primary); border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
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
        console.error('Error showing user order details:', error);
        showToast('Error loading order details', 'error');
    }
}