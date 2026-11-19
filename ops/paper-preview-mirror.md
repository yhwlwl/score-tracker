# 试卷预览：阿里云入口与双副本

仅固定分支预览域名使用 `https://assets.tantantan.tech/paper-preview-upload`；服务只允许该来源上传 `upload_page` 和 `upload_page_view`，账号和记录归属继续由预览 Edge Function 验证。其他请求、正式域名和其他分支沿用原路径。阿里云连接失败时浏览器退回原有同源接口。

预览 v2 以 ECS 为即时主副本：浏览器先向预览 Edge Function做小体积归属/页序校验，再把图片在 ECS 本机校验并 AES-256-GCM 加密落盘；数据库只登记随机资源编号、能力令牌散列对应的读取信息、摘要与规范化存储路径。落盘和登记成功后即可继续识别，不等待大图写入 Supabase。后台队列再使用短时 signed upload URL 把同一字节补写到 Supabase Storage；失败按 generation 重试，用户删除记录时同时清理 ECS 主副本和 Supabase 备份。旧 preview-v1 双副本记录仍按原来的 Supabase→ECS 镜像方式兼容。

服务器以禁止登录的 `stpaperpreview` 用户运行，图片在 `/var/lib/score-tracker-paper-preview`，不在公开目录。每个对象使用 AES-256-GCM，密钥及签名私钥只在 `/etc/score-tracker-paper-preview`，目录不可供其他普通用户读取；切勿删除密钥，否则服务器副本无法解密。`/paper-preview-read` 只接受数据库生成的 request UUID、资源 UUID 与 256 位随机能力令牌，不接受文件路径、目录或用户输入 URL；能力令牌本身不以明文落盘。签名私钥仅用于服务器向 `score-tracker-paper-mirror-preview` 证明身份；用户会话和图片不写日志。

维护检查：

```sql
select count(*) as pending, min(updated_at) as oldest
from public.score_tracker_paper_mirror_preview_jobs;
```

通过 `systemctl status score-tracker-paper-preview.service` 查看服务状态。下载失败采用退避重试；服务器可用空间低于 6 GiB 时停止写入新副本并保留队列，避免影响同机业务。队列积压或长时间失败需要人工排查，不会自动清理用户图片。预览迁移和预览 Edge Function 不代表正式站已切换；正式推广还需要对应的域名许可、入口配置、容量规划与验证。
