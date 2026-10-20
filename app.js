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
db.store ||= { name: 'Toko Saya', address: '', phone: '', footer: 'Terima kasih sudah berbelanja!', paper: '58' };
db.discType ||= 'nominal';
db.discVal ||= 0;
db.categories ||= ['Makanan', 'Minuman', 'Sembako', 'Lainnya'];
if(!db.tokoId) { db.tokoId = 'TOKO_' + Math.floor(Math.random()*9000+1000); save(); }

// Produk contoh untuk demo
const svgIcon = (emoji, bg) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${bg}'/><text x='50' y='58' font-size='46' text-anchor='middle'>${emoji}</text></svg>`);

if(!db.seeded) {
    db.products = [
        { id: 'P_SEED1', n: 'Indomie Goreng', p: 3500, q: 24, c: '8992388101010', cat: 'Makanan', img: svgIcon('🍜', '#fef3c7') },
        { id: 'P_SEED2', n: 'Aqua 600ml', p: 4000, q: 30, c: '8996001306015', cat: 'Minuman', img: svgIcon('💧', '#dbeafe') },
        { id: 'P_SEED3', n: 'Teh Botol 350ml', p: 5000, q: 18, c: '', cat: 'Minuman', img: svgIcon('🍵', '#d1fae5') },
        { id: 'P_SEED4', n: 'Kopi Sachet', p: 2500, q: 40, c: '', cat: 'Makanan', img: svgIcon('☕', '#f3e8d2') },
        { id: 'P_SEED5', n: 'Beras 5kg', p: 75000, q: 10, c: '', cat: 'Sembako', img: svgIcon('🍚', '#fef9c3') },
        { id: 'P_SEED6', n: 'Minyak Goreng 1L', p: 18000, q: 12, c: '', cat: 'Sembako', img: svgIcon('🛢️', '#e0e7ff') }
    ];
    db.seeded = true;
    save();
}

// Tambah produk demo jika produk kurang dari 12 (untuk tes pagination)
if(!db.seedPageExtra) {
    const extra = [
        { id: 'P_SEED7', n: 'Gula Pasir 1kg', p: 16000, q: 20, c: '8991001', cat: 'Sembako', img: svgIcon('🧂', '#fef3c7') },
        { id: 'P_SEED8', n: 'Telur Ayam 1kg', p: 28000, q: 15, c: '8991002', cat: 'Sembako', img: svgIcon('🥚', '#ffedd5') },
        { id: 'P_SEED9', n: 'Susu UHT 200ml', p: 6000, q: 25, c: '8991003', cat: 'Minuman', img: svgIcon('🥛', '#e0f2fe') },
        { id: 'P_SEED10', n: 'Biskuit Roma', p: 8500, q: 18, c: '8991004', cat: 'Makanan', img: svgIcon('🍪', '#fef9c3') },
        { id: 'P_SEED11', n: 'Sabun Mandi', p: 4500, q: 30, c: '8991005', cat: 'Lainnya', img: svgIcon('🧼', '#f3e8ff') },
        { id: 'P_SEED12', n: 'Shampoo Sachet', p: 1500, q: 50, c: '8991006', cat: 'Lainnya', img: svgIcon('🧴', '#ecfdf5') },
        { id: 'P_SEED13', n: 'Kerupuk Kaleng', p: 2000, q: 40, c: '8991007', cat: 'Makanan', img: svgIcon('🍘', '#fff7ed') },
        { id: 'P_SEED14', n: 'Mie Kari Ayam', p: 3500, q: 22, c: '8991008', cat: 'Makanan', img: svgIcon('🍲', '#fef3c7') }
    ];
    extra.forEach(x => {
        if(!db.products.some(p => p.id === x.id || p.n === x.n)) db.products.push(x);
    });
    db.seedPageExtra = true;
    save();
}

// Migrasi: produk lama tanpa ID unik
db.products.forEach(p => { if(!p.id) p.id = 'P' + Date.now() + Math.floor(Math.random()*1000); });
db.lowStock ||= 5;

