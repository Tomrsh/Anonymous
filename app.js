const firebaseConfig = {
    apiKey: "AIzaSyCgswS8AZObwKQjxZooWWJHf4b1m1rvorA",
    authDomain: "t2upload.firebaseapp.com",
    databaseURL: "https://t2upload-default-rtdb.firebaseio.com",
    projectId: "t2upload",
    storageBucket: "t2upload.appspot.com",
    messagingSenderId: "1000887477924",
    appId: "1:1000887477924:web:522232d054b9b7ce2ea831",
    measurementId: "G-75ZZL6BWVH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// UI Elements
const authPage = document.getElementById('auth-page');
const mainAppPage = document.getElementById('main-app-page');
const chatPage = document.getElementById('chat-page');

const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authMessage = document.getElementById('auth-message');

const chatsTabBtn = document.getElementById('chats-tab');
const contactsTabBtn = document.getElementById('contacts-tab');
const logoutBtn = document.getElementById('logout-btn');

const chatsTabContent = document.getElementById('chats-page');
const contactsTabContent = document.getElementById('contacts-page');

const chatList = document.getElementById('chat-list');
const noChatsMessage = document.getElementById('no-chats-message');

const searchContactInput = document.getElementById('search-contact-input');
const searchContactBtn = document.getElementById('search-contact-btn');
const searchMessage = document.getElementById('search-message');
const searchResultsList = document.getElementById('search-results');
const contactsList = document.getElementById('contacts-list');
const noContactsMessage = document.getElementById('no-contacts-message');

const chatContactEmail = document.getElementById('chat-contact-email');
const statusDisplay = document.getElementById('status-display');
const messagesList = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const uploadProgress = document.getElementById('upload-progress');
const backToMainBtn = document.getElementById('back-to-main-btn');

let currentChatPartner = null;

// --- Helper Functions ---
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function showTab(tabId) {
    const tabs = document.querySelectorAll('.page-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tabId.replace('-page', '')}-tab`).classList.add('active');
}

function getChatId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// --- Firebase Authentication ---
auth.onAuthStateChanged(user => {
    if (user) {
        showPage('main-app-page');
        showTab('chats-page');
        database.ref(`users/${user.uid}/email`).set(user.email);
        loadChats();
        loadContacts();
        updateOnlineStatus(true);
        setupPresenceDetection();
    } else {
        showPage('auth-page');
        updateOnlineStatus(false);
    }
});

loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => authMessage.textContent = 'Login successful!')
        .catch(error => authMessage.textContent = `Error: ${error.message}`);
});

signupBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => authMessage.textContent = 'Account created successfully!')
        .catch(error => authMessage.textContent = `Error: ${error.message}`);
});

logoutBtn.addEventListener('click', () => {
    updateOnlineStatus(false);
    auth.signOut()
        .then(() => {
            emailInput.value = '';
            passwordInput.value = '';
            authMessage.textContent = '';
            // Clear UI state
        })
        .catch(error => console.error('Logout Error:', error));
});

// --- Presence (Online/Offline) Status ---
function updateOnlineStatus(isOnline) {
    const user = auth.currentUser;
    if (user) {
        const userStatusRef = database.ref(`presence/${user.uid}`);
        userStatusRef.onDisconnect().set(false); // Set to false when user disconnects
        userStatusRef.set(isOnline);
    }
}

function setupPresenceDetection() {
    window.addEventListener('blur', () => updateOnlineStatus(false));
    window.addEventListener('focus', () => updateOnlineStatus(true));
}

// --- Main App Logic ---
chatsTabBtn.addEventListener('click', () => {
    showTab('chats-page');
    loadChats();
});

contactsTabBtn.addEventListener('click', () => {
    showTab('contacts-page');
    loadContacts();
});

function loadChats() {
    const currentUserUid = auth.currentUser.uid;
    const userChatsRef = database.ref(`users/${currentUserUid}/chats`);
    userChatsRef.on('value', snapshot => {
        const chats = snapshot.val();
        chatList.innerHTML = '';
        if (chats) {
            noChatsMessage.style.display = 'none';
            Object.keys(chats).forEach(partnerUid => {
                database.ref(`users/${partnerUid}/email`).once('value', emailSnapshot => {
                    const partnerEmail = emailSnapshot.val();
                    const li = document.createElement('li');
                    li.textContent = partnerEmail;
                    li.addEventListener('click', () => openChat(partnerUid, partnerEmail));
                    chatList.appendChild(li);
                });
            });
        } else {
            noChatsMessage.style.display = 'block';
        }
    });
}

