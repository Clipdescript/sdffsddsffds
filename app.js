// Initialize PeerJS
const peer = new Peer();
let conn = null;

// DOM Elements
const statusEl = document.getElementById('status');
const myIdEl = document.getElementById('my-id');
const copyIdBtn = document.getElementById('copy-id-btn');
const peerIdInput = document.getElementById('peer-id-input');
const connectBtn = document.getElementById('connect-btn');
const welcomeScreen = document.getElementById('welcome-screen');
const chatScreen = document.getElementById('chat-screen');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// --- PEER EVENTS ---

// When we get our ID from the PeerServer
peer.on('open', (id) => {
    myIdEl.innerText = id;
    statusEl.innerText = 'Prêt à se connecter';
    statusEl.style.color = 'white';

    // Auto-connect if ID is in URL (e.g., ?peer=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const peerParam = urlParams.get('peer');
    if (peerParam) {
        peerIdInput.value = peerParam;
        connectToPeer(peerParam);
    }
});

// When someone tries to connect to us
peer.on('connection', (connection) => {
    if (conn) {
        connection.close(); // Only one connection at a time for simplicity
        return;
    }
    conn = connection;
    setupConnection();
});

peer.on('error', (err) => {
    console.error('Peer error:', err);
    statusEl.innerText = 'Erreur : ' + err.type;
    statusEl.style.color = '#ffcccc';
});

// --- CONNECTION LOGIC ---

function connectToPeer(peerId) {
    if (!peerId) return;
    
    statusEl.innerText = 'Connexion en cours...';
    conn = peer.connect(peerId);
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        statusEl.innerText = 'Connecté à : ' + conn.peer;
        welcomeScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
    });

    conn.on('data', (data) => {
        addMessage(data, 'received');
    });

    conn.on('close', () => {
        statusEl.innerText = 'Connexion fermée';
        chatScreen.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        conn = null;
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        statusEl.innerText = 'Erreur de connexion';
    });
}

// --- UI LOGIC ---

function addMessage(msg, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = msg;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendMessage() {
    const msg = messageInput.value.trim();
    if (msg && conn && conn.open) {
        conn.send(msg);
        addMessage(msg, 'sent');
        messageInput.value = '';
    }
}

// --- EVENT LISTENERS ---

connectBtn.addEventListener('click', () => {
    connectToPeer(peerIdInput.value.trim());
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

copyIdBtn.addEventListener('click', () => {
    const id = myIdEl.innerText;
    if (id && id !== 'Génération...') {
        // Create a shareable URL
        const shareUrl = `${window.location.origin}${window.location.pathname}?peer=${id}`;
        
        navigator.clipboard.writeText(id).then(() => {
            const originalIcon = copyIdBtn.innerText;
            copyIdBtn.innerText = '✅';
            setTimeout(() => copyIdBtn.innerText = originalIcon, 2000);
        });
    }
});
