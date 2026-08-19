# 成绩轨迹 Score Tracker

一个面向手机优先设计的全年考试成绩记录网页：记录语文、数学、英语、物理、化学、生物、历史、地理、政治 9 科的目标成绩与真实成绩，并用趋势图和雷达图查看变化。

## 功能

- 首次访问自动生成易记用户名与强密码，并用 `ⓘ` 明确提示截图保存
- 期中/期末等考试可先填目标，考后再补真实成绩
- 总分以及各科均可查看「真实成绩 / 目标成绩」趋势
- 9 科雷达图、多场考试叠加比较
- 新增、编辑、补录、删除考试记录
- 手机端底部导航、移动端表单与图表适配
- 访问日志：Visitor / Session / 页面 / 来源 / 地区 / 设备 / 版本 / PWA / 核心行为
- 建议反馈：游客和登录用户均可提交，支持截图、历史记录、双向回复、未读提醒、状态流转
- 私有管理员后台 `/mg`：访问统计、实时在线、用户、访客、反馈、分析和安全原始数据视图
- 数据保存在 Supabase `database0`

## Supabase 表

核心成绩数据：

- `score_tracker_users` — 账号、密码摘要、会话、管理员标记
- `score_tracker_exams` — 考试主记录
- `score_tracker_scores` — 每场考试每科的目标/真实成绩

访问与反馈：

- `score_tracker_visit_logs` — 页面、Visitor、Session、来源、地理位置、设备、版本和产品行为事件
- `score_tracker_feedback_submissions` — 反馈主体及提交时用户使用深度快照
- `score_tracker_feedback_replies` — 用户 / 管理员双向会话与已读状态
- `score_tracker_feedback_attachments` — 反馈与回复图片附件元数据
- Storage bucket `score-tracker-feedback` — 私有反馈图片文件

账号密码由 Supabase Edge Function `score-tracker-api` 处理。数据库中的密码仅保存 PBKDF2-SHA256 摘要与盐，不保存明文密码；业务表启用 RLS，并撤销 anon/authenticated 直接访问。

Score Tracker 的用户深度分按本产品重新计算，综合活跃天、Session、考试记录、真实出分考试、目标考试、科目覆盖、编辑/趋势图/雷达图交互和使用时长，不复用 Study Planner 的任务/目标/复盘口径。

## 管理后台

`/mg` 只在公开仓库保留一个无密钥同源代理。后台主体、聚合逻辑和 service-role 数据访问运行在 Supabase 私有 Edge Function `score-tracker-admin` 中；管理员面板不会展示密码摘要、密码盐、会话 token 等机密字段。

## 前端

纯静态 HTML/CSS/JavaScript，无构建依赖，可直接部署到 Vercel。
