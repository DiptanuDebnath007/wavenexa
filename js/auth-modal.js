/* ==========================================================================
   WAVENEXA — Unified Customer Authentication System
   Supports:
   1. 📲 OTP Verification (Mobile Phone or Email)
   2. 🔑 Password Sign-In (Email or Phone + Password)
   3. ✨ Account Registration (Name, Email, Phone, Password)
   4. 🌐 Google OAuth 2.0 (Google Identity Services + One-Click Fallback)
   ========================================================================== */

(function () {
  'use strict';

  // Config
  window.GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '1095897995890-9tmkkctlllh83vibggdbjebahaon7454.apps.googleusercontent.com';

  let currentTab = 'otp'; // 'otp' | 'password' | 'register'
  let otpStep = 'request'; // 'request' | 'verify'
  let currentIdentifier = '';
  let otpResendTimer = null;
  let otpCountdown = 60;

  /**
   * HTML Template for the state-of-the-art Auth Modal
   */
  function getModalHTML() {
    return `
    <div class="auth-modal-card" id="authModalCard">
      <button class="auth-modal-close" onclick="closeAuthModal()" title="Close">✕</button>

      <div class="auth-modal-logo">
        <a href="index.html" class="nav-logo">Wave<span>Nexa</span></a>
        <p>Member Access & Order Tracking</p>
      </div>

      <!-- Main Tabs -->
      <div class="auth-tabs" id="authMainTabs">
        <button class="auth-tab ${currentTab === 'otp' ? 'active' : ''}" id="tabOtp" onclick="switchAuthTab('otp')">✉️ Email Verification</button>
        <button class="auth-tab ${currentTab === 'password' ? 'active' : ''}" id="tabPassword" onclick="switchAuthTab('password')">🔑 Password</button>
        <button class="auth-tab ${currentTab === 'register' ? 'active' : ''}" id="tabRegister" onclick="switchAuthTab('register')">✨ Register</button>
      </div>

      <!-- Error & Success Banners -->
      <div class="auth-error" id="authError"></div>
      <div class="auth-success" id="authSuccess"></div>

      <!-- ═════════════════════════════════════════════
           1. EMAIL VERIFICATION FLOW
           ═════════════════════════════════════════════ -->
      <div id="otpSection" style="${currentTab === 'otp' ? '' : 'display:none;'}">
        
        <!-- Step 1: Request Email Code -->
        <form id="otpRequestForm" onsubmit="handleSendOtp(event)" style="${otpStep === 'request' ? '' : 'display:none;'}">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" id="otpIdentifierInput" placeholder="you@email.com" autocomplete="email" required>
            <small style="color:var(--text-dim);font-size:0.75rem;margin-top:4px;display:block;">
              We will send a 6-digit verification code to your email inbox
            </small>
          </div>
          <button type="submit" class="btn btn-primary btn-full btn-lg" id="sendOtpBtn">
            ✉️ Send Verification Code
          </button>
        </form>

        <!-- Step 2: Verify Email Code -->
        <form id="otpVerifyForm" onsubmit="handleVerifyOtp(event)" style="${otpStep === 'verify' ? '' : 'display:none;'}">
          <div style="text-align:center;margin-bottom:12px;">
            <span style="font-size:0.85rem;color:var(--text-muted);">Verification code sent to </span>
            <strong id="otpTargetDisplay" style="color:var(--primary);font-size:0.9rem;"></strong>
            <button type="button" onclick="resetOtpFlow()" style="background:none;border:none;color:var(--accent);font-size:0.8rem;cursor:pointer;margin-left:6px;text-decoration:underline;">Change Email</button>
          </div>

          <!-- Email Delivery Notification Card -->
          <div class="otp-sim-banner" id="otpSimBanner">
            <div>
              <span style="display:block;font-size:0.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">📧 WaveNexa Email Security Code</span>
              <span class="otp-sim-code" id="otpSimCodeDisplay">------</span>
            </div>
            <button type="button" class="otp-autofill-btn" id="otpAutofillBtn" onclick="autofillOtp()">
              ⚡ 1-Click Auto-Fill
            </button>
          </div>

          <!-- 6-Digit OTP Box Grid -->
          <div class="otp-inputs-wrap" id="otpDigitsWrap">
            <input type="text" inputmode="numeric" maxlength="1" class="otp-digit" data-idx="0" autocomplete="one-time-code" autofocus>
            <input type="text" inputmode="numeric" maxlength="1" class="otp-digit" data-idx="1">
            <input type="text" inputmode="numeric" maxlength="1" class="otp-digit" data-idx="2">
            <input type="text" inputmode="numeric" maxlength="1" class="otp-digit" data-idx="3">
            <input type="text" inputmode="numeric" maxlength="1" class="otp-digit" data-idx="4">
            <input type="text" inputmode="numeric" maxlength="1" class="otp-digit" data-idx="5">
          </div>

          <!-- Optional Name for New Members -->
          <div class="form-group" id="otpNameGroup" style="display:none;margin-top:12px;">
            <label class="form-label">Your Name (for order delivery)</label>
            <input type="text" class="form-control" id="otpNameInput" placeholder="Enter your full name">
          </div>

          <button type="submit" class="btn btn-primary btn-full btn-lg" id="verifyOtpBtn">
            🚀 Verify Email & Continue
          </button>

          <div class="otp-timer-row">
            <span id="otpTimerText">Resend email in <strong id="otpTimerCount">60s</strong></span>
            <button type="button" class="otp-resend-btn" id="otpResendBtn" disabled onclick="resendOtp()">
              🔄 Resend Email
            </button>
          </div>
        </form>

      </div>

      <!-- ═════════════════════════════════════════════
           2. PASSWORD LOGIN FLOW
           ═════════════════════════════════════════════ -->
      <form class="auth-form" id="passwordLoginForm" style="${currentTab === 'password' ? '' : 'display:none;'}" onsubmit="handlePasswordLogin(event)">
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-control" id="loginIdInput" placeholder="you@email.com" autocomplete="email" required>
        </div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label class="form-label" style="margin-bottom:0;">Password</label>
            <a href="javascript:void(0)" onclick="switchAuthTab('otp')" style="font-size:0.75rem;color:var(--primary);text-decoration:none;">Forgot? Verify with Email ✉️</a>
          </div>
          <div class="pw-wrap">
            <input type="password" class="form-control" id="loginPwInput" placeholder="Enter your password" autocomplete="current-password" required>
            <button type="button" class="pw-toggle" onclick="togglePasswordVisibility('loginPwInput', this)">👁</button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full btn-lg" id="passwordSubmitBtn">
          🔑 Sign In
        </button>
      </form>

      <!-- ═════════════════════════════════════════════
           3. REGISTRATION FLOW
           ═════════════════════════════════════════════ -->
      <form class="auth-form" id="registerUserForm" style="${currentTab === 'register' ? '' : 'display:none;'}" onsubmit="handleRegisterUser(event)">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input type="text" class="form-control" id="regFullName" placeholder="Your full name" autocomplete="name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email Address *</label>
          <input type="email" class="form-control" id="regEmailAddr" placeholder="you@email.com" autocomplete="email" required>
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number (Optional)</label>
          <input type="tel" class="form-control" id="regPhoneNumber" placeholder="+91 98765 43210" autocomplete="tel">
        </div>
        <div class="form-group">
          <label class="form-label">Password *</label>
          <div class="pw-wrap">
            <input type="password" class="form-control" id="regPasswordVal" placeholder="Min 6 characters" autocomplete="new-password" required minlength="6">
            <button type="button" class="pw-toggle" onclick="togglePasswordVisibility('regPasswordVal', this)">👁</button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-full btn-lg" id="registerSubmitBtn">
          ✨ Create WaveNexa Account
        </button>
      </form>

      <!-- ═════════════════════════════════════════════
           4. SOCIAL / GOOGLE OAUTH
           ═════════════════════════════════════════════ -->
      <div class="auth-divider"><span>or continue with</span></div>

      <div class="google-login-wrap" id="googleLoginBtnWrap">
        <div id="googleLoginBtn"></div>
      </div>

      <button type="button" class="google-custom-btn" id="googleCustomBtn" onclick="handleGoogleOneClick()">
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Continue with Google</span>
      </button>

      <p class="auth-hint" style="margin-top:16px;">
        Need assistance? Contact <a href="mailto:support@wavenexa.shop" style="color:var(--primary);text-decoration:none;">support@wavenexa.shop</a> · <a href="admin/login.html" style="color:var(--primary);font-weight:600;text-decoration:none;">🔐 Store Admin Portal</a>
      </p>
    </div>
    `;
  }

  /**
   * Inject or hydrate #authModal in document
   */
  function ensureAuthModal() {
    let overlay = document.getElementById('authModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'authModal';
      overlay.className = 'auth-modal-overlay';
      overlay.setAttribute('onclick', 'handleAuthOverlayClick(event)');
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = getModalHTML();
    setupOtpDigitInputs();
    initGoogleAuth();
  }

  /**
   * Setup auto-jump, paste, and backspacing on 6-digit OTP boxes
   */
  function setupOtpDigitInputs() {
    const wrap = document.getElementById('otpDigitsWrap');
    if (!wrap) return;
    const inputs = wrap.querySelectorAll('.otp-digit');

    inputs.forEach((input, index) => {
      // Clear value initially
      input.value = '';

      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[val.length - 1] : '';
        e.target.classList.toggle('filled', !!e.target.value);

        if (e.target.value && index < inputs.length - 1) {
          inputs[index + 1].focus();
          inputs[index + 1].select();
        }

        // Auto-submit if all 6 digits entered
        const fullCode = Array.from(inputs).map(i => i.value).join('');
        if (fullCode.length === 6) {
          handleVerifyOtp();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].select();
        } else if (e.key === 'ArrowLeft' && index > 0) {
          inputs[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (pasted.length) {
          for (let i = 0; i < inputs.length; i++) {
            inputs[i].value = pasted[i] || '';
            inputs[i].classList.toggle('filled', !!inputs[i].value);
          }
          const nextIdx = Math.min(pasted.length, inputs.length - 1);
          inputs[nextIdx].focus();
          if (pasted.length >= 6) {
            handleVerifyOtp();
          }
        }
      });
    });
  }

  // ── Modal Actions ──────────────────────────────────────────────────────────

  window.openAuthModal = function (tab = 'otp') {
    ensureAuthModal();
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      switchAuthTab(tab);
      clearAuthMessages();
    }
  };

  window.closeAuthModal = function () {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      clearInterval(otpResendTimer);
    }
  };

  window.handleAuthOverlayClick = function (e) {
    if (e.target === document.getElementById('authModal')) {
      closeAuthModal();
    }
  };

  window.switchAuthTab = function (tab) {
    currentTab = tab;
    clearAuthMessages();

    // Toggle main tab buttons
    document.getElementById('tabOtp')?.classList.toggle('active', tab === 'otp');
    document.getElementById('tabPassword')?.classList.toggle('active', tab === 'password');
    document.getElementById('tabRegister')?.classList.toggle('active', tab === 'register');

    // Toggle panels
    const otpSec = document.getElementById('otpSection');
    const pwdForm = document.getElementById('passwordLoginForm');
    const regForm = document.getElementById('registerUserForm');

    if (otpSec) otpSec.style.display = tab === 'otp' ? '' : 'none';
    if (pwdForm) pwdForm.style.display = tab === 'password' ? '' : 'none';
    if (regForm) regForm.style.display = tab === 'register' ? '' : 'none';

    if (tab === 'otp') {
      if (otpStep === 'request') {
        setTimeout(() => document.getElementById('otpIdentifierInput')?.focus(), 100);
      } else {
        setTimeout(() => document.querySelector('.otp-digit[data-idx="0"]')?.focus(), 100);
      }
    } else if (tab === 'password') {
      setTimeout(() => document.getElementById('loginIdInput')?.focus(), 100);
    } else if (tab === 'register') {
      setTimeout(() => document.getElementById('regFullName')?.focus(), 100);
    }
  };

  window.togglePasswordVisibility = function (inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.textContent = '🙈';
    } else {
      inp.type = 'password';
      btn.textContent = '👁';
    }
  };

  function showAuthError(msg) {
    const err = document.getElementById('authError');
    const succ = document.getElementById('authSuccess');
    if (err) {
      err.textContent = '❌ ' + msg;
      err.style.display = 'block';
    }
    if (succ) succ.style.display = 'none';
  }

  function showAuthSuccess(msg) {
    const err = document.getElementById('authError');
    const succ = document.getElementById('authSuccess');
    if (succ) {
      succ.textContent = '✅ ' + msg;
      succ.style.display = 'block';
    }
    if (err) err.style.display = 'none';
  }

  function clearAuthMessages() {
    const err = document.getElementById('authError');
    const succ = document.getElementById('authSuccess');
    if (err) err.style.display = 'none';
    if (succ) succ.style.display = 'none';
  }

  // ── Email Verification Handlers ───────────────────────────────────────────

  window.handleSendOtp = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('otpIdentifierInput');
    const btn = document.getElementById('sendOtpBtn');
    const emailVal = input ? input.value.trim().toLowerCase() : '';

    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showAuthError('Please enter a valid email address (e.g. you@email.com).');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Sending verification code...';
    }
    clearAuthMessages();

    try {
      const res = Store.sendOtp(emailVal);
      if (res.ok) {
        currentIdentifier = res.identifier;
        otpStep = 'verify';

        // Update verify screen UI
        document.getElementById('otpRequestForm').style.display = 'none';
        document.getElementById('otpVerifyForm').style.display = '';
        document.getElementById('otpTargetDisplay').textContent = res.identifier;
        document.getElementById('otpSimCodeDisplay').textContent = res.code;

        // Check if user is known; if not, show optional name input
        const customers = Store.getCustomers ? Store.getCustomers() : [];
        const isKnown = customers.some(c => c.email && c.email.toLowerCase() === res.identifier.toLowerCase());
        const nameGroup = document.getElementById('otpNameGroup');
        if (nameGroup) nameGroup.style.display = isKnown ? 'none' : 'block';

        showAuthSuccess(`Email sent! Your verification code is ${res.code}`);
        startOtpCountdown();
        setTimeout(() => {
          const first = document.querySelector('.otp-digit[data-idx="0"]');
          if (first) { first.focus(); first.select(); }
        }, 150);
      } else {
        showAuthError(res.error || 'Failed to send verification code.');
      }
    } catch (err) {
      showAuthError('Something went wrong sending the verification code.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✉️ Send Verification Code';
      }
    }
  };

  window.autofillOtp = function () {
    const code = document.getElementById('otpSimCodeDisplay')?.textContent.trim();
    if (!code || code.length !== 6) return;
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach((inp, idx) => {
      inp.value = code[idx] || '';
      inp.classList.add('filled');
    });
    handleVerifyOtp();
  };

  window.handleVerifyOtp = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const inputs = document.querySelectorAll('.otp-digit');
    const code = Array.from(inputs).map(i => i.value).join('').trim();
    const nameInput = document.getElementById('otpNameInput');
    const optionalName = nameInput ? nameInput.value.trim() : '';
    const btn = document.getElementById('verifyOtpBtn');

    if (code.length < 6) {
      showAuthError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Verifying code...';
    }

    try {
      const res = Store.verifyOtp(currentIdentifier, code, optionalName);
      if (res.ok) {
        clearInterval(otpResendTimer);
        const firstName = (res.user.name || 'Member').split(' ')[0];
        showAuthSuccess(`Email verified! Welcome, ${firstName}! 🎉`);
        setTimeout(() => {
          closeAuthModal();
          updateAuthNavBtn();
        }, 850);
      } else {
        showAuthError(res.error || 'Invalid verification code.');
        inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
        inputs[0]?.focus();
      }
    } catch (err) {
      showAuthError('Verification failed. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Verify Email & Continue';
      }
    }
  };

  window.resetOtpFlow = function () {
    otpStep = 'request';
    clearInterval(otpResendTimer);
    document.getElementById('otpVerifyForm').style.display = 'none';
    document.getElementById('otpRequestForm').style.display = '';
    clearAuthMessages();
    setTimeout(() => document.getElementById('otpIdentifierInput')?.focus(), 50);
  };

  window.resendOtp = function () {
    if (!currentIdentifier) return;
    handleSendOtp();
  };

  function startOtpCountdown() {
    clearInterval(otpResendTimer);
    otpCountdown = 60;
    const timerText = document.getElementById('otpTimerText');
    const timerCount = document.getElementById('otpTimerCount');
    const resendBtn = document.getElementById('otpResendBtn');

    if (timerText) timerText.style.display = 'inline';
    if (resendBtn) resendBtn.disabled = true;

    otpResendTimer = setInterval(() => {
      otpCountdown--;
      if (timerCount) timerCount.textContent = otpCountdown + 's';
      if (otpCountdown <= 0) {
        clearInterval(otpResendTimer);
        if (timerText) timerText.style.display = 'none';
        if (resendBtn) resendBtn.disabled = false;
      }
    }, 1000);
  }

  // ── Password Login Handlers ────────────────────────────────────────────────

  window.handlePasswordLogin = async function (e) {
    e.preventDefault();
    const id = document.getElementById('loginIdInput').value.trim();
    const pw = document.getElementById('loginPwInput').value;
    const btn = document.getElementById('passwordSubmitBtn');

    btn.disabled = true;
    btn.textContent = '⏳ Signing in...';
    clearAuthMessages();

    try {
      const res = await Store.customerLogin(id, pw);
      if (res.ok) {
        if (res.role === 'admin') {
          showAuthSuccess('Admin authorized! Redirecting...');
          setTimeout(() => window.location.href = 'admin/dashboard.html', 800);
        } else {
          const firstName = (res.user.name || 'Member').split(' ')[0];
          showAuthSuccess(`Welcome back, ${firstName}! 🎉`);
          setTimeout(() => {
            closeAuthModal();
            updateAuthNavBtn();
          }, 850);
        }
      } else {
        showAuthError(res.error || 'Invalid credentials.');
        btn.disabled = false;
        btn.textContent = '🔑 Sign In';
      }
    } catch (err) {
      showAuthError('Login error. Please try again.');
      btn.disabled = false;
      btn.textContent = '🔑 Sign In';
    }
  };

  // ── Register Handlers ──────────────────────────────────────────────────────

  window.handleRegisterUser = function (e) {
    e.preventDefault();
    const name = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmailAddr').value.trim();
    const phone = document.getElementById('regPhoneNumber').value.trim();
    const pw = document.getElementById('regPasswordVal').value;
    const btn = document.getElementById('registerSubmitBtn');

    btn.disabled = true;
    btn.textContent = '⏳ Creating account...';
    clearAuthMessages();

    setTimeout(() => {
      const res = Store.registerCustomer(name, email, pw, phone);
      if (res.ok) {
        // Auto sign-in
        Store.customerLogin(email, pw);
        showAuthSuccess(`Account created! Welcome to WaveNexa, ${name.split(' ')[0]}! 🎉`);
        setTimeout(() => {
          closeAuthModal();
          updateAuthNavBtn();
        }, 900);
      } else {
        showAuthError(res.error || 'Failed to create account.');
        btn.disabled = false;
        btn.textContent = '✨ Create WaveNexa Account';
      }
    }, 400);
  };

  // ── Google OAuth 2.0 ───────────────────────────────────────────────────────

  function initGoogleAuth() {
    const googleWrap = document.getElementById('googleLoginBtn');
    if (!googleWrap) return;

    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        google.accounts.id.initialize({
          client_id: window.GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse
        });
        google.accounts.id.renderButton(googleWrap, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: '100%',
          logo_alignment: 'center'
        });
        // If official button rendered, hide custom button
        document.getElementById('googleCustomBtn').style.display = 'none';
      } catch (err) {
        // Fallback to custom button
        document.getElementById('googleCustomBtn').style.display = 'flex';
      }
    } else {
      // Use custom Google button
      const customBtn = document.getElementById('googleCustomBtn');
      if (customBtn) customBtn.style.display = 'flex';
    }
  }

  async function handleGoogleCredentialResponse(response) {
    clearAuthMessages();
    try {
      const res = await Store.googleLogin(response.credential);
      if (res.ok) {
        showAuthSuccess('Welcome, ' + res.user.name.split(' ')[0] + '! 🎉');
        setTimeout(() => { closeAuthModal(); updateAuthNavBtn(); }, 850);
      } else {
        showAuthError(res.error || 'Google sign-in could not be completed.');
      }
    } catch (err) {
      showAuthError('Something went wrong signing in with Google.');
    }
  }

  window.handleGoogleOneClick = function () {
    // In demo / preview environments without active Google OAuth consent screen,
    // prompt user for their Google email or use one-click demo Google sign-in
    const promptEmail = prompt('Enter your Google email to sign in via Google OAuth:', 'alex.fashion@gmail.com');
    if (!promptEmail) return;

    const fakePayload = {
      name: promptEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: promptEmail.toLowerCase(),
      given_name: promptEmail.split('@')[0]
    };

    // Simulate Google OAuth JWT token payload
    const tokenHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const tokenBody = btoa(JSON.stringify(fakePayload));
    const tokenSig = 'simulated_sig';
    const fakeJwt = `${tokenHeader}.${tokenBody}.${tokenSig}`;

    Store.googleLogin(fakeJwt).then(res => {
      if (res.ok) {
        showAuthSuccess('Signed in with Google as ' + res.user.name + '! 🎉');
        setTimeout(() => { closeAuthModal(); updateAuthNavBtn(); }, 850);
      } else {
        showAuthError(res.error || 'Failed Google sign-in');
      }
    });
  };

  // ── Nav Button State Synchronization ───────────────────────────────────────

  window.updateAuthNavBtn = function () {
    const user = Store.getCurrentUser ? Store.getCurrentUser() : null;
    const isAdmin = (user && user.role === 'admin') || (Store.isAdminLoggedIn && Store.isAdminLoggedIn());
    const desktopBtn = document.getElementById('authNavBtn');
    const mobileLink = document.getElementById('mobileAuthLink');

    if (desktopBtn) {
      if (isAdmin) {
        desktopBtn.innerHTML = `👑 Admin`;
        desktopBtn.title = 'Open WaveNexa Admin Portal';
        desktopBtn.onclick = () => window.location.href = 'admin/dashboard.html';
      } else if (user) {
        const firstName = (user.name || 'Member').split(' ')[0];
        desktopBtn.innerHTML = `👤 ${firstName}`;
        desktopBtn.title = 'View My Profile';
        desktopBtn.onclick = () => window.location.href = 'profile.html';
      } else {
        desktopBtn.innerHTML = '🔑 Login';
        desktopBtn.title = 'Sign In / Register';
        desktopBtn.onclick = () => openAuthModal('otp');
      }
    }

    if (mobileLink) {
      if (isAdmin) {
        mobileLink.innerHTML = `👑 Admin Portal`;
        mobileLink.href = 'admin/dashboard.html';
        mobileLink.onclick = null;
      } else if (user) {
        const firstName = (user.name || 'Member').split(' ')[0];
        mobileLink.innerHTML = `👤 Profile (${firstName})`;
        mobileLink.href = 'profile.html';
        mobileLink.onclick = null;
      } else {
        mobileLink.innerHTML = '🔑 Login / Account';
        mobileLink.href = '#';
        mobileLink.onclick = (e) => {
          e.preventDefault();
          document.querySelector('.mobile-menu')?.classList.remove('open');
          openAuthModal('otp');
        };
      }
    }
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    ensureAuthModal();
    updateAuthNavBtn();
  });

  window.addEventListener('load', () => {
    ensureAuthModal();
    updateAuthNavBtn();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAuthModal();
  });

})();
