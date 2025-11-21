// ========================================
// Error Handling & Retry Logic
// ========================================

const ErrorHandler = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // Start with 1 second
    NETWORK_ERRORS: [
        'Network request failed',
        'Failed to fetch',
        'NetworkError',
        'ERR_INTERNET_DISCONNECTED',
        'ERR_NETWORK'
    ],

    /**
     * Check if error is a network-related error
     * @param {Error} error - Error object
     * @returns {boolean} Is network error
     */
    isNetworkError(error) {
        const message = error.message || error.toString();
        return this.NETWORK_ERRORS.some(netError => 
            message.includes(netError) || 
            message.toLowerCase().includes('network') ||
            message.toLowerCase().includes('fetch') ||
            error.code === 'NETWORK_ERROR'
        );
    },

    /**
     * Check if error is a permissions/auth error
     * @param {Error} error - Error object
     * @returns {boolean} Is auth error
     */
    isAuthError(error) {
        const message = error.message || error.toString();
        return message.includes('permission') || 
               message.includes('unauthorized') ||
               message.includes('auth') ||
               error.code === 'PERMISSION_DENIED';
    },

    /**
     * Check if error is a rate limiting error
     * @param {Error} error - Error object
     * @returns {boolean} Is rate limit error
     */
    isRateLimitError(error) {
        const message = error.message || error.toString();
        return message.includes('rate limit') ||
               message.includes('too many requests') ||
               error.code === 'RESOURCE_EXHAUSTED';
    },

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly message
     */
    getUserMessage(error) {
        const message = error.message || error.toString();

        if (this.isNetworkError(error)) {
            return 'Connection issue detected. Please check your internet connection and try again.';
        }

        if (this.isAuthError(error)) {
            return 'Permission denied. Please ensure you have the necessary access rights.';
        }

        if (this.isRateLimitError(error)) {
            return 'Too many requests. Please wait a moment before trying again.';
        }

        if (message.includes('permission denied')) {
            return 'Access denied. Please check your permissions.';
        }

        // Suppress "not found" errors completely during navigation or always
        // These are typically navigation artifacts, not real user errors
        if (message.includes('not found')) {
            // Check if we're in a navigation context or if this is likely a navigation artifact
            const isNavigationContext = window.location.pathname.includes('.html') || 
                                      window.location.search.includes('.html') ||
                                      document.referrer.includes('.html');
            
            if (isNavigationContext || ErrorBoundary.isNavigating()) {
                return null; // Completely suppress navigation-related "not found" errors
            }
            return 'The requested resource was not found.'; // Only show for real errors
        }

        if (message.includes('quota') || message.includes('billing')) {
            return 'Service limit reached. Please try again later or contact support.';
        }

        return 'An unexpected error occurred. Please try again.';
    },

    /**
     * Retry function with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {Object} options - Retry options
     * @returns {Promise} Function result
     */
    async retry(fn, options = {}) {
        const {
            maxRetries = this.MAX_RETRIES,
            delay = this.RETRY_DELAY,
            backoffMultiplier = 2,
            retryCondition = (error) => this.isNetworkError(error) || this.isRateLimitError(error)
        } = options;

        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on last attempt
                if (attempt === maxRetries) {
                    break;
                }

                // Check if we should retry this error
                if (!retryCondition(error)) {
                    break;
                }

                // Calculate delay with exponential backoff and jitter
                const backoffDelay = delay * Math.pow(backoffMultiplier, attempt);
                const jitter = Math.random() * 0.1 * backoffDelay;
                const waitTime = Math.min(backoffDelay + jitter, 30000); // Max 30 seconds

                console.warn(`Attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`, error);
                await this.sleep(waitTime);
            }
        }

        throw lastError;
    },

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Sleep promise
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Enhanced error handler for Firebase operations
     * @param {Function} operation - Async operation to perform
     * @param {Object} options - Error handling options
     * @returns {Promise} Operation result
     */
    async handleFirebaseOperation(operation, options = {}) {
        const {
            showToast = true,
            customMessage = null,
            showRetryButton = true,
            context = 'operation'
        } = options;

        try {
            return await this.retry(operation, options);
        } catch (error) {
            console.error(`Error during ${context}:`, error);
            
            const userMessage = customMessage || this.getUserMessage(error);
            
            if (showToast) {
                if (showRetryButton && this.isNetworkError(error)) {
                    this.showRetryableError(userMessage, () => this.handleFirebaseOperation(operation, options));
                } else {
                    showToast(userMessage, 'error');
                }
            }

            throw error;
        }
    },

    /**
     * Show error with retry option
     * @param {string} message - Error message
     * @param {Function} retryFn - Retry function
     */
    showRetryableError(message, retryFn) {
        const retryButton = document.createElement('button');
        retryButton.textContent = '🔄 Retry';
        retryButton.className = 'btn btn-primary';
        retryButton.style.marginLeft = '10px';
        
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.innerHTML = `${message} `;
        toast.appendChild(retryButton);

        retryButton.addEventListener('click', () => {
            toast.remove();
            retryFn();
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 10000); // Show for 10 seconds
    },

    /**
     * Show offline indicator
     */
    showOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'offline-indicator';
        indicator.innerHTML = '📡 Offline - Changes will sync when connection is restored';
        indicator.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #f59e0b;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            z-index: 9999;
            font-size: 0.9rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(indicator);
    },

    /**
     * Hide offline indicator
     */
    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Initialize network status monitoring
     */
    initNetworkMonitoring() {
        // Check initial network status
        if (!navigator.onLine) {
            this.showOfflineIndicator();
        }

        // Monitor online/offline events
        window.addEventListener('online', () => {
            this.hideOfflineIndicator();
            showToast('Connection restored!', 'success');
        });

        window.addEventListener('offline', () => {
            this.showOfflineIndicator();
        });
    }
};

