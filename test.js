// Test otomatis logika kasir (tanpa framework)
// Cara jalan: node kasir/test.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let passed = 0, failed = 0;
const ok = (name, cond) => { if(cond) { passed++; console.log('  PASS ' + name); } else { failed++; console.log('  FAIL ' + name); } };

function loadApp(store) {
    const events = {};
    const els = {};
    const ctx = {
        navigator: { onLine: true },
        localStorage: {
            _s: store || {},
            getItem(k) { return this._s[k] ?? null; },
            setItem(k, v) { this._s[k] = String(v); }
        },
        document: {
            body: { classList: { toggle: () => false, add: () => {} } },
            getElementById: () => ({ style: {}, textContent: '', value: '', innerHTML: '', classList: { toggle: () => {}, add: () => {}, remove: () => {} } }),
            addEventListener: () => {},
            createElement: () => ({ style: {}, click: () => {} })
        },
        crypto: { randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2) },
        console, alert: () => {}, confirm: () => true,
        addEventListener: (ev, fn) => { events[ev] = fn; },
        removeEventListener: () => {},
        URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
        Blob: function() {}
    };
    ctx.window = ctx; // supaya window.x === global.x di sandbox
    vm.createContext(ctx);
    const code = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    vm.runInContext(code, ctx);
    return { ctx, events };
}

console.log('\n[1] Migrasi & struktur data');
{
    let { ctx } = loadApp({ kasir: JSON.stringify({ products: [{ n: 'A', p: 1000, q: 5 }], cart: [], sales: [{ t: 'x', items: [], total: 500, m: 'Tunai' }] }) });
    let d = ctx.window.db;
    ok('produk lama dapat id', !!d.products[0].id);
    ok('transaksi lama dapat nomor struk', /^TRX-\d{5}$/.test(d.sales[0].no));
    ok('pinO default 1234', d.pinO === '1234');
    ok('lowStock default 5', d.lowStock === 5);
}

console.log('\n[2] clean() sanitasi input');
{
    let { ctx } = loadApp();
    ok('strip <script>', !ctx.window.clean('<script>x</script>').includes('<'));
    ok('trim spasi', ctx.window.clean('  hp  ') === 'hp');
    ok('potong max', ctx.window.clean('abcdefghij', 5).length === 5);
}

console.log('\n[3] nextNo() nomor struk unik berurutan');
{
    let { ctx } = loadApp();
    let a = ctx.window.nextNo(), b = ctx.window.nextNo();
    ok('format TRX-00001', a === 'TRX-00001');
    ok('increment', b === 'TRX-00002');
    ok('beda id', a !== b);
}

console.log('\n[4] grandTotal() dengan diskon');
{
    let { ctx } = loadApp();
    let d = ctx.window.db;
    d.cart = [{ n: 'A', p: 10000, qty: 2 }]; // 20000
    ok('tanpa diskon', ctx.window.grandTotal() === 20000);
    d.discType = 'persen'; d.discVal = 10;
    ok('diskon 10% = 18000', ctx.window.grandTotal() === 18000);
    d.discType = 'nominal'; d.discVal = 5000;
    ok('diskon nominal 5000 = 15000', ctx.window.grandTotal() === 15000);
    d.discVal = 99999;
    ok('diskon melebihi total tidak minus', ctx.window.grandTotal() === 0);
}

console.log('\n[5] localStorage rusak tidak crash');
{
    let threw = false;
    try {
        const ctx = {
            navigator: { onLine: true },
            localStorage: { getItem: () => { throw new Error('corrupt'); }, setItem: () => {} },
            document: { body: { classList: { toggle: () => false, add: () => {} } }, getElementById: () => ({ style: {}, textContent: '', value: '', innerHTML: '', classList: { toggle: () => {}, add: () => {}, remove: () => {} } }), addEventListener: () => {}, createElement: () => ({ style: {}, click: () => {} }) },
            crypto: { randomUUID: () => 'x' }, console, alert: () => {}, confirm: () => true,
            addEventListener: () => {}, removeEventListener: () => {}, URL: { createObjectURL: () => 'b', revokeObjectURL: () => {} }, Blob: function() {}
        };
        ctx.window = ctx;
        vm.createContext(ctx);
        vm.runInContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), ctx);
    } catch(e) { threw = true; console.log('    error:', e.message); }
    ok('app.js tetap jalan', !threw);
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
process.exit(failed ? 1 : 0);