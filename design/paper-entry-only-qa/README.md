# 公开交互预览

只保留试题录入、核对、保存与题型统计，分析入口和相关请求被拦截。
本公开版本仅含自行编写的数学、物理合成示例，各8题，不包含真实账号、历史题目、作答或成绩。
所有API请求在浏览器中模拟，修改只保存于独立的本地预览存储，不调用模型、不修改生产数据。
示例图片由合成文字重排，上传不会执行真实识别。
基于PR54真实前端生成，未部署生产后端，未合并main。

生成命令：`node design/build-bundles.js && node design/build-paper-entry-only-preview.cjs && node tools/cf-build.js`。
