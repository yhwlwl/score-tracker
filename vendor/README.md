# vendor

PDF 导出用的第三方库，只在用户点了「导出 PDF」时才按需加载，不进首屏。

| 文件 | 版本 | 许可证 | 来源 |
| --- | --- | --- | --- |
| `html2canvas.min.js` | 1.4.1 | MIT | https://github.com/niklasvh/html2canvas |
| `jspdf.umd.min.js` | 2.5.2 | MIT | https://github.com/parallax/jsPDF |

升级方式：`pnpm add html2canvas@1.4.1 jspdf@2.5.2`，然后把
`node_modules/html2canvas/dist/html2canvas.min.js` 和
`node_modules/jspdf/dist/jspdf.umd.min.js` 复制到这里，并检查 `pdf-export-v40.js` 里的分页逻辑。