function loadContacts() {
    const currentUserUid = auth.currentUser.uid;
    const contactsRef = database.ref(`users/${currentUserUid}/contacts`);
    contactsRef.on('value', snapshot => {
        const contacts = snapshot.val();
        contactsList.innerHTML = '';
        if (contacts) {
            noContactsMessage.style.display = 'none';
            Object.keys(contacts).forEach(contactUid => {
                const contactEmail = contacts[contactUid];
                const li = document.createElement('li');
                li.textContent = contactEmail;
                li.addEventListener('click', () => openChat(contactUid, contactEmail));
                contactsList.appendChild(li);
            });
        } else {
            noContactsMessage.style.display = 'block';
        }
    });
}

searchContactBtn.addEventListener('click', () => {
    const searchTerm = searchContactInput.value.trim().toLowerCase();
    searchResultsList.innerHTML = '';
    searchMessage.textContent = '';
    if (!searchTerm) return;

    database.ref('users').once('value', snapshot => {
        const users = snapshot.val();
        const results = [];
        for (let uid in users) {
            const userEmail = users[uid].email;
            if (userEmail && userEmail.toLowerCase().includes(searchTerm)) {
                results.push({ uid, email: userEmail });
            }
        }

        if (results.length > 0) {
            results.forEach(user => {
                const li = document.createElement('li');
                li.textContent = `${user.email} - Add Contact`;
                li.addEventListener('click', () => addContact(user.uid, user.email));
                searchResultsList.appendChild(li);
            });
            searchMessage.textContent = `Found ${results.length} user(s). Click to add.`;
        } else {
            searchMessage.textContent = 'No users found matching your search.';
        }
    });
});

function addContact(contactUid, contactEmail) {
    const currentUserUid = auth.currentUser.uid;
    database.ref(`users/${currentUserUid}/contacts/${contactUid}`).set(contactEmail)
        .then(() => {
            alert(`Contact ${contactEmail} added!`);
            loadContacts();
            searchResultsList.innerHTML = '';
            searchContactInput.value = '';
            searchMessage.textContent = '';
        })
        .catch(error => alert('Error adding contact: ' + error.message));
}

function openChat(partnerUid, partnerEmail) {
    currentChatPartner = { uid: partnerUid, email: partnerEmail };
    chatContactEmail.textContent = `Chat with ${partnerEmail}`;
    messagesList.innerHTML = '';
    showPage('chat-page');
    
    // Display partner's online status
    database.ref(`presence/${partnerUid}`).on('value', snapshot => {
        const isOnline = snapshot.val();
        statusDisplay.textContent = isOnline ? 'Online' : 'Offline';
        statusDisplay.style.color = isOnline ? 'green' : 'grey';
    });

    const chatId = getChatId(auth.currentUser.uid, partnerUid);
    const chatRef = database.ref(`chats/${chatId}`);
    chatRef.on('child_added', snapshot => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

function displayMessage(message) {
    const li = document.createElement('li');
    const isSentByMe = message.sender === auth.currentUser.uid;
    
    if (message.type === 'text') {
        li.textContent = message.text;
    } else if (message.type === 'file') {
        const fileLink = document.createElement('a');
        fileLink.href = message.url;
        fileLink.textContent = message.fileName;
        fileLink.target = '_blank';
        li.appendChild(document.createTextNode('File: '));
        li.appendChild(fileLink);
    }
    
    li.className = isSentByMe ? 'message-sent' : 'message-received';
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
}

sendBtn.addEventListener('click', () => {
    const messageText = messageInput.value.trim();
    if (messageText && currentChatPartner) {
        sendMessage({
            type: 'text',
            text: messageText,
            sender: auth.currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        messageInput.value = '';
    }
});

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !currentChatPartner) return;

    const fileRef = storage.ref().child(`chat_files/${file.name}_${Date.now()}`);
    const uploadTask = fileRef.put(file);

    uploadProgress.style.display = 'block';

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadProgress.value = progress;
        },
        (error) => {
            console.error('Upload failed:', error);
            uploadProgress.style.display = 'none';
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                sendMessage({
                    type: 'file',
                    url: downloadURL,
                    fileName: file.name,
                    sender: auth.currentUser.uid,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                uploadProgress.style.display = 'none';
            });
        }
    );
});

function sendMessage(message) {
    const currentUserUid = auth.currentUser.uid;
    const chatId = getChatId(currentUserUid, currentChatPartner.uid);

    database.ref(`chats/${chatId}`).push(message)
        .then(() => {
            database.ref(`users/${currentUserUid}/chats/${currentChatPartner.uid}`).set(currentChatPartner.email);
            database.ref(`users/${currentChatPartner.uid}/chats/${currentUserUid}`).set(auth.currentUser.email);
        })
        .catch(error => console.error("Error sending message:", error));
}

backToMainBtn.addEventListener('click', () => {
    if (currentChatPartner) {
        const chatId = getChatId(auth.currentUser.uid, currentChatPartner.uid);
        database.ref(`chats/${chatId}`).off('child_added');
        database.ref(`presence/${currentChatPartner.uid}`).off('value');
    }
    currentChatPartner = null;
    showPage('main-app-page');
    showTab('chats-page');
});
