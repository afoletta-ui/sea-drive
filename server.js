// Sea Drive multiplayer server: serves the game + relays players + owns the land blocks.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'data.json');
const UR = process.env.UPSTASH_REDIS_REST_URL, UT = process.env.UPSTASH_REDIS_REST_TOKEN;
const COLORS = ['#e8445a', '#2f8ccc', '#3fae5a', '#a85aa8', '#ff8a1e', '#2ee6c8', '#ff6fae', '#9fb4c8'];

let owners = {}; // blockIndex -> { pid, n, c }

async function load() {
  try {
    if (UR) {
      const r = await fetch(UR + '/get/owners', { headers: { Authorization: 'Bearer ' + UT } });
      const j = await r.json();
      if (j.result) owners = JSON.parse(j.result);
    } else owners = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) { /* first run: nothing saved yet */ }
}
function save() {
  const s = JSON.stringify(owners);
  if (UR) fetch(UR + '/set/owners', { method: 'POST', headers: { Authorization: 'Bearer ' + UT }, body: s }).catch(() => {});
  else fs.writeFile(FILE, s, () => {});
}

const page = () => fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
  .replace('<!--MP-->', '<script>window.MP_ON=true</script>');

const srv = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200); return res.end('ok'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page());
});

const wss = new WebSocketServer({ server: srv });
const players = new Map(); // ws -> player
let nextId = 1;
const num = v => (Number.isFinite(v) ? v : 0);
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const others = (me, o) => { for (const w of wss.clients) if (w !== me) send(w, o); };

wss.on('connection', ws => {
  const id = nextId++;
  const p = { id, n: 'Player' + id, c: COLORS[id % COLORS.length], x: 0, z: 6, h: 0, w: 0, pid: null };
  players.set(ws, p);

  ws.on('message', raw => {
    let d; try { d = JSON.parse(raw); } catch (e) { return; }
    if (d.t === 'hi') {
      p.n = String(d.n || p.n).slice(0, 14);
      p.pid = crypto.createHash('sha1').update(String(d.tok || id)).digest('hex').slice(0, 8);
      send(ws, { t: 'init', id, pid: p.pid, c: p.c, owners,
        players: [...players.values()].filter(q => q !== p && q.pid).map(q => ({ id: q.id, n: q.n, c: q.c, x: q.x, z: q.z, h: q.h, w: q.w })) });
      others(ws, { t: 'join', id, n: p.n, c: p.c });
    } else if (d.t === 'pos' && p.pid) {
      p.x = num(d.x); p.z = num(d.z); p.h = num(d.h); p.w = d.w ? 1 : 0;
    } else if (d.t === 'buy' && p.pid) {
      const i = Math.trunc(num(d.i));
      if (owners[i]) return send(ws, { t: 'buyres', i, ok: 0 });
      owners[i] = { pid: p.pid, n: p.n, c: p.c };
      save();
      send(ws, { t: 'buyres', i, ok: 1 });
      for (const w of wss.clients) send(w, { t: 'own', i, o: owners[i] });
    }
  });
  ws.on('close', () => { players.delete(ws); others(ws, { t: 'leave', id }); });
});

setInterval(() => {
  if (players.size < 2) return;
  const snap = [...players.values()].filter(p => p.pid).map(p => [p.id, p.x, p.z, p.h, p.w]);
  for (const w of wss.clients) send(w, { t: 'snap', p: snap });
}, 100);
setInterval(() => { for (const w of wss.clients) if (w.readyState === 1) w.ping(); }, 30000); // keep free hosts from dropping idle sockets

load().then(() => srv.listen(PORT, () => console.log('Sea Drive running on port ' + PORT)));
