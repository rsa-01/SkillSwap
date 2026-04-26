const API_URL = '/api';

// State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let authToken = localStorage.getItem('authToken') || null;
let chatPollInterval = null;

// --- Init ---
function init() {
    if (currentUser && authToken) {
        document.getElementById('auth-nav-items').style.display = 'flex';
        document.getElementById('guest-nav-items').style.display = 'none';
        document.getElementById('current-user-name').innerText = currentUser.name;
        showSection('feed');
    } else {
        document.getElementById('auth-nav-items').style.display = 'none';
        document.getElementById('guest-nav-items').style.display = 'flex';
        showSection('landing');
    }
}

// Navigation logic
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const navBtn = document.getElementById(`nav-${sectionId}`);
    if (navBtn) navBtn.classList.add('active');

    if (chatPollInterval && sectionId !== 'chat') {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }

    if (sectionId === 'feed') {
        loadSkills();
    } else if (sectionId === 'exchanges') {
        loadExchanges();
    } else if (sectionId === 'profile') {
        loadProfile();
    }
}

// --- Auth Section ---
function toggleAuth(type) {
    if (type === 'login') {
        document.getElementById('login-card').style.display = 'block';
        document.getElementById('signup-card').style.display = 'none';
    } else {
        document.getElementById('login-card').style.display = 'none';
        document.getElementById('signup-card').style.display = 'block';
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
            loginSuccess(data);
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error('Error logging in:', err);
    }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const bio = document.getElementById('signup-bio').value;

    try {
        const res = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, bio })
        });
        const data = await res.json();
        
        if (res.ok) {
            loginSuccess(data);
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error('Error signing up:', err);
    }
});

function loginSuccess(data) {
    currentUser = data.user;
    authToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('authToken', authToken);
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    init();
}

function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    init();
}

// --- Feed Section ---
async function loadSkills() {
    if (!currentUser) return;
    const search = document.getElementById('search-input').value;
    const category = document.getElementById('category-filter').value;
    
    let url = `${API_URL}/skills?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (category) url += `category=${encodeURIComponent(category)}`;

    try {
        const res = await fetch(url);
        const skills = await res.json();
        renderSkills(skills);
    } catch (err) {
        console.error('Error loading skills:', err);
    }
}

function renderSkills(skills) {
    const container = document.getElementById('skills-container');
    container.innerHTML = '';
    
    if (skills.length === 0) {
        container.innerHTML = '<p>No skills found.</p>';
        return;
    }

    skills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="user-name">${skill.userName}</span>
                <span class="category-tag">${skill.category}</span>
            </div>
            <div class="card-body">
                <h3>Offers: ${skill.offer}</h3>
                <p class="request-text">Looking for: ${skill.request}</p>
                ${skill.userId !== currentUser.id 
                    ? `<button class="btn btn-primary" onclick="openRequestModal(${skill.id}, '${skill.offer}', '${skill.userName}')">Request Swap</button>` 
                    : '<button class="btn" disabled>Your Post</button>'}
            </div>
        `;
        container.appendChild(card);
    });
}

document.getElementById('search-input').addEventListener('input', loadSkills);
document.getElementById('category-filter').addEventListener('change', loadSkills);

// --- Post Skill Section ---
document.getElementById('post-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const offer = document.getElementById('offer').value;
    const request = document.getElementById('request').value;
    const category = document.getElementById('category').value;

    try {
        const res = await fetch(`${API_URL}/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, offer, request, category })
        });
        if (res.ok) {
            e.target.reset();
            alert('Skill posted successfully!');
            showSection('feed');
        }
    } catch (err) {
        console.error('Error posting skill:', err);
    }
});

// --- Modal Logic ---
function openRequestModal(id, offer, userName) {
    document.getElementById('modal-target-id').value = id;
    document.getElementById('modal-target-offer').innerText = offer;
    document.getElementById('modal-target-user').innerText = userName;
    document.getElementById('request-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('request-modal').style.display = 'none';
    document.getElementById('swap-request-form').reset();
}

document.getElementById('swap-request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const targetSkillId = document.getElementById('modal-target-id').value;
    const offeredSkill = document.getElementById('modal-offered-skill').value;

    try {
        const res = await fetch(`${API_URL}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromUserId: currentUser.id, targetSkillId, offeredSkill })
        });
        if (res.ok) {
            closeModal();
            alert('Swap request sent!');
        }
    } catch (err) {
        console.error('Error sending request:', err);
    }
});

