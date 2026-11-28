# 三百纪念 · 手动发布验收
- 此分支基于 main，只准备上线，不开启 armed 或 cron；不能直接合并或上线未经验收的预览。
- 正式站加载 centenary-release.js：只调用已部署的 centenary_status / centenary_seen，登录和恢复可见时检查，在线可见页面最多约两分钟一次；仅 published=true 且本人 eligible=true 且未暂停时可显示。已读后不再自动弹出，个人页可以重看。
- 统一使用成就馆最新香槟金与海军蓝 SVG。纪念发布事务从唯一活动资格表发放唯一 triple 记录；成就馆同一 triple ID 保持兼容。
- 纪念留言复用现有公告讨论（专用公告 ID），发布时保存此前公告记录并设为当前公告；已有留言不删除。新版普通公告检查跳过该 ID，纪念弹窗内的入口打开该专用讨论；历史状态仍可只读查看。
- 发布前：核对实时三项门槛、armed=false、cron inactive、API鉴权、生产静态资源与浏览器移动/桌面端验收；运行 node design/test-centenary-release.cjs，运行原有发布检查和构建。若成就馆也上线，必须先合并统一徽章方案，确保没有第二枚。
- 明确收到人工发布指令后：先上线保持隐藏的前端版本并确认生产可用，最后由有权限的管理员执行 manual-publish.sql（不可定时运行），事务同时冻结活动资格、唯一徽章及留言主题；发布后 armed 自动恢复 false，cron 保持禁用。未达标整笔回滚。
- 发布后：核对 published_at、发布快照、资格数、徽章数、公告 ID 与端到端真实账号。若异常，暂停活动展示，不删除既有资格或徽章。测试不可伪造生产发布时间或真实用户资格。

- 埋点复用现有事件通道：centenary_view（automatic/account）、centenary_dismiss、centenary_badge_open/view/failed、centenary_discussion_open、centenary_card_saved；centenary_comment_sent（comment/reply）。仅记录功能操作，不新增个人成绩、留言正文等采集。
