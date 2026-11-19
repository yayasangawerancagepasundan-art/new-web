(() => {
  'use strict';

  const API_BASE = 'https://sppg-keuangan-dev.yayasangawerancagepasundan.workers.dev';
  const API = Object.freeze({
    me: '/api/auth/me',
    dashboard: '/api/bendahara/dashboard',
    feePayments: '/api/bendahara/fee-payments',
    verifyFee: id => `/api/bendahara/fee-payments/${encodeURIComponent(id)}/verify`,
    rejectFee: id => `/api/bendahara/fee-payments/${encodeURIComponent(id)}/reject`,
    accounts: '/api/bendahara/foundation/accounts',
    cashBankAccounts: '/api/bendahara/foundation/cash-bank-accounts',
    income: '/api/bendahara/foundation/income',
    expense: '/api/bendahara/foundation/expense',
    withdrawals: '/api/bendahara/withdrawals',
    confirmWithdrawal: id => `/api/bendahara/withdrawals/${encodeURIComponent(id)}/confirm-payment`,
    transactions: '/api/bendahara/foundation/transactions',
    reports: '/api/bendahara/foundation/reports',
    notifications: '/api/bendahara/notifications'
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { 
    profile: null,
    dashboard: null, 
    accounts: [], 
    cashBankAccounts: [], 
    feePayments: [], 
    withdrawals: [], 
    transactions: [],
    notifications: [],
    currentPage: 'overview', 
    history: [] };

  const pageMeta = {
    overview: ['RINGKASAN YAYASAN', 'Dashboard Bendahara', 'Kelola penerimaan, pengeluaran, verifikasi Fee Yayasan, dan kewajiban keuangan Yayasan.'],
    fee: ['VERIFIKASI', 'Verifikasi Fee Yayasan', 'Cocokkan setoran dapur dengan penerimaan kas/bank Yayasan.'],
    income: ['PEMBUKUAN FOUNDATION', 'Pemasukan Yayasan', 'Catat penerimaan internal Yayasan yang benar-benar telah diterima.'],
    expense: ['PEMBUKUAN FOUNDATION', 'Pengeluaran Yayasan', 'Catat pengeluaran internal Yayasan berdasarkan transaksi aktual.'],
    cashBank: ['PENGELOLAAN FOUNDATION','Rekening Kas dan Bank','Kelola rekening kas dan bank Yayasan yang terhubung dengan COA aset FOUNDATION.'],
    withdrawals: ['PEMBAYARAN', 'Proses Withdraw', 'Proses transfer dan konfirmasi pembayaran withdraw saldo pribadi.'],
    history: ['ARSIP TRANSAKSI', 'Riwayat Transaksi', 'Lihat transaksi yang telah tercatat pada buku FOUNDATION.'],
    reports: ['DOKUMEN', 'Laporan', 'Lihat laporan keuangan internal Yayasan.'],
    notifications: ['PEMBERITAHUAN', 'Notifikasi', 'Pembaruan yang relevan dengan tugas Bendahara.'],
    account: ['PENGATURAN', 'Keamanan Akun', 'Informasi akun Bendahara Yayasan.']
  };

  function authToken() {
    return localStorage.getItem('sppg_auth_token') || sessionStorage.getItem('sppg_auth_token') || '';
  }
  function setBackendStatus(kind, label) {
    const status = $('#backendStatus');
    if (!status)
      return;
    status.classList.remove('is-checking', 'is-connected', 'is-failed');
    status.classList.add(kind);
    $('#backendStatusText').textContent = label;
    $('#connectionText').textContent = kind === 'is-connected' ? 'Sesi terhubung' : label;
  }
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    window.setTimeout(() => el.classList.remove('show'), 2800);
  }
  function money(value) {
    if (value === null || value === undefined || value === '') return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
  }
  function safe(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function safeHref(value) {
    try { const url = new URL(String(value || ''), window.location.origin); return ['https:', 'http:'].includes(url.protocol) ? safe(url.href) : ''; }
    catch { return ''; }
  }
  async function request(path, options = {}) {
    const token = authToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'omit' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) throw new Error(payload?.message || `Permintaan gagal (${response.status})`);
    return payload?.data ?? payload;
  }
  function renderPage(page, push = true) {
    if (!pageMeta[page]) return;
    if (push && page !== state.currentPage) state.history.push(state.currentPage);
    state.currentPage = page;
    $$('[data-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === page));
    $$('.nav-item[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
    $('#breadcrumbCurrent').textContent = pageMeta[page][1];
    $('#pageEyebrow').textContent = pageMeta[page][0];
    $('#pageTitle').textContent = pageMeta[page][1];
    $('#pageDescription').textContent = pageMeta[page][2];
    $('#sidebar').classList.remove('open');
    $('#sidebarBackdrop').classList.remove('show');
    if (push) window.history.pushState({ bendahara: true, page }, '', `#${page}`);
    loadPageData(page).catch(error => toast(error.message));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function setEmpty(tbodyId, colspan, message) {
    const body = document.getElementById(tbodyId);
    if (body) body.innerHTML = `<tr><td colspan="${colspan}"><div class="table-empty">${safe(message)}</div></td></tr>`;
  }
  function renderFeeRows(rows) {
    const body = $('#feeTable'); if (!body) return;
    if (!rows.length) return setEmpty('feeTable', 6, 'Belum ada setoran Fee yang perlu ditampilkan.');
    body.innerHTML = rows.map(row => `<tr><td>${safe(row.kitchen_name || row.kitchen_code || '—')}</td><td>${safe(row.fee_period || row.period_label || '—')}</td><td>${money(row.billed_amount)}</td><td>${money(row.reported_amount)}</td><td><span class="status-pill ${row.verification_status === 'VERIFIED' ? 'success' : row.verification_status === 'REJECTED' ? 'danger' : 'warning'}">${safe(row.verification_status || 'PENDING')}</span></td><td><button class="button button-secondary" data-fee-verify="${safe(row.id)}" ${row.verification_status === 'VERIFIED' ? 'disabled' : ''}>Periksa</button></td></tr>`).join('');
  }
  function renderWithdrawalRows(rows) {
    const body = $('#withdrawTable'); if (!body) return;
    if (!rows.length) return setEmpty('withdrawTable', 6, 'Belum ada permintaan withdraw.');
    body.innerHTML = rows.map(row => `<tr><td>${safe(row.requester_name || '—')}</td><td>${safe(row.request_date || '—')}</td><td>${money(row.amount)}</td><td><span class="status-pill ${row.status === 'PAID' || row.status === 'COMPLETED' ? 'success' : 'warning'}">${safe(row.status || '—')}</span></td><td>${safeHref(row.evidence_url) ? `<a href="${safeHref(row.evidence_url)}" target="_blank" rel="noopener">Lihat bukti</a>` : '—'}</td><td><button class="button button-secondary" data-withdraw-confirm="${safe(row.id)}" ${['PAID','COMPLETED','REJECTED'].includes(row.status) ? 'disabled' : ''}>Konfirmasi transfer</button></td></tr>`).join('');
  }
  function renderTransactionRows(rows) {
    const body = $('#historyTable'); if (!body) return;
    if (!rows.length) return setEmpty('historyTable', 7, 'Belum ada transaksi FOUNDATION.');
    body.innerHTML = rows.map(row => `<tr><td>${safe(row.transaction_date || '—')}</td><td>${safe(row.transaction_number || '—')}</td><td>${safe(row.transaction_type || '—')}</td><td>${safe(row.description || '—')}</td><td>${money(row.total_amount)}</td><td><span class="status-pill ${row.status === 'POSTED' ? 'success' : 'warning'}">${safe(row.status || '—')}</span></td><td>${safeHref(row.evidence_url) ? `<a href="${safeHref(row.evidence_url)}" target="_blank" rel="noopener">Lihat</a>` : '—'}</td></tr>`).join('');
  }
  function renderOptions(select, rows, valueKey, labelFn, placeholder) {
    if (!select) return;
    select.innerHTML = `<option value="">${safe(placeholder)}</option>` + rows.map(row => `<option value="${safe(row[valueKey])}">${safe(labelFn(row))}</option>`).join('');
  }
  async function loadProfile() {
    setBackendStatus('is-checking', 'Memeriksa sesi');
    const profile = await request(API.me);
   const user = profile?.user || profile;

const roles = Array.isArray(profile?.roles)
  ? profile.roles
  : Array.isArray(user.roles)
    ? user.roles
    : user.role
      ? [user.role]
      : [];

const roleCodes = [
  ...roles.map(role =>
    typeof role === 'string'
      ? role
      : role?.role_code || role?.code
  ),
  user.role_code
].filter(Boolean).map(code => String(code).toUpperCase());
    if (!roleCodes.includes('BENDAHARA')) throw new Error('Akun ini tidak memiliki role BENDAHARA. Akses ditolak.');
    state.profile = user;
    const name = user.full_name || user.name || 'Bendahara Yayasan';
    ['userName', 'topUserName', 'accountName'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = name; });
    setBackendStatus('is-connected', 'Sesi terhubung');
    return user;
  }
  async function loadDashboard() {
    const data = await request(API.dashboard);
    state.dashboard = data;
    const values = data.metrics || data;
    $$('[data-metric]').forEach(el => { const key = el.dataset.metric; if (Object.prototype.hasOwnProperty.call(values, key)) el.textContent = money(values[key]); });
    return data;
  }
  async function loadFee() {
    const data = await request(API.feePayments);
    state.feePayments = data.items || data.results || data || [];
    renderFeeRows(state.feePayments);
  }
  async function loadAccounts() {
    const [accounts, cash] = await Promise.all([request(API.accounts), request(API.cashBankAccounts)]);
    state.accounts = accounts.items || accounts || [];
    state.cashBankAccounts = cash.accounts || cash.items || [];
    const incomeSelect = $('#incomeForm select[name="account_id"]');
    const expenseCoa = $('#expenseForm select[name="category_account_id"]');
    const expenseCash = $('#expenseForm select[name="cash_bank_account_id"]');
    renderOptions(incomeSelect, state.accounts.filter(a => a.account_type === 'INCOME' || a.account_type === 'ASSET'), 'id', a => `${a.account_code} · ${a.account_name}`, 'Pilih akun FOUNDATION');
    renderOptions(expenseCoa, state.accounts.filter(a => a.account_type === 'EXPENSE'), 'id', a => `${a.account_code} · ${a.account_name}`, 'Pilih akun beban FOUNDATION');
    renderOptions(expenseCash, state.cashBankAccounts, 'id', a => a.account_name, 'Pilih kas/bank FOUNDATION');
  }
  async function loadCashBankAccounts() {
  const [accountResponse, cashResponse] = await Promise.all([
    request(API.accounts),
    request(API.cashBankAccounts)
  ]);

  state.accounts = accountResponse.items || accountResponse || [];
  state.cashBankAccounts =
    cashResponse.accounts ||
    cashResponse.items ||
    [];

  const coaSelect = $('#cashBank-coa');

  renderOptions(
    coaSelect,
    state.accounts.filter(a => a.account_type === 'ASSET'),
    'id',
    a => `${a.account_code} · ${a.account_name}`,
    'Pilih akun aset FOUNDATION'
  );

  const body = $('#cashBankTable');

  if (!body) return;

  if (!state.cashBankAccounts.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          Belum ada rekening kas/bank terdaftar.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML = state.cashBankAccounts.map(row => `
    <tr>
      <td>${safe(row.account_name || '—')}</td>
      <td>${safe(row.account_type || '—')}</td>
      <td>${safe(row.bank_name || '—')}</td>
      <td>${row.account_number_last4
        ? '•••• ' + safe(row.account_number_last4)
        : '—'}</td>
      <td>${safe(row.coa_account_name || row.account_id || '—')}</td>
      <td>
        <span class="status-pill ${Number(row.is_active) === 1 ? 'success' : 'danger'}">
          ${Number(row.is_active) === 1 ? 'AKTIF' : 'NONAKTIF'}
        </span>
      </td>
    </tr>
  `).join('');
} 
  async function loadWithdrawals() {
    const data = await request(API.withdrawals);
    state.withdrawals = data.items || data || [];
    renderWithdrawalRows(state.withdrawals);
  }
  async function loadTransactions() {
    const query = new URLSearchParams();
    ['historySearch','historyFrom','historyTo','historyType'].forEach(id => { const el = $('#'+id); if (el?.value) query.set(({historySearch:'search',historyFrom:'date_from',historyTo:'date_to',historyType:'type'})[id], el.value); });
    const data = await request(`${API.transactions}${query.size ? `?${query}` : ''}`);
    state.transactions = data.items || data || [];
    renderTransactionRows(state.transactions);
  }
  async function loadNotifications() {
    const data = await request(API.notifications);
    state.notifications = data.items || data || [];
    const panel = $('[data-panel="notifications"] .surface-card');
    if (!panel) return;
    const list = state.notifications.length ? `<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Notifikasi</th><th>Status</th></tr></thead><tbody>${state.notifications.map(n => `<tr><td>${safe(n.created_at || '—')}</td><td>${safe(n.title || n.message || '—')}</td><td>${safe(n.status || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Belum ada notifikasi</strong><p>Notifikasi Bendahara akan tampil di sini.</p></div>';
    const old = $('#notificationList'); if (old) old.outerHTML = `<div id="notificationList">${list}</div>`;
    else panel.insertAdjacentHTML('beforeend', `<div id="notificationList">${list}</div>`);
  }
  async function loadPageData(page) {
    if (!state.profile) return;
    const jobs = { 
      overview: [loadDashboard],
      fee: [loadFee],
      income: [loadAccounts],
      expense: [loadAccounts],
      cashBank: [loadCashBankAccounts],
      withdrawals: [loadWithdrawals],
      history: [loadTransactions],
      notifications: [loadNotifications] }[page] || [];
    const results = await Promise.allSettled(jobs.map(job => job()));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) console.info(`Data halaman ${page} belum tersedia:`, failed.reason?.message || failed.reason);
  }
  async function submitEntry(event, type) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type="submit"]');
    const endpoint = type === 'income' ? API.income : API.expense;
    const formData = new FormData(form);
    const payload = Object.fromEntries([...formData.entries()].filter(([key, value]) => key !== 'evidence' && !(value instanceof File)));
    const file = formData.get('evidence');
    submit.disabled = true;
    try {
      let body = payload;
      if (file instanceof File && file.size) {
        const upload = new FormData();
        Object.entries(payload).forEach(([key,value]) => upload.append(key,value));
        upload.append('evidence', file);
        body = upload;
      }
      await request(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
      toast('Transaksi berhasil dikirim dan disimpan.');
      form.reset();
      await loadTransactions();
    } catch (error) { toast(error.message); }
    finally { submit.disabled = false; }
  }
  async function submitCashBank(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) return;

  const submit = form.querySelector('[type="submit"]');
  const formData = new FormData(form);

  const payload = Object.fromEntries(formData.entries());
  delete payload.id;

  submit.disabled = true;

  try {
    await request(API.cashBankAccounts, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    toast('Rekening kas/bank berhasil disimpan.');

    form.reset();

    await loadCashBankAccounts();

  } catch (error) {
    toast(error.message);
  } finally {
    submit.disabled = false;
  }
}
  
  async function confirmFee(id) {
    const actual = window.prompt('Masukkan nominal yang benar-benar diterima Yayasan (angka Rupiah):');
    if (actual === null) return;
    const amount = Number(actual);
    if (!Number.isSafeInteger(amount) || amount <= 0) return toast('Nominal penerimaan tidak valid.');
    const daysText = window.prompt('Masukkan jumlah hari yang dikonfirmasi untuk kredit saldo pribadi:');
    if (daysText === null) return;
    const days = Number(daysText);
    if (!Number.isSafeInteger(days) || days <= 0) return toast('Jumlah hari tidak valid.');
    try { await request(API.verifyFee(id), { method:'POST', body:JSON.stringify({ received_amount:amount, confirmed_days:days }) }); toast('Verifikasi Fee berhasil dikirim.'); await loadFee(); await loadDashboard(); }
    catch (error) { toast(error.message); }
  }
  async function confirmWithdrawal(id) {
    const file = document.createElement('input'); file.type='file'; file.accept='image/*,.pdf'; file.click();
    file.addEventListener('change', async () => {
      if (!file.files?.[0]) return;
      const form = new FormData(); form.append('evidence', file.files[0]);
      try { await request(API.confirmWithdrawal(id), { method:'POST', body:form }); toast('Konfirmasi transfer berhasil dikirim.'); await loadWithdrawals(); await loadTransactions(); await loadDashboard(); }
      catch (error) { toast(error.message); }
    }, { once:true });
  }
  async function loadReport() {
    const kind = $('#reportKind')?.value;
    const from = $('#reportFrom')?.value;
    const to = $('#reportTo')?.value;
    if (!kind || !to) return toast('Pilih jenis laporan dan tanggal akhir.');
    try {
      const params = new URLSearchParams({ report_type:kind, date_to:to }); if (from) params.set('date_from',from);
      const result = await request(`${API.reports}?${params}`);
      const box = $('[data-panel="reports"] .empty-state');
      if (box) box.innerHTML = `<div class="empty-icon">▥</div><strong>Laporan berhasil dimuat</strong><p>${safe(result.report_title || kind)} · ${safe(result.period_label || `${from || 'Awal periode'} s.d. ${to}`)}</p>${safeHref(result.document_url) ? `<p><a href="${safeHref(result.document_url)}" target="_blank" rel="noopener">Buka dokumen laporan</a></p>` : ''}`;
    } catch (error) { toast(error.message); }
  }
  async function logout() {
    const token = authToken();
    try { if (token) await fetch(`${API_BASE}/api/auth/logout`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, keepalive:true }); }
    finally { localStorage.removeItem('sppg_auth_token'); sessionStorage.removeItem('sppg_auth_token'); window.location.replace('./index.html'); }
  }
  function bindEvents() {
    $$('.nav-item[data-page]').forEach(button => button.addEventListener('click', () => renderPage(button.dataset.page)));
    $$('[data-navigate]').forEach(button => button.addEventListener('click', () => renderPage(button.dataset.navigate)));
    $('#refreshButton')?.addEventListener('click', async () => { try { await loadProfile(); await loadPageData(state.currentPage); toast('Data diperbarui.'); } catch(error) { setBackendStatus('is-failed','Gagal terhubung'); toast(error.message); } });
    $('#logoutButton')?.addEventListener('click', logout);
    $('#menuToggle')?.addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#sidebarBackdrop').classList.add('show'); });
    $('#sidebarClose')?.addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); });
    $('#sidebarBackdrop')?.addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); });
    $('#incomeForm')?.addEventListener('submit', event => submitEntry(event,'income'));
    $('#expenseForm')?.addEventListener('submit', event => submitEntry(event,'expense'));
    $('#cashBankForm')?.addEventListener('submit', submitCashBank);
    $('#refreshCashBank')?.addEventListener('click', () => {loadCashBankAccounts().catch(error => toast(error.message)); });
    $('#previewReport')?.addEventListener('click', loadReport);
    $('#exportReport')?.addEventListener('click', loadReport);
    $('#feeTable')?.addEventListener('click', event => { const button=event.target.closest('[data-fee-verify]'); if(button) confirmFee(button.dataset.feeVerify); });
    $('#withdrawTable')?.addEventListener('click', event => { const button=event.target.closest('[data-withdraw-confirm]'); if(button) confirmWithdrawal(button.dataset.withdrawConfirm); });
    $('#historySearch')?.addEventListener('keydown', event => { if(event.key==='Enter') loadTransactions().catch(e=>toast(e.message)); });
    ['historyFrom','historyTo','historyType'].forEach(id => $('#'+id)?.addEventListener('change', () => loadTransactions().catch(e=>toast(e.message))));
    window.addEventListener('popstate', event => { if(event.state?.bendahara) renderPage(event.state.page,false); });
  }
  async function init() {
    const date = $('#currentDate');
    if (date) date.textContent = new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
    bindEvents();
    try { await loadProfile(); await loadPageData('overview'); }
    catch (error) { setBackendStatus('is-failed','Belum terhubung'); console.warn('Dashboard Bendahara:',error.message); toast(error.message); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();