// ---------- Lisensi & Demo (RumaPos) ----------
// Versi DEMO dibatasi jumlah produk (seed contoh = 14, sisakan 1 slot untuk dicoba).
// Aktivasi dengan kode dari penjual; kode terikat 1 device via Firestore licenses/{code}.
const DEMO_MAX_PRODUK = 15;
let lic = (() => { try { return JSON.parse(readLS('rp_lic')); } catch(e) { return null; } })();
window.isLicensed = () => !!(lic && lic.code && !lic.blocked);
window.DEVICE_ID = (() => {
    let d = readLS('rp_device');
    if(!d) { d = 'DEV_' + Math.random().toString(36).slice(2,10).toUpperCase(); try { localStorage.setItem('rp_device', d); } catch(e) {} }
    return d;
})();
const licUI = () => {
    let b = $('demo-banner');
    if(b) b.style.display = window.isLicensed() ? 'none' : 'block';
    let t = $('tab-lic');
    if(t) t.textContent = window.isLicensed() ? '✅ Lisensi Aktif' : '🔑 Aktivasi';
};
window.licUI = licUI;

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
        if($('menubtn')) $('menubtn').style.display = 'flex';
        if($('fab-scan')) $('fab-scan').style.display = 'block';
        if($('hdr-toko')) $('hdr-toko').textContent = `${db.tokoId || 'Toko Utama'} • Kasir POS`;
        let nm = $('dprof-name'); if(nm) nm.textContent = db.store.name || 'RumaPos';
        let dr = $('dprof-role'); if(dr) dr.textContent = role === 'owner' ? '👑 Pemilik' : '🧑‍💼 Kasir';
        applyLogo();
        renderCatSelect();
        renderCats();
        let rb = $('role-badge');
        if(rb) {
            rb.style.display = 'inline-block';
            rb.textContent = role === 'owner' ? '👑 Pemilik' : '🧑‍💼 Kasir';
            rb.style.background = role === 'owner' ? 'rgba(16,185,129,.35)' : 'rgba(245,158,11,.35)';
        }
        activePin = p;
        localStorage.setItem('rp_last_pin', p);
        localStorage.setItem('rp_last_ts', String(Date.now()));
        
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
        if($('st-name')) {
            $('st-name').value = db.store.name;
            $('st-addr').value = db.store.address;
            $('st-phone').value = db.store.phone;
            $('st-foot').value = db.store.footer;
            $('st-paper').value = db.store.paper;
        }
        pinTries = 0;
        startIdle();
        show('kasir');
        closeCheckout();
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
    localStorage.removeItem('rp_last_pin');
    localStorage.removeItem('rp_last_ts');
    if($('role-badge')) $('role-badge').style.display = 'none';
    closeDrawer();
    if($('menubtn')) $('menubtn').style.display = 'none';
    $('auth').style.display = 'block';
    $('app').style.display = 'none';
    if($('fab-scan')) $('fab-scan').style.display = 'none';
};

// --- Logout otomatis saat idle ---
const resetIdle = () => {
    if(!role) return;
    localStorage.setItem('rp_last_ts', String(Date.now()));
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        alert('Sesi dikunci karena tidak ada aktivitas. Silakan masukkan PIN kembali.');
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
    closeDrawer();
    if(t==='stok') { renderP(); renderLog(); } if(t==='lap') renderS(); if(t==='data') { renderBackups(); renderTrash(); }
};

window.openDrawer = () => { $('drawer').classList.add('on'); $('drawer-back').classList.add('on'); };
window.closeDrawer = () => { $('drawer').classList.remove('on'); $('drawer-back').classList.remove('on'); };

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

let stokQ = '', stokPageN = 0;
const STOK_PER = 10;

window.searchStok = () => { stokQ = $('sq-q').value; stokPageN = 0; renderP(); };
window.stokPage = d => { stokPageN = Math.max(0, stokPageN + d); renderP(); };

