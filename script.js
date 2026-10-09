/**
 * =============================================================================
 * KASIRPRO - MODERN POINT OF SALE (POS) & FINANCIAL MANAGEMENT JAVASCRIPT ENGINE
 * Clean, Modular, Fully Reactive, and LocalStorage-backed Architecture
 * =============================================================================
 */

// Local Storage Keys
const STORAGE_KEY_PRODUCTS = 'kasirpro_products_v2';
const STORAGE_KEY_TRANSACTIONS = 'kasirpro_transactions_v2';
const STORAGE_KEY_SETTINGS = 'kasirpro_settings_v2';

// -----------------------------------------------------------------------------
// 1. SOUND SYNTHESIS ENGINE (Web Audio API - 100% Offline, Zero MP3 Dependency)
// -----------------------------------------------------------------------------
const AudioEngine = {
    ctx: null,
    enabled: true,

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext && !this.ctx) {
                this.ctx = new AudioContext();
            }
        } catch (e) {
            console.warn("AudioContext initialization warning:", e);
        }
    },

    playBeep() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        } catch (e) {}
    },

    playSuccessChime() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
            // Elegant 4-note ascending chord arpeggio (C5, E5, G5, C6)
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
                gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(this.ctx.currentTime + idx * 0.08);
                osc.stop(this.ctx.currentTime + idx * 0.08 + 0.28);
            });
        } catch (e) {}
    }
};

// -----------------------------------------------------------------------------
// 2. APPLICATION CENTRAL STATE
// -----------------------------------------------------------------------------
const AppState = {
    products: [],
    transactions: [],
    cart: [],
    activeTab: 'pos',
    activeReportSubTab: 'daily',
    activeCategoryFilter: 'Semua',
    selectedPaymentMethod: 'Tunai',
    settings: {
        storeName: 'KasirPro Mart',
        storeSlogan: 'Minimarket & Retail Modern',
        storePhone: '0812-8888-9999',
        storeAddress: 'Jl. Pemuda No. 88, Jakarta Selatan',
        receiptFooter: 'Terima kasih telah berbelanja di KasirPro!',
        taxRate: 11,
        soundEnabled: true
    },
    charts: {
        trend: null,
        topProducts: null,
        payments: null
    }
};

// -----------------------------------------------------------------------------
// 3. SAMPLE DATA (REALISTIC DEMO DATABASE)
// -----------------------------------------------------------------------------
const SAMPLE_PRODUCTS = [
    { id: 'PRD-001', code: '8991001', name: 'Kopi Susu Gula Aren 250ml', category: 'Minuman', stock: 45, costPrice: 7000, sellingPrice: 15000, icon: '☕' },
    { id: 'PRD-002', code: '8991002', name: 'Air Mineral Pegunungan 600ml', category: 'Minuman', stock: 120, costPrice: 2000, sellingPrice: 4000, icon: '💧' },
    { id: 'PRD-003', code: '8991003', name: 'Teh Melati Wangi Botol 450ml', category: 'Minuman', stock: 8, costPrice: 3500, sellingPrice: 6500, icon: '🍵' },
    { id: 'PRD-004', code: '8991004', name: 'Roti Gandum Coklat Keju', category: 'Makanan', stock: 25, costPrice: 8500, sellingPrice: 14000, icon: '🍞' },
    { id: 'PRD-005', code: '8991005', name: 'Mie Instan Goreng Spesial', category: 'Makanan', stock: 150, costPrice: 2600, sellingPrice: 3800, icon: '🍜' },
    { id: 'PRD-006', code: '8991006', name: 'Keripik Kentang Balado 75g', category: 'Snack', stock: 32, costPrice: 9000, sellingPrice: 15500, icon: '🥔' },
    { id: 'PRD-007', code: '8991007', name: 'Biskuit Coklat Sandwich 120g', category: 'Snack', stock: 5, costPrice: 6000, sellingPrice: 10000, icon: '🍪' },
    { id: 'PRD-008', code: '8991008', name: 'Beras Premium Ramos 5kg', category: 'Sembako', stock: 18, costPrice: 62000, sellingPrice: 74000, icon: '🍚' },
    { id: 'PRD-009', code: '8991009', name: 'Minyak Goreng Pouch 2 Liter', category: 'Sembako', stock: 22, costPrice: 30000, sellingPrice: 36000, icon: '🍳' },
    { id: 'PRD-010', code: '8991010', name: 'Gula Pasir Kristal Putih 1kg', category: 'Sembako', stock: 40, costPrice: 14500, sellingPrice: 18000, icon: '🧂' },
    { id: 'PRD-011', code: '8991011', name: 'Sabun Cuci Piring Jeruk Nipis', category: 'Kebutuhan Rumah', stock: 30, costPrice: 8000, sellingPrice: 13000, icon: '🧼' },
    { id: 'PRD-012', code: '8991012', name: 'Deterjen Bubuk Konsentrat 800g', category: 'Kebutuhan Rumah', stock: 15, costPrice: 17000, sellingPrice: 24500, icon: '🧺' }
];

