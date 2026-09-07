const reportStorageKey = 'ff_antihack_reports';
const supabaseDataReady = Boolean(
  window.supabase?.createClient &&
  window.SUPABASE_CONFIG?.url &&
  !window.SUPABASE_CONFIG.url.includes('YOUR_') &&
  window.SUPABASE_CONFIG?.anonKey &&
  !window.SUPABASE_CONFIG.anonKey.includes('YOUR_')
);
const reportSupabase = supabaseDataReady
  ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey)
  : null;
window.SharedSupabaseClient = reportSupabase;

/* ── helpers ─────────────────────────────────────────── */
function localReports() {
  return JSON.parse(localStorage.getItem(reportStorageKey) || '[]');
}

function mapRow(row) {
  return {
    ...row,
    id: row.report_code || row.id,
    playerName: row.player_name || '',
    reporterUid: row.reporter_uid || '',
    target: row.target || '',
    occurredAt: row.occurred_at,
    evidenceName: row.evidence_name || '',
    evidenceData: row.evidence_data || '',
    evidenceType: row.evidence_type || '',
    statusHistory: row.status_history || [{ status: row.status, at: row.created_at }],
    createdAt: row.created_at,
  };
}

/* ── getReports ──────────────────────────────────────── */
async function getReports() {
  if (!reportSupabase) return localReports();

  const { data, error } = await reportSupabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase getReports error, using local fallback:', error.message);
    return localReports();
  }

  const remoteReports = data.map(mapRow);

  // Push any locally-queued reports that haven't reached Supabase yet
  const remoteIds = new Set(remoteReports.map((r) => r.id));
  const pendingLocal = localReports().filter((r) => !remoteIds.has(r.id));
  if (pendingLocal.length) {
    await Promise.all(pendingLocal.map((r) => _insertRow(r)));
    localStorage.removeItem(reportStorageKey);
  }

  return remoteReports;
}

/* ── saveReport ──────────────────────────────────────── */
async function saveReport(report) {
  if (!reportSupabase) {
    const queue = localReports();
    queue.unshift(report);
    localStorage.setItem(reportStorageKey, JSON.stringify(queue));
    return { data: report, error: null };
  }

  const { data, error } = await _insertRow(report);
  if (error) {
    // Queue locally so it syncs later
    const queue = localReports();
    queue.unshift(report);
    localStorage.setItem(reportStorageKey, JSON.stringify(queue));
    console.warn('Supabase saveReport failed, queued locally:', error.message);
  }
  return { data, error };
}

async function _insertRow(report) {
  return reportSupabase.from('reports').insert({
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
    created_at: report.createdAt || new Date().toISOString(),
  }).select().single();
}

/* ── updateReport ────────────────────────────────────── */
async function updateReport(id, changes) {
  // Update local cache first for instant UI feedback
  const local = localReports().map((r) =>
    r.id === id ? { ...r, ...changes } : r
  );
  localStorage.setItem(reportStorageKey, JSON.stringify(local));

  if (!reportSupabase) return { data: changes, error: null };

  const { data, error } = await reportSupabase
    .from('reports')
    .update({
      status: changes.status,
      status_history: changes.statusHistory,
      reply: changes.reply,
      replied_at: changes.repliedAt,
    })
    .eq('report_code', id)
    .select()
    .single();

  if (error) console.warn('Supabase updateReport failed:', error.message);
  return { data, error };
}

/* ── Realtime subscription ───────────────────────────── */
let _realtimeChannel = null;
function subscribeRealtime(onInsert, onUpdate) {
  if (!reportSupabase) return () => {};
  if (_realtimeChannel) {
    reportSupabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
  _realtimeChannel = reportSupabase
    .channel('reports-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
      if (typeof onInsert === 'function') onInsert(mapRow(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
      if (typeof onUpdate === 'function') onUpdate(mapRow(payload.new));
    })
    .subscribe();
  return () => {
    if (_realtimeChannel) reportSupabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  };
}

window.ReportStore = {
  getReports,
  saveReport,
  updateReport,
  localReports,
  subscribeRealtime,
  reportSupabase,
};