window.renderP = () => {
    let q = (stokQ || '').toLowerCase();
    let all = db.products.map((p, i) => ({ p, i }))
        .filter(x => !q || x.p.n.toLowerCase().includes(q) || (x.p.c || '').includes(q));
    let pages = Math.max(1, Math.ceil(all.length / STOK_PER));
    if(stokPageN >= pages) stokPageN = pages - 1;
    let list = all.slice(stokPageN * STOK_PER, (stokPageN + 1) * STOK_PER);
    $('plist').innerHTML = list.map(({ p, i }) =>
        `<li><span class="big">${p.n}<span class="tag">Rp${rp(p.p)} · Stok: ${p.q}${p.q <= db.lowStock ? ' ⚠️ MENIPIS' : ''}${p.c?' · '+p.c:''}${p.cat?' · '+p.cat:''}</span></span>
         <span style="display:flex;gap:6px">
           <button onclick="adjustStock(${i})" style="background:var(--g)">±</button>
           ${p.c ? `<button onclick="printBarcode(${i})" style="background:var(--s)">🖨️</button>` : ''}
           <button onclick="editProd(${i})" style="background:var(--b)">✏️</button>
           <button onclick="delProd(${i})" style="background:var(--r)">🗑</button>
         </span></li>`).join('')
         || '<div class="empty">Belum ada produk. Tambahkan di atas.</div>';
    let info = $('plist-info');
    if(info) info.textContent = `${all.length} produk` + (q ? ` cocok "${stokQ}"` : '');
    let pg = $('pager');
    if(pg) {
        pg.style.display = pages > 1 ? 'flex' : 'none';
        let pi = $('pinfo'); if(pi) pi.textContent = `Hal ${stokPageN + 1} / ${pages}`;
        let pv = $('pprev'), nx = $('pnext');
        if(pv) pv.disabled = stokPageN === 0;
        if(nx) nx.disabled = stokPageN >= pages - 1;
    }
};