function generateSampleTransactions() {
    const now = new Date();
    const txs = [];
    const methods = ['Tunai', 'QRIS', 'Transfer'];

    const getDateStr = (offsetDays) => {
        const d = new Date(now);
        d.setDate(d.getDate() - offsetDays);
        return d.toISOString().split('T')[0];
    };

    // Today's Transactions
    const todayStr = getDateStr(0);
    txs.push({
        id: 'TRK-20261009-001',
        date: todayStr,
        time: '08:45',
        items: [
            { id: 'PRD-001', name: 'Kopi Susu Gula Aren 250ml', qty: 2, costPrice: 7000, sellingPrice: 15000, subtotal: 30000, profit: 16000 },
            { id: 'PRD-004', name: 'Roti Gandum Coklat Keju', qty: 1, costPrice: 8500, sellingPrice: 14000, subtotal: 14000, profit: 5500 }
        ],
        subtotal: 44000,
        discount: 0,
        tax: 0,
        total: 44000,
        totalCost: 22500,
        totalProfit: 21500,
        paymentMethod: 'QRIS',
        cashPaid: 44000,
        change: 0
    });

    txs.push({
        id: 'TRK-20261009-002',
        date: todayStr,
        time: '10:15',
        items: [
            { id: 'PRD-008', name: 'Beras Premium Ramos 5kg', qty: 1, costPrice: 62000, sellingPrice: 74000, subtotal: 74000, profit: 12000 },
            { id: 'PRD-009', name: 'Minyak Goreng Pouch 2 Liter', qty: 2, costPrice: 30000, sellingPrice: 36000, subtotal: 72000, profit: 12000 },
            { id: 'PRD-010', name: 'Gula Pasir Kristal Putih 1kg', qty: 1, costPrice: 14500, sellingPrice: 18000, subtotal: 18000, profit: 3500 }
        ],
        subtotal: 164000,
        discount: 4000,
        tax: 0,
        total: 160000,
        totalCost: 136500,
        totalProfit: 23500,
        paymentMethod: 'Tunai',
        cashPaid: 200000,
        change: 40000
    });

    txs.push({
        id: 'TRK-20261009-003',
        date: todayStr,
        time: '13:20',
        items: [
            { id: 'PRD-006', name: 'Keripik Kentang Balado 75g', qty: 3, costPrice: 9000, sellingPrice: 15500, subtotal: 46500, profit: 19500 },
            { id: 'PRD-002', name: 'Air Mineral Pegunungan 600ml', qty: 4, costPrice: 2000, sellingPrice: 4000, subtotal: 16000, profit: 8000 }
        ],
        subtotal: 62500,
        discount: 0,
        tax: 0,
        total: 62500,
        totalCost: 35000,
        totalProfit: 27500,
        paymentMethod: 'Tunai',
        cashPaid: 100000,
        change: 37500
    });

    // Past Days for rich visual charts and monthly summaries
    const offsets = [1, 2, 3, 4, 5, 6, 15, 25, 45, 60];
    offsets.forEach((off, idx) => {
        const dateStr = getDateStr(off);
        const grand = 50000 + (idx * 27000);
        const cost = Math.round(grand * 0.68);
        const profit = grand - cost;
        txs.push({
            id: `TRK-HIST-${100 + idx}`,
            date: dateStr,
            time: '11:' + String(10 + idx * 3).padStart(2, '0'),
            items: [
                { id: 'PRD-001', name: 'Kopi Susu Gula Aren 250ml', qty: 2 + (idx % 3), costPrice: 7000, sellingPrice: 15000, subtotal: 30000, profit: 16000 },
                { id: 'PRD-005', name: 'Mie Instan Goreng Spesial', qty: 4 + (idx % 4), costPrice: 2600, sellingPrice: 3800, subtotal: 15200, profit: 4800 }
            ],
            subtotal: grand,
            discount: 0,
            tax: 0,
            total: grand,
            totalCost: cost,
            totalProfit: profit,
            paymentMethod: methods[idx % 3],
            cashPaid: grand,
            change: 0
        });
    });

    return txs;
}

// -----------------------------------------------------------------------------
// 4. FORMATTING & UTILITIES
// -----------------------------------------------------------------------------
function formatRp(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number || 0);
}

// -----------------------------------------------------------------------------
// 5. APPLICATION INITIALIZATION & STORAGE
// -----------------------------------------------------------------------------
function initApp() {
    // 1. Load Settings
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (savedSettings) {
        try {
            AppState.settings = Object.assign(AppState.settings, JSON.parse(savedSettings));
        } catch (e) {}
    }
    applySettingsToUI();

    // 2. Load Products
    const savedProducts = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (savedProducts) {
        try {
            AppState.products = JSON.parse(savedProducts);
        } catch (e) {
            AppState.products = [...SAMPLE_PRODUCTS];
        }
    } else {
        AppState.products = [...SAMPLE_PRODUCTS];
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(AppState.products));
    }

    // 3. Load Transactions
    const savedTx = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (savedTx) {
        try {
            AppState.transactions = JSON.parse(savedTx);
        } catch (e) {
            AppState.transactions = generateSampleTransactions();
        }
    } else {
        AppState.transactions = generateSampleTransactions();
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(AppState.transactions));
    }

    // 4. Setup UI Elements
    startLiveClock();
    generateNewInvoiceId();
    renderCategoryFilterPills();
    renderProductGrid();
    renderCart();
    renderInventoryTable();
    renderFinancialReports();

    // Set Default Date Picker to Today
    const todayISO = new Date().toISOString().split('T')[0];
    const picker = document.getElementById('dailyReportDatePicker');
    if (picker) {
        picker.value = todayISO;
    }
    renderDailyReportTable();
}

function saveProductsToStorage() {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(AppState.products));
}

function saveTransactionsToStorage() {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(AppState.transactions));
}

function saveSettingsToStorage() {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(AppState.settings));
}

function applySettingsToUI() {
    const elName = document.getElementById('headerStoreName');
    const elSlogan = document.getElementById('headerStoreSlogan');
    const elTaxLabel = document.getElementById('taxRateLabel');

    if (elName) elName.textContent = AppState.settings.storeName;
    if (elSlogan) elSlogan.textContent = AppState.settings.storeSlogan;
    if (elTaxLabel) elTaxLabel.textContent = AppState.settings.taxRate;

    // Fill Settings Form
    const setFormName = document.getElementById('settingStoreName');
    const setFormSlogan = document.getElementById('settingStoreSlogan');
    const setFormPhone = document.getElementById('settingStorePhone');
    const setFormAddress = document.getElementById('settingStoreAddress');
    const setFormFooter = document.getElementById('settingReceiptFooter');
    const setFormTax = document.getElementById('settingTaxRate');

    if (setFormName) setFormName.value = AppState.settings.storeName;
    if (setFormSlogan) setFormSlogan.value = AppState.settings.storeSlogan;
    if (setFormPhone) setFormPhone.value = AppState.settings.storePhone;
    if (setFormAddress) setFormAddress.value = AppState.settings.storeAddress;
    if (setFormFooter) setFormFooter.value = AppState.settings.receiptFooter;
    if (setFormTax) setFormTax.value = AppState.settings.taxRate;

    AudioEngine.enabled = AppState.settings.soundEnabled;
    updateSoundIcon();
}

function saveStoreSettings(e) {
    e.preventDefault();
    AppState.settings.storeName = document.getElementById('settingStoreName').value.trim();
    AppState.settings.storeSlogan = document.getElementById('settingStoreSlogan').value.trim();
    AppState.settings.storePhone = document.getElementById('settingStorePhone').value.trim();
    AppState.settings.storeAddress = document.getElementById('settingStoreAddress').value.trim();
    AppState.settings.receiptFooter = document.getElementById('settingReceiptFooter').value.trim();
    AppState.settings.taxRate = Number(document.getElementById('settingTaxRate').value) || 0;

    saveSettingsToStorage();
    applySettingsToUI();
    calculateCartTotals();
    showToast('Pengaturan toko berhasil disimpan!', 'success');
}

