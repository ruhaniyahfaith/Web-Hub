// --- STATE MANAGEMENT ---
let data = {
    profile: { name: "", mobile: "", photo: "", darkMode: false },
    balance: 0,
    transactions: [],
    goals: [],
    lists: []
};

// Global variables for temporary state
let tempImgBase64 = "";
let activeListId = null; 

// --- INIT & UTILS ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateUI();
});

function loadData() {
    const stored = localStorage.getItem('moneyTrackerData');
    if (stored) {
        data = JSON.parse(stored);
        if (data.profile.name) {
            document.getElementById('auth-view').classList.remove('active');
            document.getElementById('app-wrapper').classList.remove('hidden');
        }
        if (data.profile.darkMode) document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = data.profile.darkMode;
    }
}

function saveData() {
    localStorage.setItem('moneyTrackerData', JSON.stringify(data));
    updateUI();
}

function formatCurrency(amount) {
    return "₹ " + parseFloat(amount).toLocaleString('en-IN');
}

// --- AUTHENTICATION & PROFILE ---
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
            tempImgBase64 = e.target.result; // Store temporarily
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function handleLogin() {
    const name = document.getElementById('auth-name').value;
    const mobile = document.getElementById('auth-mobile').value;
    
    if (!name) return alert("Please enter your name");

    data.profile.name = name;
    data.profile.mobile = mobile;
    
    // Use uploaded photo or default
    data.profile.photo = tempImgBase64 || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    
    saveData();
    location.reload();
}

// --- SETTINGS: EDIT PROFILE ---
function openEditProfile() {
    document.getElementById('edit-profile-name').value = data.profile.name;
    document.getElementById('edit-profile-mobile').value = data.profile.mobile;
    document.getElementById('edit-img-preview').src = data.profile.photo;
    tempImgBase64 = data.profile.photo; // Keep existing photo if not changed
    openModal('profile-edit-modal');
}

function saveProfileChanges() {
    const name = document.getElementById('edit-profile-name').value;
    const mobile = document.getElementById('edit-profile-mobile').value;

    if(name) data.profile.name = name;
    if(mobile) data.profile.mobile = mobile;
    data.profile.photo = tempImgBase64; // Update photo

    closeModal('profile-edit-modal');
    saveData();
}

function handleLogout() {
    if(confirm("Are you sure? All data will be deleted.")) {
        localStorage.removeItem('moneyTrackerData');
        location.reload();
    }
}

// --- NAVIGATION ---
function switchTab(viewId, navEl) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    navEl.classList.add('active');
    
    const fab = document.getElementById('home-fab');
    viewId === 'home-view' ? fab.classList.remove('hidden') : fab.classList.add('hidden');
}

// --- HOME & TRANSACTIONS ---
let currentTransType = 'income';

function toggleBalance() {
    const el = document.getElementById('balance-display');
    const eye = document.getElementById('eye-icon');
    if (el.innerText.includes('•')) {
        el.innerText = formatCurrency(data.balance);
        eye.classList.replace('fa-eye-slash', 'fa-eye');
    } else {
        el.innerText = '••••••';
        eye.classList.replace('fa-eye', 'fa-eye-slash');
    }
}

function setTransType(type) {
    currentTransType = type;
    document.getElementById('btn-inc').classList.toggle('active', type === 'income');
    document.getElementById('btn-exp').classList.toggle('active', type === 'expense');
}

function saveTransaction() {
    const amount = parseFloat(document.getElementById('t-amount').value);
    const note = document.getElementById('t-note').value;
    if (!amount) return alert("Enter amount");

    const trans = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        type: currentTransType,
        amount: amount,
        note: note || (currentTransType === 'income' ? 'Income' : 'Expense')
    };

    data.transactions.unshift(trans);
    data.balance += currentTransType === 'income' ? amount : -amount;
    
    closeModal('transaction-modal');
    document.getElementById('t-amount').value = '';
    document.getElementById('t-note').value = '';
    saveData();
}

