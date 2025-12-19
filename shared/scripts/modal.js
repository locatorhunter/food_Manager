// Modal Utilities for Lunch Manager
// Replaces browser alerts and confirms with modern modals

class ModalManager {
    constructor() {
        this.init();
    }

    init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('customModal')) {
            this.createModalHTML();
        }
        this.bindEvents();
    }

    createModalHTML() {
        const modalHTML = `
            <div id="customModal" class="modal" style="display: none;">
                <div class="modal-content custom-modal-content">
                    <div class="custom-modal-header">
                        <h2 id="modalTitle">Alert</h2>
                    </div>
                    <div class="custom-modal-body">
                        <p id="modalMessage"></p>
                    </div>
                    <div class="custom-modal-actions">
                        <button id="modalCancelBtn" class="btn btn-secondary">Cancel</button>
                        <button id="modalConfirmBtn" class="btn btn-primary">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        const modal = document.getElementById('customModal');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const confirmBtn = document.getElementById('modalConfirmBtn');

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            if (this.cancelCallback) {
                this.cancelCallback();
            }
            this.hide();
        });

        // Confirm button
        confirmBtn.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.hide();
        });
    }

    show(options = {}) {
        const {
            title = 'Alert',
            message = '',
            type = 'alert', // 'alert', 'confirm', 'success', 'error', 'warning'
            confirmText = 'OK',
            cancelText = 'Cancel',
            showCancel = false,
            onConfirm = null,
            onCancel = null
        } = options;

        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('modalTitle');
        const messageEl = document.getElementById('modalMessage');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const modalContent = document.querySelector('.custom-modal-content');

        // Set content
        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        // Set type-specific styling
        modalContent.className = 'modal-content custom-modal-content';
        if (type !== 'alert') {
            modalContent.classList.add(`modal-${type}`);
        }

        // Show/hide cancel button
        cancelBtn.style.display = showCancel ? 'inline-block' : 'none';

        // Set callbacks
        this.confirmCallback = onConfirm;
        this.cancelCallback = onCancel;

        // Show modal
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'auto'; // Ensure modal can receive events
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        // Focus management
        setTimeout(() => {
            if (showCancel) {
                cancelBtn.focus();
            } else {
                confirmBtn.focus();
            }
        }, 100);

        // Prevent accidental modal closing on double-click
        modal.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { once: true });
    }

    hide() {
        const modal = document.getElementById('customModal');
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // Convenience methods
    alert(message, title = 'Alert') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type: 'alert',
                showCancel: false,
                onConfirm: () => resolve(true)
            });
        });
    }

    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type: 'confirm',
                showCancel: true,
                confirmText: 'Yes',
                cancelText: 'No',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    success(message, title = 'Success') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type: 'success',
                showCancel: false,
                onConfirm: () => resolve(true)
            });
        });
    }

    error(message, title = 'Error') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type: 'error',
                showCancel: false,
                onConfirm: () => resolve(true)
            });
        });
    }
}

// Global instance
const modalManager = new ModalManager();

// Replace native functions
window.customAlert = modalManager.alert.bind(modalManager);
window.customConfirm = modalManager.confirm.bind(modalManager);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}