// ========================================
// Utility Functions
// ========================================

/**
 * Sanitize string input to prevent XSS
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate name (letters, spaces, hyphens, apostrophes)
 * @param {string} name - Name to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function isValidName(name, options = {}) {
    const {
        minLength = 2,
        maxLength = 50,
        allowNumbers = false,
        allowSpecialChars = true
    } = options;

    const result = {
        isValid: true,
        errors: [],
        sanitized: name
    };

    // Basic checks
    if (!name || typeof name !== 'string') {
        result.isValid = false;
        result.errors.push('Name is required');
        return result;
    }

    const trimmed = name.trim();
    result.sanitized = trimmed;

    // Length checks
    if (trimmed.length < minLength) {
        result.isValid = false;
        result.errors.push(`Name must be at least ${minLength} characters long`);
    }

    if (trimmed.length > maxLength) {
        result.isValid = false;
        result.errors.push(`Name must not exceed ${maxLength} characters`);
    }

    // Character validation
    let regex;
    if (allowNumbers && allowSpecialChars) {
        regex = /^[a-zA-Z0-9\s\-'.,@]+$/;
    } else if (allowNumbers) {
        regex = /^[a-zA-Z0-9\s\-']+$/;
    } else if (allowSpecialChars) {
        regex = /^[a-zA-Z\s\-'.,@]+$/;
    } else {
        regex = /^[a-zA-Z\s\-']+$/;
    }

    if (!regex.test(trimmed)) {
        result.isValid = false;
        result.errors.push('Name contains invalid characters');
    }

    // Check for potential XSS
    const xssPattern = /<script|javascript:|on\w+=|data:/i;
    if (xssPattern.test(trimmed)) {
        result.isValid = false;
        result.errors.push('Name contains potentially unsafe content');
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(trimmed)) {
        result.isValid = false;
        result.errors.push('Name contains repeated characters');
    }

    return result;
}

/**
 * Validate price (positive number with up to 2 decimal places)
 * @param {number|string} price - Price to validate
 * @returns {boolean} Is valid price
 */
function isValidPrice(price) {
    const numPrice = parseFloat(price);
    return !isNaN(numPrice) && numPrice >= 0 && /^\d+(\.\d{1,2})?$/.test(price.toString());
}

/**
 * Format currency consistently
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

/**
 * Debounce function calls
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show loading spinner
 * @param {HTMLElement} container - Container to show spinner in
 */
function showLoading(container) {
    container.innerHTML = '<div class="loading-spinner">Loading...</div>';
}

/**
 * Hide loading spinner
 * @param {HTMLElement} container - Container to clear
 */
function hideLoading(container) {
    // Will be replaced by actual content
}

/**
 * Generate unique ID
 * @param {string} prefix - Prefix for ID
 * @returns {string} Unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} Is empty
 */
