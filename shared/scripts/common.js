// ========================================
// Common functionality for all pages
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    initializeNavbar();
    initializeBanner();
    setActivePage();
    initializeMobileUX();
    initializeTheme();
});

function getPathPrefix() {
    const path = window.location.pathname;
    if (path.includes('/admin/tests/')) return '../../';
    if (path.includes('/auth/') ||
        path.includes('/dashboard/') ||
        path.includes('/admin/') ||
        path.includes('/menu/') ||
        path.includes('/auragram/')) {
        return '../';
    }
    return '';
}

function initializeMobileUX() {
    // Prevent zoom on double-tap for iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
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

    document.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', function (e) {
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
    const user = window.authService ? window.authService.getCurrentUser() : null;
    const isAdmin = user && user.role === 'admin';
    const prefix = getPathPrefix();

    const navbarHtml = `
        <div class="navbar" role="navigation" aria-label="Main navigation">
            <div class="navbar-container">
                <a href="${prefix}index.html" class="navbar-brand" aria-label="OfzHub Home">
                    <div class="navbar-logo" aria-hidden="true">🏢</div>
                    <span>OfzHub</span>
                </a>

                <button class="mobile-menu-toggle"
                        id="mobileMenuToggle"
                        aria-label="Toggle mobile menu"
                        aria-expanded="false"
                        aria-controls="navbarNav">☰</button>

                <ul class="navbar-nav" id="navbarNav" role="menubar">
                    <li role="none"><a href="${prefix}index.html"
                                        class="nav-link"
                                        data-page="index"
                                        role="menuitem"
                                        aria-label="Home page">Home</a></li>
                    <li role="none"><a href="${prefix}menu/menu.html"
                                        class="nav-link"
                                        data-page="menu"
                                        role="menuitem"
                                        aria-label="View menu and place orders">Menu</a></li>
                    ${user ? `<li role="none"><a href="${prefix}dashboard/user-orders.html"
                                        class="nav-link"
                                        data-page="user-orders"
                                        role="menuitem"
                                        aria-label="View my order history">My Orders</a></li>
                    <li role="none"><a href="${prefix}auragram/auragram.html"
                                         class="nav-link"
                                         data-page="auragram"
                                         role="menuitem"
                                         aria-label="View social feed and share posts">Auragram</a></li>` : ''}
                    ${isAdmin ? `<li role="none"><a href="${prefix}dashboard/dashboard.html"
                                        class="nav-link"
                                        data-page="dashboard"
                                        role="menuitem"
                                        aria-label="View order dashboard and analytics">Dashboard</a></li>
                    <li role="none"><a href="${prefix}admin/admin.html"
                                        class="nav-link"
                                        data-page="admin"
                                        role="menuitem"
                                        aria-label="Admin panel for managing hotels and menus">Admin</a></li>` : ''}
                    <li role="none"><a href="#"
                                        class="nav-link"
                                        onclick="window.authService.logout()"
                                        role="menuitem"
                                        aria-label="Logout">Logout</a></li>
                </ul>

                <div class="navbar-user">
                    ${user ? `<span class="user-greeting">Welcome, ${user.displayName || user.name || user.email}</span>` : ''}
                    <button class="theme-toggle"
                            id="themeToggle"
                            title="Toggle theme"
                            aria-label="Switch between light and dark themes"
                            aria-describedby="themeStatus">🌙</button>
                    <span id="themeStatus" class="sr-only" aria-live="polite">Current theme: Light</span>
                </div>
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
                const isExpanded = navbarNav.classList.toggle('active');
                mobileToggle.setAttribute('aria-expanded', isExpanded);

                // Focus management for accessibility
                if (isExpanded) {
                    // Focus first menu item when opened
                    const firstMenuItem = navbarNav.querySelector('.nav-link');
                    if (firstMenuItem) {
                        setTimeout(() => firstMenuItem.focus(), 100);
                    }
                }
            });

            // Enhanced keyboard navigation
            const navLinks = navbarNav.querySelectorAll('.nav-link');
            navLinks.forEach((link, index) => {
                link.addEventListener('click', () => {
                    navbarNav.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                });

                // Arrow key navigation
                link.addEventListener('keydown', (e) => {
                    let targetIndex;
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        targetIndex = (index + 1) % navLinks.length;
                        navLinks[targetIndex].focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        targetIndex = (index - 1 + navLinks.length) % navLinks.length;
                        navLinks[targetIndex].focus();
                    } else if (e.key === 'Home') {
                        e.preventDefault();
                        navLinks[0].focus();
                    } else if (e.key === 'End') {
                        e.preventDefault();
                        navLinks[navLinks.length - 1].focus();
                    }
                });
            });

            // ESC key to close mobile menu
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navbarNav.classList.contains('active')) {
                    navbarNav.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.focus();
                }
            });
        }
    }
}

async function initializeTheme() {
    // Load saved theme (defaults to retro-light arcade pastel theme)
    try {
        // Check if StorageManager and getTheme are available
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.getTheme === 'function') {
            const savedTheme = await StorageManager.getTheme();
            setTheme(savedTheme);
        } else {
            // Fallback to localStorage if StorageManager not available
            const savedTheme = localStorage.getItem('ofzhub_theme') || 'retro-light';
            setTheme(savedTheme);
        }
    } catch (error) {
        console.warn('Error loading theme, using default:', error);
        setTheme('retro-light');
    }

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
    const themeNames = {
        'light': 'Light',
        'dark': 'Dark',
        'retro-dark': 'Retro Dark',
        'retro-light': 'Retro Light'
    };

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

    // Announce theme change to screen readers
    const themeStatus = document.getElementById('themeStatus');
    if (themeStatus) {
        themeStatus.textContent = `Switching from ${themeNames[currentTheme]} to ${themeNames[newTheme]} theme`;
    }

    setTheme(newTheme);

    // Save theme - try StorageManager first, fallback to localStorage
    try {
        if (typeof StorageManager !== 'undefined' && typeof StorageManager.setTheme === 'function') {
            await StorageManager.setTheme(newTheme);
        } else {
            localStorage.setItem('ofzhub_theme', newTheme);
        }
    } catch (error) {
        console.warn('Error saving theme:', error);
        localStorage.setItem('ofzhub_theme', newTheme);
    }

    // Update ARIA label
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.setAttribute('aria-label', `Switch to ${themeNames[themes[(currentIndex + 2) % themes.length]]} theme`);
        themeToggle.setAttribute('aria-pressed', newTheme !== 'light');
    }

    // Show success message
    showToast(`Theme changed to ${themeNames[newTheme]}`, 'success');
}

async function initializeBanner() {
    // Only initialize banner if banner element exists
    const bannerElement = document.getElementById('banner');
    if (!bannerElement) {
        console.log('Banner element not found, skipping banner initialization');
        return;
    }

    await updateBanner();
    await loadAndDisplayNotice();
    window.addEventListener('hotelsUpdated', updateBanner);
    // Update banner when localStorage changes from other pages
    window.addEventListener('storage', async (e) => {
        if (e.key && e.key.startsWith('ofzhub_selectedHotels')) {
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

function getHotelTypeEmoji(type) {
    return type === 'veg' ? '🥬' : '🍖';
}

async function updateBanner() {
    const bannerContainer = document.getElementById('banner');
    if (!bannerContainer) return;

    // Show skeleton loading initially
    showBannerSkeleton(bannerContainer);

    try {
        const selectedHotels = await StorageManager.getSelectedHotelsData();

        if (!selectedHotels || selectedHotels.length === 0) {
            const bannerHtml = `
                <div class="banner">
                    <h2>Hotels for Today</h2>
                    <p id="hotelNames">No hotels selected</p>
                    <div class="delivery-animation">
                        <div class="road-line"></div>
                    </div>
                </div>
            `;
            bannerContainer.innerHTML = bannerHtml;
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
                </div>
            </div>
        `;

        bannerContainer.innerHTML = bannerHtml;
    } catch (error) {
        console.error('Error updating banner:', error);
        const bannerHtml = `
            <div class="banner">
                <h2>Hotels for Today</h2>
                <p id="hotelNames">Error loading hotels</p>
                <div class="delivery-animation">
                </div>
            </div>
        `;
        bannerContainer.innerHTML = bannerHtml;
    }
}

