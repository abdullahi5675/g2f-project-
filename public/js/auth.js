// G2F Authentication Guard
// Protects pages from unauthorized access and manages navigation UI

(function() {
  // Hide page immediately to prevent content flash before auth check
  document.documentElement.style.visibility = 'hidden';

  document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const path = window.location.pathname;

    // Classify current page using clean URLs AND .html fallbacks
    const isHomePage      = path === '/' || path === '/index.html';
    const isLoginPage     = path === '/login.html' || path === '/login';
    const isSignupPage    = path === '/signup.html' || path === '/signup';
    const isRegisterPage  = path === '/register' || path.includes('register.html');
    const isAgentPage     = path === '/agent' || path.includes('agent.html');
    const isDashboardPage = path === '/dashboard' || path.includes('dashboard.html');
    const isPublicPage    = isHomePage || isLoginPage || isSignupPage;

    // ─── NOT LOGGED IN ───
    if (!user) {
      if (!isPublicPage) {
        // Trying to access a protected page → redirect to login
        window.location.href = '/login.html';
        return; // Keep body hidden during redirect
      }

      // On home page: hide protected nav links, show Login/Signup buttons
      if (isHomePage) {
        updateHomePageForGuest();
      }

      document.documentElement.style.visibility = 'visible';
      return;
    }

    // ─── LOGGED IN ───

    // Auto-logout when visiting the Home page while logged in
    if (isHomePage) {
      const token = localStorage.getItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => {});
      }
      updateHomePageForGuest();
      document.documentElement.style.visibility = 'visible';
      return;
    }

    // If already logged in and on login/signup page, redirect to role home
    if (isLoginPage || isSignupPage) {
      window.location.href = getRoleHomePath(user.role);
      return;
    }

    // Role-based access control on protected pages
    if (isRegisterPage && user.role !== 'officer') {
      window.location.href = getRoleHomePath(user.role);
      return;
    }
    if (isAgentPage && user.role !== 'agent') {
      window.location.href = getRoleHomePath(user.role);
      return;
    }
    if (isDashboardPage && user.role !== 'supervisor') {
      window.location.href = getRoleHomePath(user.role);
      return;
    }

    // User is authorized — set up the UI
    addUserInfoToNav(user);
    filterNavLinks(user);

    if (isHomePage) {
      updateHomePageForUser(user);
    }

    // Reveal the page
    document.documentElement.style.visibility = 'visible';
  });
})();


// ─── HELPER FUNCTIONS ───

/** Returns the default page path for a given role */
function getRoleHomePath(role) {
  if (role === 'officer')    return '/register';
  if (role === 'agent')      return '/agent';
  if (role === 'supervisor') return '/dashboard';
  return '/';
}

/** Adds user name, role badge, and logout button to the navbar */
function addUserInfoToNav(user) {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const userDiv = document.createElement('div');
  userDiv.style.cssText = 'display:flex; align-items:center; gap:16px; margin-left:auto;';

  const roleBadge = user.role === 'officer' ? 'badge-blue'
                  : user.role === 'agent'   ? 'badge-gold'
                  : 'badge-green';

  userDiv.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="font-weight:600; font-size:0.9rem; color:var(--text-main);">${user.full_name}</div>
      <span class="badge ${roleBadge}">${user.role}</span>
    </div>
    <button class="btn btn-outline btn-sm" onclick="logout()" style="color:var(--danger); border-color:var(--danger);">Logout</button>
  `;
  nav.appendChild(userDiv);
}

/** Hides nav links the user's role should not see */
function filterNavLinks(user) {
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '/register'  && user.role !== 'officer')    link.style.display = 'none';
    if (href === '/agent'     && user.role !== 'agent')      link.style.display = 'none';
    if (href === '/dashboard' && user.role !== 'supervisor') link.style.display = 'none';
  });
}

/** Home page for guests: hides protected links, shows Login/Signup */
function updateHomePageForGuest() {
  // Hide protected nav links
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '/register' || href === '/dashboard' || href === '/agent' || href === '/sms-preview') {
      link.style.display = 'none';
    }
  });

  // Add Login and Sign Up links to nav
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    const loginLink = document.createElement('a');
    loginLink.href = '/login.html';
    loginLink.textContent = 'Login';
    navLinks.appendChild(loginLink);

    const signupLink = document.createElement('a');
    signupLink.href = '/signup.html';
    signupLink.textContent = 'Sign Up';
    navLinks.appendChild(signupLink);
  }

  // Replace hero buttons with login/signup actions
  const heroButtons = document.querySelector('.hero-btns');
  if (heroButtons) {
    heroButtons.innerHTML = `
      <a href="/login.html" class="btn btn-gold">Login to Get Started</a>
      <a href="/signup.html" class="btn btn-outline">Create Account</a>
    `;
  }
}

/** Home page for logged-in users: shows role-appropriate action */
function updateHomePageForUser(user) {
  const heroButtons = document.querySelector('.hero-btns');
  if (heroButtons) {
    const homePath = getRoleHomePath(user.role);
    const label = user.role === 'officer' ? 'Register a Farmer'
               : user.role === 'agent'   ? 'Go to Agent Portal'
               : 'View Dashboard';
    heroButtons.innerHTML = `<a href="${homePath}" class="btn btn-gold">${label}</a>`;
  }
}

/** Makes an authenticated API call, attaching the Bearer token */
function authFetch(url, options = {}) {
  const token = localStorage.getItem('auth_token');
  if (token) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch(url, options);
}

/** Logs the user out, clears session, and redirects to login */
function logout() {
  const token = localStorage.getItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('auth_token');
  // Notify server to invalidate the token
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    }).catch(() => {});
  }
  window.location.href = '/login.html';
}
