export function showModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show'); 
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');

    ['modalError', 'reqError', 'messageBoxContent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'messageBoxContent') el.textContent = ''; 
            else el.classList.add('hidden');
        }
    });
}

export function showMessageBox(message) {
    const messageBoxContent = document.getElementById('messageBoxContent');
    if (messageBoxContent) messageBoxContent.innerHTML = message; 
    showModal('messageBox');
}

export function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

export function updateElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = html;
}

export function toggleElementClass(elementId, className, force) {
    const element = document.getElementById(elementId);
    if (element) element.classList.toggle(className, force);
}

export function getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

export function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.value = value;
}

export function isElementChecked(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.checked : false;
}

export function setElementChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element) element.checked = checked;
}

export function getElementById(elementId){
    return document.getElementById(elementId);
} 