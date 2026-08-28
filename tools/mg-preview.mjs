import http from 'node:http';
import { MG_HTML } from '../api/mg-ui.js';

const port = Number(process.env.MG_PREVIEW_PORT || 4180);
const now = Date.now();
const iso = (minutes) => new Date(now - minutes * 60000).toISOString();
const users = Array.from({ length: 84 }, (_, i) => ({
  id: `user-${String(i + 1).padStart(3, '0')}`,
  username: ['星河同学', '陈小北', '林知夏', '周远航', '许言'][i % 5] + (i > 4 ? i + 1 : ''),
  is_admin: false,
  created_at: iso(60000 + i * 700),
  updated_at: iso(i * 130),
  last_seen: i % 9 === 0 ? null : iso(i * 47),
  sessions: 2 + (i % 16), events: 14 + i * 3, days: 1 + (i % 21),
  exam_count: 1 + (i % 12), actual_exams: i % 10, score_rows: 3 + i * 2,
  subjects: 2 + (i % 7), feedback_count: i % 4,
  depth_score: 5 + (i % 70), depth_level: ['new', 'casual', 'returning', 'engaged', 'power'][i % 5],
}));
const events = ['app_page_view', 'exam_created', 'score_updated', 'chart_interaction', 'feedback_submitted', 'heartbeat'];
const logs = Array.from({ length: 240 }, (_, i) => ({
  id: `log-${i + 1}`, event_id: `evt-${i + 1}`, event_type: events[i % events.length], occurred_at: iso(i * 3),
  user_id: i % 4 ? users[i % users.length].id : null, visitor_id: `visitor-${String(i % 56).padStart(3, '0')}`,
  session_id: `session-${String(i % 82).padStart(3, '0')}`, app_page: ['dashboard', 'exams', 'scores', 'analytics'][i % 4],
  pathname: ['/app', '/exams', '/scores', '/analytics'][i % 4], city: ['成都', '上海', '北京', '深圳'][i % 4],
  account_mode: i % 4 ? 'account' : 'guest', app_version: `2.${i % 5}.${i % 10}`,
  user_agent: ['Windows Chrome', 'iPhone Safari', 'Android Chrome', 'Macintosh Safari'][i % 4],
  metadata: { preview: true, sequence: i + 1 },
}));
const feedback = Array.from({ length: 38 }, (_, i) => ({
  id: `feedback-${i + 1}`, created_at: iso(40 + i * 230), status: ['new', 'reviewing', 'planned', 'resolved', 'closed'][i % 5],
  feedback_type: ['bug', 'suggestion', 'experience', 'other'][i % 4], user_id: users[i % users.length].id,
  username: users[i % users.length].username, content: ['移动端成绩录入时希望键盘操作更顺畅。', '希望深度分析里增加指标解释。', '偶尔会看到图表加载较慢。', '建议增加考试记录批量整理。'][i % 4],
  page_path: ['/scores', '/analytics', '/app', '/exams'][i % 4], app_version: `2.${i % 5}.0`,
  reply_count: i % 3, attachment_count: i % 6 === 0 ? 1 : 0, admin_unread_count: i % 7 === 0 ? 1 : 0,
  needs_reply: i % 5 === 0 || i % 7 === 0,
}));
const overview = {
  generated_at: new Date(now).toISOString(), counts: { logs: 228643, visitors: 1489, sessions: 3206, users: 9132, online: 27, exams: 8222, scores: 48731, feedback: 386 },
  events_by_day: Array.from({ length: 14 }, (_, i) => ({ key: `8月${15 + i}日`, count: 760 + (i * 137) % 930 })),
  depth: ['new', 'casual', 'returning', 'engaged', 'power'].map((key, i) => ({ key, count: [1280, 2140, 1930, 1420, 860][i] })),
  events: ['浏览页面', '录入成绩', '新建考试', '查看图表', '提交反馈'].map((key, i) => ({ key, count: [12920, 3840, 2130, 1760, 386][i] })),
  pages: ['首页', '成绩管理', '考试记录', '深度分析', '设置'].map((key, i) => ({ key, count: [6820, 4920, 3260, 1890, 740][i] })),
  sources: ['直接访问', '微信', '搜索', '分享链接'].map((key, i) => ({ key, count: [2280, 760, 420, 188][i] })),
  cities: ['成都', '上海', '北京', '深圳'].map((key, i) => ({ key, count: [820, 540, 460, 330][i] })),
  devices: ['Windows', 'iOS', 'Android', 'macOS'].map((key, i) => ({ key, count: [1280, 860, 720, 410][i] })),
  versions: ['2.4.1', '2.4.0', '2.3.8'].map((key, i) => ({ key, count: [1880, 960, 420][i] })),
  feedback_types: ['功能建议', '问题反馈', '体验优化', '其他'].map((key, i) => ({ key, count: [142, 98, 83, 63][i] })),
};

function send(res, body, status = 200, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname !== '/mg') return send(res, { error: 'not_found' }, 404);
  const action = url.searchParams.get('action');
  if (!action) {
    const html = MG_HTML.replace("var TOKEN=localStorage.getItem('st_admin_token')||'';", "var TOKEN='local-preview';");
    return send(res, html, 200, 'text/html; charset=utf-8');
  }
  if (action === 'ping') return send(res, { ok: true });
  if (action === 'overview') return send(res, overview);
  if (action === 'realtime') return send(res, { rows: logs.slice(0, 90).map((x, i) => ({ ...x, username: x.user_id ? users[i % users.length].username : null, seconds_ago: i * 12 })) });
  if (action === 'users') return send(res, { rows: users });
  if (action === 'user') {
    const user = users.find((x) => x.id === url.searchParams.get('id')) || users[0];
    return send(res, { user, depth: { score: user.depth_score, level: user.depth_level, last_seen: user.last_seen, days: user.days, sessions: user.sessions, events: user.events, exam_count: user.exam_count, actual_exams: user.actual_exams, score_rows: user.score_rows, subjects: user.subjects }, exams: [{ id: 'exam-1', name: '期中考试', exam_date: iso(8000) }], scores: [{ subject: '数学', actual_score: 126, target_score: 130 }], events: logs.slice(0, 12), feedback: feedback.slice(0, 2) });
  }
  if (action === 'feedback') return send(res, { rows: feedback });
  if (action === 'feedback_detail') {
    const item = feedback.find((x) => x.id === url.searchParams.get('id')) || feedback[0];
    return send(res, { feedback: item, username: item.username, replies: [{ id: 'reply-1', author_type: 'admin', content: '已经收到，我们会核对并在修复后同步给你。', created_at: iso(20) }], attachments: [] });
  }
  if (action === 'feedback_status' || action === 'feedback_reply') return send(res, { ok: true });
  if (action === 'raw') return send(res, { rows: logs });
  return send(res, { error: 'unknown_action' }, 404);
}).listen(port, '127.0.0.1', () => {
  console.log(`Score Tracker /mg preview: http://127.0.0.1:${port}/mg`);
});
