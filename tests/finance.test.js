import { describe, expect, test, beforeEach, vi } from 'vitest';

function createMockLocalStorage() {
    let store = {};

    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
            store[key] = String(value);
        },
        removeItem(key) {
            delete store[key];
        },
        clear() {
            store = {};
        }
    };
}

function setupFinanceDOM() {
    Object.defineProperty(window, 'localStorage', {
        value: createMockLocalStorage(),
        writable: true,
        configurable: true
    });

    document.body.innerHTML = `
        <div id="sidebar" style="display: none;"></div>
        <form id="transaction-form" style="display: none;">
            <input id="tr-id" value="" />
            <input id="tr-date" value="2024-03-01" />
            <select id="tr-category">
                <option value="Rent" selected>Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Supplies">Supplies</option>
            </select>
            <input id="tr-amount" value="50" />
            <input id="tr-notes" value="Test expense" />
            <button id="submitBtn">Add</button>
        </form>
        <table>
            <tbody id="tableBody"></tbody>
        </table>
        <div id="total-expenses"></div>
        <input id="searchInput" />
    `;

    window.i18n = {
        t: key => key
    };

    global.alert = vi.fn();

    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}

async function loadFinanceModule() {
    vi.resetModules();
    await import('../finances.js');
    return window.__financeTest__;
}

