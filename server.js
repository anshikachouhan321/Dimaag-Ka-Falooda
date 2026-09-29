// server.js - DIMAAG KA FALOODA: BEAT RUN 3.0 "FORTRESS EDITION"
// Hybrid HTTP API, Static Server, RFC 6455 Realtime WebSocket Engine & Security Controller
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'fortress_security_admin_2026';

// Supabase server-side client
const supabaseUrl = process.env.SUPABASE_URL || 'https://dfixypyqewrdofaufehg.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
let supabase = null;
if (supabaseUrl && supabaseSecretKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseSecretKey);
  } catch (e) {
    console.error('[SUPABASE INIT ERROR]', e.message);
  }
}

// In-memory rotating security audit ring buffer (last 500 security events)
const SECURITY_LOG_CAP = 500;
const securityEvents = [];

function logSecurityEvent(type, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    details
  };
  securityEvents.push(entry);
  if (securityEvents.length > SECURITY_LOG_CAP) {
    securityEvents.shift();
  }
  console.warn(`[SECURITY EVENT: ${type}]`, JSON.stringify(details));
}

// Rate limiting token buckets
const ipSubmitTokens = new Map(); // ip -> [timestamps]

function isSubmitRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxReq = 5;
  const list = (ipSubmitTokens.get(ip) || []).filter(t => now - t < windowMs);
  if (list.length >= maxReq) {
    return true;
  }
  list.push(now);
  ipSubmitTokens.set(ip, list);
  return false;
}

// Periodic cleanup of stale rate limit entries
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [ip, times] of ipSubmitTokens.entries()) {
    const valid = times.filter(t => now - t < windowMs);
    if (valid.length === 0) ipSubmitTokens.delete(ip);
    else ipSubmitTokens.set(ip, valid);
  }
}, 300000).unref();

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

const KNOWN_AVATARS = [
  'hero_spiderman',
  'hero_cap',
  'hero_thor',
  'hero_loki',
  'hero_deadpool',
  'hero_ironman',
  'spider_mask',
  'miles_stealth',
  'web_slinger',
  'spider_sense',
  'iron_spider',
  'spider_bot',
  'cutting_chai',
  'sharma_beta',
  'auto_rocket',
  'chintu_pro',
  'gabbar_mustache',
  'desi_alien',
  'samosa_ninja',
  'babu_rao'
];

