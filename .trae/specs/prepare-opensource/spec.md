# 开源准备规范

## Why

ClipMaster 已经具备了基本的开源要素（README、LICENSE、CONTRIBUTING、CI/CD），但为了提升项目专业度和吸引贡献者，需要完善文档、清理代码、添加测试等。

## What Changes

### 文档完善
- 添加 CHANGELOG.md 记录版本历史
- 添加 CODE_OF_CONDUCT.md 社区行为准则
- 添加 SECURITY.md 安全政策
- 更新 README.md 添加实际截图/GIF
- 完善 package.json 元数据（author、repository、keywords）

### 代码清理
- 移除未使用的依赖（electron-store、highlight.js）
- 删除未使用的代码文件（imageStore.ts）
- 统一设置文件管理逻辑
- 启用 TypeScript 严格模式

### 质量保障
- 添加基础测试框架
- 修复所有 lint 错误
- 添加 pre-commit hooks

### 发布流程
- 完善 GitHub Actions 发布工作流
- 添加自动发布脚本

## Impact

- Affected specs: 项目整体质量、社区体验
- Affected code: package.json、tsconfig.json、.github/workflows、src/main/

## ADDED Requirements

### Requirement: 版本变更日志

项目 SHALL 提供 CHANGELOG.md 文件记录所有版本变更。

#### Scenario: 用户查看版本历史
- **WHEN** 用户访问 CHANGELOG.md
- **THEN** 可以看到按版本组织的变更记录，包括新增功能、修复、破坏性变更

### Requirement: 社区行为准则

项目 SHALL 提供 CODE_OF_CONDUCT.md 定义社区行为标准。

#### Scenario: 贡献者了解行为规范
- **WHEN** 贡献者阅读 CODE_OF_CONDUCT.md
- **THEN** 了解预期的行为标准和举报方式

### Requirement: 安全政策

项目 SHALL 提供 SECURITY.md 说明安全漏洞报告流程。

#### Scenario: 安全研究人员报告漏洞
- **WHEN** 发现安全漏洞
- **THEN** 可以通过 SECURITY.md 中的指引安全地报告问题

### Requirement: 项目元数据完整性

package.json SHALL 包含完整的项目元数据。

#### Scenario: npm 显示项目信息
- **WHEN** 用户查看 npm 包信息
- **THEN** 可以看到 author、repository、keywords、bugs 等完整信息

### Requirement: 代码质量标准

项目 SHALL 通过所有 lint 检查且无 TypeScript 错误。

#### Scenario: CI 运行代码检查
- **WHEN** 提交代码或创建 PR
- **THEN** lint 和 typecheck 必须通过

### Requirement: 未使用代码清理

项目 SHALL 不包含未使用的依赖和代码文件。

#### Scenario: 减少包体积
- **WHEN** 用户安装应用
- **THEN** 不包含未使用的 npm 依赖

## MODIFIED Requirements

### Requirement: README 文档

README.md SHALL 包含实际的应用截图或演示 GIF。

**变更**: 将占位符图片替换为实际截图

#### Scenario: 用户了解应用外观
- **WHEN** 用户访问 GitHub 仓库
- **THEN** 可以看到应用的实际界面截图

### Requirement: TypeScript 配置

tsconfig.json SHALL 启用严格模式。

**变更**: 添加 strict: true 和相关严格检查选项

#### Scenario: 提高代码质量
- **WHEN** 开发者编写代码
- **THEN** TypeScript 会进行更严格的类型检查

## REMOVED Requirements

### Requirement: 未使用的依赖

**Reason**: electron-store 和 highlight.js 未被实际使用，增加包体积
**Migration**: 直接移除，无需迁移

### Requirement: 未使用的代码文件

**Reason**: imageStore.ts 未被任何模块引用
**Migration**: 直接删除
