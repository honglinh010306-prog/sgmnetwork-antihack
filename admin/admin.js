const storageKey = 'ff_antihack_reports';
const body = document.querySelector('#reports-body');
const emptyState = document.querySelector('#empty-state');
const statusFilter = document.querySelector('#status-filter');
const modal = document.querySelector('#report-modal');
const detailContent = document.querySelector('#detail-content');
const replyInput = document.querySelector('#reply-input');
const replyTemplate = document.querySelector('#reply-template');
const replySaved = document.querySelector('#reply-saved');
const authPanel = document.querySelector('#auth-panel');
const adminMain = document.querySelector('#admin-main');
const authForm = document.querySelector('#auth-form');
const authError = document.querySelector('#auth-error');
const logoutButton = document.querySelector('#logout-button');
const cylinderChart = document.querySelector('#cylinder-chart');
const rankingList = document.querySelector('#ranking-list');
const reporterRankingList = document.querySelector('#reporter-ranking-list');
const announcementForm = document.querySelector('#announcement-form');
const announcementHeading = document.querySelector('#announcement-heading');
const announcementLabel = document.querySelector('#announcement-label');
const announcementContent = document.querySelector('#announcement-content');
const announcementLink = document.querySelector('#announcement-link');
const announcementActive = document.querySelector('#announcement-active');
const announcementMessage = document.querySelector('#announcement-message');
const announcementStorageKey = 'ff_antihack_announcement';
let activeReportId = '';
const supabaseReady = Boolean(window.supabase?.createClient && window.SUPABASE_CONFIG?.url && !window.SUPABASE_CONFIG.url.includes('YOUR_') && window.SUPABASE_CONFIG?.anonKey && !window.SUPABASE_CONFIG.anonKey.includes('YOUR_'));
const supabaseClient = supabaseReady ? (window.SharedSupabaseClient || window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey)) : null;

let reportCache = window.ReportStore ? window.ReportStore.localReports() : [];
const readReports = () => reportCache;
async function refreshReports() {
  if (!window.ReportStore) return;
  reportCache = await window.ReportStore.getReports();
  renderReports();
}
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Chưa cung cấp';
const getEvidenceMarkup = (report) => {
  if (!report.evidenceName) return '<span class="evidence-empty">Không có tệp đính kèm</span>';
  if (!report.evidenceData) return `<span class="evidence-empty">${escapeHtml(report.evidenceName)} - chưa có dữ liệu xem trước</span>`;
  if (report.evidenceType.startsWith('image/')) return `<span>${escapeHtml(report.evidenceName)}</span><img class="evidence-preview" src="${report.evidenceData}" alt="Bằng chứng ${escapeHtml(report.evidenceName)}">`;
  if (report.evidenceType.startsWith('video/')) return `<span>${escapeHtml(report.evidenceName)}</span><video class="evidence-preview evidence-video" src="${report.evidenceData}" controls></video>`;
  return `<span>${escapeHtml(report.evidenceName)}</span>`;
};
function loadAnnouncement() {
  const announcement = JSON.parse(localStorage.getItem(announcementStorageKey) || 'null');
  if (!announcement) return;
  announcementHeading.value = announcement.heading || '';
  announcementLabel.value = announcement.label || 'THÔNG BÁO QUAN TRỌNG';
  announcementContent.value = announcement.content || '';
  announcementLink.value = announcement.link || '';
  announcementActive.checked = Boolean(announcement.active);
}
function setAuthenticated(isAuthenticated) {
  authPanel.hidden = isAuthenticated;
  adminMain.hidden = !isAuthenticated;
  logoutButton.hidden = !isAuthenticated;
  if (isAuthenticated) renderReports();
  if (isAuthenticated) refreshReports();
}

async function handleAuth(event) {
  event.preventDefault();
  if (!supabaseClient) {
    authError.textContent = 'Chưa cấu hình Supabase. Hãy cập nhật supabase-config.js.';
    return;
  }
  const username = document.querySelector('#admin-username').value.trim();
  const password = document.querySelector('#admin-password').value;
  const result = await supabaseClient.auth.signInWithPassword({ email: username, password });
  if (result.error) {
    authError.textContent = result.error.message.includes('Invalid login credentials')
      ? 'Email hoặc mật khẩu không đúng, hoặc tài khoản chưa xác nhận email.'
      : `Đăng nhập thất bại: ${result.error.message}`;
    return;
  }
  authForm.reset();
  setAuthenticated(true);
}

function renderStats(reports) {
  document.querySelector('#total-count').textContent = reports.length;
  document.querySelector('#new-count').textContent = reports.filter((report) => report.status === 'Mới').length;
  document.querySelector('#approved-count').textContent = reports.filter((report) => report.status === 'Đã duyệt').length;
  document.querySelector('#game-count').textContent = reports.filter((report) => report.type === 'game').length;
  document.querySelector('#social-count').textContent = reports.filter((report) => report.type === 'social').length;
  renderAnalytics(reports);
}

