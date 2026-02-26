# Lumina Business Card

## 部署步骤

1. **创建/打开 Google Apps Script 项目**
   - 打开 [script.google.com](https://script.google.com)，新建项目或打开现有项目。
   - 若为现有项目，确认已启用“Google Apps Script API”和所需服务。

2. **上传/同步代码**
   - 将 `main.gs`、`calc.js`、`catalog.js`、`ai.js`、`format.js` 等文件按项目结构添加到脚本编辑器。
   - 若使用 clasp：在项目根目录执行 `clasp push` 同步到云端。

3. **配置 HTML 入口（如使用 Web App）**
   - 若有 `index.html` 等前端，在脚本中通过 `HtmlService.createHtmlOutputFromFile('index')` 等引用，并确保文件名与 `createHtmlOutputFromFile` 参数一致。

4. **部署为 Web 应用**
   - 菜单：**部署** → **新建部署** → 类型选择 **Web 应用**。
   - 说明填写版本信息；“执行身份”选“以我的身份”或“以访问该 Web 应用的用户的身份”；“有权访问的应用”选“所有人”或“仅限组织内”，按需选择。
   - 点击**部署**，复制生成的 Web 应用 URL。

5. **测试与版本管理**
   - 在浏览器中打开 Web 应用 URL 做功能测试。
   - 后续更新：修改代码后，**部署** → **管理部署** → 编辑现有部署，选择**版本**为“新版本”，保存。

## 注意事项

- **权限**：首次以你的身份运行会触发授权；若改为“以访问用户身份”运行，访问者需有相应 Google 账号与权限。
- **配额**：Apps Script 有每日执行时间、URL 获取等配额，高并发或长时间运行需注意限制。
- **脚本顺序**：若在 HTML 中通过 `<script src="...">` 引用 `calc.js`、`catalog.js`、`ai.js`、`format.js`，注意加载顺序，避免未定义引用。
- **安全**：不要在代码中硬编码密钥或敏感信息；使用“项目属性”或 Script Properties 存储配置。
- **clasp**：使用 clasp 时需先 `clasp login` 和 `clasp create` 或 `clasp clone <scriptId>`，且 `appsscript.json` 中 `timeZone`、依赖等需与预期一致。