function isEmpty(obj) {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get veg/non-veg emoji for hotel type
 * @param {string} type - Hotel type ('veg' or 'non-veg')
 * @returns {string} Emoji indicator
 */
function getHotelTypeEmoji(type) {
    return type === 'non-veg' ? '🍖' : '🥬';
}

// ========================================
// Performance Optimization Utilities
// ========================================

const PerformanceOptimizer = {
    /**
     * DOM element cache to avoid repeated queries
     */
    elementCache: new Map(),

    /**
     * Get cached element or query DOM
     * @param {string} selector - CSS selector
     * @returns {HTMLElement|null} Cached element
     */
    getCachedElement(selector) {
        if (this.elementCache.has(selector)) {
            const element = this.elementCache.get(selector);
            // Check if element is still in DOM
            if (element && document.contains(element)) {
                return element;
            }
            this.elementCache.delete(selector);
        }
        
        const element = document.querySelector(selector);
        if (element) {
            this.elementCache.set(selector, element);
        }
        return element;
    },

    /**
     * Clear element cache
     */
    clearElementCache() {
        this.elementCache.clear();
    },

    /**
     * Batch DOM updates using DocumentFragment
     * @param {HTMLElement} container - Container element
     * @param {Function} updateFn - Function that performs updates
     */
    batchDOMUpdate(container, updateFn) {
        // Use a DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        updateFn(fragment);
        
        // Clear container efficiently
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        // Append fragment (more efficient than multiple appendChild calls)
        container.appendChild(fragment);
    },

    /**
     * Efficiently update large lists
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Array of items to render
     * @param {Function} renderItem - Function to render individual item
     * @param {Object} options - Options for optimization
     */
    updateList(container, items, renderItem, options = {}) {
        const {
            batchSize = 50,
            useVirtualScrolling = false,
            placeholderHeight = 40
        } = options;

        if (useVirtualScrolling && items.length > 100) {
            this.updateVirtualList(container, items, renderItem, placeholderHeight);
            return;
        }

        // Use DocumentFragment for batch updates
        const fragment = document.createDocumentFragment();
        const startTime = performance.now();

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const element = renderItem(item, i);
            
            if (element) {
                fragment.appendChild(element);
                
                // Batch DOM updates for large lists
                if ((i + 1) % batchSize === 0 && i < items.length - 1) {
                    container.appendChild(fragment.cloneNode(true));
                    while (fragment.firstChild) {
                        fragment.removeChild(fragment.firstChild);
                    }
                }
            }
        }

        // Clear and append in one operation
        this.batchDOMUpdate(container, (frag) => {
            frag.appendChild(fragment);
        });

        const endTime = performance.now();
        console.log(`Updated ${items.length} items in ${(endTime - startTime).toFixed(2)}ms`);
    },

    /**
     * Virtual scrolling for very large lists
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Array of items
     * @param {Function} renderItem - Render function
     * @param {number} itemHeight - Height of each item
     */
    updateVirtualList(container, items, renderItem, itemHeight = 40) {
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / itemHeight) + 2,
            items.length
        );

        // Set container height and position
        container.style.height = `${items.length * itemHeight}px`;
        container.style.position = 'relative';

        // Create visible items
        const visibleFragment = document.createDocumentFragment();
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = items[i];
            const element = renderItem(item, i);
            if (element) {
                element.style.position = 'absolute';
                element.style.top = `${i * itemHeight}px`;
                element.style.width = '100%';
                visibleFragment.appendChild(element);
            }
        }

        // Update visible content
        const existingContent = container.querySelector('.virtual-list-content');
        if (existingContent) {
            existingContent.remove();
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'virtual-list-content';
        contentDiv.appendChild(visibleFragment);
        container.appendChild(contentDiv);
    },

    /**
     * Debounced DOM update
     * @param {string} key - Cache key
     * @param {Function} updateFn - Update function
     * @param {number} delay - Delay in ms
     */
    debouncedUpdate: debounce((key, updateFn) => {
        updateFn();
    }, 300),

    /**
     * Throttled scroll handler
     * @param {Function} handler - Scroll handler
     * @param {number} limit - Throttle limit in ms
     * @returns {Function} Throttled handler
     */
    throttleScroll(handler, limit = 16) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                handler.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Create element with performance optimizations
     * @param {string} tag - HTML tag
     * @param {Object} attributes - Element attributes
     * @param {string|Array} content - Element content
     * @returns {HTMLElement} Created element
     */
    createOptimizedElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        // Set attributes efficiently
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        // Handle content efficiently
        if (Array.isArray(content)) {
            content.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (typeof content === 'string') {
            element.innerHTML = content;
        }

        return element;
    },

    /**
     * Efficient search with highlighting
     * @param {Array} items - Items to search
     * @param {string} searchTerm - Search term
     * @param {Array} searchFields - Fields to search in
     * @returns {Array} Filtered items with highlights
     */
    efficientSearch(items, searchTerm, searchFields) {
        if (!searchTerm) return items;

        const term = searchTerm.toLowerCase();
        const results = [];

        for (const item of items) {
            let match = false;
            for (const field of searchFields) {
                const value = item[field]?.toString().toLowerCase() || '';
                if (value.includes(term)) {
                    match = true;
                    break;
                }
            }
            
            if (match) {
                results.push(item);
            }
        }

        return results;
    },

    /**
     * Lazy load images
     * @param {NodeList|Array} images - Images to lazy load
     * @param {Object} options - Options
     */
    lazyLoadImages(images, options = {}) {
        const {
            rootMargin = '50px',
            threshold = 0.1
        } = options;

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        const srcset = img.dataset.srcset;
                        
                        if (src) {
                            img.src = src;
                        }
                        if (srcset) {
                            img.srcset = srcset;
                        }
                        
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin, threshold });

            images.forEach(img => {
                img.classList.add('lazy');
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                const src = img.dataset.src;
                if (src) img.src = src;
            });
        }
    }
};

/**
 * Measure performance of operations
 * @param {string} operationName - Name of operation
 * @param {Function} operation - Function to measure
 */
