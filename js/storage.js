// ========================================
// Storage Management Utilities
// Handles Firebase database operations with real-time sync
// ========================================

const StorageManager = {
    PATHS: {
        HOTELS: 'hotels',
        SELECTED_HOTELS: 'selectedHotels',
        ORDERS: 'orders',
        THEME: 'theme'
    },

    // Initialize real-time listeners
    init() {
        // Listen for hotels changes
        const hotelsRef = firebaseRef(StorageManager.PATHS.HOTELS);
        firebaseOnValue(hotelsRef, (snapshot) => {
            const data = snapshot.val() || {};
            // Convert object to array and dispatch event
            const hotels = Object.values(data);
            window.dispatchEvent(new CustomEvent('hotelsUpdated', { detail: hotels }));
        });

        // Listen for orders changes
        const ordersRef = firebaseRef(StorageManager.PATHS.ORDERS);
        firebaseOnValue(ordersRef, (snapshot) => {
            const data = snapshot.val() || {};
            const orders = Object.values(data);
            window.dispatchEvent(new CustomEvent('orderAdded', { detail: orders }));
            window.dispatchEvent(new CustomEvent('orderDeleted', { detail: orders }));
        });
    },
    
    // ===== HOTEL MANAGEMENT =====
    async getHotels() {
        try {
            const hotelsRef = firebaseRef(StorageManager.PATHS.HOTELS);
            const snapshot = await firebaseGet(hotelsRef);
            const data = snapshot.val() || {};
            return Object.values(data);
        } catch (error) {
            console.error('Error fetching hotels:', error);
            return [];
        }
    },

    async setHotels(hotels) {
        try {
            const hotelsRef = firebaseRef(StorageManager.PATHS.HOTELS);
            const hotelsObject = {};
            hotels.forEach(hotel => {
                hotelsObject[hotel.id] = hotel;
            });
            await firebaseSet(hotelsRef, hotelsObject);
        } catch (error) {
            console.error('Error saving hotels:', error);
            showToast('Error saving data. Check connection.', 'error');
        }
    },

    async addHotel(hotelData) {
        try {
            hotelData.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
            hotelData.menuItems = hotelData.menuItems || [];
            const hotelRef = firebaseRef(`${StorageManager.PATHS.HOTELS}/${hotelData.id}`);
            await firebaseSet(hotelRef, hotelData);
            return hotelData;
        } catch (error) {
            console.error('Error adding hotel:', error);
            showToast('Error adding hotel.', 'error');
            return null;
        }
    },

    async updateHotel(hotelId, updates) {
        try {
            const hotelRef = firebaseRef(`${StorageManager.PATHS.HOTELS}/${hotelId}`);
            await firebaseUpdate(hotelRef, updates);
        } catch (error) {
            console.error('Error updating hotel:', error);
            showToast('Error updating hotel.', 'error');
        }
    },

    async deleteHotel(hotelId) {
        try {
            const hotelRef = firebaseRef(`${StorageManager.PATHS.HOTELS}/${hotelId}`);
            await firebaseRemove(hotelRef);
        } catch (error) {
            console.error('Error deleting hotel:', error);
            showToast('Error deleting hotel.', 'error');
        }
    },

    async getHotelById(hotelId) {
        try {
            const hotels = await this.getHotels();
            return hotels.find(h => h.id === hotelId);
        } catch (error) {
            console.error('Error fetching hotel:', error);
            return null;
        }
    },
    
    // ===== MENU ITEMS FOR HOTELS =====
    async addMenuItemToHotel(hotelId, menuItem) {
        try {
            const hotel = await this.getHotelById(hotelId);
            if (hotel) {
                menuItem.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
                hotel.menuItems = hotel.menuItems || [];
                hotel.menuItems.push(menuItem);
                await this.updateHotel(hotelId, { menuItems: hotel.menuItems });
            }
        } catch (error) {
            console.error('Error adding menu item:', error);
            showToast('Error adding menu item.', 'error');
        }
    },

    async updateMenuItem(hotelId, itemId, updates) {
        try {
            const hotel = await this.getHotelById(hotelId);
            if (hotel && hotel.menuItems) {
                const itemIndex = hotel.menuItems.findIndex(item => item.id === itemId);
                if (itemIndex !== -1) {
                    hotel.menuItems[itemIndex] = { ...hotel.menuItems[itemIndex], ...updates };
                    await this.updateHotel(hotelId, { menuItems: hotel.menuItems });
                }
            }
        } catch (error) {
            console.error('Error updating menu item:', error);
            showToast('Error updating menu item.', 'error');
        }
    },

    async deleteMenuItem(hotelId, itemId) {
        try {
            const hotel = await this.getHotelById(hotelId);
            if (hotel && hotel.menuItems) {
                hotel.menuItems = hotel.menuItems.filter(item => item.id !== itemId);
                await this.updateHotel(hotelId, { menuItems: hotel.menuItems });
            }
        } catch (error) {
            console.error('Error deleting menu item:', error);
            showToast('Error deleting menu item.', 'error');
        }
    },

    async addImageToMenuItem(hotelId, itemId, imageData) {
        try {
            const hotel = await this.getHotelById(hotelId);
            if (hotel && hotel.menuItems) {
                const item = hotel.menuItems.find(item => item.id === itemId);
                if (item) {
                    if (!item.images) item.images = [];
                    item.images.push(imageData);
                    await this.updateHotel(hotelId, { menuItems: hotel.menuItems });
                }
            }
        } catch (error) {
            console.error('Error adding image to menu item:', error);
            showToast('Error adding image.', 'error');
        }
    },
    
    // ===== SELECTED HOTELS FOR TODAY =====
    async getSelectedHotels() {
        try {
            const today = new Date().toDateString();
            const selectedRef = firebaseRef(`${StorageManager.PATHS.SELECTED_HOTELS}/${today}`);
            const snapshot = await firebaseGet(selectedRef);
            const data = snapshot.val();
            return data || [];
        } catch (error) {
            console.error('Error fetching selected hotels:', error);
            return [];
        }
    },

    async setSelectedHotels(hotelIds) {
        try {
            const today = new Date().toDateString();
            const selectedRef = firebaseRef(`${StorageManager.PATHS.SELECTED_HOTELS}/${today}`);
            await firebaseSet(selectedRef, hotelIds);
            // Event will be triggered by the real-time listener
        } catch (error) {
            console.error('Error saving selected hotels:', error);
            showToast('Error saving selection.', 'error');
        }
    },

    async getSelectedHotelsData() {
        try {
            const selectedIds = await this.getSelectedHotels();
            const allHotels = await this.getHotels();
            return allHotels.filter(h => selectedIds.includes(h.id));
        } catch (error) {
            console.error('Error fetching selected hotels data:', error);
            return [];
        }
    },
    
    // ===== ORDERS =====
    async getOrders() {
        try {
            const ordersRef = firebaseRef(StorageManager.PATHS.ORDERS);
            const snapshot = await firebaseGet(ordersRef);
            const data = snapshot.val() || {};
            return Object.values(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    },

    async setOrders(orders) {
        try {
            const ordersRef = firebaseRef(StorageManager.PATHS.ORDERS);
            const ordersObject = {};
            orders.forEach(order => {
                ordersObject[order.id] = order;
            });
            await firebaseSet(ordersRef, ordersObject);
        } catch (error) {
            console.error('Error saving orders:', error);
            showToast('Error saving orders. Check connection.', 'error');
        }
    },

    async addOrder(order) {
        try {
            order.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
            order.timestamp = new Date().toISOString();
            order.date = new Date().toDateString();
            order.completed = false; // Add completed status
            const orderRef = firebaseRef(`${StorageManager.PATHS.ORDERS}/${order.id}`);
            await firebaseSet(orderRef, order);
            // Event will be triggered by real-time listener
            return order;
        } catch (error) {
            console.error('Error adding order:', error);
            showToast('Error placing order.', 'error');
            return null;
        }
    },

    async getTodaysOrders() {
        try {
            const today = new Date().toDateString();
            const orders = await this.getOrders();
            return orders.filter(order => order.date === today);
        } catch (error) {
            console.error('Error fetching today\'s orders:', error);
            return [];
        }
    },

    async getOrdersByDateRange(startDate, endDate) {
        try {
            const orders = await this.getOrders();
            return orders.filter(order => {
                const orderDate = new Date(order.timestamp);
                return orderDate >= startDate && orderDate <= endDate;
            });
        } catch (error) {
            console.error('Error fetching orders by date range:', error);
            return [];
        }
    },

    async deleteOrder(id) {
        try {
            const orderRef = firebaseRef(`${StorageManager.PATHS.ORDERS}/${id}`);
            await firebaseRemove(orderRef);
            // Event will be triggered by real-time listener
        } catch (error) {
            console.error('Error deleting order:', error);
            showToast('Error deleting order.', 'error');
        }
    },

    async updateOrderStatus(orderId, completed) {
        try {
            const orderRef = firebaseRef(`${StorageManager.PATHS.ORDERS}/${orderId}`);
            await firebaseUpdate(orderRef, { completed });
            // Event will be triggered by real-time listener
        } catch (error) {
            console.error('Error updating order status:', error);
            showToast('Error updating order status.', 'error');
        }
    },

    async clearAllOrders() {
        try {
            const ordersRef = firebaseRef(StorageManager.PATHS.ORDERS);
            await firebaseSet(ordersRef, {});
            // Event will be triggered by real-time listener
        } catch (error) {
            console.error('Error clearing orders:', error);
            showToast('Error clearing orders.', 'error');
        }
    },
    
    // ===== THEME =====
    async getTheme() {
        try {
            const themeRef = firebaseRef(StorageManager.PATHS.THEME);
            const snapshot = await firebaseGet(themeRef);
            return snapshot.val() || 'retro-light';
        } catch (error) {
            console.error('Error fetching theme:', error);
            return 'retro-light';
        }
    },

    async setTheme(theme) {
        try {
            const themeRef = firebaseRef(StorageManager.PATHS.THEME);
            await firebaseSet(themeRef, theme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    },

    // ===== RESET =====
    async resetAll() {
        try {
            // Clear all Firebase data
            const paths = [StorageManager.PATHS.HOTELS, StorageManager.PATHS.ORDERS, StorageManager.PATHS.SELECTED_HOTELS];
            for (const path of paths) {
                const ref = firebaseRef(path);
                await firebaseSet(ref, {});
            }
            // Keep theme
            window.dispatchEvent(new Event('storageReset'));
        } catch (error) {
            console.error('Error resetting data:', error);
            showToast('Error resetting data.', 'error');
        }
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

// Initialize Firebase and clean up demo data
async function initializeApp() {
    try {
        // Initialize Firebase listeners
        StorageManager.init();

        // Clear any existing demo data for production deployment
        const hotels = await StorageManager.getHotels();

        // Check if demo hotels exist and remove them
        const demoHotelNames = ['Paradise Lunch Home', 'Spice Garden Restaurant'];
        const hasDemoData = hotels.some(hotel => demoHotelNames.includes(hotel.name));

        if (hasDemoData) {
            console.log('Removing demo data for production deployment');
            // Remove demo hotels
            for (const demoName of demoHotelNames) {
                const demoHotel = hotels.find(h => h.name === demoName);
                if (demoHotel) {
                    await StorageManager.deleteHotel(demoHotel.id);
                }
            }

            // Clear all orders (demo orders)
            await StorageManager.clearAllOrders();

            console.log('Demo data cleared successfully');
        }

        // Update existing hotels to have type if missing
        const existingHotels = await StorageManager.getHotels();
        for (const hotel of existingHotels) {
            if (!hotel.type) {
                await StorageManager.updateHotel(hotel.id, { type: 'veg' });
            }
        }

        console.log('Lunch Manager initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing app. Check connection.', 'error');
    }
}

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (window.firebaseDB && window.firebaseRef) {
            clearInterval(checkFirebase);
            initializeApp();
        }
    }, 100);
});

