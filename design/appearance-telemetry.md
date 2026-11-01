# 外观中心埋点

通过现有 `__scoreTrackerTrack` 上报至 `score_tracker_visit_logs`，事件统一使用 `appearance_studio_` 前缀，沿用账号、会话、客户端时间、版本、页面和设备上下文。后台日志已配置中文名称。无需数据库迁移或后端改动。

| 事件后缀 | 含义 |
| --- | --- |
| `loaded` | 登录后载入当前装扮，用于观察现有装扮使用分布 |
| `entry_shown` | 账号页出现外观中心入口 |
| `opened` | 打开外观中心，source 区分账号入口、逐卡编辑和程序调用 |
| `section_viewed` / `filter_changed` | 切换分类、筛选背景或挂件 |
| `option_selected` | 试用主题、背景、配色、字体字号、卡片和挂件设置 |
| `page_preview_started` / `page_preview_returned` | 当前页面预览及返回 |
| `preview_toggled` / `artwork_opened` | 展开预览、查看背景原画 |
| `applied` / `cancelled` / `save_failed` | 成功保存、取消及保存失败 |
| `undone` / `reset` | 撤销、试用默认设置 |
| `favorite_added` / `favorite_loaded` / `favorite_deleted` / `favorite_failed` | 收藏搭配的添加、试用、删除和失败 |
| `card_edit_started` / `card_selected` / `card_edit_finished` / `card_override_cleared` | 逐卡装扮与覆盖设置 |

每次打开生成 `studio_session_id`。保存与取消包含停留时长、选项操作数、访问分类；保存额外包含是否发生修改。仅持久化成功才记 `applied`，失败仍保留试用状态。取消在还原前记录被放弃的预览。

事件携带受控的主题、背景、配色、字体字号、卡片质感、挂件类型、位置、大小、浓度及覆盖卡片数量。不会上报收藏名称、卡片标识或其中的成绩与文字内容。

`loaded` 和 `entry_shown` 在当前页面加载内按账号去重，不随重绘重复累计。滑块仅在 change 时记录一次，拖动过程不发请求。埋点异常不会打断试用、取消或保存。

分析时：入口使用人数按 `user_id` 去重；打开次数按 `studio_session_id` 去重；保存转化匹配同一次打开的 `applied`；已保存装扮的偏好使用 `applied`，试用偏好使用 `option_selected`，二者不要混计。收藏加载、重置和撤销均只修改预览，不能视为保存。

验证：`node design/test-appearance-telemetry.cjs` 与 `node design/test-theme-studio.cjs`（需要 jsdom）。前者通过真实埋点传输和实际外观控件校验事件、去重、滑块、成功/失败/取消和隐私字段。
