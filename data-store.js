const reportStorageKey = 'ff_antihack_reports';
const supabaseDataReady = Boolean(window.supabase?.createClient && window.SUPABASE_CONFIG?.url && !window.SUPABASE_CONFIG.url.includes('YOUR_') && window.SUPABASE_CONFIG?.anonKey && !window.SUPABASE_CONFIG.anonKey.includes('YOUR_'));
const reportSupabase = supabaseDataReady ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey) : null;
window.SharedSupabaseClient = reportSupabase;

function localReports() {
  return JSON.parse(localStorage.getItem(reportStorageKey) || '[]');
}

async function getReports() {
  if (!reportSupabase) return localReports();
  const { data, error } = await reportSupabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn('Supabase reports unavailable, using local fallback:', error.message);
    return localReports();
  }
  const remoteReports = data.map((report) => ({
    ...report,
    id: report.report_code || report.id,
    playerName: report.player_name || '',
    reporterUid: report.reporter_uid || '',
    target: report.target || '',
    occurredAt: report.occurred_at,
    evidenceName: report.evidence_name || '',
    evidenceData: report.evidence_data || '',
    evidenceType: report.evidence_type || '',
    statusHistory: report.status_history || [{ status: report.status, at: report.created_at }],
    createdAt: report.created_at
  }));
  const remoteIds = new Set(remoteReports.map((report) => report.id));
  const pendingLocal = localReports().filter((report) => !remoteIds.has(report.id));
  if (pendingLocal.length) {
    await Promise.all(pendingLocal.map((report) => reportSupabase.from('reports').insert({
      report_code: report.id,
      type: report.type,
      player_name: report.playerName || '',
      reporter_uid: report.reporterUid || '',
      target: report.target || '',
      occurred_at: report.occurredAt,
      category: report.category || 'Khác',
      description: report.description || '',
      evidence_name: report.evidenceName || '',
      evidence_data: report.evidenceData || '',
      evidence_type: report.evidenceType || '',
      status: report.status || 'Mới',
      status_history: report.statusHistory || [],
      created_at: report.createdAt || new Date().toISOString()
    })));
  }
  return [...remoteReports, ...pendingLocal];
}

async function saveReport(report) {
  const reports = localReports();
  reports.unshift(report);
  localStorage.setItem(reportStorageKey, JSON.stringify(reports));
  if (!reportSupabase) return { data: report, error: null };
  const { data, error } = await reportSupabase.from('reports').insert({
    report_code: report.id,
    type: report.type,
    player_name: report.playerName,
    reporter_uid: report.reporterUid,
    target: report.target,
    occurred_at: report.occurredAt,
    category: report.category,
    description: report.description,
    evidence_name: report.evidenceName,
    evidence_data: report.evidenceData,
    evidence_type: report.evidenceType,
    status: report.status,
    status_history: report.statusHistory,
    created_at: report.createdAt
  }).select().single();
  return { data, error };
}

async function updateReport(id, changes) {
  const reports = localReports().map((report) => report.id === id ? { ...report, ...changes } : report);
  localStorage.setItem(reportStorageKey, JSON.stringify(reports));
  if (!reportSupabase) return { data: changes, error: null };
  const { data, error } = await reportSupabase.from('reports').update({
    status: changes.status,
    status_history: changes.statusHistory,
    reply: changes.reply,
    replied_at: changes.repliedAt
  }).eq('report_code', id).select().single();
  return { data, error };
}

window.ReportStore = { getReports, saveReport, updateReport, localReports, reportSupabase };
