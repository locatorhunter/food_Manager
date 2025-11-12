// ========================================
// Storage Management Utilities
// Handles all localStorage operations
// ========================================

const StorageManager = {
    KEYS: {
        HOTELS: 'lunchManager_hotels',
        SELECTED_HOTELS: 'lunchManager_selectedHotels',
        ORDERS: 'lunchManager_orders',
        THEME: 'lunchManager_theme'
    },
    
    // ===== HOTEL MANAGEMENT =====
    getHotels() {
        try {
            const hotels = localStorage.getItem(this.KEYS.HOTELS);
            return hotels ? JSON.parse(hotels) : [];
        } catch (error) {
            console.error('Error parsing hotels data:', error);
            return [];
        }
    },
    
    setHotels(hotels) {
        try {
            localStorage.setItem(this.KEYS.HOTELS, JSON.stringify(hotels));
        } catch (error) {
            console.error('Error saving hotels data:', error);
            showToast('Error saving data. Storage may be full.', 'error');
        }
    },
    
    addHotel(hotelData) {
        const hotels = this.getHotels();
        hotelData.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
        hotelData.menuItems = hotelData.menuItems || [];
        hotels.push(hotelData);
        this.setHotels(hotels);
        return hotelData;
    },
    
    updateHotel(hotelId, updates) {
        const hotels = this.getHotels();
        const index = hotels.findIndex(h => h.id === hotelId);
        if (index !== -1) {
            hotels[index] = { ...hotels[index], ...updates };
            this.setHotels(hotels);
        }
    },
    
    deleteHotel(hotelId) {
        const hotels = this.getHotels();
        const filtered = hotels.filter(h => h.id !== hotelId);
        this.setHotels(filtered);
    },
    
    getHotelById(hotelId) {
        return this.getHotels().find(h => h.id === hotelId);
    },
    
    // ===== MENU ITEMS FOR HOTELS =====
    addMenuItemToHotel(hotelId, menuItem) {
        console.log('addMenuItemToHotel called with hotelId:', hotelId, 'menuItem:', menuItem);
        const hotels = this.getHotels();
        const hotel = hotels.find(h => h.id === hotelId);
        console.log('Hotel found:', !!hotel, 'hotels count:', hotels.length);
        if (hotel) {
            menuItem.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
            console.log('Assigned id:', menuItem.id);
            hotel.menuItems.push(menuItem);
            this.setHotels(hotels);
            console.log('Menu item added, hotel now has', hotel.menuItems.length, 'items');
        } else {
            console.log('Hotel not found for id:', hotelId);
        }
    },
    
    updateMenuItem(hotelId, itemId, updates) {
        const hotels = this.getHotels();
        const hotel = hotels.find(h => h.id === hotelId);
        if (hotel) {
            const itemIndex = hotel.menuItems.findIndex(item => item.id === itemId);
            if (itemIndex !== -1) {
                hotel.menuItems[itemIndex] = { ...hotel.menuItems[itemIndex], ...updates };
                this.setHotels(hotels);
            }
        }
    },
    
    deleteMenuItem(hotelId, itemId) {
        const hotels = this.getHotels();
        const hotel = hotels.find(h => h.id === hotelId);
        if (hotel) {
            hotel.menuItems = hotel.menuItems.filter(item => item.id !== itemId);
            this.setHotels(hotels);
        }
    },

    addImageToMenuItem(hotelId, itemId, imageData) {
        const hotels = this.getHotels();
        const hotel = hotels.find(h => h.id === hotelId);
        if (hotel) {
            const item = hotel.menuItems.find(item => item.id === itemId);
            if (item) {
                if (!item.images) item.images = [];
                item.images.push(imageData);
                this.setHotels(hotels);
            }
        }
    },
    
    // ===== SELECTED HOTELS FOR TODAY =====
    getSelectedHotels() {
        const today = new Date().toDateString();
        const key = this.KEYS.SELECTED_HOTELS + '_' + today;
        const selected = localStorage.getItem(key);
        console.log('getSelectedHotels key:', key, 'value:', selected);
        return selected ? JSON.parse(selected) : [];
    },

    setSelectedHotels(hotelIds) {
        const today = new Date().toDateString();
        const key = this.KEYS.SELECTED_HOTELS + '_' + today;
        console.log('setSelectedHotels key:', key, 'hotelIds:', hotelIds);
        localStorage.setItem(key, JSON.stringify(hotelIds));
        window.dispatchEvent(new Event('hotelsUpdated'));
    },
    
    getSelectedHotelsData() {
        const selectedIds = this.getSelectedHotels();
        const allHotels = this.getHotels();
        return allHotels.filter(h => selectedIds.includes(h.id));
    },
    
    // ===== ORDERS =====
    getOrders() {
        try {
            const orders = localStorage.getItem(this.KEYS.ORDERS);
            return orders ? JSON.parse(orders) : [];
        } catch (error) {
            console.error('Error parsing orders data:', error);
            return [];
        }
    },

    setOrders(orders) {
        try {
            localStorage.setItem(this.KEYS.ORDERS, JSON.stringify(orders));
        } catch (error) {
            console.error('Error saving orders data:', error);
            showToast('Error saving data. Storage may be full.', 'error');
        }
    },
    
    addOrder(order) {
        const orders = this.getOrders();
        order.id = Date.now().toString();
        order.timestamp = new Date().toISOString();
        order.date = new Date().toDateString();
        order.completed = false; // Add completed status
        orders.push(order);
        this.setOrders(orders);
        window.dispatchEvent(new Event('orderAdded'));
        return order;
    },
    
    getTodaysOrders() {
        const today = new Date().toDateString();
        return this.getOrders().filter(order => order.date === today);
    },
    
    getOrdersByDateRange(startDate, endDate) {
        const orders = this.getOrders();
        return orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= startDate && orderDate <= endDate;
        });
    },
    
    deleteOrder(id) {
        const orders = this.getOrders();
        const filtered = orders.filter(order => order.id !== id);
        this.setOrders(filtered);
        window.dispatchEvent(new Event('orderDeleted'));
    },

    updateOrderStatus(orderId, completed) {
        const orders = this.getOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.completed = completed;
            this.setOrders(orders);
            window.dispatchEvent(new Event('orderStatusUpdated'));
        }
    },
    
    clearAllOrders() {
        localStorage.removeItem(this.KEYS.ORDERS);
        window.dispatchEvent(new Event('orderDeleted'));
    },
    
    // ===== THEME =====
    getTheme() {
        return localStorage.getItem(this.KEYS.THEME) || 'light';
    },
    
    setTheme(theme) {
        localStorage.setItem(this.KEYS.THEME, theme);
    },
    
    // ===== RESET =====
    resetAll() {
        Object.values(this.KEYS).forEach(key => {
            if (key !== this.KEYS.THEME) {
                localStorage.removeItem(key);
            }
        });
        window.dispatchEvent(new Event('storageReset'));
    },
    
    // ===== STATISTICS =====
    getStatistics(dateFilter = 'today') {
        let orders;
        
        if (dateFilter === 'today') {
            orders = this.getTodaysOrders();
        } else if (dateFilter === 'all') {
            orders = this.getOrders();
        } else {
            orders = this.getTodaysOrders();
        }
        
        const totalOrders = orders.length;
        let totalRevenue = 0;
        let totalItems = 0;
        const uniqueEmployees = new Set();
        const itemCounts = {};
        const hotelCounts = {};
        
        orders.forEach(order => {
            totalRevenue += order.total;
            totalItems += order.items.length;
            uniqueEmployees.add(order.employeeName);
            
            // Count hotel orders
            if (!hotelCounts[order.hotelName]) {
                hotelCounts[order.hotelName] = 0;
            }
            hotelCounts[order.hotelName]++;
            
            // Count items
            order.items.forEach(item => {
                if (!itemCounts[item.name]) {
                    itemCounts[item.name] = 0;
                }
                itemCounts[item.name] += item.quantity;
            });
        });
        
        const popularItems = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        
        const hotelStats = Object.entries(hotelCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        
        return {
            totalOrders,
            totalRevenue,
            totalItems,
            uniqueEmployees: uniqueEmployees.size,
            popularItems,
            hotelStats
        };
    }
};

