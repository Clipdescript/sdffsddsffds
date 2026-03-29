// Persistence keys
const STORAGE_ID_KEY = 'p2p_chat_my_id';
const STORAGE_MSGS_KEY = 'p2p_chat_messages';
const STORAGE_PEERS_KEY = 'p2p_chat_peers';

// Initialize PeerJS with persisted ID if available
let myId = localStorage.getItem(STORAGE_ID_KEY);
const peer = new Peer(myId); // Peer will use myId if provided, else generate one

let activeConnections = {}; // Track all active connections by peerId
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

// --- INITIALIZATION ---

// Load messages from localStorage
function loadMessages() {
    const savedMsgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    savedMsgs.forEach(msg => {
        displayMessage(msg.text, msg.type, false);
    });
}

// Save message to localStorage
function saveMessage(text, type) {
    const savedMsgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    savedMsgs.push({ text, type, time: Date.now() });
    localStorage.setItem(STORAGE_MSGS_KEY, JSON.stringify(savedMsgs));
}

// Update Peer List UI
function updatePeerListUI() {
    peerListEl.innerHTML = '';
    peerList.forEach(pId => {
        const li = document.createElement('li');
        li.className = 'peer-item';
        const isOnline = activeConnections[pId] && activeConnections[pId].open;
        li.innerHTML = `
            <span>${pId.substring(0, 8)}...</span>
            <span class="peer-status ${isOnline ? '' : 'offline'}"></span>
        `;
        peerListEl.appendChild(li);
    });
}

// --- PEER EVENTS ---

peer.on('open', (id) => {
    myId = id;
    localStorage.setItem(STORAGE_ID_KEY, id);
    headerMyIdEl.innerText = id.substring(0, 8) + '...';
    statusEl.innerText = 'En ligne';
    
    // Attempt to reconnect to previous peers
    peerList.forEach(pId => {
        if (!activeConnections[pId]) {
            connectToPeer(pId);
        }
    });
    
    updatePeerListUI();
});

// Incoming connections
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
        statusEl.innerText = 'Connecté';
        updatePeerListUI();
    });

    conn.on('data', (data) => {
        displayMessage(data, 'received', true);
    });

    conn.on('close', () => {
        delete activeConnections[conn.peer];
        updatePeerListUI();
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        delete activeConnections[conn.peer];
        updatePeerListUI();
    });
}

// --- UI LOGIC ---

function displayMessage(msg, type, save = true) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = msg;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (save) {
        saveMessage(msg, type);
    }
}

function broadcastMessage() {
    const msg = messageInput.value.trim();
    if (!msg) return;

    let sent = false;
    Object.values(activeConnections).forEach(conn => {
        if (conn.open) {
            conn.send(msg);
            sent = true;
        }
    });

    if (sent || Object.keys(activeConnections).length === 0) {
        displayMessage(msg, 'sent', true);
        messageInput.value = '';
    }
}

// --- EVENT LISTENERS ---

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
    if (myId) {
        navigator.clipboard.writeText(myId).then(() => {
            const originalIcon = headerCopyBtn.innerText;
            headerCopyBtn.innerText = '✅';
            setTimeout(() => headerCopyBtn.innerText = originalIcon, 2000);
        });
    }
});

// Start by loading history
loadMessages();
updatePeerListUI();