function toggleAudioMute() {
    AppState.settings.soundEnabled = !AppState.settings.soundEnabled;
    AudioEngine.enabled = AppState.settings.soundEnabled;
    saveSettingsToStorage();
    updateSoundIcon();
    showToast(AudioEngine.enabled ? 'Efek Suara Diaktifkan' : 'Efek Suara Dimatikan', 'info');
}

function updateSoundIcon() {
    const icon = document.getElementById('soundIcon');
    if (!icon) return;
    if (AudioEngine.enabled) {
        icon.className = 'fa-solid fa-volume-high text-sm text-indigo-600';
    } else {
        icon.className = 'fa-solid fa-volume-xmark text-sm text-slate-400';
    }
}

function startLiveClock() {
    const update = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID') + ' WIB';
        const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        const elTime = document.getElementById('liveClockTime');
        const elDate = document.getElementById('liveClockDate');
        if (elTime) elTime.textContent = timeStr;
        if (elDate) elDate.textContent = dateStr;
    };
    update();
    setInterval(update, 1000);
}

function generateNewInvoiceId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invId = `TRK-${y}${m}${d}-${rand}`;
    const elInv = document.getElementById('currentInvoiceNumber');
    if (elInv) elInv.textContent = `No. Inv: ${invId}`;
    return invId;
}

// -----------------------------------------------------------------------------
// 6. NAVIGATION & TABS
// -----------------------------------------------------------------------------
function switchTab(tabId) {
    AppState.activeTab = tabId;

    // Hide all tab sections
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    // Show target tab
    const target = document.getElementById(`tab-${tabId}`);
    if (target) {
        target.classList.remove('hidden');
    }

    // Update Desktop Nav Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 text-slate-600 hover:text-indigo-600 hover:bg-white/60';
    });
    const activeBtn = document.getElementById(`tabBtn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 bg-white text-indigo-600 shadow-sm';
    }

    // Update Mobile Nav Buttons
    const mIds = ['pos', 'inventory', 'reports', 'analytics', 'settings'];
    mIds.forEach(id => {
        const mBtn = document.getElementById(`mTabBtn-${id}`);
        if (mBtn) {
            if (id === tabId) {
                mBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-indigo-600 text-white flex items-center gap-1.5';
            } else {
                mBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-slate-600 bg-slate-100 flex items-center gap-1.5';
            }
        }
    });

    // Refresh Tab Context
    if (tabId === 'inventory') {
        renderInventoryTable();
    } else if (tabId === 'reports') {
        renderFinancialReports();
    } else if (tabId === 'analytics') {
        renderAnalyticsCharts();
    }
}

// -----------------------------------------------------------------------------
// 7. POS ENGINE: CATALOG, SCAN & CART
// -----------------------------------------------------------------------------
function renderCategoryFilterPills() {
    const container = document.getElementById('categoryFilterContainer');
    if (!container) return;

    const categories = ['Semua', ...new Set(AppState.products.map(p => p.category))];

    container.innerHTML = categories.map(cat => {
        const isActive = AppState.activeCategoryFilter === cat;
        return `
            <button onclick="setCategoryFilter('${cat}')" class="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }">
                ${cat}
            </button>
        `;
    }).join('');
}

function setCategoryFilter(category) {
    AppState.activeCategoryFilter = category;
    renderCategoryFilterPills();
    filterCatalogProducts();
}

function filterCatalogProducts() {
    const searchInput = document.getElementById('productSearchInput');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    const filtered = AppState.products.filter(p => {
        const matchCategory = AppState.activeCategoryFilter === 'Semua' || p.category === AppState.activeCategoryFilter;
        const matchQuery = p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query);
        return matchCategory && matchQuery;
    });

    renderProductGrid(filtered);
}

function renderProductGrid(items = null) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const productList = items !== null ? items : AppState.products;
    const countBadge = document.getElementById('catalogCountBadge');
    if (countBadge) countBadge.textContent = `${productList.length} Produk`;

    if (productList.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-400">
                <i class="fa-solid fa-box-open text-3xl mb-2"></i>
                <p class="text-xs font-medium">Tidak ada produk ditemukan.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = productList.map(prod => {
        const isOutOfStock = prod.stock <= 0;
        const isLowStock = prod.stock > 0 && prod.stock <= 10;
        const stockBadgeClass = isOutOfStock 
            ? 'bg-rose-100 text-rose-700' 
            : isLowStock 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-emerald-50 text-emerald-700';
        const stockLabel = isOutOfStock ? 'Habis' : `Stok: ${prod.stock}`;

        return `
            <div onclick="${isOutOfStock ? `showToast('Stok produk ${prod.name} sudah habis!', 'error')` : `addToCart('${prod.id}')`}"
                class="group relative bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}">
                
                <div>
                    <div class="flex items-start justify-between gap-1 mb-2">
                        <span class="text-2xl p-1.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                            ${prod.icon || '📦'}
                        </span>
                        <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${stockBadgeClass}">
                            ${stockLabel}
                        </span>
                    </div>
                    <h4 class="font-bold text-slate-800 text-xs line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        ${prod.name}
                    </h4>
                    <span class="text-[10px] text-slate-400 font-mono mt-0.5 block">${prod.code}</span>
                </div>

                <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span class="font-extrabold text-xs text-indigo-600 font-mono">
                        ${formatRp(prod.sellingPrice)}
                    </span>
                    <div class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <i class="fa-solid fa-plus text-[10px]"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function handleBarcodeScan() {
    const input = document.getElementById('barcodeInput');
    const code = (input ? input.value : '').trim();
    if (!code) return;

    const product = AppState.products.find(p => p.code.toLowerCase() === code.toLowerCase() || p.id.toLowerCase() === code.toLowerCase());
    if (product) {
        if (product.stock <= 0) {
            showToast(`Stok produk ${product.name} habis!`, 'error');
        } else {
            addToCart(product.id);
            input.value = '';
            input.focus();
        }
    } else {
        showToast(`Barcode / Kode "${code}" tidak ditemukan dalam daftar produk!`, 'error');
    }
}

// -----------------------------------------------------------------------------
// 8. CART & CHECKOUT OPERATIONS
// -----------------------------------------------------------------------------
function addToCart(productId) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = AppState.cart.find(item => item.product.id === productId);
    const currentQtyInCart = existingItem ? existingItem.qty : 0;

    if (currentQtyInCart + 1 > product.stock) {
        showToast(`Stok tidak mencukupi! Sisa stok: ${product.stock}`, 'error');
        return;
    }

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        AppState.cart.push({
            product: product,
            qty: 1
        });
    }

    AudioEngine.playBeep();
    renderCart();
}

