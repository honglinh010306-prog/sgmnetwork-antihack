lucide.createIcons();

const reportData = {
  game: {
    kicker: 'BÁO CÁO TRONG GAME',
    title: 'Người chơi vi phạm',
    description: 'Bạn vừa bắt gặp một người chơi sử dụng phần mềm gian lận? Hãy cung cấp thông tin để chúng tôi kiểm tra nhanh chóng.',
    idLabel: 'UID tài khoản vi phạm',
    idPlaceholder: 'Nhập UID tài khoản vi phạm',
    idHint: 'UID của người chơi bị báo cáo',
    categoryLabel: 'Loại vi phạm',
    categoryPlaceholder: 'Chọn hành vi bạn quan sát được'
  },
  social: {
    kicker: 'BÁO CÁO MẠNG XÃ HỘI',
    title: 'Nội dung đáng ngờ',
    description: 'Phát hiện tài khoản hoặc nội dung quảng bá hack / cheat? Hãy gửi thông tin để chúng tôi xem xét.',
    idLabel: 'Đường dẫn bài đăng',
    idPlaceholder: 'Dán đường dẫn bài đăng hoặc tài khoản',
    idHint: 'Liên kết công khai giúp việc xác minh nhanh hơn',
    categoryLabel: 'Nền tảng & loại nội dung',
    categoryPlaceholder: 'Chọn nền tảng bạn phát hiện'
  }
};

const tabs = document.querySelectorAll('.report-tab');
const title = document.querySelector('#form-title');
const kicker = document.querySelector('#form-kicker');
const description = document.querySelector('#form-description');
const idLabel = document.querySelector('label[for="player-id"]');
const idInput = document.querySelector('input[name="playerId"]');
const playerNameField = document.querySelector('#player-name-field');
const playerNameInput = document.querySelector('input[name="playerName"]');
const reporterUidField = document.querySelector('#reporter-uid-field');
const reporterUidInput = document.querySelector('input[name="reporterUid"]');
const violatingUidField = document.querySelector('#violating-uid-field');
const occurredAtInput = document.querySelector('input[name="occurredAt"]');
const occurredAtHint = document.querySelector('#occurred-at-hint');
const idHint = idInput.parentElement.querySelector('small');
const categoryLabel = document.querySelector('label[for="category"]');
const categorySelect = document.querySelector('select[name="category"]');
const customCategoryField = document.querySelector('#custom-category-field');
const customCategoryInput = document.querySelector('input[name="categoryOther"]');
const evidence = document.querySelector('#evidence');
const form = document.querySelector('#report-form');
const toast = document.querySelector('.toast');
const accountButton = document.querySelector('.avatar');
const lookupForm = document.querySelector('#lookup-form');
const lookupName = document.querySelector('#lookup-name');
const lookupUid = document.querySelector('#lookup-uid');
const lookupResult = document.querySelector('#lookup-result');
const notificationWrap = document.querySelector('#notification-wrap');
const notificationButton = document.querySelector('#notification-button');
const notificationPanel = document.querySelector('#notification-panel');
const notificationList = document.querySelector('#notification-list');
const notificationCount = document.querySelector('#notification-count');
const importantAnnouncement = document.querySelector('#important-announcement');
const announcementLabelView = document.querySelector('#announcement-label-view');
const announcementContentView = document.querySelector('#announcement-content-view');
const announcementLinkView = document.querySelector('#announcement-link-view');
const publicTotalCount = document.querySelector('#public-total-count');
const publicApprovedCount = document.querySelector('#public-approved-count');
const publicReviewCount = document.querySelector('#public-review-count');
const publicGameCount = document.querySelector('#public-game-count');
const publicSocialCount = document.querySelector('#public-social-count');
const publicRankingList = document.querySelector('#public-ranking-list');
let activeReportType = 'game';
const notificationSeenKey = 'ff_antihack_seen_replies';
const announcementStorageKey = 'ff_antihack_announcement';
function getLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function updateOccurredAt() {
  const now = new Date();
  occurredAtInput.value = getLocalDateTime();
  occurredAtHint.textContent = `Tự động cập nhật: ${now.toLocaleTimeString('vi-VN')}`;
}