window.addProd = () => {
    let n = clean($('sn').value), p = Number($('sp').value), q = Number($('sq').value), c = clean($('sc').value, 40);
    let cat = $('pcat').value;
    if(!n || !Number.isSafeInteger(p) || p <= 0 || !Number.isSafeInteger(q) || q < 0) return alert('Nama, harga, atau stok tidak valid');
    if(c && db.products.some((x, i) => x.c === c && i !== editIdx)) return alert('Barcode sudah dipakai produk lain');
    // Batas demo: hanya saat menambah produk BARU (edit produk lama selalu boleh)
    if(editIdx === null && !window.isLicensed() && db.products.length >= DEMO_MAX_PRODUK)
        return alert(`Versi Demo maksimal ${DEMO_MAX_PRODUK} produk. Aktivasi lisensi untuk produk tanpa batas.`);
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

const CATS = () => ['Semua', ...db.categories];
let catFilter = 'Semua', imgBuf = '';

window.pickCat = c => { catFilter = c; renderGrid(); };

window.addCatFast = () => {
    let n = clean(prompt('Nama kategori baru:'), 24);
    if(!n) return;
    if(db.categories.some(c => c.toLowerCase() === n.toLowerCase())) return alert('Kategori sudah ada');
    db.categories.push(n); save();
    renderCats(); renderGrid(); renderCatSelect();
};

window.addCat = () => {
    let n = clean($('newcat').value, 24);
    if(!n) return alert('Nama kategori kosong');
    if(db.categories.some(c => c.toLowerCase() === n.toLowerCase())) return alert('Kategori sudah ada');
    db.categories.push(n); save();
    $('newcat').value = '';
    renderCats(); renderGrid(); renderCatSelect();
    alert('Kategori "' + n + '" ditambahkan.');
};

window.delCat = i => {
    let n = db.categories[i];
    if(db.categories.length <= 1) return alert('Minimal harus ada 1 kategori.');
    if(!confirm(`Hapus kategori "${n}"? Produk di kategori ini dipindah ke kategori pertama yang tersisa.`)) return;
    let fallback = db.categories.find((_, j) => j !== i);
    db.products.forEach(p => { if(p.cat === n) p.cat = fallback; });
    db.categories.splice(i, 1);
    if(catFilter === n) catFilter = 'Semua';
    save(); renderCats(); renderGrid(); renderCatSelect(); renderP();
    alert('Kategori dihapus.');
};

window.renderCats = () => {
    let el = $('catlist');
    if(!el) return;
    el.innerHTML = db.categories.map((c, i) =>
        `<li><span class="big">${c}<span class="tag">${db.products.filter(p => p.cat === c).length} produk</span></span>
         <button onclick="delCat(${i})" style="background:var(--r)">🗑</button></li>`).join('');
};

window.renderCatSelect = () => {
    let sel = $('pcat');
    if(!sel) return;
    let cur = sel.value;
    sel.innerHTML = db.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if(db.categories.includes(cur)) sel.value = cur;
};

window.renderGrid = () => {
    let chips = $('chips');
    if(chips) {
        chips.innerHTML = CATS().map(c => `<button class="${c===catFilter?'on':''}" onclick="pickCat('${c}')">${c}</button>`).join('') +
            `<button class="add" onclick="addCatFast()" title="Tambah kategori baru">＋</button>`;
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
    let cash = 0;
    if(m === 'Tunai') {
        cash = Number($('cash').value) || 0;
        if(cash < total) { alert('Uang kurang. Total Rp' + rp(total) + ', diterima Rp' + rp(cash)); return; }
    }
    if(!confirm('Selesaikan transaksi Rp' + rp(total) + ' via ' + m + '?')) return;

    let tStr = new Date().toLocaleString('id-ID');
    let no = nextNo();
    let sub = db.cart.reduce((s, i) => s + i.p * i.qty, 0);
    let disc = db.discType === 'persen' ? Math.round(sub * (db.discVal || 0) / 100) : (db.discVal || 0);
    let sale = {
        id: crypto.randomUUID(), no, toko_id: db.tokoId, kasir_id: activePin,
        waktu: tStr, ts: Date.now(), total, metode: m,
        items: db.cart.map(i => ({ n: clean(i.n), p: i.p, qty: i.qty })),
        disc, sub, cash, kembali: cash ? cash - total : 0
    };
    db.cart.forEach(c => { let p = db.products.find(x => x.n === c.n); if(p) logStock(p, -c.qty, 'Penjualan ' + no); });
    db.sales.unshift({ t: tStr, items: sale.items, total, m, id: sale.id, no, disc, sub, cash, kembali: sale.kembali });
    
    // --- Kirim ke Firebase Admin ---
    db.pendingSales.push(sale);
    syncPending();
    syncBadge();
    autoBackup('Transaksi ' + no);

    db.cart = []; db.discVal = 0; if($('disc-val')) $('disc-val').value = '';
    save(); render(); renderGrid(); chgPay();
    closeCheckout();
    printNota(sale);
};

// --- Nota thermal ---
const buildNotaHtml = sale => {
    let s = db.store, w = s.paper === '80' ? 300 : 220;
    let rows = sale.items.map(i =>
        `<div class="n-row">${clean(i.n)}</div>
         <div class="n-sub"><span>${i.qty} x ${rp(i.p)}</span><span>${rp(i.p * i.qty)}</span></div>`).join('');
    return `
      <div class="nota" style="width:${w}px;margin:0 auto;padding:14px 10px">
        ${db.store.logo ? `<div style="text-align:center;margin-bottom:6px"><img src="${db.store.logo}" style="width:64px;height:64px;object-fit:cover;border-radius:8px"></div>` : ''}
        <div class="n-head">${clean(s.name, 40) || 'Toko'}</div>
        ${s.address ? `<div class="n-line">${clean(s.address, 120)}</div>` : ''}
        ${s.phone ? `<div class="n-line">${clean(s.phone, 30)}</div>` : ''}
        <div class="n-dash">----------------------------</div>
        <div class="n-line">No   : ${sale.no}</div>
        <div class="n-line">Waktu: ${sale.waktu}</div>
        <div class="n-line">Kasir: ${sale.kasir_id || '-'}</div>
        <div class="n-line">Bayar: ${sale.metode}</div>
        <div class="n-dash">----------------------------</div>
        ${rows}
        <div class="n-dash">----------------------------</div>
        <div class="n-line2"><span>Subtotal</span><span>${rp(sale.sub)}</span></div>
        ${sale.disc ? `<div class="n-line2"><span>Diskon</span><span>-${rp(sale.disc)}</span></div>` : ''}
        <div class="n-total"><span>TOTAL</span><span>${rp(sale.total)}</span></div>
        ${sale.cash ? `<div class="n-line2"><span>Tunai</span><span>${rp(sale.cash)}</span></div>
        <div class="n-line2"><span>Kembali</span><span>${rp(sale.kembali)}</span></div>` : ''}
        <div class="n-dash">----------------------------</div>
        ${window.isLicensed() ? '' : '<div class="n-line" style="margin-top:3px">*** VERSI DEMO - RumaPos ***</div>'}
        <div class="n-thanks">${clean(s.footer, 80) || 'Terima kasih'}</div>
      </div>`;
};

const openNota = sale => {
    window._lastNota = sale;
    $('nota-body').innerHTML = buildNotaHtml(sale);
    let bt = $('nota-bt');
    if(bt) bt.style.display = (window.Capacitor && window.Capacitor.isPluginAvailable('BleClient')) ? 'block' : 'none';
    $('nota-modal').classList.add('on');
};

window.closeNota = () => $('nota-modal').classList.remove('on');

window.cetakSistem = () => {
    let sale = window._lastNota;
    if(!sale) return;
    let box = $('nota');
    box.innerHTML = buildNotaHtml(sale);
    box.style.display = 'block';
    $('nota-modal').classList.remove('on');
    let prevApp = $('app').style.display;
    $('app').style.display = 'none';
    $('auth').style.display = 'none';
    window.print();
    box.style.display = 'none';
    box.innerHTML = '';
    $('app').style.display = prevApp;
};

window.cetakBt = () => {
    let sale = window._lastNota;
    if(!sale) return;
    if(window.printBtNota) printBtNota(sale).catch(e => alert('Cetak Bluetooth gagal: ' + (e.message || e)));
    else alert('Printer Bluetooth tidak tersedia di perangkat ini.');
};

const printNota = sale => openNota(sale);

window.reprintNota = id => {
    let s = db.sales.find(x => x.id === id);
    if(!s) return;
    printNota({ ...s, no: s.no, waktu: s.t, metode: s.m, kasir_id: s.kasir_id || '-' });
};

window.saveStore = () => {
    let name = clean($('st-name').value, 40);
    if(!name) return alert('Nama toko wajib diisi');
    db.store = {
        name,
        address: clean($('st-addr').value, 120),
        phone: clean($('st-phone').value, 30).replace(/[^\d+\-\s]/g, ''),
        footer: clean($('st-foot').value, 80),
        paper: $('st-paper').value,
        logo: db.store.logo || null
    };
    save();
    let nm = $('dprof-name'); if(nm) nm.textContent = name;
    alert('Profil toko disimpan.');
};

window.setLogo = async inp => {
    let f = inp.files[0];
    if(!f) return;
    let logo = await compress(f);
    if(!logo) return alert('Gagal memproses gambar');
    db.store.logo = logo;
    save(); applyLogo();
    inp.value = '';
    alert('Logo toko diperbarui.');
};

window.delLogo = () => {
    if(!db.store.logo) return alert('Belum ada logo.');
    if(!confirm('Hapus logo toko?')) return;
    delete db.store.logo;
    save(); applyLogo();
    alert('Logo dihapus.');
};

const applyLogo = () => {
    let logo = db.store.logo;
    let h = $('hdr-logo'), d = $('drawer-logo'), p = $('logo-prev');
    if(h) h.innerHTML = logo ? `<img src="${logo}" alt="logo">` : 'R';
    if(d) d.innerHTML = logo ? `<img src="${logo}" alt="logo">` : 'R';
    if(p) { if(logo) { p.src = logo; p.style.display = 'block'; } else p.style.display = 'none'; }
};

window.previewNota = () => {
    printNota({
        no: 'TRX-CONTOH', waktu: new Date().toLocaleString('id-ID'), kasir_id: activePin || '-',
        metode: 'Tunai', items: [{ n: 'Contoh Produk', p: 10000, qty: 2 }],
        sub: 20000, disc: 2000, total: 18000, cash: 20000, kembali: 2000
    });
};

const syncBadge = () => {
    let b = $('sync-badge');
    if(!b) return;
    if(!navigator.onLine) { b.textContent = '● Offline'; b.style.background = 'rgba(239,68,68,.35)'; }
    else if(db.pendingSales.length) { b.textContent = `⏳ ${db.pendingSales.length} antre`; b.style.background = 'rgba(245,158,11,.35)'; }
    else { b.textContent = '● Online'; b.style.background = 'rgba(16,185,129,.35)'; }
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

// ---------- Aktivasi lisensi ----------
window.openLic = () => {
    let b = $('lic-body'), m = $('lic-modal');
    if(!b || !m) return;
    if(window.isLicensed()) {
        b.innerHTML = `<div style="text-align:center;padding:6px 0 2px;color:#000">
          <div style="font-size:44px">✅</div>
          <b style="font-size:17px">Lisensi Aktif</b>
          <p style="color:#666;font-size:13px;margin:8px 0 2px">Kode: <b>${lic.code.slice(0,4)}-${lic.code.slice(4,8)}-${lic.code.slice(8,12)}</b><br>Device: ${window.DEVICE_ID}</p>
          <p style="color:#999;font-size:12px">Semua fitur terbuka di device ini. Sekali bayar, tanpa langganan.</p></div>`;
    } else {
        b.innerHTML = `<div style="text-align:center;padding:6px 0 2px;color:#000">
          <div style="font-size:44px">🔓</div>
          <b style="font-size:17px">Aktivasi RumaPos</b>
          <p style="color:#555;font-size:13px;margin:6px 0 12px">Beli lisensi (sekali bayar Rp 75.000) untuk membuka produk tanpa batas & menghapus tanda DEMO.</p>
          <input id="lic-in" placeholder="Kode: RUMA-XXXX-XXXX" style="width:100%;text-align:center;font-size:16px" oninput="this.value=this.value.replace(/[^a-zA-Z0-9\\s-]/g,'')">
        </div>`;
        let inp = $('lic-in'); if(inp) setTimeout(() => inp.focus(), 80);
    }
    m.classList.add('on');
};
window.closeLic = () => { if($('lic-modal')) $('lic-modal').classList.remove('on'); };

window.doActivate = async () => {
    let raw = String(($('lic-in') || {}).value || '').trim().toUpperCase().replace(/[\s-]/g, '');
    if(raw && raw.indexOf('RUMA') !== 0) raw = 'RUMA' + raw;
    if(!raw) return alert('Masukkan kode aktivasi');
    if(!navigator.onLine || !window.fdb || !window.fget) return alert('Aktivasi butuh koneksi internet sekali. Nyalakan Wi-Fi/data lalu coba lagi.');
    try {
        let snap = await window.fget(window.fdoc(window.fdb, 'licenses', raw));
        if(!snap.exists()) return alert('Kode tidak dikenal. Periksa penulisan atau hubungi penjual.');
        let data = snap.data() || {};
        if(data.blocked) return alert('Kode ini sudah diblokir. Hubungi penjual.');
        if(data.device && data.device !== window.DEVICE_ID) return alert('Kode ini sudah dipakai device lain. Hubungi penjual jika ini adalah ganti HP yang sah.');
        if(!data.device) await window.fupd(window.fdoc(window.fdb, 'licenses', raw), { device: window.DEVICE_ID, at: Date.now() });
        lic = { code: raw, at: Date.now(), blocked: false };
        try { localStorage.setItem('rp_lic', JSON.stringify(lic)); } catch(e) {}
        closeLic(); licUI(); renderGrid();
        toast('✅ Aktivasi berhasil! Semua fitur terbuka.');
    } catch(e) { console.error('Aktivasi gagal', e); alert('Aktivasi gagal: ' + ((e && e.message) || e)); }
};

// Cek pemblokiran lisensi dari penjual (administrative block) — jalan saat online
window.licCheck = async () => {
    if(!window.isLicensed() || !window.fdb || !window.fget || !navigator.onLine) return;
    try {
        let snap = await window.fget(window.fdoc(window.fdb, 'licenses', lic.code));
        if(snap.exists() && (snap.data() || {}).blocked) {
            lic = null;
            try { localStorage.removeItem('rp_lic'); } catch(e) {}
            licUI(); renderGrid();
            toast('⚠️ Lisensi diblokir. Hubungi penjual.', false);
        }
    } catch(e) { /* offline/blokir jaringan: biarkan status lokal */ }
};
window.addEventListener('firebase-ready', licCheck);

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

window.openCheckout = () => {
    $('posright').classList.add('open');
    chgPay();
};
window.closeCheckout = () => $('posright').classList.remove('open');

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
    let gt = Math.max(0, sub - d);
    $('tot').textContent = rp(gt);
    // Badge keranjang HP
    let n = db.cart.reduce((s, i) => s + i.qty, 0);
    if($('cc-n')) $('cc-n').textContent = n;
    if($('cc-t')) $('cc-t').textContent = rp(gt);
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
    if(!s.refund && confirm(detail + '\n\n1. Cetak ulang nota\n2. Batalkan transaksi (refund)\n\nKlik OK untuk cetak ulang, Batal untuk tutup.')) reprintNota(s.id);
    else if(!s.refund && confirm('Batalkan transaksi ini (refund)?')) refundSale(s.id);
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

// ponytail: alert() memblokir scan berturut; toast non-modal (upgrade: antrian toast kalau banyak sekaligus)
let toastTimer;
window.toast = (msg, ok = true) => {
    let t = $('rp-toast');
    if(!t) {
        t = document.createElement('div');
        t.id = 'rp-toast';
        t.style.cssText = 'position:fixed;bottom:190px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 20px;border-radius:12px;font-weight:700;font-size:14px;color:#fff;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.3);transition:opacity .25s;white-space:nowrap;max-width:90vw;overflow:hidden;text-overflow:ellipsis';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = ok ? 'var(--v)' : 'var(--r)';
    t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.style.opacity = '0', 1300);
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
    if(p) { addToCart(p); show('kasir'); toast('✓ ' + p.n); }
    else toast('✗ Kode tidak dikenal: ' + code, false);
};

render();
chgPay();
applyLogo();
syncBadge();
licUI();
renderGrid();

// Auto-login jika sesi PIN belum kedaluwarsa (login sekali, minta PIN jika idle > IDLE_MS)
const checkSavedSession = async () => {
    let savedPin = readLS('rp_last_pin');
    let lastTs = Number(readLS('rp_last_ts')) || 0;
    if(!savedPin || Date.now() - lastTs >= IDLE_MS) return;
    // ponytail: validasi PIN dulu (lokal atau cloud) supaya PIN kadaluwarsa tidak memunculkan alert "PIN Salah"
    let valid = savedPin === db.pinO || savedPin === db.pinC;
    if(!valid && window.fdb && navigator.onLine) {
        try { valid = (await window.fget(window.fdoc(window.fdb, "users", savedPin))).exists(); } catch(e) {}
    }
    if(valid) {
        if($('pin')) $('pin').value = savedPin;
        login().catch(e => console.error('Auto-login gagal', e));
    }
};
checkSavedSession();

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