function updateCartQty(productId, delta) {
    const item = AppState.cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQty > item.product.stock) {
        showToast(`Stok tidak mencukupi! Tersedia hanya ${item.product.stock}`, 'error');
        return;
    }

    item.qty = newQty;
    AudioEngine.playBeep();
    renderCart();
}

function removeFromCart(productId) {
    AppState.cart = AppState.cart.filter(i => i.product.id !== productId);
    renderCart();
}

function clearCartConfirm() {
    if (AppState.cart.length === 0) return;
    if (confirm('Apakah Anda yakin ingin mengosongkan keranjang belanja?')) {
        AppState.cart = [];
        renderCart();
        showToast('Keranjang berhasil dikosongkan', 'info');
    }
}

function renderCart() {
    const container = document.getElementById('cartItemsList');
    if (!container) return;

    if (AppState.cart.length === 0) {
        container.innerHTML = `
            <div class="h-44 flex flex-col items-center justify-center text-slate-300">
                <i class="fa-solid fa-basket-shopping text-4xl mb-2"></i>
                <p class="text-xs font-semibold text-slate-400">Keranjang masih kosong</p>
                <p class="text-[11px] text-slate-400">Pilih produk atau scan barcode di sebelah kiri</p>
            </div>
        `;
        calculateCartTotals();
        return;
    }

    container.innerHTML = AppState.cart.map(item => {
        const itemSubtotal = item.product.sellingPrice * item.qty;
        return `
            <div class="pt-2 first:pt-0 flex items-center justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <h5 class="text-xs font-bold text-slate-800 truncate">${item.product.name}</h5>
                    <span class="text-[11px] text-slate-500 font-mono">${formatRp(item.product.sellingPrice)} × ${item.qty}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button onclick="updateCartQty('${item.product.id}', -1)" class="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors">
                        -
                    </button>
                    <span class="w-6 text-center text-xs font-bold font-mono text-slate-800">${item.qty}</span>
                    <button onclick="updateCartQty('${item.product.id}', 1)" class="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors">
                        +
                    </button>
                </div>
                <div class="text-right min-w-[70px]">
                    <span class="text-xs font-bold font-mono text-slate-900 block">${formatRp(itemSubtotal)}</span>
                    <button onclick="removeFromCart('${item.product.id}')" class="text-[10px] text-rose-500 hover:text-rose-700">Hapus</button>
                </div>
            </div>
        `;
    }).join('');

    calculateCartTotals();
}

function calculateCartTotals() {
    let subtotal = 0;
    AppState.cart.forEach(item => {
        subtotal += item.product.sellingPrice * item.qty;
    });

    const discInput = document.getElementById('cartDiscount');
    const discount = Math.max(0, Number(discInput ? discInput.value : 0) || 0);
    const taxToggle = document.getElementById('taxToggle');
    const isTaxActive = taxToggle ? taxToggle.checked : false;
    const taxRate = isTaxActive ? (AppState.settings.taxRate / 100) : 0;

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const taxAmount = Math.round(discountedSubtotal * taxRate);
    const grandTotal = discountedSubtotal + taxAmount;

    const elSubtotal = document.getElementById('summarySubtotal');
    const elTax = document.getElementById('summaryTax');
    const elGrandTotal = document.getElementById('summaryGrandTotal');

    if (elSubtotal) elSubtotal.textContent = formatRp(subtotal);
    if (elTax) elTax.textContent = formatRp(taxAmount);
    if (elGrandTotal) elGrandTotal.textContent = formatRp(grandTotal);

    // Change Calculation
    const cashInput = document.getElementById('cashReceivedInput');
    const changeDisplay = document.getElementById('cashChangeDisplay');

    if (cashInput && changeDisplay) {
        if (AppState.selectedPaymentMethod === 'Tunai') {
            const cashPaid = Number(cashInput.value) || 0;
            const change = cashPaid - grandTotal;

            if (cashPaid === 0 && grandTotal > 0) {
                changeDisplay.textContent = 'Rp 0';
                changeDisplay.className = 'text-base font-extrabold font-mono text-slate-400';
            } else if (change < 0) {
                changeDisplay.textContent = `Kurang ${formatRp(Math.abs(change))}`;
                changeDisplay.className = 'text-base font-extrabold font-mono text-rose-600';
            } else {
                changeDisplay.textContent = formatRp(change);
                changeDisplay.className = 'text-base font-extrabold font-mono text-emerald-600';
            }
        } else {
            changeDisplay.textContent = 'Rp 0 (Non-Tunai)';
            changeDisplay.className = 'text-base font-extrabold font-mono text-slate-500';
        }
    }

    return { subtotal, discount, tax: taxAmount, grandTotal };
}

function selectPaymentMethod(method) {
    AppState.selectedPaymentMethod = method;
    ['Tunai', 'QRIS', 'Transfer'].forEach(m => {
        const btn = document.getElementById(`pmBtn-${m}`);
        if (btn) {
            if (m === method) {
                btn.className = 'pm-btn py-1.5 px-2 rounded-xl text-xs font-bold border border-indigo-500 bg-indigo-50 text-indigo-700 flex items-center justify-center gap-1.5 transition-all';
            } else {
                btn.className = 'pm-btn py-1.5 px-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:border-slate-300 flex items-center justify-center gap-1.5 transition-all';
            }
        }
    });

    const cashContainer = document.getElementById('cashInputContainer');
    if (cashContainer) {
        cashContainer.style.display = (method === 'Tunai') ? 'block' : 'none';
    }
    calculateCartTotals();
}

function setQuickCash(amount) {
    const { grandTotal } = calculateCartTotals();
    const input = document.getElementById('cashReceivedInput');
    if (!input) return;
    if (amount === 'exact') {
        input.value = grandTotal;
    } else {
        input.value = amount;
    }
    calculateCartTotals();
}