const readEvidence = (file) => new Promise((resolve) => {
  if (!file || file.size > 8 * 1024 * 1024) {
    resolve({ data: '', type: file?.type || '' });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve({ data: reader.result, type: file.type });
  reader.onerror = () => resolve({ data: '', type: file.type });
  reader.readAsDataURL(file);
});
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
let reportCache = window.ReportStore ? window.ReportStore.localReports() : [];
const readReports = () => reportCache;
async function refreshReports() {
  if (!window.ReportStore) return;
  reportCache = await window.ReportStore.getReports();
  renderPublicOverview();
  renderNotifications();
}
const readSeenReplies = () => JSON.parse(localStorage.getItem(notificationSeenKey) || '[]');

function renderPublicOverview() {
  const reports = readReports();
  publicTotalCount.textContent = reports.length;
  publicApprovedCount.textContent = reports.filter((report) => report.status === 'Đã duyệt').length;
  publicReviewCount.textContent = reports.filter((report) => report.status === 'Đang kiểm tra').length;
  publicGameCount.textContent = reports.filter((report) => report.type === 'game').length;
  publicSocialCount.textContent = reports.filter((report) => report.type === 'social').length;
  const categories = reports.reduce((summary, report) => {
    if (!report.category) return summary;
    summary[report.category] = (summary[report.category] || 0) + 1;
    return summary;
  }, {});
  const ranking = Object.entries(categories).sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0])).slice(0, 3);
  publicRankingList.innerHTML = ranking.length ? ranking.map(([category, count], index) => `<div class="public-ranking-item"><span>${String(index + 1).padStart(2, '0')}</span><strong title="${escapeHtml(category)}">${escapeHtml(category)}</strong><small>${count} báo cáo</small></div>`).join('') : '<span class="public-ranking-empty">Chưa có dữ liệu xếp hạng.</span>';
}
const processStages = ['Mới', 'Đang kiểm tra', 'Đã duyệt', 'Đã xử lý'];

function formatProcessTime(value) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Đang chờ';
}

function renderLookupReport(report) {
  lookupResult.hidden = false;
  if (!report) {
    lookupResult.innerHTML = '<strong class="lookup-empty">Không tìm thấy báo cáo</strong><small>Vui lòng kiểm tra lại Họ và tên cùng UID ingame.</small>';
    return;
  }
  const history = report.statusHistory || [{ status: report.status, at: report.createdAt }];
  const historyMap = Object.fromEntries(history.map((item) => [item.status, item.at]));
  const currentIndex = processStages.indexOf(report.status);
  const timeline = processStages.map((stage, index) => {
    const completed = historyMap[stage] || (currentIndex >= index ? report.createdAt : '');
    const active = stage === report.status;
    return `<li class="process-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}"><span class="process-dot"></span><div><strong>${stage === 'Mới' ? 'Tiếp nhận' : stage}</strong><small>${completed ? formatProcessTime(completed) : 'Đang chờ'}</small></div></li>`;
  }).join('');
  lookupResult.innerHTML = `<strong>Trạng thái hiện tại: ${escapeHtml(report.status)}</strong><small>Báo cáo đang được đội ngũ Anti-Hack theo dõi và xử lý.</small><ol class="process-timeline">${timeline}</ol>${report.reply ? `<small class="lookup-reply"><b>Phản hồi chính thức:</b><br>${escapeHtml(report.reply)}</small>` : '<small>Chưa có phản hồi mới. Bạn có thể kiểm tra lại sau.</small>'}`;
}

function renderAnnouncement() {
  const announcement = JSON.parse(localStorage.getItem(announcementStorageKey) || 'null');
  if (!announcement?.active || !announcement.heading || !announcement.content) {
    importantAnnouncement.hidden = true;
    return;
  }
  importantAnnouncement.hidden = false;
  announcementLabelView.textContent = `${announcement.label} · ${announcement.heading}`;
  announcementContentView.textContent = announcement.content;
  if (announcement.link) {
    announcementLinkView.hidden = false;
    announcementLinkView.href = announcement.link;
  } else {
    announcementLinkView.hidden = true;
  }
}