function showBannerSkeleton(container) {
    const skeletonHtml = `
        <div class="banner skeleton-banner">
            <div class="skeleton skeleton-banner-title"></div>
            <div class="skeleton skeleton-banner-text"></div>
            <div class="delivery-animation">
                <div class="sky-clouds">
                    <div class="cloud cloud-1">☁️</div>
                    <div class="cloud cloud-2">☁️</div>
                    <div class="cloud cloud-3">☁️</div>
                    <div class="cloud cloud-4">☁️</div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = skeletonHtml;
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

function showToast(message, type = 'success', duration = 4000, position = 'auto') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    // Add dismiss button for better accessibility
    const dismissBtn = document.createElement('button');
    dismissBtn.innerHTML = '×';
    dismissBtn.setAttribute('aria-label', 'Dismiss notification');
    dismissBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        opacity: 0.8;
    `;

    dismissBtn.addEventListener('click', () => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    });

    toast.appendChild(dismissBtn);

    // Add progress bar for longer messages
    if (duration > 2000) {
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.5);
            width: 100%;
            animation: toastProgress ${duration}ms linear forwards;
        `;
        toast.style.position = 'relative';
        toast.appendChild(progressBar);
    }

    // Position the toast based on current viewport
    positionToast(toast, position);

    document.body.appendChild(toast);

    // Auto-dismiss with configurable duration
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Loading utilities
function showLoadingOverlay(message = 'Loading...') {
    const existingOverlay = document.querySelector('.skeleton-loading-overlay');
    if (existingOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'skeleton-loading-overlay';
    overlay.innerHTML = `
        <div class="skeleton-loading-content">
            <div class="skeleton-loading-spinner"></div>
            <div class="skeleton-loading-text">${message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.skeleton-loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showElementLoading(element, message = 'Loading...') {
    if (!element) return;

    const originalContent = element.innerHTML;
    element.setAttribute('data-original-content', originalContent);

    element.innerHTML = `
        <div class="skeleton-loading-content" style="position: relative; padding: 20px;">
            <div class="skeleton-loading-spinner"></div>
            <div class="skeleton-loading-text">${message}</div>
        </div>
    `;
}

function hideElementLoading(element) {
    if (!element) return;

    const originalContent = element.getAttribute('data-original-content');
    if (originalContent !== null) {
        element.innerHTML = originalContent;
        element.removeAttribute('data-original-content');
    }
}

/**
 * Position toast notification in corner of screen
 * @param {HTMLElement} toast - Toast element
 * @param {string} position - Position strategy ('auto', 'top-right', 'bottom-right', 'top-left', 'bottom-left')
 */
function positionToast(toast, position = 'auto') {
    // Get current scroll position and viewport dimensions
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Count existing toasts to avoid overlap
    const existingToasts = document.querySelectorAll('.toast:not(.toast-hide)');
    const toastIndex = existingToasts.length;
    const toastHeight = 80; // Approximate toast height
    const spacing = 10; // Space between toasts

    // Check if there's an active modal to avoid overlapping
    const hasModal = document.querySelector('.modal[aria-hidden="false"]') !== null;

    // Calculate corner positioning
    let topPosition;
    let leftPosition;
    let rightPosition;
    let bottomPosition;

    if (position === 'top-right' || (position === 'auto' && !hasModal)) {
        // Top-right corner (default preferred position)
        topPosition = 90; // Below navbar
        rightPosition = 20;
        leftPosition = 'auto';
        bottomPosition = 'auto';
    } else if (position === 'bottom-right' || hasModal) {
        // Bottom-right corner (safer when modals are open)
        bottomPosition = 20;
        rightPosition = 20;
        topPosition = 'auto';
        leftPosition = 'auto';
    } else if (position === 'top-left') {
        // Top-left corner
        topPosition = 90; // Below navbar
        leftPosition = 20;
        rightPosition = 'auto';
        bottomPosition = 'auto';
    } else if (position === 'bottom-left') {
        // Bottom-left corner
        bottomPosition = 20;
        leftPosition = 20;
        topPosition = 'auto';
        rightPosition = 'auto';
    }

    // Apply stacking for multiple toasts in the same corner
    if (position === 'top-right' || (position === 'auto' && !hasModal)) {
        topPosition = 90 + (toastIndex * (toastHeight + spacing));
    } else if (position === 'bottom-right' || hasModal) {
        bottomPosition = 20 + (toastIndex * (toastHeight + spacing));
    } else if (position === 'top-left') {
        topPosition = 90 + (toastIndex * (toastHeight + spacing));
    } else if (position === 'bottom-left') {
        bottomPosition = 20 + (toastIndex * (toastHeight + spacing));
    }

    // Ensure toasts don't go off-screen on mobile (use full width in mobile)
    if (viewportWidth <= 768) {
        leftPosition = 10;
        rightPosition = 10;
        if (position === 'top-right' || position === 'top-left' || position === 'auto') {
            topPosition = 80 + (toastIndex * (toastHeight + spacing));
        } else {
            bottomPosition = 20 + (toastIndex * (toastHeight + spacing));
        }
    }

    // Apply positioning styles with fixed positioning for corner display
    // Skip fixed positioning for notice banners (they use inline positioning)
    if (!toast.classList.contains('notice-banner')) {
        const additionalStyles = `
            position: fixed;
            top: ${typeof topPosition === 'number' ? topPosition + 'px' : topPosition};
            left: ${typeof leftPosition === 'number' ? leftPosition + 'px' : leftPosition};
            right: ${typeof rightPosition === 'number' ? rightPosition + 'px' : rightPosition};
            bottom: ${typeof bottomPosition === 'number' ? bottomPosition + 'px' : bottomPosition};
            transform: none;
            z-index: ${9999 + toastIndex};
        `;

        toast.style.cssText += additionalStyles;
    }
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

// formatCurrency moved to utils.js to avoid duplication

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
    const container = document.getElementById('orderSummary');
    if (!container) return;

    // Show skeleton loading initially
    showOrderSummarySkeleton(container);

    // Simulate async operation (in real app this might be fetching from server)
    setTimeout(() => {
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

        container.innerHTML = html;
    }, 800); // Simulate loading delay
}

function showOrderSummarySkeleton(container) {
    const skeletonHtml = `
        <div class="skeleton-order-summary">
            <div class="skeleton skeleton-order-summary-title"></div>
            <div class="skeleton-order-item">
                <div class="skeleton skeleton-order-item-name"></div>
                <div class="skeleton skeleton-order-item-qty"></div>
            </div>
            <div class="skeleton-order-item">
                <div class="skeleton skeleton-order-item-name"></div>
                <div class="skeleton skeleton-order-item-qty"></div>
            </div>
            <div class="skeleton-order-item">
                <div class="skeleton skeleton-order-item-name"></div>
                <div class="skeleton skeleton-order-item-qty"></div>
            </div>
        </div>
    `;
    container.innerHTML = skeletonHtml;
}

// Expose functions globally for use in other scripts
window.showToast = showToast;
window.showLoadingOverlay = showLoadingOverlay;
window.hideLoadingOverlay = hideLoadingOverlay;
window.showElementLoading = showElementLoading;
window.hideElementLoading = hideElementLoading;
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;

// Wrapper function for async toggleTheme to work with onclick handlers
window.toggleThemeClick = function () {
    toggleTheme().catch(error => {
        console.error('Error toggling theme:', error);
        showToast('Error changing theme. Please try again.', 'error');
    });
};

// ===== NOTICE DISPLAY FUNCTIONS =====
async function loadAndDisplayNotice() {
    try {
        const notices = await StorageManager.getNotices();
        displayNotices(notices);
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

function displayNotices(notices) {
    const heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;

    // Remove existing notice banners
    const existingBanners = heroContent.querySelectorAll('.notice-banner');
    existingBanners.forEach(banner => banner.remove());

    // Filter active notices and sort by priority (higher priority first)
    const activeNotices = notices
        .filter(notice => notice && notice.active !== false && notice.message)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (activeNotices.length === 0) {
        return;
    }

    // Find the position to insert notices (before the h1)
    const h1Element = heroContent.querySelector('h1');
    let insertPosition = h1Element;

    // Create and insert notice banners
    activeNotices.forEach((notice, index) => {
        const noticeBanner = createNoticeBanner(notice, index);
        heroContent.insertBefore(noticeBanner, insertPosition);
    });
}

function createNoticeBanner(notice, index) {
    const noticeBanner = document.createElement('div');
    noticeBanner.className = `notice-banner notice-${notice.type || 'info'}`;
    noticeBanner.id = `noticeBanner-${notice.id || index}`;
    noticeBanner.style.display = 'block';

    // Add slide-in animation with staggered delay
    noticeBanner.style.transform = 'translateY(-20px)';
    noticeBanner.style.opacity = '0';
    noticeBanner.style.transition = 'all 0.5s ease';

    setTimeout(() => {
        noticeBanner.style.transform = 'translateY(0)';
        noticeBanner.style.opacity = '1';
    }, 100 + (index * 100)); // Stagger animations

    const typeEmoji = getNoticeTypeEmoji(notice.type);
    const typeColor = getNoticeTypeColor(notice.type);

    noticeBanner.innerHTML = `
        <div class="notice-content">
            <span class="notice-icon">${typeEmoji}</span>
            <div class="notice-text">
                <strong id="noticeTitle-${notice.id || index}">${notice.title || 'Notice'}</strong>
                <span id="noticeMessage-${notice.id || index}">${notice.message}</span>
            </div>
            <button class="notice-close" onclick="hideNoticeBanner('${notice.id || index}')" title="Close notice">×</button>
        </div>
    `;

    return noticeBanner;
}

function hideNoticeBanner(noticeId) {
    const noticeBanner = document.getElementById(`noticeBanner-${noticeId}`);
    if (noticeBanner) {
        noticeBanner.style.transform = 'translateY(-20px)';
        noticeBanner.style.opacity = '0';
        setTimeout(() => {
            if (noticeBanner.parentNode) {
                noticeBanner.parentNode.removeChild(noticeBanner);
            }
        }, 300);
    }
}

function hideNotice() {
    // Legacy function for backward compatibility
    const noticeBanners = document.querySelectorAll('.notice-banner');
    noticeBanners.forEach(banner => {
        banner.style.transform = 'translateY(-20px)';
        banner.style.opacity = '0';
        setTimeout(() => {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        }, 300);
    });
}

function getNoticeTypeEmoji(type) {
    switch (type) {
        case 'success': return '✅';
        case 'warning': return '⚠️';
        case 'error': return '❌';
        case 'quote': return '💭';
        default: return 'ℹ️';
    }
}

function getNoticeTypeColor(type) {
    switch (type) {
        case 'success': return '#28a745';
        case 'warning': return '#ffc107';
        case 'error': return '#dc3545';
        case 'quote': return '#6f42c1';
        default: return '#007bff';
    }
}

// Make functions globally available
window.hideNotice = hideNotice;
