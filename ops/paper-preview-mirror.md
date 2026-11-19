# 试卷预览：阿里云入口与双副本

仅固定分支预览域名使用 `https://assets.tantantan.tech/paper-preview-upload`；服务只允许该来源上传 `upload_page` 和 `upload_page_view`，账号和记录归属继续由预览 Edge Function 验证。其他请求、正式域名和其他分支沿用原路径。阿里云连接失败时浏览器退回原有同源接口。

上传响应仍等待 Supabase 保存成功。材料事务通过预览专用标记写入同步队列，服务器后台拉取并加密存储第二份；服务器故障或重启不会丢失待同步任务。已启用同步的记录在旧客户端更新设置时保留标记，直到记录删除。队列采用 generation 防止旧任务确认覆盖新任务；替换和删除均同步，删除任务不受用户记录级联删除影响。同步是异步的，不应把上传响应理解为两份都已完成。历史记录不会批量迁移，预览中重新保存的记录会进入队列。

服务器以禁止登录的 `stpaperpreview` 用户运行，图片在 `/var/lib/score-tracker-paper-preview`，不在公开目录。每个对象使用 AES-256-GCM，密钥及签名私钥只在 `/etc/score-tracker-paper-preview`，目录不可供其他普通用户读取；切勿删除密钥，否则服务器副本无法解密。签名私钥用于服务器向 `score-tracker-paper-mirror-preview` 证明身份；用户会话和图片不写日志。域名静态路径仍只允许 GET/HEAD，新增入口限制请求大小、并发和来源。

维护检查：

```sql
select count(*) as pending, min(updated_at) as oldest
from public.score_tracker_paper_mirror_preview_jobs;
```

通过 `systemctl status score-tracker-paper-preview.service` 查看服务状态。下载失败采用退避重试；服务器可用空间低于 6 GiB 时停止写入新副本并保留队列，避免影响同机业务。队列积压或长时间失败需要人工排查，不会自动清理用户图片。预览迁移和预览 Edge Function 不代表正式站已切换；正式推广还需要对应的域名许可、入口配置、容量规划与验证。