function renderNotifications() {
  const reports = readReports().filter((report) => report.reply && report.type === 'game' && report.playerName && report.target);
  const seen = readSeenReplies();
  const unread = reports.filter((report) => !seen.includes(report.id));
  notificationWrap.classList.toggle('has-unread', unread.length > 0);
  notificationCount.textContent = unread.length ? `${unread.length} mới` : 'Đã xem hết';
  notificationList.innerHTML = reports.length
    ? reports.map((report) => `<button class="notification-item" type="button" data-report-id="${escapeHtml(report.id)}"><strong>${escapeHtml(report.id)} · ${escapeHtml(report.status)}</strong><small>${escapeHtml(report.reply)}</small></button>`).join('')
    : '<div class="notification-empty">Chưa có phản hồi mới.</div>';
  notificationList.querySelectorAll('.notification-item').forEach((item) => item.addEventListener('click', () => {
    const id = item.dataset.reportId;
    const report = readReports().find((item) => item.id === id);
    if (!report) return;
    lookupName.value = report.playerName || '';
    lookupUid.value = report.reporterUid || '';
    lookupForm.dispatchEvent(new Event('submit', { cancelable: true }));
    document.querySelector('#lookup').scrollIntoView({ behavior: 'smooth' });
    notificationPanel.hidden = true;
    notificationButton.setAttribute('aria-expanded', 'false');
    localStorage.setItem(notificationSeenKey, JSON.stringify([...new Set([...readSeenReplies(), id])]));
    renderNotifications();
  }));
}

function setReportType(type) {
  const data = reportData[type];
  activeReportType = type;
  tabs.forEach((tab) => {
    const active = tab.dataset.report === type;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  kicker.textContent = data.kicker;
  title.textContent = data.title;
  description.textContent = data.description;
  idInput.previousElementSibling.innerHTML = `${data.idLabel} <b>*</b>`;
  idInput.placeholder = data.idPlaceholder;
  idHint.textContent = data.idHint;
  const isGameReport = type === 'game';
  playerNameField.hidden = !isGameReport;
  playerNameInput.required = isGameReport;
  reporterUidField.hidden = !isGameReport;
  reporterUidInput.required = isGameReport;
  violatingUidField.hidden = false;
  idInput.required = true;
  categorySelect.previousElementSibling.innerHTML = `${data.categoryLabel} <b>*</b>`;
  categorySelect.innerHTML = type === 'game'
    ? '<option value="">Chọn hành vi bạn quan sát được</option><option>Auto aim / Aim bot</option><option>Wall hack / Nhìn xuyên tường</option><option>Speed hack / Di chuyển bất thường</option><option>Tên phản cảm</option><option>Khác</option>'
    : '<option value="">Chọn lý do báo cáo</option><option>Lừa đảo nạp kim cương/Web nạp không chính thống.</option><option>Hack/mode chia sẻ &amp; quảng bá trên mạng xã hội.</option><option>Nội dung phản cảm/Đú trend khiêu dâm.</option><option>Live stream kéo rank/ phá game bằng hack.</option><option>Giả mạo KOL trong các hành vi quảng bá vi phạm pháp luật hoặc dùng AI để quảng bá hack/cheat.</option><option>Giả mạo nhà phát hành game, đưa tin sai sự thực lùa gà người chơi.</option><option>Giả mạo Lý Tiểu Đông nhà sáng lập SEA, Shoppe, Garena đưa thông tin sai sự thực.</option><option>Khác</option>';
  form.reset();
  updateOccurredAt();
  toggleCustomCategory();
}

function toggleCustomCategory() {
  const isCustom = categorySelect.value === 'Khác';
  customCategoryField.hidden = !isCustom;
  customCategoryInput.required = isCustom;
  if (!isCustom) customCategoryInput.value = '';
}

tabs.forEach((tab) => tab.addEventListener('click', () => setReportType(tab.dataset.report)));
categorySelect.addEventListener('change', toggleCustomCategory);
evidence.addEventListener('change', () => {
  const label = evidence.closest('.upload-button').querySelector('span');
  label.textContent = evidence.files[0] ? evidence.files[0].name : 'Chọn tệp';
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!evidence.files.length) {
    evidence.reportValidity();
    return;
  }
  updateOccurredAt();
  const formData = new FormData(form);
  const evidenceFile = evidence.files[0];
  const evidenceContent = await readEvidence(evidenceFile);
  const selectedCategory = categorySelect.value === 'Khác' ? formData.get('categoryOther').trim() : formData.get('category');
  const reports = JSON.parse(localStorage.getItem('ff_antihack_reports') || '[]');
  const createdAt = new Date().toISOString();
  reports.unshift({
    id: `FF-${Date.now().toString(36).toUpperCase()}`,
    type: activeReportType,
    playerName: formData.get('playerName') || '',
    reporterUid: formData.get('reporterUid') || '',
    target: formData.get('playerId'),
    occurredAt: formData.get('occurredAt'),
    category: selectedCategory,
    description: formData.get('description'),
    evidenceName: evidenceFile?.name || '',
    evidenceData: evidenceContent.data,
    evidenceType: evidenceContent.type,
    status: 'Mới',
    statusHistory: [{ status: 'Mới', at: createdAt }],
    createdAt
  });
  reportCache = reports;
  if (window.ReportStore) {
    const result = await window.ReportStore.saveReport(reports[0]);
    if (result.error) console.warn('Không đồng bộ được Supabase:', result.error.message);
  } else localStorage.setItem('ff_antihack_reports', JSON.stringify(reports));
  renderPublicOverview();
  renderNotifications();
  toast.querySelector('strong').textContent = 'Đã tiếp nhận báo cáo';
  toast.querySelector('small').textContent = `Mã tra cứu: ${reports[0].id}`;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 4200);
  form.reset();
  updateOccurredAt();
  evidence.closest('.upload-button').querySelector('span').textContent = 'Chọn tệp';
});
document.querySelector('.toast button').addEventListener('click', () => toast.classList.remove('show'));
accountButton.addEventListener('click', () => {
  toast.querySelector('strong').textContent = 'TÍNH NĂNG ĐANG PHÁT TRIỂN';
  toast.querySelector('small').textContent = 'Tính năng tạo tài khoản sẽ sớm được cập nhật.';
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 4200);
});

lookupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = lookupName.value.trim().toLowerCase();
  const uid = lookupUid.value.trim().toLowerCase();
  const report = readReports().find((item) => item.type === 'game' && item.playerName?.trim().toLowerCase() === name && item.reporterUid?.trim().toLowerCase() === uid);
  renderLookupReport(report);
});

notificationButton.addEventListener('click', () => {
  notificationPanel.hidden = !notificationPanel.hidden;
  notificationButton.setAttribute('aria-expanded', String(!notificationPanel.hidden));
});
document.addEventListener('click', (event) => {
  if (!notificationWrap.contains(event.target)) {
    notificationPanel.hidden = true;
    notificationButton.setAttribute('aria-expanded', 'false');
  }
});
window.addEventListener('storage', renderNotifications);
window.addEventListener('storage', renderAnnouncement);
window.addEventListener('storage', (event) => { if (event.key === 'ff_antihack_reports') renderPublicOverview(); });
window.addEventListener('storage', (event) => {
  if (event.key !== 'ff_antihack_reports' || !lookupName.value || !lookupUid.value) return;
  const name = lookupName.value.trim().toLowerCase();
  const uid = lookupUid.value.trim().toLowerCase();
  renderLookupReport(readReports().find((item) => item.type === 'game' && item.playerName?.trim().toLowerCase() === name && item.reporterUid?.trim().toLowerCase() === uid));
});
renderNotifications();
renderAnnouncement();
renderPublicOverview();
updateOccurredAt();
window.setInterval(updateOccurredAt, 1000);
refreshReports();
window.setInterval(refreshReports, 5000);

document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('selectstart', (event) => event.preventDefault());
document.addEventListener('dragstart', (event) => event.preventDefault());
document.addEventListener('copy', (event) => event.preventDefault());
document.addEventListener('cut', (event) => event.preventDefault());
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const devToolsShortcut = event.key === 'F12'
    || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key))
    || (event.ctrlKey && key === 'u');
  if (devToolsShortcut) {
    event.preventDefault();
    event.stopPropagation();
  }
});
