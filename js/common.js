// ========================================
// Common functionality for all pages
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeNavbar();
    initializeBanner();
    setActivePage();
    initializeMobileUX();
    initializeTheme();
});

function initializeMobileUX() {
    // Prevent zoom on double-tap for iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(viewport);
    }

    // Improve touch scrolling on mobile
    if ('ontouchstart' in window) {
        document.body.style.overscrollBehavior = 'none';
    }

    // Add swipe gestures for mobile menu
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50;
        const navbar = document.getElementById('navbarNav');

        if (touchEndX - touchStartX > swipeThreshold && navbar) {
            // Swipe right - open menu
            navbar.classList.add('active');
        }

        if (touchStartX - touchEndX > swipeThreshold && navbar) {
            // Swipe left - close menu
            navbar.classList.remove('active');
        }
    }
}

function initializeNavbar() {
    const navbarHtml = `
        <div class="navbar">
            <div class="navbar-container">
                <a href="index.html" class="navbar-brand">
                    <div class="navbar-logo">🍽️</div>
                    <span>Lunch Manager</span>
                </a>
                
                <button class="mobile-menu-toggle" id="mobileMenuToggle">☰</button>
                
                <ul class="navbar-nav" id="navbarNav">
                    <li><a href="index.html" class="nav-link" data-page="index">Home</a></li>
                    <li><a href="menu.html" class="nav-link" data-page="menu">Menu</a></li>
                    <li><a href="dashboard.html" class="nav-link" data-page="dashboard">Dashboard</a></li>
                    <li><a href="admin.html" class="nav-link" data-page="admin">Admin</a></li>
                </ul>

                <button class="theme-toggle" id="themeToggle" title="Toggle theme">🌙</button>
            </div>
        </div>
    `;
    
    const navbarContainer = document.getElementById('navbar');
    if (navbarContainer) {
        navbarContainer.innerHTML = navbarHtml;
        
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const navbarNav = document.getElementById('navbarNav');
        
        if (mobileToggle && navbarNav) {
            mobileToggle.addEventListener('click', () => {
                navbarNav.classList.toggle('active');
            });
            
            const navLinks = navbarNav.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navbarNav.classList.remove('active');
                });
            });
        }
    }
}