describe('finances.js', () => {
    beforeEach(() => {
        setupFinanceDOM();
    });

    test('escapes HTML text', async () => {
        const finance = await loadFinanceModule();

        expect(finance.escapeHTML('<script>alert("x")</script>')).toContain('&lt;script&gt;');
    });

    test('opens and closes sidebar', async () => {
        const finance = await loadFinanceModule();
        const sidebar = document.getElementById('sidebar');

        finance.openSidebar();
        expect(sidebar.style.display).toBe('block');

        finance.openSidebar();
        expect(sidebar.style.display).toBe('none');

        finance.closeSidebar();
        expect(sidebar.style.display).toBe('none');
    });

    test('opens and closes transaction form', async () => {
        const finance = await loadFinanceModule();
        const form = document.getElementById('transaction-form');

        finance.openForm();
        expect(form.style.display).toBe('block');

        finance.openForm();
        expect(form.style.display).toBe('none');

        finance.closeForm();
        expect(form.style.display).toBe('none');
    });

    test('converts category name to i18n key', async () => {
        const finance = await loadFinanceModule();

        expect(finance.getCategoryKey('Order Fulfillment')).toBe('orderfulfillment');
    });

    test('renders empty transaction state', async () => {
        const finance = await loadFinanceModule();

        window.localStorage.setItem('bizTrackTransactions', JSON.stringify([]));
        finance.initFinances();

        expect(document.getElementById('tableBody').innerHTML).toContain('No expenses found');
    });

    test('initialises default transactions when localStorage is empty', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));

        expect(stored.length).toBe(5);
        expect(document.querySelectorAll('.transaction-row').length).toBe(5);
        expect(document.getElementById('total-expenses').innerHTML).toContain('$455.00');
    });

    test('adds a new transaction with a valid positive amount', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('tr-date').value = '2024-03-10';
        document.getElementById('tr-category').value = 'Rent';
        document.getElementById('tr-amount').value = '75';
        document.getElementById('tr-notes').value = 'March rent';

        finance.newTransaction({ preventDefault: vi.fn() });

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));

        expect(stored.length).toBe(6);
        expect(stored[5].trID).toBe(6);
        expect(stored[5].trAmount).toBe(75);
    });

    test('adds a transaction after deletion without reusing an existing id', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.deleteTransaction(3);

        document.getElementById('tr-date').value = '2024-04-10';
        document.getElementById('tr-category').value = 'Supplies';
        document.getElementById('tr-amount').value = '60';
        document.getElementById('tr-notes').value = 'New supplies';

        finance.newTransaction({ preventDefault: vi.fn() });

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));
        const ids = stored.map(transaction => transaction.trID);

        expect(ids).toContain(6);
        expect(ids.filter(id => id === 5).length).toBe(1);
    });

    test('rejects invalid transaction amount', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('tr-amount').value = '-10';

        finance.newTransaction({ preventDefault: vi.fn() });

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));

        expect(stored.length).toBe(5);
        expect(global.alert).toHaveBeenCalled();
    });

    test('uses addOrUpdate to add a transaction', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('submitBtn').textContent = 'Add';
        document.getElementById('tr-amount').value = '30';

        finance.addOrUpdate({ preventDefault: vi.fn() });

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));

        expect(stored.length).toBe(6);
    });

    test('uses addOrUpdate to update a transaction', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('submitBtn').textContent = 'Update';
        document.getElementById('tr-id').value = '1';
        document.getElementById('tr-date').value = '2024-05-01';
        document.getElementById('tr-category').value = 'Utilities';
        document.getElementById('tr-amount').value = '95';
        document.getElementById('tr-notes').value = 'Updated by addOrUpdate';

        finance.addOrUpdate({ preventDefault: vi.fn() });

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));
        const updated = stored.find(transaction => transaction.trID === 1);

        expect(updated.trAmount).toBe(95);
        expect(updated.trNotes).toBe('Updated by addOrUpdate');
    });

    test('edits a row and fills form values', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.editRow(1);

        expect(document.getElementById('tr-id').value).toBe('1');
        expect(document.getElementById('tr-notes').value).toBe('January Rent');
        expect(document.getElementById('submitBtn').textContent).toBe('finances.form.update');
        expect(document.getElementById('transaction-form').style.display).toBe('block');
    });

    test('does nothing when editing a missing row', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.editRow(999);

        expect(document.getElementById('tr-id').value).toBe('');
    });

    test('deletes a transaction', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.deleteTransaction(3);

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));

        expect(stored.some(transaction => transaction.trID === 3)).toBe(false);
        expect(stored.length).toBe(4);
    });

    test('updates a transaction', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('tr-date').value = '2024-04-01';
        document.getElementById('tr-category').value = 'Utilities';
        document.getElementById('tr-amount').value = '88';
        document.getElementById('tr-notes').value = 'Updated bill';

        finance.updateTransaction(1);

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));
        const updated = stored.find(transaction => transaction.trID === 1);

        expect(updated.trAmount).toBe(88);
        expect(updated.trNotes).toBe('Updated bill');
    });

    test('does nothing when updating a missing transaction', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.updateTransaction(999);

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));

        expect(stored.length).toBe(5);
    });

    test('rejects invalid amount during update', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('tr-amount').value = 'abc';

        finance.updateTransaction(1);

        const stored = JSON.parse(window.localStorage.getItem('bizTrackTransactions'));
        const original = stored.find(transaction => transaction.trID === 1);

        expect(original.trAmount).toBe(100);
        expect(global.alert).toHaveBeenCalled();
    });

    test('displayExpenses safely returns when total element is missing', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        document.getElementById('total-expenses').remove();

        expect(() => finance.displayExpenses()).not.toThrow();
    });

    test('sorts transaction table by amount', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.sortTable('trAmount');

        const firstAmount = document.querySelector('.transaction-row').dataset.trAmount;

        expect(firstAmount).toBe('20');
    });

    test('sorts transaction table by category', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();
        finance.sortTable('trCategory');

        const firstCategory = document.querySelector('.transaction-row').dataset.trCategory;

        expect(firstCategory).toBe('Miscellaneous');
    });

    test('search hides non-matching rows', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        document.getElementById('searchInput').value = 'pizza';
        finance.performSearch();

        const visibleRows = Array.from(document.querySelectorAll('.transaction-row'))
            .filter(row => row.style.display !== 'none');

        expect(visibleRows.length).toBe(1);
        expect(visibleRows[0].textContent.toLowerCase()).toContain('pizza');
    });

    test('generates CSV content', async () => {
        const finance = await loadFinanceModule();

        const csv = finance.generateCSV([
            {
                trID: 1,
                trDate: '2024-01-05',
                trCategory: 'Rent',
                trAmount: '100.00',
                trNotes: 'January Rent'
            }
        ]);

        expect(csv).toContain('trID,trDate,trCategory,trAmount,trNotes');
        expect(csv).toContain('1,2024-01-05,Rent,100.00,January Rent');
    });

    test('exports transactions to CSV', async () => {
        const finance = await loadFinanceModule();

        finance.initFinances();

        const clickMock = vi.fn();
        vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
            if (tagName === 'a') {
                element.click = clickMock;
            }
            return element;
        });

        finance.exportToCSV();

        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(clickMock).toHaveBeenCalled();
    });
});