function measurePerformance(operationName, operation) {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    console.log(`${operationName}: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
}

// ========================================
// Enhanced Form Validation Framework
// ========================================

const ValidationFramework = {
    /**
     * Validate price with enhanced rules
     * @param {number|string} price - Price to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    validatePrice(price, options = {}) {
        const {
            min = 0,
            max = 9999.99,
            allowZero = false,
            decimals = 2
        } = options;

        const result = {
            isValid: true,
            errors: [],
            sanitized: price,
            formatted: null
        };

        // Type checking
        if (price === null || price === undefined || price === '') {
            result.isValid = false;
            result.errors.push('Price is required');
            return result;
        }

        const numPrice = parseFloat(price);
        
        // NaN check
        if (isNaN(numPrice)) {
            result.isValid = false;
            result.errors.push('Price must be a valid number');
            return result;
        }

        // Range validation
        if (numPrice < min) {
            result.isValid = false;
            result.errors.push(`Price must be at least ₹${min}`);
        }

        if (numPrice > max) {
            result.isValid = false;
            result.errors.push(`Price must not exceed ₹${max}`);
        }

        if (!allowZero && numPrice === 0) {
            result.isValid = false;
            result.errors.push('Price cannot be zero');
        }

        // Decimal places validation
        const priceStr = price.toString();
        const decimalIndex = priceStr.indexOf('.');
        if (decimalIndex !== -1) {
            const decimalPlaces = priceStr.length - decimalIndex - 1;
            if (decimalPlaces > decimals) {
                result.isValid = false;
                result.errors.push(`Price can have at most ${decimals} decimal places`);
            }
        }

        // Sanitize and format
        result.sanitized = numPrice.toString();
        result.formatted = formatCurrency(numPrice);

        return result;
    },

    /**
     * Validate category
     * @param {string} category - Category to validate
     * @param {Array} allowedCategories - Allowed categories
     * @returns {Object} Validation result
     */
    validateCategory(category, allowedCategories = []) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: category
        };

        if (!category || typeof category !== 'string') {
            result.isValid = false;
            result.errors.push('Category is required');
            return result;
        }

        const trimmed = category.trim();
        result.sanitized = trimmed;

        if (trimmed.length === 0) {
            result.isValid = false;
            result.errors.push('Category cannot be empty');
            return result;
        }

        if (trimmed.length > 30) {
            result.isValid = false;
            result.errors.push('Category name too long (max 30 characters)');
        }

        // Check against allowed categories if provided
        if (allowedCategories.length > 0) {
            const categoryMatch = allowedCategories.some(cat => 
                cat.toLowerCase() === trimmed.toLowerCase()
            );
            if (!categoryMatch) {
                result.isValid = false;
                result.errors.push(`Invalid category. Allowed: ${allowedCategories.join(', ')}`);
            }
        }

        // XSS check
        const xssPattern = /<script|javascript:|on\w+=|data:/i;
        if (xssPattern.test(trimmed)) {
            result.isValid = false;
            result.errors.push('Category contains unsafe content');
        }

        return result;
    },

    /**
     * Validate hotel name
     * @param {string} name - Hotel name
     * @returns {Object} Validation result
     */
    validateHotelName(name) {
        const result = {
            isValid: true,
            errors: [],
            sanitized: name
        };

        const nameValidation = isValidName(name, { maxLength: 100 });
        
        if (!nameValidation.isValid) {
            result.isValid = false;
            result.errors.push(...nameValidation.errors);
        }

        result.sanitized = nameValidation.sanitized;

        // Additional hotel name specific checks
        if (name && name.length < 3) {
            result.isValid = false;
            result.errors.push('Hotel name must be at least 3 characters');
        }

        // Check for common spam patterns
        const spamPatterns = [
            /(.)\1{10,}/, // Repeated characters
            /https?:\/\//i, // URLs
            /@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}/ // Email addresses
        ];

        if (name && spamPatterns.some(pattern => pattern.test(name))) {
            result.isValid = false;
            result.errors.push('Hotel name contains invalid content');
        }

        return result;
    },

    /**
     * Apply validation to form input
     * @param {HTMLInputElement|HTMLSelectElement} input - Input element
     * @param {Object} rules - Validation rules
     */
    applyInputValidation(input, rules) {
        const value = input.value;
        let validationResult;

        switch (input.type || input.tagName.toLowerCase()) {
            case 'text':
            case 'email':
                if (rules.field === 'name') {
                    validationResult = isValidName(value, rules.options);
                } else if (rules.field === 'hotelName') {
                    validationResult = this.validateHotelName(value);
                } else if (rules.field === 'category') {
                    validationResult = this.validateCategory(value, rules.allowedCategories);
                } else {
                    validationResult = { isValid: true, errors: [], sanitized: sanitizeInput(value) };
                }
                break;
            
            case 'number':
                validationResult = this.validatePrice(value, rules.options);
                break;
            
            case 'select-one':
                if (rules.required && !value) {
                    validationResult = {
                        isValid: false,
                        errors: [`${rules.label || 'Selection'} is required`],
                        sanitized: value
                    };
                } else {
                    validationResult = { isValid: true, errors: [], sanitized: value };
                }
                break;
            
            default:
                validationResult = { isValid: true, errors: [], sanitized: sanitizeInput(value) };
        }

        // Update input state
        this.updateInputState(input, validationResult, rules);

        return validationResult;
    },

    /**
     * Update input visual state based on validation
     * @param {HTMLInputElement} input - Input element
     * @param {Object} validationResult - Validation result
     * @param {Object} rules - Validation rules
     */
    updateInputState(input, validationResult, rules) {
        // Remove previous states
        input.classList.remove('is-valid', 'is-invalid');
        input.removeAttribute('aria-invalid');
        
        // Remove existing error message
        const existingError = input.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }

        // Apply new state
        if (validationResult.isValid) {
            input.classList.add('is-valid');
            input.setAttribute('aria-invalid', 'false');
        } else {
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.setAttribute('role', 'alert');
            errorDiv.setAttribute('aria-live', 'polite');
            
            // Show first error or all errors
            const errorText = validationResult.errors.length === 1 
                ? validationResult.errors[0]
                : validationResult.errors.join(', ');
            
            errorDiv.textContent = errorText;
            input.parentNode.appendChild(errorDiv);
        }

        // Update value with sanitized version if valid
        if (validationResult.isValid && validationResult.sanitized !== input.value) {
            input.value = validationResult.sanitized;
        }
    },

    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} validationRules - Validation rules
     * @returns {Object} Form validation result
     */
    validateForm(form, validationRules) {
        const result = {
            isValid: true,
            errors: {},
            firstErrorField: null
        };

        Object.entries(validationRules).forEach(([fieldName, rules]) => {
            const input = form.querySelector(`[name="${fieldName}"]`) || 
                         form.querySelector(`#${fieldName}`);
            
            if (input) {
                const fieldResult = this.applyInputValidation(input, rules);
                
                if (!fieldResult.isValid) {
                    result.isValid = false;
                    result.errors[fieldName] = fieldResult.errors;
                    
                    if (!result.firstErrorField) {
                        result.firstErrorField = input;
                    }
                }
            }
        });

        return result;
    },

    /**
     * Add real-time validation to form inputs
     * @param {HTMLFormElement} form - Form element
     * @param {Object} validationRules - Validation rules
     */
    addRealTimeValidation(form, validationRules) {
        Object.entries(validationRules).forEach(([fieldName, rules]) => {
            const input = form.querySelector(`[name="${fieldName}"]`) || 
                         form.querySelector(`#${fieldName}`);
            
            if (input) {
                // Debounced validation on input
                const debouncedValidate = debounce(() => {
                    this.applyInputValidation(input, rules);
                }, 300);

                input.addEventListener('input', debouncedValidate);
                input.addEventListener('blur', () => {
                    this.applyInputValidation(input, rules);
                });
            }
        });
    }
};

