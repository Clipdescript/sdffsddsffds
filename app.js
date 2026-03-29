// Persistence keys
const STORAGE_ID_KEY = 'p2p_chat_my_id';
const STORAGE_MSGS_KEY = 'p2p_chat_messages';
const STORAGE_PEERS_KEY = 'p2p_chat_peers';
const STORAGE_USER_KEY = 'p2p_chat_username';

// State
let myUsername = localStorage.getItem(STORAGE_USER_KEY) || 'Moi';
let myId = localStorage.getItem(STORAGE_ID_KEY);
let activeConnections = {}; 
let peerList = [];
try {
    peerList = JSON.parse(localStorage.getItem(STORAGE_PEERS_KEY) || '[]');
} catch (e) {
    peerList = [];
}
let currentChatPeerId = null;

// Generate ID if not exists
if (!myId) {
    myId = 'wa-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_ID_KEY, myId);
}

// Peer Instance
const peer = new Peer(myId, {
    debug: 2 // Show errors and warnings
});

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
const statusEl = document.getElementById('status');

// --- INIT ---

function init() {
    console.log('Initialisation de l\'application...');
    usernameInput.value = myUsername;
    headerMyIdEl.innerText = myId;
    updatePeerListUI();
    
    // Peer events
    peer.on('open', (id) => {
        console.log('Votre Peer ID est :', id);
        statusEl.innerText = 'En ligne';
        // Tentative de reconnexion aux pairs enregistrés
        peerList.forEach(pId => {
            if (pId !== myId) connectToPeer(pId);
        });
    });

    peer.on('connection', (conn) => {
        console.log('Nouvelle connexion entrante de :', conn.peer);
        setupConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('Erreur PeerJS :', err.type, err);
        if (err.type === 'peer-unavailable') {
            console.warn('Le pair demandé n\'existe pas ou est hors ligne.');
        }
    });

    peer.on('disconnected', () => {
        console.warn('Déconnecté du serveur de signalisation. Tentative de reconnexion...');
        peer.reconnect();
    });
}

// --- LOGIC ---

function connectToPeer(targetId) {
    if (!targetId || targetId === myId) return;
    
    // Si déjà connecté et ouvert, on ne fait rien
    if (activeConnections[targetId] && activeConnections[targetId].open) {
        console.log('Déjà connecté à', targetId);
        return;
    }

    console.log('Tentative de connexion à :', targetId);
    const conn = peer.connect(targetId, {
        reliable: true
    });
    setupConnection(conn);
}

function setupConnection(conn) {
    conn.on('open', () => {
        console.log('Connexion ouverte avec :', conn.peer);
        activeConnections[conn.peer] = conn;
        
        if (!peerList.includes(conn.peer)) {
            peerList.push(conn.peer);
            localStorage.setItem(STORAGE_PEERS_KEY, JSON.stringify(peerList));
        }
        updatePeerListUI();
    });

    conn.on('data', (data) => {
        console.log('Données reçues de', conn.peer, ':', data);
        if (data && data.type === 'chat') {
            saveAndDisplayMessage(data.text, 'received', data.user, conn.peer);
        }
    });

    conn.on('close', () => {
        console.log('Connexion fermée avec :', conn.peer);
        delete activeConnections[conn.peer];
        updatePeerListUI();
    });

    conn.on('error', (err) => {
        console.error('Erreur de connexion avec', conn.peer, ':', err);
        delete activeConnections[conn.peer];
        updatePeerListUI();
    });
}

function saveAndDisplayMessage(text, type, user, peerId) {
    let msgs = [];
    try {
        msgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    } catch (e) {
        msgs = [];
    }
    
    const newMsg = { text, type, user, peerId, time: Date.now() };
    msgs.push(newMsg);
    localStorage.setItem(STORAGE_MSGS_KEY, JSON.stringify(msgs));
    
    if (currentChatPeerId === peerId) {
        renderMessage(text, type, user);
    }
    updatePeerListUI();
}

function renderMessage(text, type, user) {
    const wrapper = document.createElement('div');
    wrapper.className = `msg-wrapper ${type}`;
    
    if (type === 'received') {
        const userLabel = document.createElement('span');
        userLabel.className = 'msg-user';
        userLabel.innerText = user || 'Ami';
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
    let msgs = [];
    try {
        msgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    } catch (e) {
        msgs = [];
    }
    
    peerList.forEach(pId => {
        if (pId === myId) return;
        
        const peerMsgs = msgs.filter(m => m.peerId === pId);
        const lastMsg = peerMsgs[peerMsgs.length - 1];
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
    console.log('Ouverture du chat avec :', peerId);
    currentChatPeerId = peerId;
    chatPeerName.innerText = peerId.substring(0, 15) + '...';
    chatPeerAvatar.innerText = peerId.charAt(0).toUpperCase();
    chatPeerAvatar.style.backgroundColor = stringToColor(peerId);
    
    chatMessages.innerHTML = '';
    let msgs = [];
    try {
        msgs = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
    } catch (e) {
        msgs = [];
    }
    
    msgs.filter(m => m.peerId === peerId).forEach(m => {
        renderMessage(m.text, m.type, m.user);
    });
    
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
        console.log('Envoi du message à', currentChatPeerId, ':', text);
        conn.send({ type: 'chat', text, user: myUsername });
        saveAndDisplayMessage(text, 'sent', myUsername, currentChatPeerId);
        messageInput.value = '';
        sendIcon.innerText = 'mic';
    } else {
        console.warn('Impossible d\'envoyer le message : connexion fermée avec', currentChatPeerId);
        alert("L'ami est hors ligne. Tentative de reconnexion...");
        connectToPeer(currentChatPeerId);
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
    console.log('Pseudo mis à jour :', myUsername);
};

headerCopyBtn.onclick = () => {
    navigator.clipboard.writeText(myId);
    const originalIcon = headerCopyBtn.innerText;
    headerCopyBtn.innerText = 'done';
    setTimeout(() => headerCopyBtn.innerText = originalIcon, 2000);
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