function processCheckout() {
    if (AppState.cart.length === 0) {
        showToast('Keranjang belanja masih kosong!', 'error');
        return;
    }

    const { subtotal, discount, tax, grandTotal } = calculateCartTotals();
    const cashInput = document.getElementById('cashReceivedInput');
    let cashPaid = Number(cashInput ? cashInput.value : 0) || 0;

    if (AppState.selectedPaymentMethod === 'Tunai') {
        if (cashPaid < grandTotal) {
            const diff = grandTotal - cashPaid;
            showToast(`Uang tunai kurang sebesar ${formatRp(diff)}!`, 'error');
            if (cashInput) {
                cashInput.classList.add('animate-shake');
                setTimeout(() => cashInput.classList.remove('animate-shake'), 400);
            }
            return;
        }
    } else {
        cashPaid = grandTotal;
    }

    const change = Math.max(0, cashPaid - grandTotal);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 5);
    const invEl = document.getElementById('currentInvoiceNumber');
    const invoiceId = invEl ? invEl.textContent.replace('No. Inv: ', '') : `TRK-${Date.now()}`;

    // Item Breakdown & Profit Calculation
    let totalCost = 0;
    let totalProfit = 0;
    const itemsRecord = AppState.cart.map(item => {
        const itemCost = item.product.costPrice * item.qty;
        const itemSales = item.product.sellingPrice * item.qty;
        const itemProfit = itemSales - itemCost;
        totalCost += itemCost;
        totalProfit += itemProfit;

        // Deduct inventory
        const prodInStock = AppState.products.find(p => p.id === item.product.id);
        if (prodInStock) {
            prodInStock.stock = Math.max(0, prodInStock.stock - item.qty);
        }

        return {
            id: item.product.id,
            name: item.product.name,
            qty: item.qty,
            costPrice: item.product.costPrice,
            sellingPrice: item.product.sellingPrice,
            subtotal: itemSales,
            profit: itemProfit
        };
    });

    const finalProfit = totalProfit - discount;

    const transactionRecord = {
        id: invoiceId,
        date: dateStr,
        time: timeStr,
        items: itemsRecord,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        total: grandTotal,
        totalCost: totalCost,
        totalProfit: finalProfit,
        paymentMethod: AppState.selectedPaymentMethod,
        cashPaid: cashPaid,
        change: change
    };

    AppState.transactions.unshift(transactionRecord);
    saveTransactionsToStorage();
    saveProductsToStorage();

    AudioEngine.playSuccessChime();
    triggerSuccessConfetti();

    openReceiptModal(transactionRecord);

    // Reset Cart
    AppState.cart = [];
    const discEl = document.getElementById('cartDiscount');
    const taxToggle = document.getElementById('taxToggle');
    if (discEl) discEl.value = '0';
    if (taxToggle) taxToggle.checked = false;
    if (cashInput) cashInput.value = '';

    generateNewInvoiceId();
    renderCart();
    renderProductGrid();

    showToast('Transaksi berhasil disimpan ke database!', 'success');
}

function triggerSuccessConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// -----------------------------------------------------------------------------
// 9. RECEIPT MODAL & PRINTING
// -----------------------------------------------------------------------------
function openReceiptModal(tx) {
    const elRecStoreName = document.getElementById('recStoreName');
    const elRecStoreAddr = document.getElementById('recStoreAddress');
    const elRecStorePhone = document.getElementById('recStorePhone');
    const elRecInv = document.getElementById('recInvoiceId');
    const elRecDate = document.getElementById('recDateTime');
    const elRecPay = document.getElementById('recPaymentMethod');
    const elRecFooter = document.getElementById('recFooterMessage');

    if (elRecStoreName) elRecStoreName.textContent = AppState.settings.storeName;
    if (elRecStoreAddr) elRecStoreAddr.textContent = AppState.settings.storeAddress;
    if (elRecStorePhone) elRecStorePhone.textContent = `Telp: ${AppState.settings.storePhone}`;
    if (elRecInv) elRecInv.textContent = tx.id;
    if (elRecDate) elRecDate.textContent = `${tx.date} ${tx.time}`;
    if (elRecPay) elRecPay.textContent = tx.paymentMethod.toUpperCase();
    if (elRecFooter) elRecFooter.textContent = AppState.settings.receiptFooter;

    const itemsContainer = document.getElementById('recItemsList');
    if (itemsContainer) {
        itemsContainer.innerHTML = tx.items.map(item => `
            <div>
                <div class="font-semibold text-slate-800">${item.name}</div>
                <div class="flex justify-between text-slate-600">
                    <span>${item.qty} × ${formatRp(item.sellingPrice)}</span>
                    <span>${formatRp(item.subtotal)}</span>
                </div>
            </div>
        `).join('');
    }

    const recSub = document.getElementById('recSubtotal');
    const recGrand = document.getElementById('recGrandTotal');
    const recPaid = document.getElementById('recCashPaid');
    const recChg = document.getElementById('recChange');

    if (recSub) recSub.textContent = formatRp(tx.subtotal);
    if (recGrand) recGrand.textContent = formatRp(tx.total);
    if (recPaid) recPaid.textContent = formatRp(tx.cashPaid);
    if (recChg) recChg.textContent = formatRp(tx.change);

    const discRow = document.getElementById('recDiscountRow');
    if (discRow) {
        discRow.style.display = tx.discount > 0 ? 'flex' : 'none';
        const elDisc = document.getElementById('recDiscount');
        if (elDisc) elDisc.textContent = `-${formatRp(tx.discount)}`;
    }

    const taxRow = document.getElementById('recTaxRow');
    if (taxRow) {
        taxRow.style.display = tx.tax > 0 ? 'flex' : 'none';
        const elTax = document.getElementById('recTax');
        if (elTax) elTax.textContent = formatRp(tx.tax);
    }

    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.remove('hidden');
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.add('hidden');
}

