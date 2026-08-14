// ╔══════════════════════════════════════════════════════════════╗
// ║            TAKA AI NEURAL SHIELD v3.0                        ║
// ║       Advanced Anti-Tamper & Intrusion Detection System      ║
// ║                   Engineered by Takadori                     ║
// ╚══════════════════════════════════════════════════════════════╝

(function() {
  'use strict';

  const SHIELD_VERSION = '3.0.0';
  let devtoolsOpen = false;
  let warningCount = 0;
  const MAX_WARNINGS = 3;

  // ── 1. Console Honey Trap ──────────────────────────────────────
  const _log = console.log;
  const _warn = console.warn;
  const _error = console.error;

  // Override console with branded warnings
  const shieldBanner = [
    '%c╔══════════════════════════════════════════════════════════╗',
    '%c║  🛡️  TAKA AI NEURAL SHIELD v3.0  •  ACTIVE              ║',
    '%c║  ⚠️  This console is monitored by Taka AI Threat Engine  ║',
    '%c║  🔒  All actions are logged & fingerprinted              ║',
    '%c║  ⚡  Unauthorized access will trigger countermeasures    ║',
    '%c╚══════════════════════════════════════════════════════════╝',
  ];

  const bannerStyle = 'color: #ff3333; font-size: 14px; font-weight: bold; font-family: monospace; text-shadow: 0 0 5px rgba(255,50,50,0.5);';

  function printShieldBanner() {
    shieldBanner.forEach(line => _log.call(console, line, bannerStyle));
    _log.call(console, '');
    _log.call(console,
      '%c🛡️ Taka AI Shield: Your browser fingerprint, IP, and session have been recorded. Any exploitation attempt will be traced.',
      'color: #ff6600; font-size: 12px; font-weight: bold;'
    );
    _log.call(console,
      '%c💡 If you are a legitimate developer, use the official Taka AI API: https://taka-ai-gateway.vercel.app/v1/chat/completions',
      'color: #22d3ee; font-size: 11px;'
    );
  }

  // Print on first load
  setTimeout(printShieldBanner, 500);

  // ── 2. DevTools Detection (Size-based) ─────────────────────────
  const devToolsChecker = setInterval(function() {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    const isOpen = widthThreshold || heightThreshold;

    if (isOpen && !devtoolsOpen) {
      devtoolsOpen = true;
      warningCount++;
      onDevToolsDetected();
    } else if (!isOpen) {
      devtoolsOpen = false;
    }
  }, 1000);

  // ── 3. Debugger Statement Trap ─────────────────────────────────
  // If someone tries to step through with debugger, this fires repeatedly
  (function antiDebug() {
    const start = performance.now();
    debugger;
    const elapsed = performance.now() - start;
    if (elapsed > 100) {
      onDevToolsDetected();
    }
    setTimeout(antiDebug, 3000);
  })();

  // ── 4. What Happens When DevTools Are Detected ─────────────────
  function onDevToolsDetected() {
    _warn.call(console, '');
    _warn.call(console,
      '%c⚠️ TAKA AI INTRUSION ALERT ⚠️',
      'color: #ff0000; font-size: 24px; font-weight: bold; text-shadow: 0 0 20px #ff0000;'
    );
    _warn.call(console,
      '%c🔴 Developer tools access detected. Session threat level: ELEVATED',
      'color: #ff4444; font-size: 14px; font-weight: bold;'
    );
    _warn.call(console,
      '%c🛡️ Your device fingerprint & network signature have been captured.',
      'color: #ff8800; font-size: 12px;'
    );
    _warn.call(console,
      '%c📡 Taka AI Threat Engine is monitoring this session in real-time.',
      'color: #ffaa00; font-size: 12px;'
    );

    // Show visual "Surprise" overlay on the page
    if (warningCount <= MAX_WARNINGS) {
      showSecurityOverlay();
    }
  }

  // ── 5. The "Surprise" Overlay ──────────────────────────────────
  function showSecurityOverlay() {
    // Remove existing overlay if present
    const existing = document.getElementById('taka-shield-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'taka-shield-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(0,0,0,0.92);
        backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: shieldFadeIn 0.3s ease;
      ">
        <div style="
          max-width: 520px;
          padding: 40px;
          text-align: center;
          border: 2px solid rgba(255,50,50,0.6);
          border-radius: 24px;
          background: rgba(20,5,5,0.95);
          box-shadow: 0 0 60px rgba(255,0,0,0.3), 0 0 120px rgba(255,0,0,0.15), inset 0 0 30px rgba(255,0,0,0.05);
          animation: shieldPulse 2s ease infinite;
        ">
          <div style="font-size: 64px; margin-bottom: 16px; animation: shieldSpin 1s ease;">🛡️</div>
          <h2 style="
            color: #ff3333;
            font-size: 22px;
            font-weight: 800;
            margin: 0 0 8px;
            letter-spacing: 2px;
            text-shadow: 0 0 15px rgba(255,50,50,0.5);
          ">TAKA AI THREAT SHIELD ACTIVATED</h2>
          <p style="
            color: #ff8888;
            font-size: 13px;
            margin: 0 0 20px;
            line-height: 1.6;
          ">
            Unauthorized inspection attempt detected.<br>
            Your browser fingerprint, IP address, and session data<br>
            have been logged by Taka AI Neural Threat Engine.
          </p>
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 10px;
            background: rgba(255,50,50,0.15);
            border: 1px solid rgba(255,50,50,0.4);
            color: #ff6666;
            font-size: 11px;
            font-weight: 600;
            font-family: monospace;
            margin-bottom: 20px;
          ">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff3333;box-shadow:0 0 8px #ff3333;animation:shieldBlink 1s ease infinite;"></span>
            THREAT LEVEL: ELEVATED • SESSION MONITORED
          </div>
          <br>
          <button onclick="this.closest('[id=taka-shield-overlay]').remove()" style="
            margin-top: 12px;
            padding: 10px 28px;
            border: 1px solid rgba(255,100,100,0.4);
            border-radius: 12px;
            background: rgba(255,50,50,0.15);
            color: #ff8888;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          " onmouseover="this.style.background='rgba(255,50,50,0.3)';this.style.color='#ffaaaa'" onmouseout="this.style.background='rgba(255,50,50,0.15)';this.style.color='#ff8888'">
            I understand — close this warning
          </button>
        </div>
      </div>
    `;

    // Inject keyframe animations
    if (!document.getElementById('taka-shield-styles')) {
      const style = document.createElement('style');
      style.id = 'taka-shield-styles';
      style.textContent = `
        @keyframes shieldFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes shieldPulse { 0%,100% { box-shadow: 0 0 60px rgba(255,0,0,0.3), 0 0 120px rgba(255,0,0,0.15); } 50% { box-shadow: 0 0 80px rgba(255,0,0,0.5), 0 0 150px rgba(255,0,0,0.25); } }
        @keyframes shieldSpin { from { transform: rotateY(0deg) scale(0.5); opacity: 0; } to { transform: rotateY(360deg) scale(1); opacity: 1; } }
        @keyframes shieldBlink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
  }

  // ── 6. Disable Right-Click Context Menu ─────────────────────────
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    showMiniToast('🛡️ Right-click disabled by Taka AI Shield');
    return false;
  });

  // ── 7. Block Common Keyboard Shortcuts ──────────────────────────
  document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      showMiniToast('🛡️ F12 blocked by Taka AI Shield');
      return false;
    }
    // Ctrl+Shift+I (DevTools), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspector)
    if (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key)) {
      e.preventDefault();
      showMiniToast('🛡️ Inspector blocked by Taka AI Shield');
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      showMiniToast('🛡️ View Source blocked by Taka AI Shield');
      return false;
    }
    // Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
      e.preventDefault();
      showMiniToast('🛡️ Save blocked by Taka AI Shield');
      return false;
    }
  });

  // ── 8. Disable text selection on sensitive areas ────────────────
  document.addEventListener('selectstart', function(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // Allow in inputs
    // Allow in code blocks
    if (e.target.closest('pre') || e.target.closest('code')) return;
  });

  // ── 9. Mini Toast Notification ──────────────────────────────────
  function showMiniToast(message) {
    const existing = document.getElementById('taka-shield-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'taka-shield-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 10px 22px;
      border-radius: 12px;
      background: rgba(255,30,30,0.9);
      color: white;
      font-size: 12px;
      font-weight: 600;
      z-index: 99998;
      pointer-events: none;
      box-shadow: 0 0 30px rgba(255,0,0,0.4);
      border: 1px solid rgba(255,100,100,0.5);
      animation: toastIn 0.3s ease forwards;
    `;

    if (!document.getElementById('taka-toast-style')) {
      const s = document.createElement('style');
      s.id = 'taka-toast-style';
      s.textContent = `
        @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(20px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        @keyframes toastOut { from { opacity:1; transform: translateX(-50%) translateY(0); } to { opacity:0; transform: translateX(-50%) translateY(20px); } }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ── 10. Protect Global Scope ────────────────────────────────────
  // Freeze critical objects to prevent prototype pollution
  try {
    Object.freeze(Object.prototype);
  } catch(e) {}

  // Console cleaner - clear any attempts to read variables
  Object.defineProperty(window, '__TAKA_SHIELD__', {
    value: Object.freeze({
      version: SHIELD_VERSION,
      status: 'ACTIVE',
      engine: 'Taka AI Neural Threat Engine',
      architect: 'Takadori'
    }),
    writable: false,
    configurable: false
  });

  _log.call(console, '%c🛡️ Taka AI Neural Shield v' + SHIELD_VERSION + ' — ACTIVE', 'color: #22d3ee; font-size: 11px; font-weight: bold;');

})();
