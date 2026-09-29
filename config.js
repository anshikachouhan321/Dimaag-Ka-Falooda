/* ==========================================================================
   DIMAAG KA FALOODA: BEAT RUN 3.0 FORTRESS EDITION
   Client-Side Environment & Architecture Configuration (config.js)
   ========================================================================== */

const APP_CONFIG = {
  VERSION: '3.0.0-fortress',
  ENV: typeof process !== 'undefined' && process.env && process.env.NODE_ENV ? process.env.NODE_ENV : 'production',

  // WebSocket Server URL: Auto-discovered or overridden
  SERVER_URL: (() => {
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="game-server"]');
      if (meta && meta.content && meta.content.trim()) return meta.content.trim();
    }
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
      }
    }
    return '';
  })(),

  // Backend API Base URL
  API_BASE_URL: (() => {
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="game-server"]');
      if (meta && meta.content && meta.content.trim()) {
        return meta.content.trim().replace(/^ws(s?):/, 'http$1:');
      }
    }
    return '';
  })(),

  // Default Supabase Config (Public Anon Key has REVOKED write privileges)
  SUPABASE_URL: 'https://dfixypyqewrdofaufehg.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_u-T2e51hbuuIp8cblLxkqQ_JMTpE90g',

  // Security thresholds
  ANTI_CHEAT: {
    MIN_MOTOR_REFLEX_MS: 35,
    MAX_PLAUSIBLE_SCORE_PER_LEVEL: 3500,
    MAX_WS_PAYLOAD_BYTES: 16384
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
}