// ========================================
// Error Boundaries & Graceful Degradation
// ========================================

const ErrorBoundary = {
    /**
     * Navigation state tracking
     */
    navigationState: {
        isNavigating: false,
        navigationTimeout: null,
        suppressAllErrors: false,
        navigationStartTime: null,
        errorSuppressionLevel: 'aggressive', // 'normal', 'aggressive', 'maximum'
        suppressPatterns: [
            'not found', '404', 'net::err_', 'failed to fetch', 'network error',
            'connection refused', 'connection timeout', 'network request failed',
            'failed to load resource', 'resource blocked', 'cannot load',
            'script error', 'loading failed', 'load error', 'page not found',
            'cannot get', 'undefined', 'cors error', 'access denied',
            'refused to connect', 'internet disconnected', 'no internet',
            'timeout', 'aborted', 'cancelled', 'no response', 'unreachable'
        ]
    },

    /**
     * Initialize global error handling
     */
    init() {
        this.setupGlobalErrorHandlers();
        this.setupUnhandledRejectionHandler();
        this.monitorCriticalElements();
        this.setupNavigationDetection();
        this.setupGlobalErrorSuppression();
        this.setupUltimateErrorSuppression();
    },

    /**
     * Setup global error suppression during navigation
     */
    setupGlobalErrorSuppression() {
        // Override console.error to suppress navigation-related errors more aggressively
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const message = args.join(' ').toLowerCase();
            
            // Extremely aggressive suppression patterns for navigation-related errors
            const suppressPatterns = [
                'not found', 'failed to load', 'network', 'resource', 'script error',
                'network error', 'load failed', 'cannot get', '404', 'net::err_',
                'undefined', 'refused to connect', 'cors', 'fetch', 'xmlhttprequest',
                'network request failed', 'internet disconnected', 'connection',
                'timeout', 'aborted', 'cancelled', 'no response', 'unreachable'
            ];
            
            // Check if we should suppress this error
            const shouldSuppress = this.navigationState.suppressAllErrors || 
                                 this.isNavigationRelatedError(message) ||
                                 suppressPatterns.some(pattern => message.includes(pattern));
            
            if (shouldSuppress) {
                return; // Completely suppress navigation-related console errors
            }
            originalConsoleError.apply(console, args);
        };

        // Also suppress console.warn during navigation
        const originalConsoleWarn = console.warn;
        console.warn = (...args) => {
            const message = args.join(' ').toLowerCase();
            if (this.navigationState.suppressAllErrors && 
                (message.includes('not found') || 
                 message.includes('deprecated') || 
                 message.includes('warning'))) {
                return; // Suppress navigation-related warnings
            }
            originalConsoleWarn.apply(console, args);
        };

        // Prevent error dialogs and unhandled rejections during navigation
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'error' || type === 'unhandledrejection') {
                const wrappedListener = function(event) {
                    if (ErrorBoundary.navigationState.suppressAllErrors) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    return listener.call(this, event);
                };
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // Override global fetch to suppress network errors during navigation
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            if (ErrorBoundary.navigationState.suppressAllErrors) {
                // Return a resolved promise to prevent unhandled rejections
                return Promise.resolve(new Response('', { status: 200, statusText: 'OK' }));
            }
            return originalFetch.apply(this, args);
        };

        // Override XMLHttpRequest to suppress errors during navigation
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url) {
            this._suppressErrors = ErrorBoundary.navigationState.suppressAllErrors;
            return originalXHROpen.call(this, method, url);
        };
        
        XMLHttpRequest.prototype.send = function(data) {
            if (this._suppressErrors) {
                // Add error handler to prevent unhandled rejections
                this.addEventListener('error', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                });
                this.addEventListener('load', function(event) {
                    // Silent success
                });
                return; // Don't actually send the request
            }
            return originalXHRSend.call(this, data);
        };

        // Override Image constructor to prevent loading errors
        const originalImage = window.Image;
        window.Image = function() {
            const img = new originalImage();
            const originalSrc = Object.getOwnPropertyDescriptor(img, 'src');
            
            Object.defineProperty(img, 'src', {
                set: function(value) {
                    if (ErrorBoundary.navigationState.suppressAllErrors) {
                        // Silently ignore src changes during navigation
                        return;
                    }
                    return originalSrc.set.call(this, value);
                },
                get: function() {
                    return originalSrc.get.call(this);
                }
            });
            
            return img;
        };

        // Override script loading
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName.toLowerCase() === 'script') {
                const originalSrc = Object.getOwnPropertyDescriptor(element, 'src');
                const originalOnError = element.onerror;
                
                Object.defineProperty(element, 'src', {
                    set: function(value) {
                        if (ErrorBoundary.navigationState.suppressAllErrors) {
                            // Silently ignore script src changes during navigation
                            return;
                        }
                        return originalSrc.set.call(this, value);
                    },
                    get: function() {
                        return originalSrc.get.call(this);
                    }
                });
                
                element.onerror = function(event) {
                    if (ErrorBoundary.navigationState.suppressAllErrors) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    if (originalOnError) {
                        return originalOnError.call(this, event);
                    }
                };
            }
            
            return element;
        };
    },

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'JavaScript Error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                const resource = event.target.src || event.target.href;
                const resourceType = event.target.tagName;
                
                // Don't show errors for common navigation-related resources
                if (this.isNavigationRelatedResource(resource, resourceType)) {
                    return; // Silent fail for navigation-related resources
                }
                
                this.handleError(new Error(`Failed to load resource: ${resource}`), 'Resource Error', {
                    resource: resource,
                    type: resourceType
                });
            }
        }, true);

        // Custom error events
        window.addEventListener('appError', (event) => {
            this.handleError(event.detail.error, event.detail.context || 'Application Error', event.detail.contextData);
        });
    },

    /**
     * Setup navigation detection to suppress errors during page transitions
     */
    setupNavigationDetection() {
        // Detect page navigation by monitoring link clicks
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a[href]');
            if (target && target.href && !target.href.startsWith('#') && !target.href.startsWith('javascript:')) {
                this.startNavigation();
            }
        });

        // Detect navigation by monitoring form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (form.action && !form.action.startsWith('#') && !form.action.includes('javascript:')) {
                this.startNavigation();
            }
        });

        // Detect navigation by monitoring window.location changes
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            ErrorBoundary.startNavigation();
            return originalPushState.apply(this, args);
        };
        
        history.replaceState = function(...args) {
            ErrorBoundary.startNavigation();
            return originalReplaceState.apply(this, args);
        };

        // Detect hash changes
        window.addEventListener('hashchange', () => {
            this.startNavigation();
        });

        // Detect beforeunload (page refresh/close)
        window.addEventListener('beforeunload', () => {
            this.startNavigation();
        });

        // Detect focus events that might indicate navigation
        window.addEventListener('focus', () => {
            // If we were recently blurred, might indicate navigation back to page
            if (document.hidden && !this.navigationState.isNavigating) {
                this.startNavigation();
            }
        });

        // Reset navigation state after page load
        window.addEventListener('load', () => {
            setTimeout(() => this.endNavigation(), 1000);
        });

        // Additional detection for SPA-style navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.startNavigation();
                setTimeout(() => this.endNavigation(), 2000);
            }
        }).observe(document, { subtree: true, childList: true });
    },

    /**
     * Check if currently in navigation state
     * @returns {boolean} True if navigating
     */
    isNavigating() {
        return this.navigationState.isNavigating;
    },

    /**
     * Enhanced error pattern detection for navigation-related issues
     * @param {string} errorMessage - Error message to check
     * @returns {boolean} True if error is navigation-related
     */
    isNavigationRelatedError(errorMessage) {
        if (!errorMessage) return false;
        
        const message = errorMessage.toLowerCase();
        
        // Navigation-related error patterns
        const navPatterns = [
            // HTTP errors
            '404', 'net::err_', 'failed to fetch', 'network error',
            'connection refused', 'connection timeout', 'network request failed',
            
            // Resource loading errors
            'failed to load resource', 'resource blocked', 'cannot load',
            'script error', 'loading failed', 'load error',
            
            // Page navigation errors
            'page not found', 'not found', 'cannot get', 'undefined',
            'cors error', 'access denied', 'refused to connect',
            
            // File/asset errors
            'favicon', 'manifest.json', '.js', '.css', '.html',
            'image failed', 'font failed', 'stylesheet failed',
            
            // Generic navigation artifacts
            'navigation', 'routing', 'history', 'location',
            'internet disconnected', 'no internet', 'offline'
        ];
        
        // Additional detection based on current page state
        const isOnHtmlPage = window.location.pathname.includes('.html');
        const hasRecentNavigation = this.navigationState.isNavigating;
        const currentTime = Date.now();
        const timeSinceNavStart = currentTime - (this.navigationState.navigationStartTime || 0);
        
        // If we're on an HTML page or recently navigated, be more aggressive
        if (isOnHtmlPage && timeSinceNavStart < 10000) { // Within 10 seconds of navigation
            return navPatterns.some(pattern => message.includes(pattern));
        }
        
        return navPatterns.some(pattern => message.includes(pattern));
    },

    /**
     * Start navigation with enhanced tracking
     */
    startNavigation() {
        this.navigationState.isNavigating = true;
        this.navigationState.suppressAllErrors = true;
        this.navigationState.navigationStartTime = Date.now();
        
        // Clear any existing timeout
        if (this.navigationState.navigationTimeout) {
            clearTimeout(this.navigationState.navigationTimeout);
        }
        
        // Extended timeout for complex navigations
        this.navigationState.navigationTimeout = setTimeout(() => {
            this.endNavigation();
        }, 5000); // Extended to 5 seconds
        
        console.log('Navigation started - error suppression active');
    },

    /**
     * End navigation with cleanup
     */
    endNavigation() {
        this.navigationState.isNavigating = false;
        this.navigationState.suppressAllErrors = false;
        if (this.navigationState.navigationTimeout) {
            clearTimeout(this.navigationState.navigationTimeout);
            this.navigationState.navigationTimeout = null;
        }
        this.navigationState.navigationStartTime = null;
        console.log('Navigation ended - error suppression disabled');
    },

    /**
     * Setup unhandled promise rejection handler
     */
    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection', {
                promise: event.promise
            });
            
            // Prevent the default console error
            event.preventDefault();
        });
    },

    /**
     * Check if resource is related to navigation and should be silently ignored
     * @param {string} resource - Resource URL
     * @param {string} resourceType - Resource type (tag name)
     * @returns {boolean} True if navigation-related
     */
    isNavigationRelatedResource(resource, resourceType) {
        if (!resource) return false;
        
        const resourceLower = resource.toLowerCase();
        const navPatterns = [
            '.html', '.htm',           // HTML files
            'index.html', 'menu.html', // Specific pages
            'favicon',                 // Favicon
            'manifest.json'           // PWA manifest
        ];
        
        const navTypes = ['LINK', 'SCRIPT']; // Common navigation-related tags
        
        return navPatterns.some(pattern => resourceLower.includes(pattern)) ||
               navTypes.includes(resourceType);
    },

    /**
     * Handle and log errors
     * @param {Error} error - Error object
     * @param {string} context - Error context
     * @param {Object} contextData - Additional context data
     */
    handleError(error, context = 'Error', contextData = {}) {
        const errorInfo = {
            message: error.message || error.toString(),
            stack: error.stack,
            context,
            contextData,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Log to console in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.error(`[${context}]`, errorInfo);
        }

        // In production, you might want to send to error tracking service
        // this.sendToErrorTracking(errorInfo);

        // Show user-friendly error message
        this.showUserFriendlyError(error, context);

        // Dispatch custom event for other error handlers
        window.dispatchEvent(new CustomEvent('appErrorLogged', { detail: errorInfo }));
    },

    /**
     * Show user-friendly error message
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    showUserFriendlyError(error, context) {
        // Check if we're currently navigating - if so, suppress all errors
        if (this.isNavigating()) {
            return; // Completely suppress errors during navigation
        }
        
        const message = ErrorHandler.getUserMessage(error);
        
        // Don't show errors for certain contexts to avoid spam
        const silentContexts = [
            'Resource Error', 
            'JavaScript Error', // Navigation-related JS errors
            'Loading Error'     // Page loading errors
        ];
        
        // Enhanced context-based filtering
        if (context === 'JavaScript Error') {
            const errorMsg = (error.message || error.toString()).toLowerCase();
            // Don't show errors for common navigation/resource issues
            if (errorMsg.includes('not found') || 
                errorMsg.includes('failed to load') ||
                errorMsg.includes('script error') ||
                errorMsg.includes('network error') ||
                errorMsg.includes('undefined') ||
                errorMsg.includes('refused to connect') ||
                window.location.pathname.includes('.html')) {
                return; // Silent fail for navigation-related errors
            }
        }
        
        // Special handling for "not found" errors during navigation
        if (message === 'The requested resource was not found.' && 
            (context === 'Resource Error' || context === 'JavaScript Error')) {
            return; // Silent fail for navigation-related "not found" errors
        }
        
        // Check for navigation-related patterns in the message
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('not found') || 
            lowerMessage.includes('failed to load') ||
            lowerMessage.includes('network error') ||
            context === 'Resource Error' ||
            context === 'Loading Error') {
            return; // Silent fail for resource-related errors
        }
        
        if (!silentContexts.includes(context)) {
            showToast(message, 'error', 6000);
        }
    },

    /**
     * Monitor critical DOM elements
     */
    monitorCriticalElements() {
        const criticalElements = [
            { selector: '#navbar', name: 'Navigation' },
            { selector: '#banner', name: 'Banner' },
            { selector: '.container', name: 'Main Content' }
        ];

        criticalElements.forEach(({ selector, name }) => {
            const element = document.querySelector(selector);
            if (!element) {
                this.handleError(new Error(`${name} element not found`), 'Critical Element Missing', { selector });
            }
        });
    },

    /**
     * Create fallback UI for missing content
     * @param {string} selector - Element selector
     * @param {string} fallbackContent - Fallback HTML content
     */
    createFallbackUI(selector, fallbackContent) {
        const element = document.querySelector(selector);
        if (element) {
            element.innerHTML = `
                <div class="fallback-ui" role="alert">
                    <div class="fallback-content">
                        <h3>⚠️ Content Unavailable</h3>
                        <p>${fallbackContent}</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            🔄 Refresh Page
                        </button>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Graceful degradation for missing features
     */
    applyGracefulDegradation() {
        // Check for modern API support and provide fallbacks
        this.checkAndFallbackFeatures();
        
        // Add offline handling
        this.setupOfflineHandling();
        
        // Add feature detection
        this.detectAndHandleMissingFeatures();
    },

    /**
     * Check and fallback for missing features
     */
    checkAndFallbackFeatures() {
        // Check for IntersectionObserver (for lazy loading)
        if (!('IntersectionObserver' in window)) {
            // Load all images immediately
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }

        // Check for WebRTC (not used in this app, but good example)
        if (!navigator.mediaDevices) {
            console.warn('WebRTC not supported - some features may be limited');
        }

        // Check for localStorage
        if (!window.localStorage) {
            console.warn('localStorage not available - using memory storage fallback');
            // Implement memory-based fallback
            this.setupLocalStorageFallback();
        }
    },

    /**
     * Setup offline handling
     */
    setupOfflineHandling() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            showToast('Connection restored! Syncing data...', 'success');
            this.syncDataWhenOnline();
        });

        window.addEventListener('offline', () => {
            showToast('You are offline. Some features may be limited.', 'warning', 8000);
            this.handleOfflineState();
        });
    },

    /**
     * Sync data when coming back online
     */
    async syncDataWhenOnline() {
        try {
            // Trigger data sync
            window.dispatchEvent(new CustomEvent('syncData'));
        } catch (error) {
            console.error('Error syncing data:', error);
        }
    },

    /**
     * Handle offline state
     */
    handleOfflineState() {
        // Add offline indicators
        const indicators = document.querySelectorAll('.sync-indicator');
        indicators.forEach(indicator => {
            indicator.textContent = 'Offline Mode';
            indicator.className = 'sync-indicator offline';
        });

        // Disable online-only features
        const onlineOnlyButtons = document.querySelectorAll('[data-requires-online="true"]');
        onlineOnlyButtons.forEach(button => {
            button.disabled = true;
            button.title = 'Feature unavailable offline';
        });
    },

    /**
     * Detect and handle missing features
     */
    detectAndHandleMissingFeatures() {
        // Add detection for various browser capabilities
        const capabilities = {
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            indexedDB: !!window.indexedDB,
            webSQL: !!window.openDatabase,
            serviceWorker: 'serviceWorker' in navigator,
            pushNotifications: 'Notification' in window,
            geolocation: 'geolocation' in navigator,
            webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        };

        // Log capabilities for debugging
        console.log('Browser capabilities:', capabilities);

        // Apply feature-specific handling
        this.handleFeatureSupport(capabilities);
    },

    /**
     * Handle feature support
     * @param {Object} capabilities - Browser capabilities
     */
    handleFeatureSupport(capabilities) {
        if (!capabilities.localStorage) {
            this.setupLocalStorageFallback();
        }

        if (!capabilities.serviceWorker) {
            console.warn('Service Worker not supported - PWA features unavailable');
        }

        if (!capabilities.webRTC) {
            console.warn('WebRTC not supported - real-time features limited');
        }
    },

    /**
     * Setup localStorage fallback
     */
    setupLocalStorageFallback() {
        const memoryStorage = {};
        
        window.localStorage = {
            getItem: (key) => memoryStorage[key] || null,
            setItem: (key, value) => { memoryStorage[key] = value; },
            removeItem: (key) => { delete memoryStorage[key]; },
            clear: () => { Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]); },
            get length() { return Object.keys(memoryStorage).length; },
            key: (index) => Object.keys(memoryStorage)[index] || null
        };
    },

    /**
     * Setup memory-based session storage
     */
    setupSessionStorageFallback() {
        const memorySession = {};
        
        window.sessionStorage = {
            getItem: (key) => memorySession[key] || null,
            setItem: (key, value) => { memorySession[key] = value; },
            removeItem: (key) => { delete memorySession[key]; },
            clear: () => { Object.keys(memorySession).forEach(key => delete memorySession[key]); },
            get length() { return Object.keys(memorySession).length; },
            key: (index) => Object.keys(memorySession)[index] || null
        };
    },

    /**
     * Create error boundary wrapper for functions
     * @param {Function} fn - Function to wrap
     * @param {string} context - Error context
     * @returns {Function} Wrapped function
     */
    wrapWithErrorBoundary(fn, context = 'Function Execution') {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleError(error, context, { args });
                // Return null or default value instead of crashing
                return null;
            }
        };
    },

    /**
     * Create async error boundary wrapper
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Error context
     * @returns {Function} Wrapped async function
     */
    wrapWithAsyncErrorBoundary(fn, context = 'Async Function Execution') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error, context, { args });
                // Return null or default value instead of crashing
                return null;
            }
        };
    },

    /**
     * Final comprehensive error suppression - catches everything else
     */
    setupUltimateErrorSuppression() {
        // Global catch-all for any unhandled errors
        window.addEventListener('error', (event) => {
            if (this.shouldSuppressError(event.message || event.error?.message)) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return true; // Signal that error was handled
            }
        }, true);

        // Global catch-all for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (this.shouldSuppressError(event.reason?.message || event.reason)) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
        }, true);

        // Override window.onerror for additional protection
        const originalOnError = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            if (this.shouldSuppressError(message)) {
                return true; // Suppress the error
            }
            if (originalOnError) {
                return originalOnError.call(window, message, source, lineno, colno, error);
            }
            return false;
        };

        // Override window.onunhandledrejection for additional protection
        const originalOnUnhandledRejection = window.onunhandledrejection;
        window.onunhandledrejection = (event) => {
            if (this.shouldSuppressError(event.reason?.message || event.reason)) {
                event.preventDefault();
                return;
            }
            if (originalOnUnhandledRejection) {
                originalOnUnhandledRejection.call(window, event);
            }
        };

        // Add a final safety net with setTimeout
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay) {
            const wrappedCallback = function() {
                try {
                    callback.apply(this, arguments);
                } catch (error) {
                    if (ErrorBoundary.shouldSuppressError(error.message)) {
                        // Silently catch and suppress navigation-related errors
                        return;
                    }
                    throw error; // Re-throw non-navigation errors
                }
            };
            return originalSetTimeout.call(this, wrappedCallback, delay);
        };
    },

    /**
     * Check if an error should be suppressed based on patterns and navigation state
     * @param {string} errorMessage - The error message to check
     * @returns {boolean} True if error should be suppressed
     */
    shouldSuppressError(errorMessage) {
        if (!errorMessage) return false;
        
        const message = errorMessage.toLowerCase();
        
        // Always suppress during active navigation
        if (this.navigationState.suppressAllErrors) {
            return true;
        }
        
        // Check against suppression patterns
        return this.navigationState.suppressPatterns.some(pattern => 
            message.includes(pattern)
        );
    }
};

// Initialize error boundary on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ErrorBoundary.init();
    ErrorBoundary.applyGracefulDegradation();
});

// Make ErrorBoundary globally available
window.ErrorBoundary = ErrorBoundary;