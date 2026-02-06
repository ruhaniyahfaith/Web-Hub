const defaultApps = [
    { name: "SIM Tracker", url: "sim-tracker/index.html", icon: "https://cdn-icons-png.flaticon.com/512/65/65686.png" }
];

let myApps = JSON.parse(localStorage.getItem('myHubApps')) || defaultApps;
let editingIndex = null;
let pendingApp = null; // Stores app info while waiting for password

const hubList = document.getElementById('hubList');
const hubModal = document.getElementById('hubModal');
const settingsModal = document.getElementById('settingsModal');
const passwordModal = document.getElementById('passwordModal');
const appOverlay = document.getElementById('appOverlay');
const appFrame = document.getElementById('appFrame');

// --- Rendering & Basic App Logic ---

function renderHub() {
    hubList.innerHTML = '';
    myApps.forEach((app, index) => {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <div class="menu-container">
                <button class="dots-btn" onclick="toggleMenu(event, ${index})">⋮</button>
                <div id="dropdown-${index}" class="dropdown">
                    <div class="dropdown-item" onclick="openEditModal(event, ${index})">Edit</div>
                    <div class="dropdown-item del" onclick="deleteApp(event, ${index})">Delete</div>
                </div>
            </div>
            <div onclick="launchApp('${app.url}', '${app.name}')">
                <img src="${app.icon}" class="app-logo" onerror="this.src='https://cdn-icons-png.flaticon.com/512/5738/5738031.png'">
                <h3>${app.name}</h3>
            </div>
        `;
        hubList.appendChild(card);
    });
}

function toggleMenu(event, index) {
    event.stopPropagation();
    document.querySelectorAll('.dropdown').forEach(d => {
        if(d.id !== `dropdown-${index}`) d.classList.remove('show');
    });
    document.getElementById(`dropdown-${index}`).classList.toggle('show');
}

// --- App Launching Logic (With Password Check) ---

function launchApp(url, name) {
    const savedPass = localStorage.getItem('hubPassword');
    
    // If password exists, request it
    if (savedPass) {
        pendingApp = { url, name };
        document.getElementById('unlockPass').value = '';
        passwordModal.style.display = 'flex';
        document.getElementById('unlockPass').focus();
    } else {
        // If no password set, open directly
        openAppDirectly(url, name);
    }
}

function verifyPassword() {
    const inputPass = document.getElementById('unlockPass').value;
    const savedPass = localStorage.getItem('hubPassword');

    if (inputPass === savedPass) {
        passwordModal.style.display = 'none';
        if (pendingApp) {
            openAppDirectly(pendingApp.url, pendingApp.name);
            pendingApp = null;
        }
    } else {
        alert("Incorrect Password!");
        document.getElementById('unlockPass').value = '';
    }
}

function closePasswordModal() {
    passwordModal.style.display = 'none';
    pendingApp = null;
}

function openAppDirectly(url, name) {
    document.getElementById('activeAppName').innerText = name;
    appFrame.src = url;
    appOverlay.style.display = 'flex';
}

function closeApp() {
    appOverlay.style.display = 'none';
    appFrame.src = '';
}

// --- App Management (Add/Edit/Delete) ---

function openHubModal() {
    editingIndex = null;
    document.getElementById('modalTitle').innerText = "Add New App";
    clearInputs();
    hubModal.style.display = 'flex';
}

function openEditModal(event, index) {
    event.stopPropagation();
    editingIndex = index;
    const app = myApps[index];
    document.getElementById('modalTitle').innerText = "Edit App";
    document.getElementById('appName').value = app.name;
    document.getElementById('appIcon').value = app.icon;
    document.getElementById('appUrl').value = app.url;
    hubModal.style.display = 'flex';
    document.getElementById(`dropdown-${index}`).classList.remove('show');
}

function deleteApp(event, index) {
    event.stopPropagation();
    if(confirm("Are you sure you want to delete this app?")) {
        myApps.splice(index, 1);
        localStorage.setItem('myHubApps', JSON.stringify(myApps));
        renderHub();
    }
}

function saveApp() {
    const name = document.getElementById('appName').value;
    const icon = document.getElementById('appIcon').value;
    const url = document.getElementById('appUrl').value;

    if (!name || !url) return alert("Fill Name and Path");

    const appData = { name, icon: icon || 'https://cdn-icons-png.flaticon.com/512/5738/5738031.png', url };

    if (editingIndex !== null) {
        myApps[editingIndex] = appData;
    } else {
        myApps.push(appData);
    }

    localStorage.setItem('myHubApps', JSON.stringify(myApps));
    renderHub();
    closeHubModal();
}

function closeHubModal() { hubModal.style.display = 'none'; }
function clearInputs() {
    document.getElementById('appName').value = '';
    document.getElementById('appIcon').value = '';
    document.getElementById('appUrl').value = '';
}

// --- Settings & Password Management ---

function openSettingsModal() {
    document.getElementById('oldPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confirmPass').value = '';
    
    // Hide "Old Password" field if no password is currently set
    if (!localStorage.getItem('hubPassword')) {
        document.getElementById('oldPassGroup').style.display = 'none';
    } else {
        document.getElementById('oldPassGroup').style.display = 'block';
    }
    
    settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

function updatePassword() {
    const currentStoredPass = localStorage.getItem('hubPassword');
    const oldPassInput = document.getElementById('oldPass').value;
    const newPassInput = document.getElementById('newPass').value;
    const confirmPassInput = document.getElementById('confirmPass').value;

    // Check old password if one exists
    if (currentStoredPass && oldPassInput !== currentStoredPass) {
        return alert("Current password is incorrect!");
    }

    if (!newPassInput) {
        return alert("Please enter a new password.");
    }

    if (newPassInput !== confirmPassInput) {
        return alert("New passwords do not match!");
    }

    localStorage.setItem('hubPassword', newPassInput);
    alert("Password updated successfully!");
    closeSettingsModal();
}

// --- Global Listeners ---

window.onclick = function(event) {
    if (!event.target.matches('.dots-btn')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
    }
    if (event.target == hubModal) closeHubModal();
    if (event.target == settingsModal) closeSettingsModal();
    // Do NOT close passwordModal on outside click to force entry or cancel
}

// Handle Enter key for password unlock
document.getElementById('unlockPass').addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        verifyPassword();
    }
});

renderHub();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('App Hub Service Worker Registered!');
        }).catch(err => console.log('Service Worker Error', err));
    });
}
