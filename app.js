const MASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUf0nGELoIF4l8fODNTtG7_rnkWmL4zbfayk4RUjdpelOiMWuMTnTk5iUAAGdVzwuaYQ/exec';

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('login-page')) initLogin();
    if (document.body.classList.contains('dashboard-page')) initDashboard();
});

/* ---------------- LOGIN LOGIC ---------------- */
function initLogin() {
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    const b = document.getElementById('loginBtn');
    const s = document.getElementById('loginStatus');
    const t = document.getElementById('togglePassword');

    if (!u || !p || !b) return;

    if (t) {
        t.addEventListener('click', () => {
            const show = p.type === 'password';
            p.type = show ? 'text' : 'password';
            t.innerHTML = show ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
        });
    }

    async function handleLogin() {
        const username = u.value.trim();
        const password = p.value;

        if (!username || !password) {
            if (s) s.textContent = 'Please enter both Username and Password.';
            return;
        }

        b.disabled = true;
        b.querySelector('span').textContent = 'Authenticating...';
        if (s) s.textContent = '';

        try {
            const result = await loginViaJsonp(username, password);

            if (result && result.status === 'success') {
                sessionStorage.setItem('masterAuth', JSON.stringify({
                    username: result.username || username,
                    role: result.role || 'user',
                    loggedAt: Date.now()
                }));

                window.location.href = 'dashboard.html';
                return;
            }

            if (s) {
                s.textContent = (result && result.message) ? result.message : 'Invalid username or password.';
            }
        } catch (err) {
            console.error('Login error:', err);
            if (s) s.textContent = 'Login service unavailable. Check network or Apps Script URL.';
        } finally {
            b.disabled = false;
            b.querySelector('span').textContent = 'Login to Workspace';
        }
    }

    b.addEventListener('click', handleLogin);
    [u, p].forEach(input => {
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') handleLogin();
        });
    });
}

function loginViaJsonp(username, password) {
    return new Promise((resolve, reject) => {
        const callbackName = '__masterLogin_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        const script = document.createElement('script');
        let finished = false;

        const cleanup = () => {
            finished = true;
            try { delete window[callbackName]; } catch (_) {}
            if (script.parentNode) script.parentNode.removeChild(script);
        };

        const timer = setTimeout(() => {
            if (finished) return;
            cleanup();
            reject(new Error('Authentication request timed out.'));
        }, 15000);

        window[callbackName] = data => {
            if (finished) return;
            clearTimeout(timer);
            cleanup();
            resolve(data);
        };

        script.onerror = () => {
            if (finished) return;
            clearTimeout(timer);
            cleanup();
            reject(new Error('Unable to reach Google Apps Script.'));
        };

        const query = new URLSearchParams({
            action: 'login',
            username: username,
            password: password,
            callback: callbackName
        });

        script.src = MASTER_SCRIPT_URL + '?' + query.toString();
        document.head.appendChild(script);
    });
}

/* ---------------- DASHBOARD LOGIC ---------------- */
function getAuth() {
    try {
        return JSON.parse(sessionStorage.getItem('masterAuth') || 'null');
    } catch (_) {
        return null;
    }
}

function initDashboard() {
    const auth = getAuth();
    if (!auth) {
        window.location.href = 'index.html';
        return;
    }

    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');

    if (userName) userName.textContent = auth.username;
    if (userRole) userRole.textContent = auth.role === 'admin' ? 'Administrator' : 'Authorized User';

    setupClock();
    setupSearch();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('masterAuth');
            window.location.href = 'index.html';
        });
    }
}

/* Live Clock Setup */
function setupClock() {
    const tick = () => {
        const now = new Date();
        const liveClock = document.getElementById('liveClock');
        const liveDate = document.getElementById('liveDate');

        if (liveClock) {
            liveClock.textContent = now.toLocaleTimeString('en-IN', { hour12: true });
        }
        if (liveDate) {
            liveDate.textContent = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        }
    };
    tick();
    setInterval(tick, 1000);
}

/* Real-time Search Filter for Cards */
function setupSearch() {
    const searchInput = document.getElementById('appSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const sections = document.querySelectorAll('.dash-section');

        sections.forEach(section => {
            const buttons = section.querySelectorAll('.dash-btn');
            let hasVisibleBtn = false;

            buttons.forEach(btn => {
                const text = btn.textContent.toLowerCase();
                if (text.includes(term)) {
                    btn.style.display = 'flex';
                    hasVisibleBtn = true;
                } else {
                    btn.style.display = 'none';
                }
            });

            section.style.display = hasVisibleBtn ? 'block' : 'none';
        });
    });
}