function renderAnalytics(reports) {
  const values = [
    { label: 'Tổng', value: reports.length },
    { label: 'Trong game', value: reports.filter((report) => report.type === 'game').length },
    { label: 'Mạng xã hội', value: reports.filter((report) => report.type === 'social').length },
    { label: 'Đã duyệt', value: reports.filter((report) => report.status === 'Đã duyệt').length }
  ];
  const maxValue = Math.max(...values.map((item) => item.value), 1);
  cylinderChart.innerHTML = values.map((item) => `<div class="cylinder-item"><span class="cylinder-value">${item.value}</span><div class="cylinder-track"><div class="cylinder-bar" style="height:${Math.max(item.value ? (item.value / maxValue) * 100 : 0, item.value ? 8 : 0)}%"></div></div><span class="cylinder-label">${item.label}</span></div>`).join('');

  const users = reports.filter((report) => report.type === 'game' && report.target).reduce((summary, report) => {
    const key = report.target.trim();
    if (!summary[key]) summary[key] = { uid: key, name: report.playerName || 'Chưa cung cấp', count: 0 };
    summary[key].count += 1;
    return summary;
  }, {});
  const ranking = Object.values(users).sort((first, second) => second.count - first.count || first.uid.localeCompare(second.uid)).slice(0, 5);
  rankingList.innerHTML = ranking.length ? ranking.map((user, index) => `<div class="ranking-row"><span class="ranking-number">${String(index + 1).padStart(2, '0')}</span><div class="ranking-user"><strong>${escapeHtml(user.uid)}</strong><small>${escapeHtml(user.name)}</small></div><span class="ranking-count">${user.count} báo cáo</span></div>`).join('') : '<div class="ranking-empty">Chưa có dữ liệu user bị báo cáo.</div>';

  const reporters = reports.filter((report) => report.type === 'game' && report.playerName).reduce((summary, report) => {
    const key = report.playerName.trim();
    if (!summary[key]) summary[key] = { name: key, uid: report.reporterUid || 'Chưa cung cấp', count: 0 };
    summary[key].count += 1;
    return summary;
  }, {});
  const reporterRanking = Object.values(reporters).sort((first, second) => second.count - first.count || first.name.localeCompare(second.name)).slice(0, 5);
  reporterRankingList.innerHTML = reporterRanking.length ? reporterRanking.map((user, index) => `<div class="ranking-row"><span class="ranking-number">${String(index + 1).padStart(2, '0')}</span><div class="ranking-user"><strong>${escapeHtml(user.name)}</strong><small>UID: ${escapeHtml(user.uid)}</small></div><span class="ranking-count">${user.count} báo cáo</span></div>`).join('') : '<div class="ranking-empty">Chưa có dữ liệu user gửi báo cáo.</div>';
}

function renderReports() {
  const reports = readReports();
  const filter = statusFilter.value;
  const visibleReports = filter === 'all' ? reports : reports.filter((report) => report.status === filter);
  renderStats(reports);
  body.innerHTML = visibleReports.map((report) => `
    <tr class="report-row" data-id="${escapeHtml(report.id)}" tabindex="0" aria-label="Mở chi tiết ${escapeHtml(report.id)}">
      <td><strong>${escapeHtml(report.id)}</strong><small>${report.evidenceName ? (report.evidenceData ? `<button class="evidence-button" type="button" data-id="${escapeHtml(report.id)}">Xem bằng chứng: ${escapeHtml(report.evidenceName)}</button>` : `Bằng chứng: ${escapeHtml(report.evidenceName)}`) : 'Không có tệp đính kèm'}</small></td>
      <td><span class="type-pill ${report.type === 'game' ? 'game' : 'social'}">${report.type === 'game' ? 'Trong game' : 'Mạng xã hội'}</span></td>
      <td><strong>${escapeHtml(report.target)}</strong><small>${escapeHtml(report.category)}</small></td>
      <td class="description">${escapeHtml(report.description)}</td>
      <td>${formatDate(report.createdAt)}<small>Sự việc: ${formatDate(report.occurredAt)}</small></td>
      <td><select class="status-select" data-id="${escapeHtml(report.id)}" aria-label="Trạng thái ${escapeHtml(report.id)}"><option ${report.status === 'Mới' ? 'selected' : ''}>Mới</option><option ${report.status === 'Đang kiểm tra' ? 'selected' : ''}>Đang kiểm tra</option><option ${report.status === 'Đã duyệt' ? 'selected' : ''}>Đã duyệt</option><option ${report.status === 'Đã xử lý' ? 'selected' : ''}>Đã xử lý</option><option ${report.status === 'Từ chối' ? 'selected' : ''}>Từ chối</option></select></td>
    </tr>`).join('');
  emptyState.hidden = visibleReports.length > 0;
  document.querySelectorAll('.status-select').forEach((select) => select.addEventListener('change', () => updateStatus(select.dataset.id, select.value)));
  document.querySelectorAll('.report-row').forEach((row) => {
    row.addEventListener('click', (event) => {
      if (event.target.closest('.status-select')) return;
      openDetails(row.dataset.id);
    });
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') openDetails(row.dataset.id);
    });
  });
  document.querySelectorAll('.evidence-button').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    openDetails(button.dataset.id);
  }));
}

