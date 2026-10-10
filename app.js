const KEY = 'kasir';
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e) { console.error('Gagal simpan', e); } };
const readLS = k => { try { return localStorage.getItem(k); } catch(e) { return null; } };

let db;
try {
    db = JSON.parse(localStorage.getItem(KEY)) || { products: [], cart: [], sales: [] };
} catch(e) {
    db = { products: [], cart: [], sales: [] };
    alert('Data lama rusak dan direset. Backup sebelumnya mungkin masih ada di folder Unduhan.');
}
db.pendingSales ||= [];
db.cart ||= [];
db.sales ||= [];
db.products ||= [];
db.trash ||= [];
db.backups ||= [];
db.pinO ||= '1234';
db.pinC ||= '0000';
db.discType ||= 'nominal';
db.discVal ||= 0;
if(!db.tokoId) { db.tokoId = 'TOKO_' + Math.floor(Math.random()*9000+1000); save(); }

// Produk contoh untuk demo
if(!db.seeded) {
    const svg = (emoji, bg) => 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/><text x='50' y='58' font-size='46' text-anchor='middle'>${emoji}</text></svg>`);
    db.products = [
        { id: 'P_SEED1', n: 'Indomie Goreng', p: 3500, q: 24, c: '8992388101010', cat: 'Makanan', img: svg('🍜', '#fef3c7') },
        { id: 'P_SEED2', n: 'Aqua 600ml', p: 4000, q: 30, c: '8996001306015', cat: 'Minuman', img: svg('💧', '#dbeafe') },
        { id: 'P_SEED3', n: 'Teh Botol 350ml', p: 5000, q: 18, c: '', cat: 'Minuman', img: svg('🍵', '#d1fae5') },
        { id: 'P_SEED4', n: 'Kopi Sachet', p: 2500, q: 40, c: '', cat: 'Makanan', img: svg('☕', '#f3e8d2') },
        { id: 'P_SEED5', n: 'Beras 5kg', p: 75000, q: 10, c: '', cat: 'Sembako', img: svg('🍚', '#fef9c3') },
        { id: 'P_SEED6', n: 'Minyak Goreng 1L', p: 18000, q: 12, c: '', cat: 'Sembako', img: svg('🛢️', '#e0e7ff') }
    ];
    db.seeded = true;
    save();
}

// Migrasi: produk lama tanpa ID unik
db.products.forEach(p => { if(!p.id) p.id = 'P' + Date.now() + Math.floor(Math.random()*1000); });
db.lowStock ||= 5;

const nextNo = function() {
    db.noSeq = (db.noSeq || 0) + 1;
    save();
    return 'TRX-' + String(db.noSeq).padStart(5, '0');
};

// Migrasi: transaksi lama tanpa nomor struk
db.sales.forEach(s => { if(!s.no) s.no = nextNo(); save(); });

let role = '', activePin = '', sessionId = '';
let searchQ = '';
let pinTries = 0, lockUntil = 0, idleTimer = null;
const IDLE_MS = 10 * 60 * 1000; // logout otomatis setelah 10 menit idle

window.login = async () => {
    let p = $('pin').value;
    if(!p) return;
    
    if(Date.now() < lockUntil) {
        let sisa = Math.ceil((lockUntil - Date.now()) / 1000);
        return alert('Terlalu banyak percobaan. Coba lagi dalam ' + sisa + ' detik.');
    }
    
    $('auth').style.opacity = '0.5'; // loading state

    try {
        let found = false;
        if(window.fdb && navigator.onLine) {
            try {
                let snap = await window.fget(window.fdoc(window.fdb, "users", p));
                if(snap.exists()) {
                    let u = snap.data();
                    role = u.role;
                    db.tokoId = u.tokoId;
                    save();
                    found = true;
                }
            } catch(netErr) { console.error('Firebase tidak terjangkau, pakai PIN lokal', netErr); }
        }
        if(!found) {
            // Fallback: PIN lokal di HP ini
            if(p === db.pinO) role = 'owner';
            else if(p === db.pinC) role = 'cashier';
            else throw 'invalid';
        }

        $('pin').value = '';
        $('auth').style.display = 'none';
        $('auth').style.opacity = '1';
        $('app').style.display = 'block';
        $('nav').style.display = 'flex';
        $('fab-scan').style.display = 'block';
        $('hdr-toko').textContent = `(${db.tokoId})`;
        activePin = p;
        
        // --- Rekam Jam Masuk Kasir ke Cloud ---
        if(window.fdb && navigator.onLine) {
            let ref = await window.fadd(window.fcol(window.fdb, "sessions"), {
                toko_id: db.tokoId,
                kasir: activePin,
                masuk: Date.now(),
                keluar: null
            });
            sessionId = ref.id;
        }

        document.querySelectorAll('.role-own').forEach(e => e.style.display = role === 'owner' ? 'block' : 'none');
        if($('disc-type')) $('disc-type').value = db.discType || 'nominal';
        if($('lowstock')) $('lowstock').value = db.lowStock || 5;
        pinTries = 0;
        startIdle();
        show('kasir');
    } catch(e) {
        $('auth').style.opacity = '1';
        pinTries++;
        if(pinTries >= 5) {
            lockUntil = Date.now() + 30000;
            pinTries = 0;
            alert('Terlalu banyak percobaan. Dikunci 30 detik.');
        } else {
            alert(e === 'invalid' ? `PIN Salah atau tidak terdaftar (${pinTries}/5)` : 'Gagal login: ' + e);
        }
    }
};

window.logout = async () => {
    // --- Rekam Jam Keluar Kasir ---
    if(sessionId && window.fdb && navigator.onLine) {
        await window.fupd(window.fdoc(window.fdb, "sessions", sessionId), { keluar: Date.now() });
    }
    stopIdle();
    role = ''; activePin = ''; sessionId = '';
    $('auth').style.display = 'block';
    $('app').style.display = 'none';
    $('nav').style.display = 'none';
    $('fab-scan').style.display = 'none';
};

// --- Logout otomatis saat idle ---
const resetIdle = () => {
    if(!role) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        alert('Sesi berakhir karena tidak ada aktivitas. Silakan login kembali.');
        logout();
    }, IDLE_MS);
};
const startIdle = () => {
    ['click', 'touchstart', 'keydown', 'input'].forEach(ev =>
        document.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
};
const stopIdle = () => {
    clearTimeout(idleTimer);
    ['click', 'touchstart', 'keydown', 'input'].forEach(ev =>
        document.removeEventListener(ev, resetIdle));
};

const rp = n => n.toLocaleString('id-ID');
const $ = i => document.getElementById(i);
const clean = (value, max = 80) => String(value).trim().replace(/[<>]/g, '').slice(0, max);

// ponytail: expose untuk testing (test.js), bukan untuk UI
window.rp = rp; window.clean = clean;

window.show = t => {
    ['kasir','stok','lap','data'].forEach(x => { $('tab-'+x).classList.toggle('on', x===t); $(x).classList.toggle('on', x===t); });
    if(t==='stok') { renderP(); renderLog(); } if(t==='lap') renderS(); if(t==='data') { renderBackups(); renderTrash(); }
};

let editIdx = null;

const logStock = (p, perubahan, alasan) => {
    db.stockLog ||= [];
    db.stockLog.unshift({ id: p.id, n: p.n, qty: perubahan, alasan, t: new Date().toLocaleString('id-ID') });
};

// --- Backup & Sampah ---
const autoBackup = label => {
    db.backups.unshift({ label, t: new Date().toLocaleString('id-ID'), data: JSON.stringify({ products: db.products, sales: db.sales, stockLog: db.stockLog || [] }) });
    db.backups = db.backups.slice(0, 20); // maks 20 backup
    save();
};

const moveToTrash = (type, data, alasan) => {
    db.trash.unshift({ type, data, alasan, t: new Date().toLocaleString('id-ID') });
    db.trash = db.trash.slice(0, 100);
    save();
};

window.makeBackup = () => {
    autoBackup('Manual oleh ' + (activePin || 'pemilik'));
    renderBackups();
    alert('Backup dibuat.');
};

window.renderBackups = () => {
    let el = $('blist');
    if(!el) return;
    el.innerHTML = db.backups.map((b, i) =>
        `<li><span class="big">${b.label}<span class="tag">${b.t} · ${JSON.parse(b.data).products.length} produk · ${JSON.parse(b.data).sales.length} transaksi</span></span>
         <span style="display:flex;gap:6px">
           <button onclick="restoreBackup(${i})" style="background:var(--g)">↩</button>
           <button onclick="delBackup(${i})" style="background:var(--r)">🗑</button>
         </span></li>`).join('') || '<div class="empty">Belum ada backup.</div>';
};

window.restoreBackup = i => {
    let b = db.backups[i];
    if(!b) return;
    if(!confirm(`Pulihkan backup "${b.label}" (${b.t})?\nData sekarang akan dibackup dulu.`)) return;
    autoBackup('Sebelum restore ' + b.label);
    let d = JSON.parse(b.data);
    db.products = d.products; db.sales = d.sales; db.stockLog = d.stockLog || [];
    save(); render(); renderP(); renderS(); renderBackups();
    alert('Backup dipulihkan.');
};

window.delBackup = i => {
    if(confirm('Hapus backup ini permanen?')) { db.backups.splice(i, 1); save(); renderBackups(); }
};

window.renderTrash = () => {
    let el = $('tlist');
    if(!el) return;
    el.innerHTML = db.trash.map((x, i) =>
        `<li><span class="big">${x.type === 'produk' ? '📦' : '🧾'} ${x.type === 'produk' ? x.data.n : (x.data.no || 'Transaksi')}<span class="tag">${x.t} · ${x.alasan}</span></span>
         <span style="display:flex;gap:6px">
           <button onclick="restoreTrash(${i})" style="background:var(--g)">↩</button>
           <button onclick="delTrashPerm(${i})" style="background:var(--r)">🗑</button>
         </span></li>`).join('') || '<div class="empty">Sampah kosong.</div>';
};

window.restoreTrash = i => {
    let x = db.trash[i];
    if(!x) return;
    if(x.type === 'produk') db.products.push(x.data);
    else db.sales.unshift(x.data);
    db.trash.splice(i, 1);
    save(); renderTrash(); renderP(); renderS();
    alert('Dipulihkan dari sampah.');
};

window.delTrashPerm = i => {
    if(!confirm('Hapus permanen? Tidak bisa dikembalikan.')) return;
    db.trash.splice(i, 1); save(); renderTrash();
};

window.emptyTrash = () => {
    if(!confirm('Kosongkan seluruh sampah?')) return;
    db.trash = []; save(); renderTrash();
};

window.adjustStock = i => {
    let p = db.products[i];
    let v = prompt(`Stok "${p.n}" saat ini: ${p.q}\nMasukkan perubahan (+/-, misal -5 atau 10):`);
    if(v === null) return;
    let n = Number(v);
    if(!Number.isSafeInteger(n) || n === 0) return alert('Angka tidak valid');
    if(p.q + n < 0) return alert('Stok tidak boleh minus');
    p.q += n;
    logStock(p, n, 'Penyesuaian manual');
    save(); renderP();
};

window.renderP = () => {
    let q = (searchQ || '').toLowerCase();
    let list = db.products.map((p, i) => ({ p, i })).filter(x => !q || x.p.n.toLowerCase().includes(q));
    $('plist').innerHTML = list.map(({ p, i }) =>
        `<li><span class="big">${p.n}<span class="tag">Rp${rp(p.p)} · Stok: ${p.q}${p.q <= db.lowStock ? ' ⚠️ MENIPIS' : ''}${p.c?' · '+p.c:''}</span></span>
         <span style="display:flex;gap:6px">
           <button onclick="adjustStock(${i})" style="background:var(--g)">±</button>
           ${p.c ? `<button onclick="printBarcode(${i})" style="background:var(--s)">🖨️</button>` : ''}
           <button onclick="editProd(${i})" style="background:var(--b)">✏️</button>
           <button onclick="delProd(${i})" style="background:var(--r)">🗑</button>
         </span></li>`).join('')
         || '<div class="empty">Belum ada produk. Tambahkan di atas.</div>';
};

window.addProd = () => {
    let n = clean($('sn').value), p = Number($('sp').value), q = Number($('sq').value), c = clean($('sc').value, 40);
    let cat = $('pcat').value;
    if(!n || !Number.isSafeInteger(p) || p <= 0 || !Number.isSafeInteger(q) || q < 0) return alert('Nama, harga, atau stok tidak valid');
    if(c && db.products.some((x, i) => x.c === c && i !== editIdx)) return alert('Barcode sudah dipakai produk lain');
    if(editIdx !== null) {
        db.products[editIdx] = { ...db.products[editIdx], n, p, q, c, cat, img: imgBuf || db.products[editIdx].img };
        editIdx = null;
        $('addbtn').textContent = 'Simpan Produk';
        $('stokh').textContent = '➕ Tambah Produk';
    } else db.products.push({ id: 'P' + Date.now() + Math.floor(Math.random()*1000), n, p, q, c, cat, img: imgBuf });
    imgBuf = '';
    $('pimg-prev').style.display = 'none';
    save(); ['sn','sp','sq','sc'].forEach(i => $(i).value = '');
    renderP(); renderGrid();
};

window.editProd = i => {
    let p = db.products[i];
    editIdx = i;
    $('sn').value = p.n; $('sp').value = p.p; $('sq').value = p.q; $('sc').value = p.c || '';
    if($('pcat')) $('pcat').value = p.cat || 'Lainnya';
    if(p.img) { $('pimg-prev').src = p.img; $('pimg-prev').style.display = 'block'; } else $('pimg-prev').style.display = 'none';
    imgBuf = '';
    $('addbtn').textContent = '💾 Update Produk';
    $('stokh').textContent = '✏️ Edit Produk';
    $('sn').focus();
};

window.delProd = i => {
    let p = db.products[i];
    if(!confirm(`Hapus produk "${p.n}"? Masuk sampah, bisa dipulihkan.`)) return;
    if(editIdx === i) { editIdx = null; $('addbtn').textContent = 'Simpan Produk'; $('stokh').textContent = '➕ Tambah Produk'; }
    moveToTrash('produk', p, 'Dihapus oleh ' + (activePin || 'pemilik'));
    db.products.splice(i, 1); save(); renderP();
};

window.printBarcode = i => {
    let p = db.products[i];
    if(!window.JsBarcode) return alert('Library Barcode belum dimuat (butuh internet)');
    $('pb-n').textContent = p.n;
    $('pb-p').textContent = rp(p.p);
    JsBarcode("#pb-code", p.c, { format: "CODE128", width: 2, height: 50, displayValue: true });
    
    // Sembunyikan struk kasir, tampilkan bar printbar, print, balik normal
    $('struk').style.display = 'none';
    $('printbar').style.display = 'block';
    window.print();
    $('struk').style.display = 'block';
    $('printbar').style.display = 'none';
};

const CATS = ['Semua', 'Makanan', 'Minuman', 'Sembako', 'Lainnya'];
let catFilter = 'Semua', imgBuf = '';

window.pickCat = c => { catFilter = c; renderGrid(); };

window.renderGrid = () => {
    let chips = $('chips');
    if(chips && !chips.dataset.done) {
        chips.innerHTML = CATS.map(c => `<button class="${c===catFilter?'on':''}" onclick="pickCat('${c}')">${c}</button>`).join('');
        chips.dataset.done = '1';
    } else if(chips) {
        [...chips.children].forEach(b => b.classList.toggle('on', b.textContent === catFilter));
    }
    let q = (searchQ || '').toLowerCase();
    let list = db.products.filter(p =>
        (!q || p.n.toLowerCase().includes(q) || (p.c || '').includes(searchQ)) &&
        (catFilter === 'Semua' || p.cat === catFilter));
    $('grid').innerHTML = list.map(p => {
        let inCart = db.cart.find(c => c.n === p.n);
        return `<div class="pcard ${p.q <= 0 ? 'out' : ''}" onclick="tapProduct('${p.id}')">
            ${inCart ? `<span class="pbadge">${inCart.qty}</span>` : ''}
            <img src="${p.img || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><rect width=\'100\' height=\'100\' fill=\'#e5e7eb\'/><text x=\'50\' y=\'55\' font-size=\'30\' text-anchor=\'middle\'>📦</text></svg>')}" alt="${p.n}">
            <div class="pn">${p.n}</div>
            <div class="pp">Rp${rp(p.p)}</div>
            <div class="pq">${p.q > 0 ? 'Stok ' + p.q : 'HABIS'}</div>
        </div>`;
    }).join('') || '<div class="empty" style="grid-column:1/-1">Produk tidak ditemukan.</div>';
};

window.tapProduct = id => {
    let p = db.products.find(x => x.id === id);
    if(p) addToCart(p);
};

const compress = file => new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = c.height = 400;
            const ctx = c.getContext('2d');
            let s = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 400, 400);
            res(c.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => res('');
        img.src = r.result;
    };
    r.onerror = () => res('');
    r.readAsDataURL(file);
});

window.addPhoto = async inp => {
    let f = inp.files[0];
    if(!f) return;
    imgBuf = await compress(f);
    let prev = $('pimg-prev');
    prev.src = imgBuf;
    prev.style.display = 'block';
    inp.value = '';
};

window.searchProd = () => {
    searchQ = $('pq').value;
    renderGrid();
};

const addToCart = p => {
    if(p.q <= 0) { alert('Stok ' + p.n + ' habis'); return; }
    let c = db.cart.find(i => i.n === p.n);
    if(c) c.qty++; else db.cart.push({ n: p.n, p: p.p, qty: 1 });
    p.q--;
    save(); render(); renderGrid();
};

window.inc = x => {
    let i = db.cart[x], p = db.products.find(y => y.n === i.n);
    if(p && p.q <= 0) { alert('Stok ' + i.n + ' habis'); return; }
    i.qty++; if(p) p.q--;
    save(); render();
};

window.dec = x => {
    let i = db.cart[x], p = db.products.find(y => y.n === i.n);
    i.qty--; if(p) p.q++;
    if(i.qty <= 0) db.cart.splice(x, 1);
    save(); render();
};

window.del = i => {
    let c = db.cart[i];
    let p = db.products.find(x => x.n === c.n);
    if(p) p.q += c.qty;
    db.cart.splice(i, 1);
    save(); render();
};

window.reset = () => {
    if(!confirm('Hapus keranjang? Stok kembali.')) return;
    db.cart.forEach(c => { let p = db.products.find(x => x.n === c.n); if(p) p.q += c.qty; });
    db.cart = []; save(); render();
};

window.pay = () => {
    if(!db.cart.length) return;
    let total = grandTotal();
    let m = $('paym').value;
    if(m === 'Tunai') {
        let c = Number($('cash').value) || 0;
        if(c < total) { alert('Uang kurang. Total Rp' + rp(total) + ', diterima Rp' + rp(c)); return; }
        alert('Kembalian: Rp' + rp(c - total));
    }
    if(!confirm('Selesaikan transaksi Rp' + rp(total) + ' via ' + m + '?')) return;

    let tStr = new Date().toLocaleString('id-ID');
    let no = nextNo();
    let sub = db.cart.reduce((s, i) => s + i.p * i.qty, 0);
    let sale = {
        id: crypto.randomUUID(), no, toko_id: db.tokoId, kasir_id: activePin,
        waktu: tStr, ts: Date.now(), total, metode: m,
        items: db.cart.map(i => ({ n: clean(i.n), p: i.p, qty: i.qty })),
        disc: db.discType === 'persen' ? Math.round(sub * (db.discVal || 0) / 100) : (db.discVal || 0)
    };
    db.cart.forEach(c => { let p = db.products.find(x => x.n === c.n); if(p) logStock(p, -c.qty, 'Penjualan ' + no); });
    db.sales.unshift({ t: tStr, items: sale.items, total, m, id: sale.id, no, disc: sale.disc });
    
    // --- Kirim ke Firebase Admin ---
    db.pendingSales.push(sale);
    syncPending();
    syncBadge();
    autoBackup('Transaksi ' + no);

    db.cart = []; db.discVal = 0; if($('disc-val')) $('disc-val').value = '';
    save(); render(); chgPay();
    $('printbar').style.display = 'none';
    $('struk').style.display = 'block';
    window.print();
};

const syncBadge = () => {
    let b = $('sync-badge');
    if(!b) return;
    if(!navigator.onLine) { b.textContent = '📡 Offline'; b.style.background = 'rgba(239,68,68,.5)'; }
    else if(db.pendingSales.length) { b.textContent = `⏳ ${db.pendingSales.length} menunggu`; b.style.background = 'rgba(245,158,11,.5)'; }
    else { b.textContent = '✅ Tersinkron'; b.style.background = 'rgba(16,185,129,.5)'; }
};

const syncPending = async () => {
    syncBadge();
    if(!navigator.onLine || !window.fdb || !window.fset) return;
    for(const sale of [...db.pendingSales]) {
        try {
            await window.fset(window.fdoc(window.fdb, 'sales', sale.id), sale);
            db.pendingSales = db.pendingSales.filter(x => x.id !== sale.id);
            save();
        } catch(e) { console.error('Sinkronisasi transaksi tertunda', e); break; }
    }
    syncBadge();
};

window.retrySync = () => syncPending();
window.addEventListener('online', syncPending);
window.addEventListener('offline', syncBadge);
window.addEventListener('firebase-ready', syncPending);

const grandTotal = () => {
    let sub = db.cart.reduce((s, i) => s + i.p * i.qty, 0);
    let d = db.discType === 'persen' ? Math.round(sub * (db.discVal || 0) / 100) : (db.discVal || 0);
    return Math.max(0, sub - d);
};

window.applyDisc = () => {
    db.discType = $('disc-type').value;
    db.discVal = Number($('disc-val').value) || 0;
    save(); chgPay(); render();
};

window.chgPay = () => {
    let m = $('paym').value, total = grandTotal();
    $('cash').style.display = m === 'Tunai' ? 'block' : 'none';
    let c = Number($('cash').value) || 0;
    let kembali = m === 'Tunai' && c >= total ? c - total : 0;
    $('chgbox').style.display = kembali > 0 ? 'block' : 'none';
    $('chg').textContent = rp(kembali);
};

window.render = () => {
    let empty = !db.cart.length;
    $('emptycart').style.display = empty ? 'block' : 'none';
    $('list').innerHTML = db.cart.map((i, x) =>
        `<li><span class="big">${i.n} <span style="color:var(--v)">x${i.qty}</span><span class="tag">Rp${rp(i.p * i.qty)}</span></span>
         <span style="display:flex;gap:6px;align-items:center">
           <button onclick="inc(${x})" style="background:var(--b);width:38px;height:38px;padding:0;border-radius:10px">+</button>
           <button onclick="dec(${x})" style="background:var(--v);width:38px;height:38px;padding:0;border-radius:10px">−</button>
           <button onclick="del(${x})" style="background:var(--r);width:38px;height:38px;padding:0;border-radius:10px">🗑</button>
         </span></li>`).join('');
    let sub = db.cart.reduce((s, i) => s + i.p * i.qty, 0);
    let d = db.discType === 'persen' ? Math.round(sub * (db.discVal || 0) / 100) : (db.discVal || 0);
    if($('disc-row')) $('disc-row').style.display = d > 0 ? 'flex' : 'none';
    if($('disc-amt')) $('disc-amt').textContent = '-Rp' + rp(d);
    $('tot').textContent = rp(Math.max(0, sub - d));
};

window.renderS = () => {
    let q = ($('sfilter') && $('sfilter').value) || '';
    let list = db.sales.filter(s => !q || (s.t || '').includes(q));
    $('slist').innerHTML = list.map((s, i) =>
        `<li onclick="detailSale('${s.id}')" style="cursor:pointer"><span class="big">${s.no || '-'}<span class="tag">${s.t} · ${s.items.map(i => i.n+' x'+i.qty).join(', ')} · ${s.m||'Tunai'}${s.disc?' · Disc Rp'+rp(s.disc):''}${s.refund?' · DIBATALKAN':''}</span></span>
         <b style="color:${s.refund?'var(--mut)':'var(--g)'};white-space:nowrap;text-decoration:${s.refund?'line-through':'none'}">Rp${rp(s.total)}</b></li>`).join('')
         || '<div class="empty">Belum ada transaksi.</div>';
    
    let valid = list.filter(s => !s.refund);
    $('rev').textContent = rp(valid.reduce((s, x) => s + x.total, 0));
    $('cnt-trx').textContent = valid.length + ' transaksi';
    
    // Produk terlaris
    let terlaris = {};
    valid.forEach(s => s.items.forEach(i => { terlaris[i.n] = (terlaris[i.n] || 0) + i.qty; }));
    let top = Object.entries(terlaris).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $('top-prod').innerHTML = top.map(([n, q]) => `<li><span class="big">${n}</span><b>${q}x</b></li>`).join('') || '<div class="empty">Belum ada data.</div>';
    
    // Rekap metode
    let metode = {};
    valid.forEach(s => { metode[s.m || 'Tunai'] = (metode[s.m || 'Tunai'] || 0) + s.total; });
    $('metode-list').innerHTML = Object.entries(metode).map(([m, t]) => `<li><span class="big">${m}</span><b>Rp${rp(t)}</b></li>`).join('') || '<div class="empty">Belum ada data.</div>';
};

window.filterSales = () => renderS();

window.detailSale = id => {
    let s = db.sales.find(x => x.id === id);
    if(!s) return;
    let detail = `No: ${s.no || '-'}\nWaktu: ${s.t}\nKasir: ${s.kasir_id || '-'}\nMetode: ${s.m || 'Tunai'}\n\n` +
        s.items.map(i => `${i.n} x${i.qty} = Rp${rp(i.p * i.qty)}`).join('\n') +
        (s.disc ? `\nDiskon: -Rp${rp(s.disc)}` : '') +
        `\nTotal: Rp${rp(s.total)}`;
    if(s.refund) detail += '\n\nSTATUS: DIBATALKAN';
    if(!s.refund && confirm(detail + '\n\nBatalkan transaksi ini (refund)?')) refundSale(id);
    else alert(detail);
};

window.refundSale = id => {
    let s = db.sales.find(x => x.id === id);
    if(!s || s.refund) return;
    s.refund = true;
    s.items.forEach(i => { let p = db.products.find(x => x.n === i.n); if(p) { p.q += i.qty; logStock(p, i.qty, 'Refund ' + (s.no||'')); } });
    save(); renderS(); render();
    alert('Transaksi dibatalkan. Stok dikembalikan.');
};

window.exportSalesCSV = () => {
    let csv = 'no,waktu,kasir,metode,total,diskon,status\n' + db.sales.map(s =>
        `"${s.no||'-'}","${s.t}","${s.kasir_id||'-'}","${s.m||'Tunai'}",${s.total},${s.disc||0},"${s.refund?'REFUND':'OK'}"`).join('\n');
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'transaksi.csv';
    a.click();
};

window.clearSales = () => {
    if(!confirm('Hapus semua riwayat? Masuk sampah, bisa dipulihkan.')) return;
    db.sales.forEach(s => moveToTrash('transaksi', s, 'Reset riwayat'));
    db.sales = []; save(); renderS();
};

// --- Produk CSV ---
window.exportCSV = () => {
    let csv = 'nama,harga,stok,barcode\n' + db.products.map(p =>
        `"${p.n}",${p.p},${p.q},"${p.c || ''}"`).join('\n');
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'produk.csv';
    a.click();
};

window.importCSV = () => $('fcsv').click();

window.doImportCSV = e => {
    let f = e.target.files[0];
    if(!f) return;
    let r = new FileReader();
    r.onload = () => {
        let lines = r.result.split(/\r?\n/).filter(l => l.trim());
        let added = 0, skipped = 0;
        lines.slice(1).forEach(l => {
            let m = l.match(/^"?(.*?)"?,(\d+),(\d+),"?(.*?)"?$/);
            if(!m) { skipped++; return; }
            let n = clean(m[1]), p = Number(m[2]), q = Number(m[3]), c = clean(m[4], 40);
            if(!n || p <= 0) { skipped++; return; }
            if(c && db.products.some(x => x.c === c)) { skipped++; return; }
            db.products.push({ id: 'P' + Date.now() + Math.floor(Math.random()*1000), n, p, q, c });
            added++;
        });
        save(); renderP();
        alert(`Impor selesai: ${added} produk ditambah, ${skipped} dilewati.`);
    };
    r.readAsText(f);
    e.target.value = '';
};

// --- Riwayat Stok ---
window.renderLog = () => {
    db.stockLog ||= [];
    $('slog').innerHTML = db.stockLog.map(l =>
        `<li><span class="big">${l.n}<span class="tag">${l.t} · ${l.alasan}</span></span>
         <b style="color:${l.qty < 0 ? 'var(--r)' : 'var(--g)'};white-space:nowrap">${l.qty > 0 ? '+' : ''}${l.qty}</b></li>`).join('')
         || '<div class="empty">Belum ada perubahan stok.</div>';
};

let scanBuf = '', scanTimer;
window.addEventListener('keypress', e => {
    if(e.target.tagName === 'INPUT' && e.target.id !== 'sc') return;
    if(e.key === 'Enter') {
        if(scanBuf.length > 3) matchCode(scanBuf);
        scanBuf = ''; clearTimeout(scanTimer); return;
    }
    scanBuf += e.key;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => scanBuf = '', 100); // Reset kalau ketikan lambat (berarti manusia, bukan scanner)
});
let scanning = false;

window.scan = async () => {
    if(!('BarcodeDetector' in window)) { alert('Browser tidak dukung scan. Pakai Pilih.'); return pick(); }
    $('scan').classList.add('on');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    $('cam').srcObject = stream;
    scanning = true;
    const det = new BarcodeDetector();
    const tick = async () => {
        if(!scanning) return;
        try {
            const codes = await det.detect($('cam'));
            if(codes.length) { stopScan(); matchCode(codes[0].rawValue); return; }
        } catch(e) {}
        requestAnimationFrame(tick);
    };
    tick();
};

window.stopScan = () => {
    scanning = false;
    $('scan').classList.remove('on');
    let s = $('cam').srcObject;
    if(s) s.getTracks().forEach(t => t.stop());
};

const matchCode = code => {
    let p = db.products.find(x => x.c === code);
    if(p) { addToCart(p); show('kasir'); alert('Ditambahkan: ' + p.n); }
    else alert('Barang tidak ditemukan untuk kode: ' + code);
};

render();
syncBadge();
renderGrid();

// ponytail: expose untuk testing (test.js), bukan untuk UI
window.grandTotal = grandTotal; window.nextNo = nextNo; window.db = db;

// --- Tema gelap ---
window.togTheme = () => {
    let d = document.body.classList.toggle('dark');
    $('thmbtn').textContent = d ? '☀️' : '🌙';
    localStorage.setItem('tema', d ? 'dark' : 'light');
};
if(readLS('tema') === 'dark') {
    document.body.classList.add('dark');
    $('thmbtn').textContent = '☀️';
}

window.setLow = v => { db.lowStock = Number(v) || 5; save(); };

window.resetData = level => {
    let labels = {
        cart: 'Keranjang',
        sales: 'Riwayat transaksi lokal',
        products: 'Produk & stok',
        all: 'SEMUA DATA APLIKASI'
    };
    if(!confirm(`Reset ${labels[level]}? Backup otomatis dibuat dulu.`)) return;
    let pin = prompt('Masukkan PIN pemilik:');
    if(pin !== db.pinO) return alert('PIN salah. Reset dibatalkan.');
    let konf = prompt(`Ketik RESET untuk konfirmasi (${labels[level]}):`);
    if(konf !== 'RESET') return alert('Konfirmasi salah. Reset dibatalkan.');
    
    autoBackup('Sebelum reset ' + labels[level]);
    if(level === 'cart') { db.cart.forEach(c => { let p = db.products.find(x => x.n === c.n); if(p) p.q += c.qty; }); db.cart = []; }
    if(level === 'sales') { db.sales = []; }
    if(level === 'products') { db.products.forEach(p => moveToTrash('produk', p, 'Reset produk')); db.products = []; db.stockLog = []; }
    if(level === 'all') { db.products = []; db.sales = []; db.cart = []; db.stockLog = []; db.pendingSales = []; }
    save(); render(); renderP(); renderS();
    alert(labels[level] + ' direset.');
};

window.savePin = () => {
    let o = $('pin-o').value, c = $('pin-c').value;
    if(o) db.pinO = o;
    if(c) db.pinC = c;
    save(); alert('PIN disimpan.');
    $('pin-o').value = ''; $('pin-c').value = '';
};

// --- Backup / Restore ---
window.backup = () => {
    let blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kasir-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
};

window.restore = () => $('frestore').click();

window.doRestore = e => {
    let f = e.target.files[0];
    if(!f) return;
    let r = new FileReader();
    r.onload = () => {
        try {
            let d = JSON.parse(r.result);
            if(!Array.isArray(d.products) || !Array.isArray(d.sales)) throw 'format';
            db = { products: d.products, cart: [], sales: d.sales };
            save(); render(); renderP(); renderS();
            alert('Restore berhasil');
        } catch(err) { alert('File backup tidak valid'); }
    };
    r.readAsText(f);
    e.target.value = '';
};