function clearHistory() {
    if(confirm("Clear transaction history? Balance will remain same.")) {
        data.transactions = [];
        saveData();
    }
}

// --- GOALS ---
function saveGoal() {
    const name = document.getElementById('g-name').value;
    const target = parseFloat(document.getElementById('g-amount').value);
    const date = document.getElementById('g-date').value;
    
    if (!name || !target || !date) return alert("Fill all fields");

    data.goals.push({ id: Date.now(), name, target, date });
    closeModal('goal-modal');
    saveData();
}

function deleteGoal(id) {
    data.goals = data.goals.filter(g => g.id !== id);
    saveData();
}

// --- LISTS (SMART LOGIC) ---
function createList() {
    const name = document.getElementById('l-name').value;
    if (!name) return;
    data.lists.push({ id: Date.now(), name, items: [] });
    closeModal('list-create-modal');
    saveData();
}

// Open modal to add item
function openAddItemModal(listId) {
    activeListId = listId;
    document.getElementById('item-name').value = '';
    document.getElementById('item-qty').value = '';
    openModal('item-add-modal');
}

// Save item from modal
function saveListItem() {
    const name = document.getElementById('item-name').value;
    const qty = document.getElementById('item-qty').value;
    const unit = document.getElementById('item-unit').value;

    if (!name) return alert("Enter Item Name");

    const list = data.lists.find(l => l.id === activeListId);
    if(list) {
        list.items.push({ 
            id: Date.now(), 
            name: name, 
            qty: qty || '1', 
            unit: unit, 
            checked: false 
        });
        saveData();
    }
    closeModal('item-add-modal');
}

function toggleItemCheck(listId, itemId) {
    const list = data.lists.find(l => l.id === listId);
    const item = list.items.find(i => i.id === itemId);
    item.checked = !item.checked;
    saveData();
}