// ============================================================================
// 1. HTTP REQUEST ROUTER & CONTROLLER
// ============================================================================
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
                   req.socket?.remoteAddress ||
                   'unknown';

  // ROUTE A: Health check endpoint
  if (pathname === '/healthz' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), version: '3.0.0' }));
    return;
  }

  // ROUTE B: Security Audit Event Ring Buffer (Admin protected)
  if (pathname === '/api/security/events') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== ADMIN_TOKEN) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: valid admin token required' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count: securityEvents.length, events: securityEvents }));
    return;
  }

  // ROUTE C: Server-Authoritative Score Submission (/api/submit-score)
  if (pathname === '/api/submit-score' && req.method === 'POST') {
    if (isSubmitRateLimited(clientIp)) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIp, endpoint: '/api/submit-score' });
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rate limit exceeded: maximum 5 score submissions per minute' }));
      return;
    }

    let bodyRaw = '';
    req.on('data', chunk => {
      bodyRaw += chunk;
      if (bodyRaw.length > 64 * 1024) { // 64KB maximum payload
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyRaw);
        const { username, avatar, score, level, mode, replayHash, actionChain } = body;

        // Validation
        if (!username || typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid username: must be 3-20 alphanumeric characters or underscores' }));
          return;
        }

        if (!avatar || typeof avatar !== 'string' || !KNOWN_AVATARS.includes(avatar)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid avatar identifier' }));
          return;
        }

        if (!Number.isInteger(level) || level < 1 || level > 60) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid level bounds' }));
          return;
        }

        if (!Number.isInteger(score) || score < 0 || score > 150000) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid score bounds' }));
          return;
        }

        const validMode = (mode === 'duel' || mode === 'solo') ? mode : 'solo';
        const maxScoreCeiling = validMode === 'duel' ? 25000 : level * 3500 + 5000;
        if (score > maxScoreCeiling) {
          logSecurityEvent('IMPLAUSIBLE_SCORE_ATTEMPT', { username, score, level, maxScoreCeiling, ip: clientIp });
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Implausible score for verified level' }));
          return;
        }

        // Action Chain Cryptographic Re-verification
        if (replayHash && Array.isArray(actionChain)) {
          const serialized = JSON.stringify(actionChain);
          const computedHash = crypto.createHash('sha256').update(serialized).digest('hex');
          if (computedHash !== replayHash) {
            logSecurityEvent('REPLAY_HASH_MISMATCH', { username, expected: replayHash, computed: computedHash, ip: clientIp });
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cryptographic replay verification failed' }));
            return;
          }

          // Motor interval verification (minimum 35ms human motor threshold)
          for (let i = 1; i < actionChain.length; i++) {
            const dt = actionChain[i][3] - actionChain[i - 1][3];
            if (typeof dt === 'number' && dt < 35) {
              logSecurityEvent('MOTOR_LIMIT_VIOLATION', { username, deltaMs: dt, ip: clientIp });
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Inhuman tap interval detected' }));
              return;
            }
          }
        }

        // Persist to Supabase if configured
        if (supabase) {
          const { data: existing } = await supabase
            .from('blind_matrix_leaderboard')
            .select('high_score, max_level')
            .eq('username', username)
            .maybeSingle();

          if (existing && existing.high_score >= score) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Score acknowledged; existing record higher', high_score: existing.high_score }));
            return;
          }

          const { data: upserted, error: upErr } = await supabase
            .from('blind_matrix_leaderboard')
            .upsert({
              username,
              avatar,
              high_score: score,
              max_level: Math.max(level, existing?.max_level || 1),
              mode: validMode,
              replay_hash: replayHash || null,
              updated_at: new Date().toISOString()
            }, { onConflict: 'username' })
            .select();

          if (upErr) {
            console.error('[DB WRITE FAILED]', upErr.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Database write failed' }));
            return;
          }

          // Broadcast to connected WebSocket clients
          broadcastAll({
            type: 'leaderboard_sync',
            record: { username, avatar, high_score: score, max_level: level, mode: validMode }
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: upserted }));
          return;
        }

        // Standalone fallback when Supabase is not attached
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Verified locally' }));
      } catch (err) {
        logSecurityEvent('PAYLOAD_PARSE_ERROR', { error: err.message, ip: clientIp });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
      }
    });
    return;
  }

  // ROUTE D: Static Web File Server
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(path.join(__dirname, reqPath));
  const baseDir = path.resolve(__dirname);
  const resolvedPath = path.resolve(safePath);

  if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== path.join(baseDir, 'index.html')) {
    logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', { path: reqPath, ip: clientIp });
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: Serve index.html
      const indexPath = path.join(__dirname, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
          });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range headers for smooth mobile and desktop audio streaming
    if (ext === '.mp3' || ext === '.wav' || ext === '.ogg') {
      const stat = fs.statSync(safePath);
      const total = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const partialstart = parts[0];
        const partialend = parts[1];
        const start = parseInt(partialstart, 10);
        const end = partialend ? parseInt(partialend, 10) : total - 1;
        const chunksize = (end - start) + 1;

        const stream = fs.createReadStream(safePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        stream.pipe(res);
        return;
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(safePath).pipe(res);
        return;
      }
    }

    fs.readFile(safePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY'
        });
        res.end(content);
      }
    });
  });
});

// ============================================================================
// 2. HARDENED ZERO-DEPENDENCY NATIVE WEBSOCKET ENGINE (RFC 6455)
// ============================================================================
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const activeClients = new Set();
const duelRooms = new Map(); // roomCode -> { players: Set(ws), p1: ws, p2: ws, deviceType: string }