async function initializeTheme() {
    // Load saved theme (defaults to retro-light arcade pastel theme)
    const savedTheme = await StorageManager.getTheme();
    setTheme(savedTheme);

    // Add theme toggle event listener
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function setTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    // Remove all theme classes
    body.classList.remove('dark-mode', 'retro-dark', 'retro-light');

    if (theme === 'dark') {
        body.classList.add('dark-mode');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else if (theme === 'retro-dark') {
        body.classList.add('retro-dark');
        if (themeToggle) themeToggle.textContent = '🎨';
    } else if (theme === 'retro-light') {
        body.classList.add('retro-light');
        if (themeToggle) themeToggle.textContent = '🌞';
    } else {
        // light
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

async function toggleTheme() {
    const themes = ['light', 'dark', 'retro-dark', 'retro-light'];
    let currentTheme = 'light';

    if (document.body.classList.contains('dark-mode')) {
        currentTheme = 'dark';
    } else if (document.body.classList.contains('retro-dark')) {
        currentTheme = 'retro-dark';
    } else if (document.body.classList.contains('retro-light')) {
        currentTheme = 'retro-light';
    }

    const currentIndex = themes.indexOf(currentTheme);
    const newTheme = themes[(currentIndex + 1) % themes.length];

    setTheme(newTheme);
    await StorageManager.setTheme(newTheme);
}

async function initializeBanner() {
    await updateBanner();
    window.addEventListener('hotelsUpdated', updateBanner);
    // Update banner when localStorage changes from other pages
    window.addEventListener('storage', async (e) => {
        if (e.key && e.key.startsWith('lunchManager_selectedHotels')) {
            await updateBanner();
        }
    });

    // Order summary removed for production deployment
    // Uncomment the code below if you want to show order summary on home page

    /*
    // Display order summary on home page
    if (document.getElementById('orderSummary')) {
        displayOrderSummary();
        window.addEventListener('orderAdded', displayOrderSummary);
        window.addEventListener('orderDeleted', displayOrderSummary);
    }
    */
}

async function updateBanner() {
    try {
        const selectedHotels = await StorageManager.getSelectedHotelsData();

        if (!selectedHotels || selectedHotels.length === 0) {
            const bannerHtml = `
                <div class="banner">
                    <h2>Hotels for Today</h2>
                    <p id="hotelNames">No hotels selected</p>
                    <div class="delivery-animation">
                        <div class="road-line"></div>
                        <div class="office-building">🏢</div>
                    </div>
                </div>
            `;
            const bannerContainer = document.getElementById('banner');
            if (bannerContainer) {
                bannerContainer.innerHTML = bannerHtml;
            }
            return;
        }

        const hotelDetails = selectedHotels.map(hotel => {
            let details = `${hotel.name}`;
            if (hotel.reviews) {
                details += ` ⭐${hotel.reviews}`;
            }
            if (hotel.location) {
                details += ` 📍${hotel.location}`;
            }
            return details;
        }).join('  |  |  ');

        const bannerHtml = `
            <div class="banner">
                <h2>Hotels for Today</h2>
                <p id="hotelNames">${hotelDetails}</p>
                <div class="delivery-animation">
                    <div class="sky-clouds">
                        <div class="cloud cloud-1">☁️</div>
                        <div class="cloud cloud-2">☁️</div>
                        <div class="cloud cloud-3">☁️</div>
                        <div class="cloud cloud-4">☁️</div>
                    </div>
                    <div class="delivery-food food-1">🍕</div>
                    <div class="delivery-food food-2">🍔</div>
                    <div class="delivery-food food-3">🌮</div>
                    <div class="delivery-food food-4">🍜</div>
                    <div class="delivery-food food-5">🥪</div>
                    <div class="office-building">🏢</div>
                </div>
            </div>
        `;

        const bannerContainer = document.getElementById('banner');
        if (bannerContainer) {
            bannerContainer.innerHTML = bannerHtml;
        }
    } catch (error) {
        console.error('Error updating banner:', error);
        const bannerHtml = `
            <div class="banner">
                <h2>Hotels for Today</h2>
                <p id="hotelNames">Error loading hotels</p>
                <div class="delivery-animation">
                    <div class="office-building">🏢</div>
                </div>
            </div>
        `;
        const bannerContainer = document.getElementById('banner');
        if (bannerContainer) {
            bannerContainer.innerHTML = bannerHtml;
        }
    }
}


function setActivePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageName = currentPage.replace('.html', '') || 'index';
    
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === pageName) {
            link.classList.add('active');
        }
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `toast toast-${type}`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateOnly(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function displayOrderSummary() {
    const orders = StorageManager.getTodaysOrders();

    // Group by hotel, then by item
    const hotelGroups = {};

    orders.forEach(order => {
        if (!hotelGroups[order.hotelName]) {
            hotelGroups[order.hotelName] = {};
        }
        order.items.forEach(item => {
            if (!hotelGroups[order.hotelName][item.name]) {
                hotelGroups[order.hotelName][item.name] = 0;
            }
            hotelGroups[order.hotelName][item.name] += item.quantity;
        });
    });

    let html = '<h2>Today\'s Order Summary</h2>';

    if (Object.keys(hotelGroups).length === 0) {
        html += '<p class="empty-message">No orders placed yet today.</p>';
    } else {
        Object.entries(hotelGroups).forEach(([hotel, items]) => {
            const itemEntries = Object.entries(items);
            const totalItems = itemEntries.reduce((sum, [, qty]) => sum + qty, 0);

            html += `<div class="hotel-order-summary">
                <h3>🏨 ${hotel}</h3>
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

            itemEntries.forEach(([item, qty], index) => {
                html += `<tr>
                    <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                    <td>${item}</td>
                    <td style="text-align: center; font-weight: 600;">${qty}</td>
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
    }

    document.getElementById('orderSummary').innerHTML = html;
}
