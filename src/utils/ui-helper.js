


export function toggleModal(modalId, show = true) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`toggleModal: Modal element with ID "${modalId}" not found.`);
        return;
    }
    
    if (show) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        document.body.style.overflow = '';
    }
}
