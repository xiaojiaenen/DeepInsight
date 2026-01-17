# DeepInsight Development Roadmap

> 本文档用于追踪项目完整开发进度。每完成一个任务，请手动将 `[ ]` 标记为 `[x]`。

## 🎯 Phase 0: 基础设施搭建 (Infrastructure)
**目标**: 建立前后端开发环境，确保 Hello World 级别运行。

- [x] **目录结构初始化**
    - [x] 创建 `/app`, `/kernel`, `/assets` 等基础目录。
    - [x] 初始化 Electron + Vite + React + TypeScript 脚手架。
    - [x] 初始化 Python FastAPI Kernel 结构。
- [x] **开发环境配置**
    - [x] 配置 `vite.config.ts` 以支持 Electron。
    - [x] 编写 Electron 主进程 (`main.ts`) 和预加载脚本。
    - [x] 桌面端无边框窗口与自定义窗口控制（拖拽/最小化/最大化/关闭）。
    - [x] 渲染进程关闭 Node 集成，改为 preload 安全桥接。
    - [x] 使用 `uv` 创建 Python 虚拟环境并安装依赖。
    - [x] 桌面端启动自动初始化 Python 环境并拉起 Kernel。
    - [x] 预置常用科学计算库（numpy/pandas/matplotlib/sympy）。
    - [x] 验证前后端服务可同时启动。
    - [x] 代码结构重构：前端/后端模块化拆分，控制单文件行数。

---

## 🔌 Phase 1: 核心编辑器与通信 (Core Editor & IPC)
**目标**: 实现“代码编写 -> 后端执行 -> 结果回显”的闭环。

- [x] **编辑器集成 (Monaco Editor)**
    - [x] 安装 `@monaco-editor/react`、`monaco-editor` 和 `vite-plugin-monaco-editor`。
    - [x] 创建 `CodeEditor` 组件，支持 Python 语法高亮。
    - [x] 配置 Clean Light / Professional 主题。
- [x] **终端集成 (Xterm.js)**
    - [x] 安装 `@xterm/xterm` 和 `@xterm/addon-fit`。
    - [x] 创建 `TerminalPanel` 组件，实现 VS Code 风格 UI。
    - [x] 适配 React 渲染与容器尺寸变化，避免初始化/刷新时报错。
- [x] **前后端通信管道 (IPC)**
    - [x] **Electron <-> Kernel**: 建立 WebSocket 连接。
    - [x] **Kernel**: 接收代码并在子进程中运行。
    - [x] **Kernel**: 实时捕获 stdout/stderr 并通过 WS 推送给前端。
    - [x] **App**: 前端收到 WS 消息，写入终端显示。
- [ ] **基础安全与隔离**
    - [x] 设置代码执行超时时间 (Timeout)。
    - [x] 支持中断运行（取消当前执行任务）。
    - [ ] 简单的 AST 检查（禁止 `os.system` 等高危操作 - 基础版）。

---

## 🎨 Phase 2: 混合渲染引擎 (Hybrid Rendering Engine)
**目标**: 实现 Manim 视频与 WebGL 交互的无缝融合。

- [ ] **Three.js 环境搭建**
    - [x] 安装 `three`、`@react-three/fiber`, `@react-three/drei`。
    - [x] 创建 `VisualCanvas` 组件。
    - [x] 建立最小联动协议：stdout 输出 `__VIS__ : <JSON>`，由 Kernel 提取并发送 vis 消息联动。
    - [x] 支持基础动作：patch/tween/reset（平滑插值动画）。
- [ ] **视频播放器开发**
    - [ ] 封装 HTML5 Video 播放器，支持精确跳转。
    - [ ] 实现“隐藏式”播放：视频层在下，Canvas 层在上（透明背景）。
- [ ] **Lesson Protocol (课程协议) 实现**
    - [ ] 定义 `Lesson` JSON Schema (视频时间轴 vs 交互事件)。
    - [ ] 开发 `TimelineController`：监听视频 `timeupdate`，触发交互组件挂载。
- [ ] **Demo 课程: 矩阵变换**
    - [ ] 制作/Mock 一段 Manim 视频（矩阵乘法介绍）。
    - [ ] 开发 `MatrixVisualizer` 组件（3D 向量/网格）。
    - [ ] 实现联动：代码修改矩阵数值 -> 3D 箭头实时旋转。

---

## 🧠 Phase 3: AI 导师与本地大模型 (AI Tutor)
**目标**: 赋予软件智能，基于本地 LLM 进行代码解释和问答。

- [ ] **本地 LLM 服务集成**
    - [ ] 编写脚本自动下载 `llama.cpp` 二进制文件。
    - [ ] 集成 `Qwen-2.5-Coder` 模型（GGUF 格式）。
    - [ ] 在设置页添加“模型管理”功能（下载/加载/卸载）。
- [ ] **AI 聊天界面**
    - [ ] 开发 `AIChatPanel` 组件（气泡式对话）。
    - [ ] 实现流式响应解析 (Server-Sent Events / Stream)。
- [ ] **智能特性**
    - [ ] **错误诊断**: 当 Kernel 返回 Traceback，自动发送给 LLM 请求解释。
    - [ ] **代码解释**: 选中代码段 -> 右键 "Explain This"。

---

## 💅 Phase 4: UI/UX 深度打磨 (Modern Polish)
**目标**: 打造干净、专业、耐看的生产力工具 UI。

- [ ] **设计系统实现**
    - [ ] 定义主题变量（浅色/深色、边框、阴影、圆角、间距）。
    - [ ] 统一排版（标题、正文、代码字体与字号层级）。
- [ ] **交互体验**
    - [ ] 面板可拖拽分割（编辑器/可视化/终端）。
    - [ ] 空状态与加载态（骨架屏、错误提示）。
    - [ ] 快捷键与命令面板（如 Ctrl+P）。
- [ ] **功能完善**
    - [ ] 技能树 (Skill Tree) 导航页面。
    - [ ] 用户进度持久化 (Local Storage / SQLite)。

---

## 📦 Phase 5: 发布与优化 (Release)
**目标**: 这是一个生产级软件。

- [ ] **打包构建**
    - [ ] 配置 `electron-builder` 打包 Windows/Mac 安装包。
    - [ ] 包含 Python 运行时和依赖的打包策略（或首次启动下载）。
- [ ] **性能优化**
    - [ ] Three.js 渲染性能调优。
    - [ ] 大模型推理内存占用优化。
- [ ] **文档与社区**
    - [ ] 编写用户手册。
    - [ ] 开放 UCG 课程编辑器（可选）。
