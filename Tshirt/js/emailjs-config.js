/* ==========================================================================
   WAVENEXA — EmailJS Service Configuration
   ========================================================================== */

(function () {
  'use strict';

  window.EMAILJS_CONFIG = {
    serviceId: 'service_p176j1e',
    templateId: 'template_v4451o9',
    publicKey: 'dlLlCT95h6RXooM6x'
  };

  // Auto-initialize EmailJS browser SDK if loaded via script tag
  if (typeof window !== 'undefined' && window.emailjs && typeof window.emailjs.init === 'function') {
    try {
      window.emailjs.init({ publicKey: window.EMAILJS_CONFIG.publicKey });
    } catch (e) {
      console.warn('[EmailJS] SDK init warning:', e);
    }
  }
})();
