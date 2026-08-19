# 成绩轨迹 Score Tracker

一个面向手机优先设计的全年考试成绩记录网页：记录语文、数学、英语、物理、化学、生物的目标成绩与真实成绩，并在同一张折线图中直观看到变化。

## 功能

- 首次访问自动生成易记用户名与强密码，并用 `ⓘ` 明确提示截图保存
- 期中/期末等考试可先填目标，考后再补真实成绩
- 总分以及六科均可查看「真实成绩 / 目标成绩」双折线
- 新增、编辑、补录、删除考试记录
- 手机端底部导航、移动端表单与图表适配
- 数据保存在 Supabase `database0`
- 访问统计：Visitor / Session / 页面、来源、地区、设备、版本、注册登录、考试操作、图表交互、GitHub、PWA、在线心跳
- 建议反馈：游客与登录用户提交、截图附件、历史记录、双向回复、未读提醒和处理状态
- 反馈处理状态与 Study Planner 对齐：`已收到 → 处理中 → 已计划 → 已解决 → 已关闭`
- 新提交默认显示「已收到」；管理员首次回复后自动进入「处理中」；已解决/已关闭后用户继续追问会自动重新进入「处理中」
- `/mg` 私有管理员后台：访问分析、实时在线、用户深度、访客、反馈管理和安全原始数据视图

## Supabase 表

- `score_tracker_users` — 账号、密码摘要、会话
- `score_tracker_exams` — 考试主记录
- `score_tracker_scores` — 每场考试每科的目标/真实成绩
- `score_tracker_visit_logs` — 访问与产品行为日志
- `score_tracker_feedback_submissions` — 建议反馈主体与提交时上下文/深度快照
- `score_tracker_feedback_replies` — 用户与管理员双向回复
- `score_tracker_feedback_attachments` — 反馈与回复附件元数据

反馈图片存放在私有 Storage bucket `score-tracker-feedback`。

账号密码由 Supabase Edge Function `score-tracker-api` 处理。数据库中的密码仅保存 PBKDF2-SHA256 摘要与盐，不保存明文密码；相关表启用 RLS，并撤销 anon/authenticated 直接访问。管理员后台主体部署在私有 `score-tracker-admin` Edge Function，公开仓库中的 `/mg` 仅为无密钥同源代理。

## 前端

纯静态 HTML/CSS/JavaScript，无构建依赖，可直接部署到 Vercel。
