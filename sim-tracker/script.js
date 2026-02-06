let sims = JSON.parse(localStorage.getItem('simData')) || [];
let currentEditId = null;
let currentMode = 'add'; // add, edit, recharge

const simList = document.getElementById('simList');
const emptyState = document.getElementById('emptyState');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');

// Icons (SVG Strings)
const icons = {
    dots: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`
};

// Initial Render
renderSims();

function renderSims() {
    simList.innerHTML = '';
    
    if (sims.length === 0) {
        simList.appendChild(emptyState);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sims.forEach(sim => {
        const expiryDate = new Date(sim.expiry);
        expiryDate.setHours(0, 0, 0, 0);

        const diffTime = today - expiryDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

        let statusClass = '';
        let statusText = '';
        let textColor = '';

        if (diffDays <= 0) {
            // অ্যাক্টিভ (রিচার্জ আছে) - কালো
            statusClass = 'status-black';
            statusText = `Active (Expires in ${Math.abs(diffDays)} days)`;
            textColor = '#333';
        } else {
            // রিচার্জ শেষ - কাউন্টডাউন শুরু
            if (diffDays >= 90) {
                // ৯০ দিন পূর্ণ - সবুজ
                statusClass = 'status-green';
                statusText = `Safe/Inactive (${diffDays} days passed)`;
                textColor = 'green';
            } else {
                // ৯০ দিনের কম - লাল
                statusClass = 'status-red';
                statusText = `Warning! (${diffDays}/90 days passed)`;
                textColor = '#d32f2f';
            }
        }

        const card = document.createElement('div');
        card.className = `sim-card ${statusClass}`;
        
        // Operator Color Logic (Visual Only)
        let badgeColor = '#555';
        if(sim.operator === 'Jio') badgeColor = '#0057e7';
        if(sim.operator === 'Airtel') badgeColor = '#e40000';
        if(sim.operator === 'Vi') badgeColor = '#da291c';
        if(sim.operator === 'BSNL') badgeColor = '#008000';

        card.innerHTML = `
            <div class="card-header">
                <span class="operator-badge" style="background:${badgeColor}">${sim.operator}</span>
                <div style="position:relative;">
                    <button class="menu-btn" onclick="toggleMenu(${sim.id})">${icons.dots}</button>
                    <div id="menu-${sim.id}" class="dropdown">
                        <div class="dropdown-item" onclick="openRechargeModal(${sim.id})">Recharge (Add Days)</div>
                        <div class="dropdown-item" onclick="setRechargeEnd(${sim.id})">Recharge Ended</div>
                        <div class="dropdown-item" onclick="openEditModal(${sim.id})">Edit Info</div>
                        <div class="dropdown-item" onclick="deleteSim(${sim.id})">Delete</div>
                    </div>
                </div>
            </div>
            <div class="sim-details">
                <h3>${sim.name}</h3>
                <p>${sim.number}</p>
                <div class="status-text" style="color:${textColor}">${statusText}</div>
            </div>
        `;
        simList.appendChild(card);
    });
}

// Modal Functions
function openModal(mode) {
    currentMode = mode;
    modal.style.display = 'flex';
    document.getElementById('daysInputGroup').style.display = 'none';
    document.getElementById('dateInputGroup').style.display = 'block';

    if (mode === 'add') {
        modalTitle.innerText = 'Add New SIM';
        clearInputs();
    }
}

function closeModal() {
    modal.style.display = 'none';
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
}

// Input Handling
function clearInputs() {
    document.getElementById('simName').value = '';
    document.getElementById('simNumber').value = '';
    document.getElementById('simOperator').value = 'Jio';
    document.getElementById('simDate').value = '';
    document.getElementById('rechargeDays').value = '';
}

function saveSim() {
    const name = document.getElementById('simName').value;
    const number = document.getElementById('simNumber').value;
    const operator = document.getElementById('simOperator').value;
    
    if (currentMode === 'recharge') {
        const days = parseInt(document.getElementById('rechargeDays').value);
        if (!days) return alert('Please enter days');
        
        const sim = sims.find(s => s.id === currentEditId);
        // রিচার্জ করলে আজকের দিন থেকে দিন যোগ হবে
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        sim.expiry = newDate.toISOString().split('T')[0];
        
    } else {
        // Add or Edit
        const date = document.getElementById('simDate').value;
        if (!name || !number || !date) return alert('Please fill all info');

        if (currentMode === 'add') {
            const newSim = {
                id: Date.now(),
                name,
                number,
                operator,
                expiry: date
            };
            sims.push(newSim);
        } else if (currentMode === 'edit') {
            const sim = sims.find(s => s.id === currentEditId);
            sim.name = name;
            sim.number = number;
            sim.operator = operator;
            sim.expiry = date;
        }
    }

    localStorage.setItem('simData', JSON.stringify(sims));
    closeModal();
    renderSims();
}

// Menu Actions
function toggleMenu(id) {
    document.querySelectorAll('.dropdown').forEach(d => {
        if (d.id !== `menu-${id}`) d.classList.remove('show');
    });
    
    const menu = document.getElementById(`menu-${id}`);
    menu.classList.toggle('show');
}

// Edit Option
function openEditModal(id) {
    currentEditId = id;
    const sim = sims.find(s => s.id === id);
    
    document.getElementById('simName').value = sim.name;
    document.getElementById('simNumber').value = sim.number;
    document.getElementById('simOperator').value = sim.operator;
    document.getElementById('simDate').value = sim.expiry;
    
    modalTitle.innerText = 'Edit SIM Info';
    openModal('edit');
    document.getElementById(`menu-${id}`).classList.remove('show');
}

// Delete Option
function deleteSim(id) {
    if(confirm('Delete this SIM?')) {
        sims = sims.filter(s => s.id !== id);
        localStorage.setItem('simData', JSON.stringify(sims));
        renderSims();
    }
}

// Recharge Option (Add Days)
function openRechargeModal(id) {
    currentEditId = id;
    currentMode = 'recharge';
    modal.style.display = 'flex';
    modalTitle.innerText = 'Recharge SIM';
    
    document.getElementById('dateInputGroup').style.display = 'none';
    document.getElementById('daysInputGroup').style.display = 'block';
    
    const sim = sims.find(s => s.id === id);
    document.getElementById('simName').value = sim.name;
    document.getElementById('simNumber').value = sim.number;
    
    document.getElementById(`menu-${id}`).classList.remove('show');
}

// Recharge End Option (Force Start Count)
function setRechargeEnd(id) {
    const sim = sims.find(s => s.id === id);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    sim.expiry = yesterday.toISOString().split('T')[0];
    localStorage.setItem('simData', JSON.stringify(sims));
    renderSims();
    document.getElementById(`menu-${id}`).classList.remove('show');
}

// Close menu if clicked outside
window.onclick = function(event) {
    if (!event.target.matches('.menu-btn') && !event.target.closest('.menu-btn')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
    if (event.target == modal) {
        closeModal();
    }
}