// --- Exchanges Section ---
async function loadExchanges() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/requests?userId=${currentUser.id}`);
        const requests = await res.json();
        renderExchanges(requests);
    } catch (err) {
        console.error('Error loading exchanges:', err);
    }
}

function renderExchanges(requests) {
    const container = document.getElementById('exchanges-container');
    container.innerHTML = '';

    if (requests.length === 0) {
        container.innerHTML = '<p>No exchange requests found.</p>';
        return;
    }

    requests.forEach(req => {
        const isTarget = req.targetUserId === currentUser.id;
        
        const item = document.createElement('div');
        item.className = 'exchange-item';
        
        let title, meta, actions = '';

        if (isTarget) {
            title = `${req.fromUserName} wants your ${req.targetSkillOffer}`;
            meta = `They are offering: <strong>${req.offeredSkill}</strong>`;
            if (req.status === 'Pending') {
                actions = `
                    <button class="btn btn-success" style="width: auto; padding: 0.5rem 1rem;" onclick="updateRequestStatus(${req.id}, 'Accepted')">Accept</button>
                    <button class="btn btn-danger" style="width: auto; padding: 0.5rem 1rem;" onclick="updateRequestStatus(${req.id}, 'Declined')">Decline</button>
                `;
            } else if (req.status === 'Accepted') {
                actions = `<button class="btn btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="openChat(${req.id}, '${req.fromUserName.replace(/'/g, "\\'")}')">Chat</button>`;
            }
        } else {
            title = `You requested ${req.targetSkillOffer} from ${req.targetUserName}`;
            meta = `You offered: <strong>${req.offeredSkill}</strong>`;
            if (req.status === 'Accepted') {
                actions = `<button class="btn btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="openChat(${req.id}, '${req.targetUserName.replace(/'/g, "\\'")}')">Chat</button>`;
            }
        }

        item.innerHTML = `
            <div class="exchange-info">
                <h4>${title}</h4>
                <div class="exchange-meta">${meta}</div>
            </div>
            <div class="exchange-actions">
                <span class="status-badge status-${req.status}">${req.status}</span>
                ${actions}
            </div>
        `;
        container.appendChild(item);
    });
}

async function updateRequestStatus(id, status) {
    try {
        const res = await fetch(`${API_URL}/requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            loadExchanges();
        }
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

// --- Profile Section ---
async function loadProfile() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/profile/${currentUser.id}`);
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('profile-avatar').innerText = data.user.name.charAt(0).toUpperCase();
            document.getElementById('profile-name').innerText = data.user.name;
            document.getElementById('profile-email').innerText = data.user.email;
            document.getElementById('profile-bio').innerText = data.user.bio || 'No bio provided.';
            
            const skillsList = document.getElementById('profile-skills-list');
            skillsList.innerHTML = '';
            if (data.skills.length === 0) {
                skillsList.innerHTML = '<p class="text-secondary">No skills posted yet.</p>';
            } else {
                data.skills.forEach(skill => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>Offers:</strong> ${skill.offer}<br><span class="text-secondary">Requests: ${skill.request}</span>`;
                    skillsList.appendChild(li);
                });
            }
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// --- Chat Section ---
async function loadMessages(exchangeId) {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/messages/${exchangeId}?userId=${currentUser.id}`);
        const messages = await res.json();
        if (res.ok) {
            renderMessages(messages);
        }
    } catch (err) {
        console.error('Error loading messages:', err);
    }
}

function renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<p class="text-secondary" style="text-align: center; margin: auto;">No messages yet. Say hi!</p>';
        return;
    }

    messages.forEach(msg => {
        const isSent = msg.senderId === currentUser.id;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isSent ? 'message-sent' : 'message-received'}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msgDiv.innerHTML = `
            ${msg.text}
            <span class="message-meta">${time}</span>
        `;
        container.appendChild(msgDiv);
    });
    
    // Auto scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function openChat(exchangeId, otherUserName) {
    document.getElementById('chat-exchange-id').value = exchangeId;
    document.getElementById('chat-title').innerText = `Chat with ${otherUserName}`;
    showSection('chat');
    
    loadMessages(exchangeId);
    
    // Start polling
    if (chatPollInterval) clearInterval(chatPollInterval);
    chatPollInterval = setInterval(() => loadMessages(exchangeId), 3000);
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const exchangeId = document.getElementById('chat-exchange-id').value;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${API_URL}/messages/${exchangeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, text })
        });
        if (res.ok) {
            input.value = '';
            loadMessages(exchangeId);
        }
    } catch (err) {
        console.error('Error sending message:', err);
    }
});

// --- Mobile Menu ---
function toggleMobileMenu() {
    const menu = document.getElementById('nav-menu');
    const btn = document.getElementById('hamburger-btn');
    menu.classList.toggle('open');
    btn.classList.toggle('open');
}

function closeMobileMenu() {
    const menu = document.getElementById('nav-menu');
    const btn = document.getElementById('hamburger-btn');
    menu.classList.remove('open');
    btn.classList.remove('open');
}

// Start app
init();
