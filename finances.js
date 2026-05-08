function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openSidebar() {
    var side = document.getElementById('sidebar');
    side.style.display = (side.style.display === "block") ? "none" : "block";
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}

function openForm() {
    var form = document.getElementById("transaction-form");
    form.style.display = (form.style.display === "block") ? "none" : "block";
}

function closeForm() {
    document.getElementById("transaction-form").style.display = "none";
}

// Convert category names such as "Order Fulfillment" into "orderfulfillment" for i18n keys.
function getCategoryKey(name) {
    return name.replace(/\s+/g, '').toLowerCase();
}

let transactions = [];
let serialNumberCounter;

function getNextTransactionId() {
    if (!transactions || transactions.length === 0) {
        return 1;
    }

    return Math.max(...transactions.map(transaction => Number(transaction.trID))) + 1;
}

// Render expense table. This can be called again when the language changes.
window.renderTransactionsTable = function() {
    const transactionTableBody = document.getElementById("tableBody");
    if (!transactionTableBody) return;
    
    transactionTableBody.innerHTML = "";

    // Empty state
    if (!transactions || transactions.length === 0) {
        transactionTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-receipt" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                    <p style="font-size: 16px;">No expenses found. Click "Add Expense" to create one!</p>
                </td>
            </tr>
        `;
        return;
    }

    const t = window.i18n ? window.i18n.t : (key => key);

    transactions.forEach(transaction => {
        const transactionRow = document.createElement("tr");
        transactionRow.className = "transaction-row";

        transactionRow.dataset.trID = transaction.trID;
        transactionRow.dataset.trDate = transaction.trDate;
        transactionRow.dataset.trCategory = transaction.trCategory;
        transactionRow.dataset.trAmount = transaction.trAmount;
        transactionRow.dataset.trNotes = transaction.trNotes;

        const formattedAmount = typeof transaction.trAmount === 'number' ? `$${transaction.trAmount.toFixed(2)}` : '';
        
        const catKey = getCategoryKey(transaction.trCategory);
        const translatedCategory = t('finances.categories.' + catKey);

        transactionRow.innerHTML = `
            <td>${transaction.trID}</td>
            <td>${transaction.trDate}</td>
            <td>${escapeHTML(translatedCategory)}</td>
            <td class="tr-amount">${formattedAmount}</td>
            <td>${escapeHTML(transaction.trNotes)}</td>
            <td class="action">
                <i title="${t('common.edit')}" onclick="editRow('${transaction.trID}')" class="edit-icon fa-solid fa-pen-to-square"></i>
                <i onclick="deleteTransaction('${transaction.trID}')" class="delete-icon fas fa-trash-alt" title="${t('common.delete')}"></i>
            </td> 
        `;
        transactionTableBody.appendChild(transactionRow);
    });
    
    displayExpenses();
};

function initFinances() {
    const storedTransactions = localStorage.getItem("bizTrackTransactions");
    if (storedTransactions) {
        transactions = JSON.parse(storedTransactions);
    } else {
        transactions = [
            { trID: 1, trDate: "2024-01-05", trCategory: "Rent", trAmount: 100.00, trNotes: "January Rent" },
            { trID: 2, trDate: "2024-01-15", trCategory: "Order Fulfillment", trAmount: 35.00, trNotes: "Order #1005" },
            { trID: 3, trDate: "2024-01-08", trCategory: "Utilities", trAmount: 120.00, trNotes: "Internet" },
            { trID: 4, trDate: "2024-02-05", trCategory: "Supplies", trAmount: 180.00, trNotes: "Embroidery Machine" },
            { trID: 5, trDate: "2024-01-25", trCategory: "Miscellaneous", trAmount: 20.00, trNotes: "Pizza" },
        ];
        serialNumberCounter = transactions.length + 1;
        localStorage.setItem("bizTrackTransactions", JSON.stringify(transactions));
    }
    
    window.renderTransactionsTable();
}

function addOrUpdate(event) {
    event.preventDefault();
    let type = document.getElementById("submitBtn").textContent;
    const t = window.i18n ? window.i18n.t : (key => key);
    
    if (type === t('finances.form.submit') || type === 'Add') {
        newTransaction(event);
    } else if (type === t('finances.form.update') || type === 'Update') {
        const trId = document.getElementById("tr-id").value;
        updateTransaction(+trId);
    }
}

function newTransaction(event) {
    const trDate = document.getElementById("tr-date").value;
    const trCategory = document.getElementById("tr-category").value;
    const trAmount = parseFloat(document.getElementById("tr-amount").value);
    const trNotes = document.getElementById("tr-notes").value;

    if (!Number.isFinite(trAmount) || trAmount <= 0) {
        alert("Please enter a valid positive amount.");
        return;
    }
    
    const transaction = {
        trID: getNextTransactionId(),
        trDate,
        trCategory,
        trAmount,
        trNotes,
    };
    
    transactions.push(transaction);
    saveAndRender();
    document.getElementById("transaction-form").reset();
}

function editRow(trID) {
    const trToEdit = transactions.find(transaction => transaction.trID == trID);
    if (!trToEdit) return;
    
    document.getElementById("tr-id").value = trToEdit.trID;      
    document.getElementById("tr-date").value = trToEdit.trDate;
    document.getElementById("tr-category").value = trToEdit.trCategory;
    document.getElementById("tr-amount").value = trToEdit.trAmount;
    document.getElementById("tr-notes").value = trToEdit.trNotes;
  
    const t = window.i18n ? window.i18n.t : (key => key);
    document.getElementById("submitBtn").textContent = t('finances.form.update');

    openForm();
}

function deleteTransaction(trID) {
    transactions = transactions.filter(t => t.trID != trID);
    saveAndRender();
}

function updateTransaction(trID) {
    const indexToUpdate = transactions.findIndex(transaction => transaction.trID === trID);
    if (indexToUpdate === -1) return;

    const trAmount = parseFloat(document.getElementById("tr-amount").value);

    if (!Number.isFinite(trAmount) || trAmount <= 0) {
        alert("Please enter a valid positive amount.");
        return;
    }

    transactions[indexToUpdate] = {
        trID: trID,
        trDate: document.getElementById("tr-date").value,
        trCategory: document.getElementById("tr-category").value,
        trAmount,
        trNotes: document.getElementById("tr-notes").value,
    };

    saveAndRender();
    document.getElementById("transaction-form").reset();
    
    const t = window.i18n ? window.i18n.t : (key => key);
    document.getElementById("submitBtn").textContent = t('finances.form.submit');
}

function saveAndRender() {
    localStorage.setItem("bizTrackTransactions", JSON.stringify(transactions));
    window.renderTransactionsTable();
}

function displayExpenses() {
    const resultElement = document.getElementById("total-expenses");
    const t = window.i18n ? window.i18n.t : (key => key);

    if (!resultElement) return;

    const totalExpenses = transactions.reduce((total, transaction) => total + transaction.trAmount, 0);

    resultElement.innerHTML = `
        <span>${t('finances.totalLabel')}: $${totalExpenses.toFixed(2)}</span>
    `;
}

function sortTable(column) {
    const tbody = document.getElementById("tableBody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const isNumeric = column === "trID" || column === "trAmount";

    const sortedRows = rows.sort((a, b) => {
        const aValue = isNumeric ? parseFloat(a.dataset[column]) : a.dataset[column];
        const bValue = isNumeric ? parseFloat(b.dataset[column]) : b.dataset[column];
        if (typeof aValue === "string" && typeof bValue === "string") {
            return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
        } else {
            return aValue - bValue;
        }
    });

    rows.forEach(row => tbody.removeChild(row));
    sortedRows.forEach(row => tbody.appendChild(row));
}

document.getElementById("searchInput").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        performSearch();
    }
});

function performSearch() {
    const searchInput = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll(".transaction-row");
    rows.forEach(row => {
        const visible = row.innerText.toLowerCase().includes(searchInput);
        row.style.display = visible ? "table-row" : "none";
    });
}

function exportToCSV() {
    const transactionsToExport = transactions.map(transaction => {
        return {
            trID: transaction.trID,
            trDate: transaction.trDate,
            trCategory: transaction.trCategory,
            trAmount: transaction.trAmount.toFixed(2),
            trNotes: transaction.trNotes,
        };
    });
  
    const csvContent = generateCSV(transactionsToExport);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'biztrack_expense_table.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
  
function generateCSV(data) {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(order => Object.values(order).join(','));
    return `${headers}\n${rows.join('\n')}`;
}

window.addEventListener('load', initFinances);