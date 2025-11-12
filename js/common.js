// ========================================
// Common functionality for all pages
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeNavbar();
    initializeBanner();
    initializeTheme();
    setActivePage();
    initializeMobileUX();
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
                    <li>
                        <button class="theme-toggle" id="themeToggle" title="Toggle Dark/Light Mode">🌙</button>
                    </li>
                </ul>
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
                </div>
            `;
            const bannerContainer = document.getElementById('banner');
            if (bannerContainer) {
                bannerContainer.innerHTML = bannerHtml;
            }
            return;
        }

        const hotelDetails = selectedHotels.map(hotel => {
            let details = `${getHotelTypeEmoji(hotel.type)} ${hotel.name}`;
            if (hotel.reviews) {
                details += ` ⭐${hotel.reviews}`;
            }
            if (hotel.location) {
                details += ` 📍${hotel.location}`;
            }
            return details;
        }).join(' | ');

        const bannerHtml = `
            <div class="banner">
                <h2>Hotels for Today</h2>
                <p id="hotelNames">${hotelDetails}</p>
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
            </div>
        `;
        const bannerContainer = document.getElementById('banner');
        if (bannerContainer) {
            bannerContainer.innerHTML = bannerHtml;
        }
    }
}

async function initializeTheme() {
    try {
        const savedTheme = await StorageManager.getTheme();
        applyTheme(savedTheme);

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            updateThemeIcon(savedTheme);
            themeToggle.addEventListener('click', toggleTheme);
        }
    } catch (error) {
        console.error('Error initializing theme:', error);
        // Default to light theme
        applyTheme('light');
    }
}

async function toggleTheme() {
    try {
        const currentTheme = await StorageManager.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        await StorageManager.setTheme(newTheme);
        updateThemeIcon(newTheme);
    } catch (error) {
        console.error('Error toggling theme:', error);
    }
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        themeToggle.style.color = theme === 'light' ? 'var(--text-primary)' : 'var(--text-primary)';
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
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${type === 'success' ? '#10B981' : '#EF4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
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
            html += `<div class="hotel-order-summary">
                <h3>🏨 ${hotel}</h3>
                <ul class="order-items-list">`;
            Object.entries(items).forEach(([item, qty]) => {
                html += `<li><span class="item-name">${item}</span> <span class="item-qty">${qty} nos</span></li>`;
            });
            html += '</ul></div>';
        });
    }

    document.getElementById('orderSummary').innerHTML = html;
}
