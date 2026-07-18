/**
 * ui-helper.js - Reusable utility functions for common UI interactions
 */

/**
 * Toggles a modal's active class and manages background scroll behavior.
 * @param {string} modalId - The HTML id of the modal container.
 * @param {boolean} show - True to display the modal, false to close it.
 */
export function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`toggleModal: Modal element with ID "${modalId}" not found.`);
        return;
    }
    
    if (show) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        // Restore background scrolling
        document.body.style.overflow = '';
    }
}
