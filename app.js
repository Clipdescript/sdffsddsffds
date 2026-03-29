// Persistence keys
const STORAGE_ID_KEY = 'p2p_chat_my_id';
const STORAGE_MSGS_KEY = 'p2p_chat_messages';
const STORAGE_PEERS_KEY = 'p2p_chat_peers';
const STORAGE_USER_KEY = 'p2p_chat_username';

// Initialize Username
let myUsername = localStorage.getItem(STORAGE_USER_KEY) || 'Anonyme';

// Initialize PeerJS with persisted ID
let myId = localStorage.getItem(STORAGE_ID_KEY);
if (!myId) {
    myId = 'p2p-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_ID_KEY, myId);
}
const peer = new Peer(myId);

let activeConnections = {}; 
let peerList = JSON.parse(localStorage.getItem(STORAGE_PEERS_KEY) || '[]');

// DOM Elements
const statusEl = document.getElementById('status');
const headerMyIdEl = document.getElementById('header-my-id');
const headerCopyBtn = document.getElementById('header-copy-btn');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const peerListEl = document.getElementById('peer-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');
const myAvatar = document.getElementById('my-avatar');

// --- INITIALIZATION ---

function init() {
    usernameInput.value = myUsername;
    myAvatar.innerText = myUsername.charAt(0);
    loadMessages();
    updatePeerListUI();
}

function loadMessages() {
    const savedMsgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    savedMsgs.forEach(msg => {
        displayMessage(msg.text, msg.type, msg.user, false);
    });
}

function saveMessage(text, type, user) {
    const savedMsgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    savedMsgs.push({ text, type, user, time: Date.now() });
    localStorage.setItem(STORAGE_MSGS_KEY, JSON.stringify(savedMsgs));
}

function updatePeerListUI() {
    peerListEl.innerHTML = '';
    peerList.forEach(pId => {
        const li = document.createElement('li');
        li.className = 'peer-item';
        const isOnline = activeConnections[pId] && activeConnections[pId].open;
        li.innerHTML = `
            <div class="peer-avatar">${pId.charAt(0).toUpperCase()}</div>
            <div class="peer-info">
                <div class="peer-name">${pId.substring(0, 8)}...</div>
                <div class="peer-status-text">${isOnline ? 'En ligne' : 'Hors ligne'}</div>
            </div>
        `;
        peerListEl.appendChild(li);
    });
}

// --- PEER EVENTS ---

peer.on('open', (id) => {
    headerMyIdEl.innerText = id.substring(0, 8) + '...';
    statusEl.innerText = 'En ligne';
    peerList.forEach(pId => connectToPeer(pId));
});

peer.on('connection', (conn) => {
    setupConnection(conn);
});

peer.on('error', (err) => {
    console.error('Peer error:', err);
    statusEl.innerText = 'Erreur : ' + err.type;
});

// --- CONNECTION LOGIC ---

function connectToPeer(targetId) {
    if (!targetId || targetId === myId || activeConnections[targetId]) return;
    const conn = peer.connect(targetId);
    setupConnection(conn);
}

function setupConnection(conn) {
    conn.on('open', () => {
        activeConnections[conn.peer] = conn;
        if (!peerList.includes(conn.peer)) {
            peerList.push(conn.peer);
            localStorage.setItem(STORAGE_PEERS_KEY, JSON.stringify(peerList));
        }
        updatePeerListUI();
    });

    conn.on('data', (data) => {
        if (typeof data === 'object' && data.type === 'chat') {
            displayMessage(data.text, 'received', data.user, true);
        }
    });

    conn.on('close', () => {
        delete activeConnections[conn.peer];
        updatePeerListUI();
    });
}

// --- UI LOGIC ---

function displayMessage(msg, type, user, save = true) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${type}`;
    
    const userLabel = document.createElement('span');
    userLabel.className = 'msg-username';
    userLabel.innerText = user || 'Inconnu';
    
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = msg;
    
    wrapper.appendChild(userLabel);
    wrapper.appendChild(div);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (save) {
        saveMessage(msg, type, user);
    }
}

function broadcastMessage() {
    const msg = messageInput.value.trim();
    if (!msg) return;

    const payload = {
        type: 'chat',
        text: msg,
        user: myUsername
    };

    let sent = false;
    Object.values(activeConnections).forEach(conn => {
        if (conn.open) {
            conn.send(payload);
            sent = true;
        }
    });

    displayMessage(msg, 'sent', myUsername, true);
    messageInput.value = '';
}

// --- EVENT LISTENERS ---

saveUsernameBtn.addEventListener('click', () => {
    const newUsername = usernameInput.value.trim();
    if (newUsername) {
        myUsername = newUsername;
        localStorage.setItem(STORAGE_USER_KEY, myUsername);
        myAvatar.innerText = myUsername.charAt(0);
        alert('Pseudo mis à jour !');
    }
});

connectBtn.addEventListener('click', () => {
    const targetId = peerIdInput.value.trim();
    connectToPeer(targetId);
    peerIdInput.value = '';
});

sendBtn.addEventListener('click', broadcastMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') broadcastMessage();
});

headerCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myId).then(() => {
        const originalIcon = headerCopyBtn.innerText;
        headerCopyBtn.innerText = 'check';
        setTimeout(() => headerCopyBtn.innerText = 'content_copy', 2000);
    });
});

init();
