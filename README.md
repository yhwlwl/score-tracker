# 成绩轨迹 Score Tracker

一个面向手机优先设计的全年考试成绩记录网页：记录语文、数学、英语、物理、化学、生物的目标成绩与真实成绩，并在同一张折线图中直观看到变化。

## 功能

- 首次访问自动生成易记用户名与强密码，并用 `ⓘ` 明确提示截图保存
- 期中/期末等考试可先填目标，考后再补真实成绩
- 总分以及六科均可查看「真实成绩 / 目标成绩」双折线
- 新增、编辑、补录、删除考试记录
- 手机端底部导航、移动端表单与图表适配
- 数据保存在 Supabase `database0`

## Supabase 表

- `score_tracker_users` — 账号、密码摘要、会话
- `score_tracker_exams` — 考试主记录
- `score_tracker_scores` — 每场考试每科的目标/真实成绩

账号密码由 Supabase Edge Function `score-tracker-api` 处理。数据库中的密码仅保存 PBKDF2-SHA256 摘要与盐，不保存明文密码；三张表启用 RLS，并撤销 anon/authenticated 直接访问。

## 前端

纯静态 HTML/CSS/JavaScript，无构建依赖，可直接部署到 Vercel。
