/**
 * UI Module - Управление UI элементами
 */

const UIManager = {
    elements: {},
    state: {
        balance: 0
    },

    init(uiElements) {
        this.elements = uiElements;
    },

    updateBalance(newBalance) {
        this.state.balance = newBalance;
        if (this.elements.balance) {
            this.elements.balance.innerText = newBalance.toLocaleString();
            this.animatePop(this.elements.balance);
        }
    },

    animatePop(element) {
        element.classList.add('pop');
        setTimeout(() => element.classList.remove('pop'), 200);
    },

    showModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('hidden');
        }
    },

    hideModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('hidden');
        }
    },

    toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    },

    addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    },

    removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    },

    setHTML(element, html) {
        if (element) {
            element.innerHTML = html;
        }
    },

    setText(element, text) {
        if (element) {
            element.innerText = text;
        }
    }
};
