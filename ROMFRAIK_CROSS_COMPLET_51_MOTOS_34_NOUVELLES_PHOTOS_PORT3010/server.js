// Serveur local ROMFRAIK CROSS — aucune dépendance. Lancer : node server.js  puis ouvrir http://localhost:3000
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname, PORT = process.env.PORT || 3010;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const TYPES = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8' };
const TITLES = { '/':'Motos cross neuves en Belgique', '/catalogue':'Catalogue de motos cross', '/contact':'Contacter la boutique', '/comparateur':'Comparateur de motos cross', '/favoris':'Mes favoris', '/panier':'Ma sélection', '/nouveautes':'Nouveautés motos cross', '/promotions':'Promotions motos cross', '/confidentialite':'Confidentialité', '/admin':'Administration' };
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8')); } catch { return d; } };
const write = (f, v) => { fs.mkdirSync(path.join(ROOT,'data'),{recursive:true}); fs.writeFileSync(path.join(ROOT,'data',f), JSON.stringify(v,null,1)); };
const json = (res, code, obj) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b=''; req.on('data',c=>{b+=c; if(b.length>1e6) req.destroy();}); req.on('end',()=>{ try{r(JSON.parse(b||'{}'))}catch{r({})} }); });
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

async function api(req, res, url) {
  if (url.pathname === '/api/messages' && req.method === 'POST') {
    const m = await body(req);
    if (!m.name || !m.email) return json(res, 400, { error: 'Nom et email requis.' });
    const msg = { ...m, id: crypto.randomUUID(), received: new Date().toISOString() };
    const all = read('messages.json', []); all.unshift(msg); write('messages.json', all);
    return json(res, 200, { id: msg.id.slice(0, 8) });
  }
  if (url.pathname.startsWith('/api/admin')) {
    const sub = url.pathname.slice('/api/admin'.length);
    const ok = (req.headers.authorization || '') === 'Bearer ' + ADMIN_PASSWORD;
    if (sub === '/status') return ok ? json(res, 200, { ok: true }) : json(res, 401, { error: 'Mot de passe incorrect.' });
    if (!ok) return json(res, 401, { error: 'Non autorisé.' });
    if (sub === '/messages' && req.method === 'GET') return json(res, 200, read('messages.json', []));
    if (sub.startsWith('/messages/') && req.method === 'DELETE') { const id = sub.split('/')[2]; write('messages.json', read('messages.json', []).filter(m => m.id !== id)); return json(res, 200, { ok: true }); }
    if (sub === '/catalog' && req.method === 'GET') return json(res, 200, read('catalog.json', []));
    if (sub === '/shop' && req.method === 'GET') return json(res, 200, read('shop.json', {}));
    return json(res, 501, { error: 'Modification non disponible dans cette reconstruction : le catalogue et les coordonnées se changent dans assets/index-*.js.' });
  }
  return json(res, 404, { error: 'Introuvable.' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const file = path.join(ROOT, decodeURIComponent(url.pathname));
    const relativeFile = path.relative(ROOT, file);
    const isDataFile = relativeFile.split(path.sep)[0] === 'data';
    if (file.startsWith(ROOT) && !isDataFile && !/server\.js$/.test(file) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache, no-store, must-revalidate' });
      return fs.createReadStream(file).pipe(res);
    }
    // Toute autre adresse : l'application React gère la page (accueil, catalogue, fiches motos…)
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const p = url.pathname.replace(/\/+$/, '') || '/';
    const t = TITLES[p] || (p.startsWith('/motos/') ? p.split('/')[2].replace(/-/g,' ').toUpperCase() : null);
    if (t) html = html.replace(/<title>.*?<\/title>/, `<title>${esc(t)} | ROMFRAIK CROSS</title>`).replace(/(og:title" content=")[^"]*/, `$1${esc(t)} | ROMFRAIK CROSS`);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' }); res.end(html);
  } catch (e) { res.writeHead(500); res.end('Erreur serveur'); }
}).listen(PORT, () => console.log('ROMFRAIK CROSS : http://localhost:' + PORT));