function processList(listId, type) {
    const list = data.lists.find(l => l.id === listId);
    const checkedItems = list.items.filter(i => i.checked);
    
    if (checkedItems.length === 0) return alert("No items selected");

    if (type === 'deduct') {
        const amount = parseFloat(prompt("Enter Total Amount to Deduct:"));
        if (amount) {
            data.balance -= amount;
            data.transactions.unshift({
                id: Date.now(),
                date: new Date().toLocaleString(),
                type: 'expense',
                amount: amount,
                note: `List: ${list.name}`
            });
            saveData();
            alert("Balance Deducted!");
        }
    } else if (type === 'calc') {
        // Advanced Calculation Modal
        const container = document.getElementById('calc-inputs');
        container.innerHTML = '';
        container.classList.remove('hidden');
        document.getElementById('logic-msg').innerText = "Enter price per item:";
        
        checkedItems.forEach(item => {
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
                    <div style="flex:1">
                        <span style="font-size:14px; font-weight:500;">${item.name}</span>
                        <div style="font-size:10px; color:#888;">Qty: ${item.qty} ${item.unit}</div>
                    </div>
                    <input type="number" class="calc-price" data-name="${item.name}" placeholder="₹ Price" style="width:80px; padding:8px; border-radius:6px; border:1px solid #ddd;">
                </div>`;
        });

        openModal('list-logic-modal');
        
        document.getElementById('logic-confirm-btn').onclick = function() {
            let total = 0;
            document.querySelectorAll('.calc-price').forEach(input => {
                const val = parseFloat(input.value) || 0;
                if(val > 0) total += val;
            });

            if (total > 0) {
                if(confirm(`Total is ₹${total}. Deduct from balance?`)) {
                    data.balance -= total;
                    data.transactions.unshift({
                        id: Date.now(),
                        date: new Date().toLocaleString(),
                        type: 'expense',
                        amount: total,
                        note: `List: ${list.name}`
                    });
                    closeModal('list-logic-modal');
                    saveData();
                }
            } else {
                alert("Total is 0. Please enter prices.");
            }
        };
    }
}

function deleteList(id) {
    if(confirm("Delete this list?")) {
        data.lists = data.lists.filter(l => l.id !== id);
        saveData();
    }
}

function deleteListItem(listId, itemId) {
    const list = data.lists.find(l => l.id === listId);
    list.items = list.items.filter(i => i.id !== itemId);
    saveData();
}

// --- UI RENDERING ---
function updateUI() {
    // 1. Home
    document.getElementById('home-username').innerText = data.profile.name || "User";
    document.getElementById('home-user-img').src = data.profile.photo;
    document.getElementById('setting-user-img').src = data.profile.photo;
    document.getElementById('balance-display').innerText = formatCurrency(data.balance);
    
    // Calc Totals
    const inc = data.transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const exp = data.transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    document.getElementById('total-income').innerText = formatCurrency(inc);
    document.getElementById('total-expense').innerText = formatCurrency(exp);

    // List Transactions
    const tList = document.getElementById('transaction-list');
    tList.innerHTML = data.transactions.length ? data.transactions.map(t => `
        <div class="trans-item">
            <div>
                <h4>${t.note}</h4>
                <p style="font-size:10px; color:#aaa;">${t.date}</p>
            </div>
            <div class="trans-amount ${t.type === 'income' ? 'inc' : 'exp'}">
                ${t.type === 'income' ? '+' : '-'} ₹${t.amount}
            </div>
        </div>
    `).join('') : '<p style="text-align:center; color:#ccc; margin-top:20px;">No transactions yet</p>';

    // 2. Goals
    const gList = document.getElementById('goal-list');
    gList.innerHTML = data.goals.length ? data.goals.map(g => {
        const diffTime = new Date(g.date) - new Date();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dailyNeed = days > 0 ? (g.target / days).toFixed(0) : g.target;
        
        return `
        <div class="goal-card">
            <div class="goal-header">
                <h3>${g.name}</h3>
                <button class="btn-del" onclick="deleteGoal(${g.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h2 style="color:var(--primary)">₹${g.target}</h2>
                    <span class="goal-calc">Save ₹${dailyNeed} / day</span>
                </div>
                <span class="goal-days">${days > 0 ? days + ' days left' : 'Time Up!'}</span>
            </div>
        </div>`;
    }).join('') : '<p style="text-align:center; color:#ccc; margin-top:20px;">No goals added</p>';

    // 3. Smart Lists
    const sList = document.getElementById('smart-lists-container');
    sList.innerHTML = data.lists.length ? data.lists.map(l => `
        <div class="list-card">
            <div class="lc-header">
                <span>${l.name}</span>
                <button class="btn-del" onclick="deleteList(${l.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="lc-body">
                ${l.items.map(i => `
                    <div class="lc-item">
                        <div class="lc-check-group">
                            <input type="checkbox" ${i.checked ? 'checked' : ''} onchange="toggleItemCheck(${l.id}, ${i.id})">
                            <div style="display:flex; flex-direction:column;">
                                <span style="${i.checked ? 'text-decoration:line-through; color:#aaa' : ''}; font-size:14px; font-weight:500;">
                                    ${i.name}
                                </span>
                                <span class="lc-qty">${i.qty} ${i.unit}</span>
                            </div>
                        </div>
                        <button class="btn-del" onclick="deleteListItem(${l.id}, ${i.id})">×</button>
                    </div>
                `).join('')}
                <div class="add-item-row">
                    <button class="small-btn" style="background:#e0e7ff; color:var(--primary)" onclick="openAddItemModal(${l.id})">+ Add Item</button>
                </div>
            </div>
            <div class="lc-actions">
                <button class="btn-save" onclick="processList(${l.id}, 'deduct')">Direct Deduct</button>
                <button class="btn-save" style="background:#1e293b;" onclick="processList(${l.id}, 'calc')">Calc & Deduct</button>
            </div>
        </div>
    `).join('') : '<p style="text-align:center; color:#ccc; margin-top:20px;">Create a list to start</p>';
}

// --- MODAL UTILS ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    data.profile.darkMode = document.body.classList.contains('dark-mode');
    saveData();
}