// Initialize demo data - removed for production deployment
function initializeDemoData() {
    // Clear any existing demo data for production deployment
    const hotels = StorageManager.getHotels();

    // Check if demo hotels exist and remove them
    const demoHotelNames = ['Paradise Lunch Home', 'Spice Garden Restaurant'];
    const hasDemoData = hotels.some(hotel => demoHotelNames.includes(hotel.name));

    if (hasDemoData) {
        console.log('Removing demo data for production deployment');
        // Remove demo hotels
        demoHotelNames.forEach(demoName => {
            const demoHotel = hotels.find(h => h.name === demoName);
            if (demoHotel) {
                StorageManager.deleteHotel(demoHotel.id);
            }
        });

        // Clear all orders (demo orders)
        StorageManager.clearAllOrders();

        // Clear selected hotels
        const today = new Date().toDateString();
        const selectedKey = StorageManager.KEYS.SELECTED_HOTELS + '_' + today;
        localStorage.removeItem(selectedKey);

        console.log('Demo data cleared successfully');
    }

    // Update existing hotels to have type if missing
    const existingHotels = StorageManager.getHotels();
    existingHotels.forEach(hotel => {
        if (!hotel.type) {
            StorageManager.updateHotel(hotel.id, { type: 'veg' });
        }
    });
}

initializeDemoData();