// -----------------------------------------------------------------------------
// 10. INVENTORY CRUD & STOCK MANAGEMENT
// -----------------------------------------------------------------------------
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('invSearchInput');
    const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const catSelect = document.getElementById('invCategoryFilter');
    const catFilter = catSelect ? catSelect.value : '';
    const stockSelect = document.getElementById('invStockStatusFilter');
    const stockFilter = stockSelect ? stockSelect.value : 'all';

    // Populate category dropdown
    if (catSelect && catSelect.options.length <= 1) {
        const categories = [...new Set(AppState.products.map(p => p.category))];
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            catSelect.appendChild(opt);
        });
    }

    // Inventory KPI Summary calculation
    let totalStock = 0;
    let totalAssetValue = 0;
    let lowStockCount = 0;

    AppState.products.forEach(p => {
        totalStock += p.stock;
        totalAssetValue += (p.stock * p.costPrice);
        if (p.stock < 10) lowStockCount++;
    });

    const elTotalItems = document.getElementById('invKpiTotalItems');
    const elTotalStock = document.getElementById('invKpiTotalStock');
    const elAssetValue = document.getElementById('invKpiAssetValue');
    const elLowStock = document.getElementById('invKpiLowStock');

    if (elTotalItems) elTotalItems.textContent = AppState.products.length;
    if (elTotalStock) elTotalStock.textContent = `${totalStock} Pcs`;
    if (elAssetValue) elAssetValue.textContent = formatRp(totalAssetValue);
    if (elLowStock) elLowStock.textContent = `${lowStockCount} Item`;

    // Filter Items
    const filtered = AppState.products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
        const matchCat = !catFilter || p.category === catFilter;
        let matchStock = true;
        if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock < 10;
        else if (stockFilter === 'empty') matchStock = p.stock <= 0;
        else if (stockFilter === 'available') matchStock = p.stock >= 10;
        return matchSearch && matchCat && matchStock;
    });

    const emptyState = document.getElementById('invEmptyState');
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
    }

    tbody.innerHTML = filtered.map(prod => {
        const marginRp = prod.sellingPrice - prod.costPrice;
        const marginPct = prod.costPrice > 0 ? ((marginRp / prod.costPrice) * 100).toFixed(1) : 0;

        const stockBadgeClass = prod.stock <= 0 
            ? 'bg-rose-100 text-rose-700' 
            : prod.stock < 10 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-emerald-50 text-emerald-700';

        return `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-slate-700">${prod.code}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                        <span class="text-base">${prod.icon || '📦'}</span>
                        <span class="font-bold text-slate-800">${prod.name}</span>
                    </div>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        ${prod.category}
                    </span>
                </td>
                <td class="py-3 px-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${stockBadgeClass}">
                        ${prod.stock} Pcs
                    </span>
                </td>
                <td class="py-3 px-4 text-right font-mono text-slate-600">${formatRp(prod.costPrice)}</td>
                <td class="py-3 px-4 text-right font-mono font-bold text-indigo-600">${formatRp(prod.sellingPrice)}</td>
                <td class="py-3 px-4 text-right font-mono">
                    <span class="text-emerald-600 font-bold">${formatRp(marginRp)}</span>
                    <span class="text-[10px] text-emerald-500 block">(${marginPct}%)</span>
                </td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="quickAddStock('${prod.id}', 10)" title="Tambah Stok +10" class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors">
                            <i class="fa-solid fa-plus text-[10px]"></i>
                        </button>
                        <button onclick="openProductModal('edit', '${prod.id}')" title="Edit Produk" class="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button onclick="deleteProductConfirm('${prod.id}')" title="Hapus Produk" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function quickAddStock(productId, amount) {
    const product = AppState.products.find(p => p.id === productId);
    if (!product) return;
    product.stock += amount;
    saveProductsToStorage();
    renderInventoryTable();
    renderProductGrid();
    showToast(`Stok ${product.name} bertambah +${amount}!`, 'success');
}

function openProductModal(mode, productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (!modal || !form) return;
    form.reset();
    document.getElementById('formProductId').value = '';

    if (mode === 'edit' && productId) {
        const prod = AppState.products.find(p => p.id === productId);
        if (!prod) return;
        if (title) title.textContent = 'Edit Data Produk';
        document.getElementById('formProductId').value = prod.id;
        document.getElementById('formProductBarcode').value = prod.code;
        document.getElementById('formProductName').value = prod.name;
        document.getElementById('formProductCategory').value = prod.category;
        document.getElementById('formProductStock').value = prod.stock;
        document.getElementById('formProductCost').value = prod.costPrice;
        document.getElementById('formProductPrice').value = prod.sellingPrice;
    } else {
        if (title) title.textContent = 'Tambah Produk Baru';
        generateBarcodeSku();
    }

    calculateModalProfitMargin();
    modal.classList.remove('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('hidden');
}

function generateBarcodeSku() {
    const rand = Math.floor(1000000 + Math.random() * 9000000);
    const input = document.getElementById('formProductBarcode');
    if (input) input.value = `899${rand}`;
}

function calculateModalProfitMargin() {
    const cost = Number(document.getElementById('formProductCost').value) || 0;
    const price = Number(document.getElementById('formProductPrice').value) || 0;
    const margin = price - cost;
    const pct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : 0;

    const elRp = document.getElementById('formCalcMarginRp');
    const elPct = document.getElementById('formCalcMarginPct');

    if (elRp) elRp.textContent = formatRp(margin);
    if (elPct) elPct.textContent = `(${pct}%)`;
}

function saveProductForm(e) {
    e.preventDefault();
    const id = document.getElementById('formProductId').value;
    const barcode = document.getElementById('formProductBarcode').value.trim();
    const name = document.getElementById('formProductName').value.trim();
    const category = document.getElementById('formProductCategory').value;
    const stock = Number(document.getElementById('formProductStock').value) || 0;
    const cost = Number(document.getElementById('formProductCost').value) || 0;
    const price = Number(document.getElementById('formProductPrice').value) || 0;

    if (id) {
        // Edit
        const prod = AppState.products.find(p => p.id === id);
        if (prod) {
            prod.code = barcode;
            prod.name = name;
            prod.category = category;
            prod.stock = stock;
            prod.costPrice = cost;
            prod.sellingPrice = price;
            showToast('Produk berhasil diperbarui!', 'success');
        }
    } else {
        // Add
        const newId = `PRD-${Date.now().toString().slice(-4)}`;
        const newProduct = {
            id: newId,
            code: barcode,
            name: name,
            category: category,
            stock: stock,
            costPrice: cost,
            sellingPrice: price,
            icon: '📦'
        };
        AppState.products.unshift(newProduct);
        showToast('Produk baru berhasil ditambahkan!', 'success');
    }

    saveProductsToStorage();
    closeProductModal();
    renderCategoryFilterPills();
    renderProductGrid();
    renderInventoryTable();
}

function deleteProductConfirm(productId) {
    const prod = AppState.products.find(p => p.id === productId);
    if (!prod) return;
    if (confirm(`Yakin ingin menghapus produk "${prod.name}"?`)) {
        AppState.products = AppState.products.filter(p => p.id !== productId);
        saveProductsToStorage();
        renderCategoryFilterPills();
        renderProductGrid();
        renderInventoryTable();
        showToast('Produk berhasil dihapus', 'info');
    }
}

// -----------------------------------------------------------------------------
// 11. FINANCIAL REPORTS (DAILY & MONTHLY)
// -----------------------------------------------------------------------------
function switchReportSubTab(subTab) {
    AppState.activeReportSubTab = subTab;
    const dailyBtn = document.getElementById('subReportBtn-daily');
    const monthlyBtn = document.getElementById('subReportBtn-monthly');
    const dailyView = document.getElementById('subViewDailyReport');
    const monthlyView = document.getElementById('subViewMonthlyReport');
    const dailyFilter = document.getElementById('dailyFilterWrapper');

    if (subTab === 'daily') {
        if (dailyBtn) dailyBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm transition-all flex items-center gap-1.5';
        if (monthlyBtn) monthlyBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-1.5';
        if (dailyView) dailyView.classList.remove('hidden');
        if (monthlyView) monthlyView.classList.add('hidden');
        if (dailyFilter) dailyFilter.classList.remove('hidden');
        renderDailyReportTable();
    } else {
        if (monthlyBtn) monthlyBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-600 shadow-sm transition-all flex items-center gap-1.5';
        if (dailyBtn) dailyBtn.className = 'px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-1.5';
        if (monthlyView) monthlyView.classList.remove('hidden');
        if (dailyView) dailyView.classList.add('hidden');
        if (dailyFilter) dailyFilter.classList.add('hidden');
        renderMonthlyReportTable();
    }
}

function resetDailyDateToToday() {
    const today = new Date().toISOString().split('T')[0];
    const picker = document.getElementById('dailyReportDatePicker');
    if (picker) picker.value = today;
    renderDailyReportTable();
}

function renderFinancialReports() {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const totalOrders = AppState.transactions.length;

    AppState.transactions.forEach(tx => {
        totalRevenue += (tx.total || 0);
        totalCost += (tx.totalCost || 0);
        totalProfit += (tx.totalProfit || 0);
    });

    const profitMarginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const elRev = document.getElementById('kpiTotalRevenue');
    const elProf = document.getElementById('kpiNetProfit');
    const elOrd = document.getElementById('kpiTotalOrders');
    const elAov = document.getElementById('kpiAvgOrderValue');
    const elPgm = document.getElementById('kpiProfitMarginPercent');
    const elCost = document.getElementById('kpiTotalCost');

    if (elRev) elRev.textContent = formatRp(totalRevenue);
    if (elProf) elProf.textContent = formatRp(totalProfit);
    if (elOrd) elOrd.textContent = totalOrders.toLocaleString('id-ID');
    if (elAov) elAov.textContent = formatRp(avgOrderValue);
    if (elPgm) elPgm.textContent = `${profitMarginPct}%`;
    if (elCost) elCost.textContent = formatRp(totalCost);

    if (AppState.activeReportSubTab === 'daily') {
        renderDailyReportTable();
    } else {
        renderMonthlyReportTable();
    }
}

function renderDailyReportTable() {
    const picker = document.getElementById('dailyReportDatePicker');
    const selectedDate = (picker && picker.value) ? picker.value : new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('dailyReportTableBody');
    const emptyEl = document.getElementById('dailyReportEmpty');

    if (!tbody) return;

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const formattedLabel = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const elDateLabel = document.getElementById('dailyReportSelectedLabel');
    if (elDateLabel) elDateLabel.textContent = formattedLabel;

    const dailyTx = AppState.transactions.filter(tx => tx.date === selectedDate);
    const countBadge = document.getElementById('dailyTransactionsCountBadge');
    if (countBadge) countBadge.textContent = `${dailyTx.length} Transaksi`;

    if (dailyTx.length === 0) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    } else {
        if (emptyEl) emptyEl.classList.add('hidden');
    }

    tbody.innerHTML = dailyTx.map(tx => {
        const totalItemQty = tx.items.reduce((sum, i) => sum + i.qty, 0);
        const itemsSummaryText = tx.items.map(i => `${i.name} (${i.qty})`).join(', ');

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 font-mono font-bold text-slate-800">${tx.id}</td>
                <td class="py-3 px-4 text-slate-500">${tx.time} WIB</td>
                <td class="py-3 px-4 max-w-[220px]">
                    <span class="font-bold text-slate-800 block text-[11px]">${totalItemQty} Barang</span>
                    <span class="text-[10px] text-slate-400 truncate block" title="${itemsSummaryText}">${itemsSummaryText}</span>
                </td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.paymentMethod === 'Tunai' ? 'bg-emerald-50 text-emerald-700' :
                        tx.paymentMethod === 'QRIS' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                    }">
                        ${tx.paymentMethod}
                    </span>
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold text-slate-800">${formatRp(tx.total)}</td>
                <td class="py-3 px-4 text-right font-mono text-slate-500">${formatRp(tx.totalCost)}</td>
                <td class="py-3 px-4 text-right font-mono font-extrabold text-emerald-600">${formatRp(tx.totalProfit)}</td>
                <td class="py-3 px-4 text-center">
                    <button onclick='viewPastReceipt("${tx.id}")' class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-semibold transition-all">
                        <i class="fa-solid fa-receipt mr-1"></i> Struk
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderMonthlyReportTable() {
    const tbody = document.getElementById('monthlyReportTableBody');
    if (!tbody) return;

    const monthlyMap = {};
    AppState.transactions.forEach(tx => {
        const monthKey = tx.date.substring(0, 7);
        if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = {
                count: 0,
                totalItems: 0,
                revenue: 0,
                cost: 0,
                profit: 0
            };
        }
        monthlyMap[monthKey].count += 1;
        monthlyMap[monthKey].revenue += (tx.total || 0);
        monthlyMap[monthKey].cost += (tx.totalCost || 0);
        monthlyMap[monthKey].profit += (tx.totalProfit || 0);
        tx.items.forEach(i => {
            monthlyMap[monthKey].totalItems += i.qty;
        });
    });

    const sortedMonths = Object.keys(monthlyMap).sort().reverse();

    if (sortedMonths.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada riwayat transaksi bulanan.</td></tr>`;
        return;
    }

    tbody.innerHTML = sortedMonths.map(mKey => {
        const data = monthlyMap[mKey];
        const [year, month] = mKey.split('-');
        const monthDate = new Date(Number(year), Number(month) - 1, 1);
        const monthName = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const marginPct = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0;

        return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4 font-bold text-slate-800">${monthName}</td>
                <td class="py-3 px-4 text-center font-bold text-slate-700">${data.count}</td>
                <td class="py-3 px-4 text-center text-slate-600">${data.totalItems} Pcs</td>
                <td class="py-3 px-4 text-right font-bold text-slate-800">${formatRp(data.revenue)}</td>
                <td class="py-3 px-4 text-right text-slate-500">${formatRp(data.cost)}</td>
                <td class="py-3 px-4 text-right font-extrabold text-emerald-600">${formatRp(data.profit)}</td>
                <td class="py-3 px-4 text-center">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        ${marginPct}%
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function viewPastReceipt(txId) {
    const tx = AppState.transactions.find(t => t.id === txId);
    if (tx) {
        openReceiptModal(tx);
    }
}

// -----------------------------------------------------------------------------
// 12. DATA VISUALIZATION (CHART.JS)
// -----------------------------------------------------------------------------
function renderAnalyticsCharts() {
    renderTrendChart();
    renderTopProductsChart();
    renderPaymentMethodsChart();
}

function renderTrendChart() {
    const ctx = document.getElementById('trendSalesChart');
    if (!ctx) return;

    const daysMap = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        daysMap[key] = { label, revenue: 0, profit: 0 };
    }

    AppState.transactions.forEach(tx => {
        if (daysMap[tx.date]) {
            daysMap[tx.date].revenue += (tx.total || 0);
            daysMap[tx.date].profit += (tx.totalProfit || 0);
        }
    });

    const labels = Object.values(daysMap).map(d => d.label);
    const revenueData = Object.values(daysMap).map(d => d.revenue);
    const profitData = Object.values(daysMap).map(d => d.profit);

    if (AppState.charts.trend) {
        AppState.charts.trend.destroy();
    }

    AppState.charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Omset Penjualan (Rp)',
                    data: revenueData,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#4f46e5',
                    pointRadius: 4
                },
                {
                    label: 'Untung Bersih (Rp)',
                    data: profitData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${formatRp(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return 'Rp ' + (value / 1000) + 'k';
                        }
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTopProductsChart() {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;

    const itemCounts = {};
    AppState.transactions.forEach(tx => {
        tx.items.forEach(item => {
            if (!itemCounts[item.name]) {
                itemCounts[item.name] = { qty: 0, revenue: 0 };
            }
            itemCounts[item.name].qty += item.qty;
            itemCounts[item.name].revenue += item.subtotal;
        });
    });

    const sortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5);

    const labels = sortedItems.map(item => item[0]);
    const dataQty = sortedItems.map(item => item[1].qty);

    if (AppState.charts.topProducts) {
        AppState.charts.topProducts.destroy();
    }

    AppState.charts.topProducts = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kuantitas Terjual (Pcs)',
                data: dataQty,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.85)',
                    'rgba(16, 185, 129, 0.85)',
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(139, 92, 246, 0.85)',
                    'rgba(236, 72, 153, 0.85)'
                ],
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Terjual: ${context.raw} Pcs`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11, family: '"Plus Jakarta Sans"' }
                    }
                }
            }
        }
    });
}

function renderPaymentMethodsChart() {
    const ctx = document.getElementById('paymentMethodsChart');
    if (!ctx) return;

    const counts = { Tunai: 0, QRIS: 0, Transfer: 0 };
    AppState.transactions.forEach(tx => {
        if (counts[tx.paymentMethod] !== undefined) {
            counts[tx.paymentMethod] += 1;
        }
    });

    const total = counts.Tunai + counts.QRIS + counts.Transfer || 1;
    const elCash = document.getElementById('statPayCash');
    const elQris = document.getElementById('statPayQris');
    const elTfr = document.getElementById('statPayTransfer');

    if (elCash) elCash.textContent = `${Math.round((counts.Tunai / total) * 100)}%`;
    if (elQris) elQris.textContent = `${Math.round((counts.QRIS / total) * 100)}%`;
    if (elTfr) elTfr.textContent = `${Math.round((counts.Transfer / total) * 100)}%`;

    if (AppState.charts.payments) {
        AppState.charts.payments.destroy();
    }

    AppState.charts.payments = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Tunai', 'QRIS', 'Transfer'],
            datasets: [{
                data: [counts.Tunai, counts.QRIS, counts.Transfer],
                backgroundColor: ['#10b981', '#6366f1', '#3b82f6'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

// -----------------------------------------------------------------------------
// 13. BACKUP & RESTORE DATA (JSON LOCALSTORAGE)
// -----------------------------------------------------------------------------
function exportDataToJson() {
    const backup = {
        products: AppState.products,
        transactions: AppState.transactions,
        settings: AppState.settings,
        exportedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `kasirpro_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Cadangan data berhasil diunduh!', 'success');
}

function importDataFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.products && parsed.transactions) {
                AppState.products = parsed.products;
                AppState.transactions = parsed.transactions;
                if (parsed.settings) AppState.settings = parsed.settings;

                saveProductsToStorage();
                saveTransactionsToStorage();
                saveSettingsToStorage();

                initApp();
                showToast('Data berhasil dipulihkan dari cadangan!', 'success');
            } else {
                showToast('Format file JSON tidak sesuai!', 'error');
            }
        } catch (err) {
            showToast('Gagal membaca file JSON: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllDataConfirm() {
    if (confirm('PERINGATAN: Seluruh produk dan riwayat transaksi akan dihapus secara permanen dari browser ini. Lanjutkan?')) {
        localStorage.removeItem(STORAGE_KEY_PRODUCTS);
        localStorage.removeItem(STORAGE_KEY_TRANSACTIONS);
        AppState.products = [];
        AppState.transactions = [];
        AppState.cart = [];
        initApp();
        showToast('Semua data lokal telah dibersihkan!', 'info');
    }
}

function loadSampleDataConfirm() {
    if (confirm('Reset ulang data ke data demo (sampel toko retail)? Data saat ini akan ditimpa dengan data contoh.')) {
        AppState.products = [...SAMPLE_PRODUCTS];
        AppState.transactions = generateSampleTransactions();
        saveProductsToStorage();
        saveTransactionsToStorage();
        initApp();
        showToast('Data demo berhasil dimuat ulang!', 'success');
    }
}

// -----------------------------------------------------------------------------
// 14. TOAST NOTIFICATIONS
// -----------------------------------------------------------------------------
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');

    const bgClass = type === 'success' ? 'bg-emerald-600 text-white' :
                    type === 'error' ? 'bg-rose-600 text-white' :
                    'bg-slate-800 text-white';

    const iconClass = type === 'success' ? 'fa-circle-check' :
                      type === 'error' ? 'fa-triangle-exclamation' :
                      'fa-circle-info';

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold pointer-events-auto transform transition-all duration-300 translate-y-3 opacity-0 ${bgClass}`;
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} text-sm"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// -----------------------------------------------------------------------------
// 15. KEYBOARD SHORTCUTS & EVENT LISTENERS
// -----------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProductModal();
        closeReceiptModal();
    } else if (e.key === 'F2') {
        e.preventDefault();
        switchTab('pos');
        const barcode = document.getElementById('barcodeInput');
        if (barcode) barcode.focus();
    }
});

// Initialize on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