function sendWsText(socket, text) {
  if (socket.destroyed || !socket.writable) return;
  const payload = Buffer.from(text, 'utf8');
  const length = payload.length;

  let header;
  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function sendWsPing(socket) {
  if (socket.destroyed || !socket.writable) return;
  const pingHeader = Buffer.from([0x89, 0x00]); // FIN + Ping opcode, 0 length
  socket.write(pingHeader);
}

function broadcastAll(data) {
  const msg = JSON.stringify(data);
  for (const client of activeClients) {
    sendWsText(client, msg);
  }
}

// Device classification resolver
function classifyDevice(headers) {
  const chMobile = headers['sec-ch-ua-mobile'];
  if (chMobile === '?1') return 'phone';
  if (chMobile === '?0') return 'laptop';

  const ua = (headers['user-agent'] || '').toLowerCase();
  if (/tablet|touch.*large/i.test(ua)) return 'tablet';
  if (/mobi|touch|mobile|phone/i.test(ua)) return 'phone';
  return 'laptop';
}

server.on('upgrade', (req, socket, head) => {
  const origin = req.headers['origin'];
  if (origin) {
    try {
      const u = new URL(origin);
      const allowedHosts = [
        'localhost',
        '127.0.0.1',
        'dimaag-ka-falooda.vercel.app',
        'aditya2438.github.io'
      ];
      const isAllowed = allowedHosts.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
      if (!isAllowed) {
        logSecurityEvent('WS_ORIGIN_REJECTED', { origin });
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
    } catch (e) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
  }

  const wsKey = req.headers['sec-websocket-key'];
  if (!wsKey) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(wsKey + WS_MAGIC)
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

  // Attach session state to socket
  socket.deviceType = classifyDevice(req.headers);
  socket.isAlive = true;
  socket.lastPingSent = Date.now();
  socket.roomCode = null;
  socket.msgTokens = 30; // Token bucket: 30 burst allowance
  socket.lastTokenRefill = Date.now();

  activeClients.add(socket);

  let frameBuffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    frameBuffer = Buffer.concat([frameBuffer, chunk]);

    while (frameBuffer.length >= 2) {
      const firstByte = frameBuffer[0];
      const secondByte = frameBuffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;

      // RFC 6455 requires all client-to-server frames to be masked
      if (!isMasked) {
        logSecurityEvent('WS_UNMASKED_CLIENT_FRAME', { ip: req.socket.remoteAddress });
        socket.destroy();
        return;
      }

      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (frameBuffer.length < 4) return;
        payloadLen = frameBuffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (frameBuffer.length < 10) return;
        payloadLen = Number(frameBuffer.readBigUInt64BE(2));
        offset = 10;
      }

      // Max frame payload limit 16KB
      if (payloadLen > 16384) {
        logSecurityEvent('WS_FRAME_SIZE_EXCEEDED', { payloadLen });
        socket.destroy();
        return;
      }

      const maskKeyOffset = offset;
      const dataOffset = maskKeyOffset + 4;
      const totalFrameLen = dataOffset + payloadLen;

      if (frameBuffer.length < totalFrameLen) return;

      const maskKey = frameBuffer.slice(maskKeyOffset, dataOffset);
      const maskedData = frameBuffer.slice(dataOffset, totalFrameLen);
      const unmasked = Buffer.alloc(payloadLen);

      for (let i = 0; i < payloadLen; i++) {
        unmasked[i] = maskedData[i] ^ maskKey[i % 4];
      }

      frameBuffer = frameBuffer.slice(totalFrameLen);

      // Handle Ping / Pong frames
      if (opcode === 0x09) { // Ping
        socket.write(Buffer.from([0x8a, 0x00])); // Pong response
        continue;
      } else if (opcode === 0x0a) { // Pong
        socket.isAlive = true;
        continue;
      } else if (opcode === 0x08) { // Close
        socket.end();
        return;
      } else if (opcode === 0x01) { // Text
        // Token bucket message rate-limiting
        const now = Date.now();
        const elapsedSec = (now - socket.lastTokenRefill) / 1000;
        socket.msgTokens = Math.min(30, socket.msgTokens + elapsedSec * 1.5); // Refill 1.5 tokens/sec
        socket.lastTokenRefill = now;

        if (socket.msgTokens < 1) {
          logSecurityEvent('WS_BURST_RATE_LIMIT', { device: socket.deviceType });
          sendWsText(socket, JSON.stringify({ type: 'rate_limited', retryAfterMs: 1000 }));
          continue;
        }
        socket.msgTokens -= 1;

        try {
          const text = unmasked.toString('utf8');
          const msg = JSON.parse(text);
          handleWebSocketMessage(socket, msg);
        } catch (e) {
          logSecurityEvent('WS_PAYLOAD_PARSE_ERROR', { error: e.message });
        }
      }
    }
  });

  socket.on('close', () => cleanupSocket(socket));
  socket.on('error', () => cleanupSocket(socket));
});

// Periodic Ping-Pong Heartbeat (every 25s; terminates silent sockets after 60s)
setInterval(() => {
  const now = Date.now();
  for (const client of activeClients) {
    if (!client.isAlive && (now - client.lastPingSent > 60000)) {
      client.destroy();
      activeClients.delete(client);
    } else {
      client.isAlive = false;
      client.lastPingSent = now;
      sendWsPing(client);
    }
  }
}, 25000).unref();

function cleanupSocket(socket) {
  activeClients.delete(socket);
  if (socket.roomCode && duelRooms.has(socket.roomCode)) {
    const room = duelRooms.get(socket.roomCode);
    room.players.delete(socket);

    const opponent = socket === room.p1 ? room.p2 : room.p1;
    if (opponent && opponent.writable && !opponent.destroyed) {
      sendWsText(opponent, JSON.stringify({
        type: 'opponent_left',
        message: 'Opponent disconnected from room.'
      }));
    }

    if (room.players.size === 0) {
      duelRooms.delete(socket.roomCode);
    }
  }
}

