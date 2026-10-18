# 科目内 AI 试卷分析（第一版）

入口：添加 / 编辑考试 → 每个科目底部「AI 试卷分析」。普通打开表单和保存考试不会调用新功能。上传、提示、额度和报告集中在独立对话框中，返回后保留考试表单。

## 本版行为

- 支持 JPG / PNG / WebP，试卷必选、答题卡与参考答案可选。可注明作答在试卷上；原图每张最多 10MB，共 8 页。先本机压缩，可预览、前移、旋转和移除。PDF 暂须转为图片。
- 使用后台任务，开始后可以返回考试、再从「分析记录」查看。分析按小题归一化，保留来源页、题干、学生答案、老师批改证据、独立 AI 估分、知识点、失分依据、建议、总体评价和覆盖范围。
- 无作答只做题目整理；无参考答案的 AI 解答明确标注待验证；不可读不记为零分。最多 60 小题，超出或缺页显示部分报告。
- 支持手动核对作答、老师得分、满分，标记已核对 / 已订正。汇总只包含已核对且得分、满分完整的小题，不含 AI 估分；多知识点不会重复累计失分。原始 AI 结果保留，改分后不假装重新生成总体评价。
- 保存考试后，以已保存的科目清单关联报告。关联失败不会重放或阻止原考试保存；本机记录保留草稿编号，下次编辑这场考试时重试。未保存考试的报告由本机草稿编号找回，清理浏览器数据会失去未关联草稿的入口。
- 上传图片只在当前浏览器表单、处理过程和模型请求中使用，本站不持久保存原图；结构化报告与核对记录存于账号下。第三方模型按其服务条款处理图片，上传前有明确确认。没有默认训练授权或公开题库。可删除报告；删除考试 / 账号时关联报告由外键清除。

## 隔离与上线

迁移只新增 `score_tracker_paper_settings`、`score_tracker_paper_reviews`、`score_tracker_paper_usage` 和两个 `score_tracker_paper_*` RPC。不修改旧表列、触发器、成绩 API、识图接口或识图额度。

新配置表只在迁移时从当前 `score_vision` 配置复制模型地址、名称及密钥；后续配置独立，密钥不进入客户端。两功能仍使用同一个供应商账户，所以实际模型调用仍产生该供应商账户的用量。

初始独立试用限制：每账号每天 3 次开始请求、全站每天 20 次、间隔 60 秒，北京时间 0 点重置。失败也计一次开始请求；同一 request_id 和内容的网络重试不重复计次或调用模型。模型内部最多两次恢复尝试。删除报告不删除次数记录。所有额度检查和预留在一个数据库事务中完成。

表启用 RLS，撤销 PUBLIC / anon / authenticated 的访问；RPC 为 SECURITY INVOKER，仅 service_role 可执行。Edge Function 校验已有自定义会话的 SHA-256 摘要和有效期，每次报告读写限定当前 user_id；考试关联额外验证所有权。核对更新用 revision 防止并发覆盖。客户端不能指定所有者，不能传任意图片 URL。

部署顺序：应用本分支的 `paper_review_beta` 迁移 → 仅部署新增 `score-tracker-paper-review` Edge Function → 部署分支前端预览。新函数 `verify_jwt=false`，因为请求体使用本项目自定义 session token，函数内部执行认证；并非匿名公开读取。部署文件还需包含相对依赖 `score-tracker-vision-preview/reliability.ts`，只作为新函数打包依赖，不重新部署旧函数。

不合并分支时，现有页面没有新入口且不调用新函数。停止试用可单独执行 `update public.score_tracker_paper_settings set enabled=false where id='default';`，已保存报告仍可读取和核对。此分支没有修改或发布生产前端，也没有替换旧 Edge Function。

## 验证

依赖可在仓库外安装，避免引入运行时包管理改造：`jsdom`、`@electric-sql/pglite`、`playwright`（及 Chromium）。将其目录加入 NODE_PATH。

```
node design/build-bundles.js
node design/bundle-check.js
node design/test-paper-review.cjs
node design/test-paper-review-browser.cjs
node design/test-exam-averages.cjs
node design/test-same-origin-api.cjs
node design/test-vision-reliability.cjs
```

单元 / 集成测试执行实际 Edge handler，使用隔离数据库和模型响应；SQL 测试在 PostgreSQL / PGlite 中验证额度与权限；浏览器测试走真实图片解码、压缩、旋转、提交、报告核对链路，并检查手机 / 桌面 / 深色布局。模型响应为测试夹具，不能证明真实中文手写、公式、几何图和主观题评分准确；正式扩大试用前仍需真实试卷评测。

本次工作环境中的 Chromium 启动失败（运行时 SIGTRAP），因此未完成真实浏览器视觉验收；不要将浏览器测试脚本的存在视为已经通过。接口、PGlite 和 jsdom 表单集成测试已运行通过。生产仅验证新增接口拒绝无效会话，不使用真实学生试卷做自动测试。
