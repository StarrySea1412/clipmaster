# 开源准备检查清单

## 文档完整性

- [ ] README.md 包含实际截图或 GIF 演示
- [ ] README.md 包含安装说明
- [ ] README.md 包含使用说明
- [ ] README.md 包含技术栈说明
- [ ] README.zh-CN.md 中文文档与英文文档同步
- [ ] CHANGELOG.md 存在并记录版本历史
- [ ] CONTRIBUTING.md 存在并说明贡献流程
- [ ] LICENSE 文件存在（MIT）
- [ ] CODE_OF_CONDUCT.md 存在
- [ ] SECURITY.md 存在

## 项目元数据

- [ ] package.json 包含 name 字段
- [ ] package.json 包含 version 字段
- [ ] package.json 包含 description 字段
- [ ] package.json 包含 author 字段
- [ ] package.json 包含 license 字段
- [ ] package.json 包含 repository 字段
- [ ] package.json 包含 keywords 字段
- [ ] package.json 包含 bugs 字段
- [ ] package.json 包含 homepage 字段
- [ ] package.json 包含 engines 字段

## 代码质量

- [ ] npm run lint 通过无错误
- [ ] npm run typecheck 通过无错误
- [ ] 无未使用的 npm 依赖
- [ ] 无未使用的代码文件
- [ ] TypeScript 严格模式已启用
- [ ] 所有函数有返回类型注解

## CI/CD

- [ ] GitHub Actions 工作流存在
- [ ] 工作流包含 lint 检查
- [ ] 工作流包含 typecheck 检查
- [ ] 工作流包含构建步骤
- [ ] 工作流包含多平台构建（Windows、macOS、Linux）
- [ ] 工作流包含发布步骤

## 社区支持

- [ ] GitHub Issue 模板存在（bug_report.md）
- [ ] GitHub Issue 模板存在（feature_request.md）
- [ ] Pull Request 模板存在（可选）
- [ ] Dependabot 配置存在（可选）

## 发布准备

- [ ] electron-builder.yml 配置完整
- [ ] 构建产物可正常运行
- [ ] 应用图标存在
- [ ] 版本号正确设置

## 安全检查

- [ ] 无敏感信息硬编码
- [ ] .gitignore 正确配置
- [ ] 无 API 密钥泄露
- [ ] 依赖无已知高危漏洞
