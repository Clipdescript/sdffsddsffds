// Persistence keys
const STORAGE_ID_KEY = 'p2p_chat_my_id';
const STORAGE_MSGS_KEY = 'p2p_chat_messages';
const STORAGE_PEERS_KEY = 'p2p_chat_peers';
const STORAGE_USER_KEY = 'p2p_chat_username';

// State
let myUsername = localStorage.getItem(STORAGE_USER_KEY) || 'Moi';
let myId = localStorage.getItem(STORAGE_ID_KEY);
let activeConnections = {}; 
let peerList = JSON.parse(localStorage.getItem(STORAGE_PEERS_KEY) || []);
let currentChatPeerId = null;

// Generate ID if not exists
if (!myId) {
    myId = 'wa-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_ID_KEY, myId);
}

// Peer Instance
const peer = new Peer(myId);

// DOM
const app = document.getElementById('app');
const peerListEl = document.getElementById('peer-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const sendIcon = document.getElementById('send-icon');
const backBtn = document.getElementById('back-btn');
const settingsTrigger = document.getElementById('settings-trigger');
const settingsPanel = document.getElementById('settings-panel');
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');
const headerMyIdEl = document.getElementById('header-my-id');
const headerCopyBtn = document.getElementById('header-copy-btn');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const chatPeerName = document.getElementById('chat-peer-name');
const chatPeerAvatar = document.getElementById('chat-peer-avatar');

// --- INIT ---

function init() {
    usernameInput.value = myUsername;
    headerMyIdEl.innerText = myId;
    updatePeerListUI();
    
    // Peer events
    peer.on('open', (id) => {
        console.log('Peer ID:', id);
        // Try reconnecting to all saved peers
        peerList.forEach(pId => connectToPeer(pId));
    });

    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
    });
}

// --- LOGIC ---

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
        if (data.type === 'chat') {
            saveAndDisplayMessage(data.text, 'received', data.user, conn.peer);
        }
    });

    conn.on('close', () => {
        delete activeConnections[conn.peer];
        updatePeerListUI();
    });
}

function saveAndDisplayMessage(text, type, user, peerId) {
    const msgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    msgs.push({ text, type, user, peerId, time: Date.now() });
    localStorage.setItem(STORAGE_MSGS_KEY, JSON.stringify(msgs));
    
    if (currentChatPeerId === peerId) {
        renderMessage(text, type, user);
    }
    updatePeerListUI(); // To show last message or update status
}

function renderMessage(text, type, user) {
    const wrapper = document.createElement('div');
    wrapper.className = `msg-wrapper ${type}`;
    
    if (type === 'received') {
        const userLabel = document.createElement('span');
        userLabel.className = 'msg-user';
        userLabel.innerText = user;
        wrapper.appendChild(userLabel);
    }
    
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = text;
    
    wrapper.appendChild(div);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updatePeerListUI() {
    peerListEl.innerHTML = '';
    const msgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    
    peerList.forEach(pId => {
        const lastMsg = msgs.filter(m => m.peerId === pId).pop();
        const isOnline = activeConnections[pId] && activeConnections[pId].open;
        
        const li = document.createElement('li');
        li.className = 'peer-item';
        li.onclick = () => openChat(pId);
        
        li.innerHTML = `
            <div class="peer-avatar" style="background-color: ${stringToColor(pId)}">${pId.charAt(0).toUpperCase()}</div>
            <div class="peer-info">
                <div class="peer-name-row">
                    <span class="peer-name">${pId.substring(0, 10)}...</span>
                </div>
                <div class="peer-status-text">
                    ${isOnline ? '<span style="color:#25d366">En ligne</span>' : 'Hors ligne'} 
                    ${lastMsg ? ' • ' + lastMsg.text.substring(0, 20) : ''}
                </div>
            </div>
        `;
        peerListEl.appendChild(li);
    });
}

function openChat(peerId) {
    currentChatPeerId = peerId;
    chatPeerName.innerText = peerId.substring(0, 15) + '...';
    chatPeerAvatar.innerText = peerId.charAt(0).toUpperCase();
    chatPeerAvatar.style.backgroundColor = stringToColor(peerId);
    
    chatMessages.innerHTML = '';
    const msgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    msgs.filter(m => m.peerId === peerId).forEach(m => {
        renderMessage(m.text, m.type, m.user);
    });
    
    // Switch UI state
    app.classList.remove('show-list');
    app.classList.add('show-chat');
}

// --- EVENTS ---

messageInput.oninput = () => {
    sendIcon.innerText = messageInput.value.trim() ? 'send' : 'mic';
};

sendBtn.onclick = () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatPeerId) return;
    
    const conn = activeConnections[currentChatPeerId];
    if (conn && conn.open) {
        conn.send({ type: 'chat', text, user: myUsername });
        saveAndDisplayMessage(text, 'sent', myUsername, currentChatPeerId);
        messageInput.value = '';
        sendIcon.innerText = 'mic';
    } else {
        alert("L'ami est hors ligne");
    }
};

backBtn.onclick = () => {
    app.classList.remove('show-chat');
    app.classList.add('show-list');
    currentChatPeerId = null;
    updatePeerListUI();
};

settingsTrigger.onclick = () => settingsPanel.classList.toggle('hidden');

saveUsernameBtn.onclick = () => {
    myUsername = usernameInput.value.trim() || 'Moi';
    localStorage.setItem(STORAGE_USER_KEY, myUsername);
    settingsPanel.classList.add('hidden');
};

headerCopyBtn.onclick = () => {
    navigator.clipboard.writeText(myId);
    headerCopyBtn.innerText = 'done';
    setTimeout(() => headerCopyBtn.innerText = 'content_copy', 2000);
};

connectBtn.onclick = () => {
    const id = peerIdInput.value.trim();
    if (id) {
        connectToPeer(id);
        peerIdInput.value = '';
    }
};

// Utils
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
}

init();
