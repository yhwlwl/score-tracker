# 学情 Agent 持续质量评估

## 评测分层

- **确定性回归（默认）**：使用虚构考试记录和预设模型输出，执行真实 studyQuestion、数据工具、结果校验、组件协议与积分策略。不调用模型、不使用用户账户、不消耗生产额度。三档均执行。
- **真实模型评测（手动）**：同一题库与实际 Agent 代码，使用专用 DeepSeek API Key 和虚构记录。不会访问生产数据库、钱包或个人考试记录；使用独立内存计量，需明确设置评测预算与调用次数。模拟回归通过不代表模型语义质量通过。
- **人工语义复核**：对真实回答按准确性、完整性、独立发现、自然易懂、图表/交互价值逐项评分（0=不达标、1=部分达标、2=达标），记录具体问题与复现题号。事实错误、虚构数据、排名方向错误、混淆预测和实考属于阻断问题，不以平均分掩盖。新发现的错误应新增固定回归题。

## 自动运行

Study agent quality 工作流仅在相关 PR、main 更新或手动触发时执行，不设置定时任务。JSON报告作为 artifact 保存90天，含题号、思考模式、检查结果、回答、依据、调用数、耗时和模拟计量。无秘密、无付费调用。现有 PR release checks 继续负责安全、结算、功能及浏览器布局。

```sh
node design/study-agent-eval.cjs --mode=all --out=study-agent-report.json
node design/study-agent-eval.cjs --case=trimmed-mean,rank-vs-score --mode=standard
```

## 实际模型对比（显式付费测试）

仅在开发者主动执行时使用环境变量 STUDY_EVAL_API_KEY（不要提交、打印或使用生产共享 Key）。也可以在 GitHub Actions 手动运行 Study agent quality，勾选 run_live 并选择题目、思考强度和预算；需事先配置同名独立仓库 Secret。PR、push 不会触发 live-model 作业，也没有定时任务。评测支持 DeepSeek 官方 API（deepseek-flash）和 OpenCode Go（deepseek-v4.1-flash）；均使用三档思考策略。选择 provider 时必须匹配独立评测密钥。

先执行单次连通性探测（最多64个输出 token，不会启动题库评测）：

```sh
node design/study-agent-eval.cjs --provider=opencode-go --probe
```

连通后才手动启动评测：

```sh
node design/study-agent-eval.cjs --provider=opencode-go --live --mode=all --case=rank-vs-score,trimmed-mean --max-credits=1000 --max-calls=20 --out=live-report.json
```

- --repeat=2 或 3 用于考察随机性；同一用例、档位、重复次数才可对比。
- --baseline=previous-report.json 对比历史报告；只允许同一报告类型及版本格式。
- live 计量按目前项目的每百万 token 输入2、缓存0.04、输出8元估算（仅为 Score Tracker 生产环境参考积分，不代表 OpenCode Go 订阅用量、剩余额度或任何服务商账单），记录输入、输出、缓存及推理 token；真实 OpenCode Go 报告还保存每次响应的 `usage.opencode.allowance`、`list_cost` 和 `billing_source`；用调用数和保守预估额度拦截后续请求。预估不保证服务商最终费用，建议使用供应商侧独立额度控制。
- 测试失败或预算停止会返回非零状态；未执行的题不能算通过。自动检查只覆盖明确的事实与结构条件，不代替人工语义判断。

## 发布门槛

离线检查全部通过；真实模型评测没有关键事实错误，覆盖主要代表题；不同档位的延迟和成本按实际用量比较，而不是要求高档一定优于低档。新版本如果退化，先分析案例与所用工具，再修复并加入回归。真实模型输出涉及虚构成绩，仍不应将报告上传到公共位置以外的无关服务。

## 首批覆盖

16道基础题：最新成绩、分数与排名反向、不同满分、零分、仅排名、组合、去极值、分类稳定性、同步进退、全科预测、常态总分、情景模拟、图表可信性、多轮追问。三档共48次确定性回放。

OpenCode Go 采用官方公开接口 `https://opencode.ai/inference/go/openai/v1/chat/completions`，按官方文档为每次独立评测会话生成稳定会话 ID，并以真实应用名 score-tracker-eval 标识请求。Go 面向编码代理及类似请求，其他评测用途的支持范围需遵守供应商政策；DeepSeek 模型还受工作区 Regions 设置约束。若收到 HTTP 403、认证失败或网络错误，评测终止，不自动改用其它接口、密钥或绕过服务商访问限制。建议检查 Go 订阅权限及官方支持渠道。
