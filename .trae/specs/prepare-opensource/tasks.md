# Tasks

## 阶段一：文档完善

- [ ] Task 1: 创建 CHANGELOG.md 版本变更日志
  - [ ] 1.1 创建 CHANGELOG.md 文件，遵循 Keep a Changelog 格式
  - [ ] 1.2 添加初始版本 0.1.0 的变更记录

- [ ] Task 2: 创建 CODE_OF_CONDUCT.md 社区行为准则
  - [ ] 2.1 采用 Contributor Covenant 标准模板
  - [ ] 2.2 添加联系方式

- [ ] Task 3: 创建 SECURITY.md 安全政策
  - [ ] 3.1 说明支持的版本
  - [ ] 3.2 提供安全漏洞报告方式

- [ ] Task 4: 更新 package.json 元数据
  - [ ] 4.1 添加 author 字段
  - [ ] 4.2 添加 repository 字段
  - [ ] 4.3 添加 keywords 字段
  - [ ] 4.4 添加 bugs 字段
  - [ ] 4.5 添加 engines 字段

- [ ] Task 5: 更新 README.md 截图
  - [ ] 5.1 添加应用实际截图或 GIF 演示

## 阶段二：代码清理

- [ ] Task 6: 移除未使用的依赖
  - [ ] 6.1 卸载 electron-store
  - [ ] 6.2 卸载 highlight.js
  - [ ] 6.3 更新 README.md 中的技术栈说明

- [ ] Task 7: 删除未使用的代码文件
  - [ ] 7.1 删除 src/main/imageStore.ts

- [ ] Task 8: 修复 lint 错误
  - [ ] 8.1 修复 SettingsPage.tsx 中的 _raw 未使用变量警告
  - [ ] 8.2 修复 ClipboardList.tsx 中的格式问题
  - [ ] 8.3 运行 npm run lint -- --fix 自动修复格式问题

- [ ] Task 9: 启用 TypeScript 严格模式
  - [ ] 9.1 在 tsconfig.node.json 中添加 strict: true
  - [ ] 9.2 在 tsconfig.web.json 中添加 strict: true
  - [ ] 9.3 修复严格模式下的类型错误

## 阶段三：质量保障

- [ ] Task 10: 添加 pre-commit hooks
  - [ ] 10.1 安装 husky 和 lint-staged
  - [ ] 10.2 配置 pre-commit 钩子运行 lint

- [ ] Task 11: 完善 GitHub Actions
  - [ ] 11.1 添加 Dependabot 配置
  - [ ] 11.2 添加 release-drafter 配置

## 阶段四：发布准备

- [ ] Task 12: 完善发布配置
  - [ ] 12.1 更新 electron-builder.yml 添加 copyright
  - [ ] 12.2 添加便携版构建目标

# Task Dependencies

- Task 6 依赖 Task 8（先修复 lint 再移除依赖）
- Task 9 依赖 Task 8（先修复现有错误再启用严格模式）
- Task 10 依赖 Task 8 和 Task 9（确保代码质量后再添加 hooks）
- Task 12 可以与 Task 1-5 并行执行