function openDetails(id) {
  const report = readReports().find((item) => item.id === id);
  if (!report) return;
  activeReportId = id;
  replyInput.value = report.reply || '';
  replyTemplate.value = '';
  replySaved.textContent = report.reply ? 'Đã có phản hồi được lưu' : '';
  detailContent.innerHTML = `
    <div class="detail-item"><label>Mã báo cáo</label><p>${escapeHtml(report.id)}</p></div>
    <div class="detail-item"><label>Loại báo cáo</label><p>${report.type === 'game' ? 'Báo cáo trong game' : 'Báo cáo mạng xã hội'}</p></div>
    <div class="detail-item"><label>Đối tượng / liên kết</label><p>${escapeHtml(report.target)}</p></div>
    ${report.reporterUid ? `<div class="detail-item"><label>UID tài khoản user</label><p>${escapeHtml(report.reporterUid)}</p></div>` : ''}
    ${report.playerName ? `<div class="detail-item"><label>Họ và tên</label><p>${escapeHtml(report.playerName)}</p></div>` : ''}
    <div class="detail-item"><label>Loại vi phạm</label><p>${escapeHtml(report.category)}</p></div>
    <div class="detail-item"><label>Ngày gửi</label><p>${formatDate(report.createdAt)}</p></div>
    <div class="detail-item"><label>Thời gian sự việc</label><p>${formatDate(report.occurredAt)}</p></div>
    <div class="detail-item full"><label>Mô tả chi tiết</label><p>${escapeHtml(report.description)}</p></div>
    <div class="detail-item full"><label>Bằng chứng</label><p class="evidence-note">${getEvidenceMarkup(report)}</p></div>`;
  modal.hidden = false;
}

function closeDetails() {
  modal.hidden = true;
}

function updateStatus(id, status) {
  const reports = readReports().map((report) => {
    if (report.id !== id || report.status === status) return report;
    const statusHistory = report.statusHistory || [{ status: report.status, at: report.createdAt }];
    return { ...report, status, statusHistory: [...statusHistory, { status, at: new Date().toISOString() }] };
  });
  reportCache = reports;
  const changed = reports.find((report) => report.id === id);
  if (window.ReportStore) window.ReportStore.updateReport(id, changed);
  else localStorage.setItem(storageKey, JSON.stringify(reports));
  renderReports();
}

document.querySelector('#save-reply').addEventListener('click', () => {
  if (!activeReportId) return;
  const reply = replyInput.value.trim();
  const reports = readReports().map((report) => report.id === activeReportId ? { ...report, reply, repliedAt: reply ? new Date().toISOString() : '' } : report);
  reportCache = reports;
  const changed = reports.find((report) => report.id === activeReportId);
  if (window.ReportStore) window.ReportStore.updateReport(activeReportId, changed);
  else localStorage.setItem(storageKey, JSON.stringify(reports));
  replySaved.textContent = reply ? 'Đã lưu phản hồi' : 'Đã xóa phản hồi';
});
replyTemplate.addEventListener('change', () => {
  if (replyTemplate.value) replyInput.value = replyTemplate.value;
});

statusFilter.addEventListener('change', renderReports);
document.querySelector('#clear-reports').addEventListener('click', () => {
  if (!readReports().length || !window.confirm('Xóa toàn bộ dữ liệu báo cáo trên thiết bị này?')) return;
  localStorage.removeItem(storageKey);
  renderReports();
});
announcementForm.addEventListener('submit', (event) => {
  event.preventDefault();
  localStorage.setItem(announcementStorageKey, JSON.stringify({
    heading: announcementHeading.value.trim(),
    label: announcementLabel.value,
    content: announcementContent.value.trim(),
    link: announcementLink.value.trim(),
    active: announcementActive.checked,
    updatedAt: new Date().toISOString()
  }));
  announcementMessage.textContent = announcementActive.checked ? 'Đã hiển thị trên giao diện chính' : 'Đã lưu ở trạng thái tắt';
});
document.querySelector('#announcement-remove').addEventListener('click', () => {
  localStorage.removeItem(announcementStorageKey);
  announcementForm.reset();
  announcementMessage.textContent = 'Đã gỡ thông báo';
});
authForm.addEventListener('submit', handleAuth);
logoutButton.addEventListener('click', () => {
  if (!supabaseClient) return;
  supabaseClient.auth.signOut().then(() => {
    setAuthenticated(false);
  });
});
document.querySelector('#close-modal').addEventListener('click', closeDetails);
modal.addEventListener('click', (event) => { if (event.target === modal) closeDetails(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDetails(); });

lucide.createIcons();
if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
  supabaseClient.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
} else {
  setAuthenticated(false);
  authError.textContent = 'Chưa cấu hình Supabase. Hãy cập nhật supabase-config.js.';
}
loadAnnouncement();
window.setInterval(() => {
  if (sessionStorage.getItem('ff_antihack_admin_session') || supabaseClient) refreshReports();
}, 5000);