function handleWebSocketMessage(socket, msg) {
  if (!msg || typeof msg !== 'object') return;

  const action = msg.action || msg.type;

  // Real-time Leaderboard broadcast over WebSocket (<1s sync across all clients)
  if (action === 'leaderboard_update') {
    if (msg.record && msg.record.username) {
      broadcastAll({
        type: 'leaderboard_sync',
        record: {
          username: String(msg.record.username).substring(0, 32),
          avatar: String(msg.record.avatar || 'cutting_chai').substring(0, 32),
          high_score: Number(msg.record.high_score) || 0,
          max_level: Number(msg.record.max_level) || 1,
          mode: String(msg.record.mode || 'solo').substring(0, 16)
        }
      });
    }
    return;
  }

  // 1. Join room with device-type homogenization check
  if (action === 'join_room') {
    const code = (msg.roomCode || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{4}$/.test(code)) return;

    socket.roomCode = code;
    let room = duelRooms.get(code);

    if (!room) {
      // Host initializes room
      room = {
        players: new Set(),
        p1: socket,
        p2: null,
        deviceType: socket.deviceType,
        handleP1: msg.handle || 'HOST',
        avatarP1: msg.avatar || 'cutting_chai',
        handleP2: null,
        avatarP2: null,
        scoreP1: 0,
        scoreP2: 0,
        targetScore: 10
      };
      room.players.add(socket);
      duelRooms.set(code, room);

      sendWsText(socket, JSON.stringify({
        type: 'room_joined',
        status: 'HOSTED',
        roomCode: code,
        deviceType: socket.deviceType
      }));
    } else {
      // HARD GATE: Device type mismatch prevention
      if (room.deviceType !== socket.deviceType) {
        logSecurityEvent('DEVICE_MISMATCH_REJECT', {
          roomCode: code,
          hostDevice: room.deviceType,
          guestDevice: socket.deviceType
        });
        sendWsText(socket, JSON.stringify({
          type: 'room_joined',
          status: 'DEVICE_MISMATCH',
          required: room.deviceType,
          detected: socket.deviceType,
          message: `Device mismatch: this room requires a ${room.deviceType}.`
        }));
        return;
      }

      if (room.players.size >= 2) {
        sendWsText(socket, JSON.stringify({
          type: 'room_joined',
          status: 'FULL',
          message: 'Room is already full.'
        }));
        return;
      }

      room.p2 = socket;
      room.handleP2 = msg.handle || 'GUEST';
      room.avatarP2 = msg.avatar || 'sharma_beta';
      room.players.add(socket);

      // Generate synchronized initial sequence
      const seq = [];
      for (let i = 0; i < 4; i++) {
        seq.push(Math.floor(Math.random() * 9));
      }

      // Notify Host
      sendWsText(room.p1, JSON.stringify({
        type: 'player_joined',
        handle: room.handleP2,
        avatar: room.avatarP2,
        initialSequence: seq,
        code
      }));

      // Confirm to Guest
      sendWsText(room.p2, JSON.stringify({
        type: 'room_ready',
        hostHandle: room.handleP1,
        guestHandle: room.handleP2,
        initialSequence: seq,
        code
      }));
    }
    return;
  }

  // 2. Realtime duel events forwarding within room
  if (socket.roomCode && duelRooms.has(socket.roomCode)) {
    const room = duelRooms.get(socket.roomCode);
    const opponent = socket === room.p1 ? room.p2 : room.p1;
    if (!opponent || opponent.destroyed || !opponent.writable) return;

    if (action === 'duel_tap' || action === 'tap_progress') {
      sendWsText(opponent, JSON.stringify({
        type: 'duel_tap',
        tileIndex: Number(msg.tileIndex) || 0,
        progress: Number(msg.progress) || 0,
        score: Number(msg.score) || 0
      }));
    } else if (action === 'duel_stun' || action === 'player_stun') {
      sendWsText(opponent, JSON.stringify({ type: 'duel_stun' }));
    } else if (action === 'duel_round_win' || action === 'round_win') {
      sendWsText(opponent, JSON.stringify({
        type: 'duel_round_win',
        score: Number(msg.score) || 0
      }));
    } else if (action === 'duel_next_round' || action === 'sync_round') {
      sendWsText(opponent, JSON.stringify({
        type: 'duel_next_round',
        sequence: Array.isArray(msg.sequence) ? msg.sequence : (Array.isArray(msg.roundSeq) ? msg.roundSeq : [0, 1, 2, 3])
      }));
    } else if (action === 'duel_match_won' || action === 'duel_victory') {
      sendWsText(opponent, JSON.stringify({ type: 'duel_match_won' }));
    }
  }
}

server.listen(PORT, () => {
  console.log(`[FORTRESS ENGINE 3.0] Master Server active on port ${PORT}`);
});
