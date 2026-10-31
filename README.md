# dsh-plugin-updater

> Check installed DeepSeek Harness plugins for newer versions and update them with one click.

在 DeepSeek Harness 的 **插件（Plugins）** 页里检查已安装插件是否有新版本，并对可更新的插件提供一键更新。

入口分两处，各司其职：

- **插件 → 更新检查**（`plugins.tab`）：总览页。列出全部已安装插件，一眼看到哪些能更新、哪些已是最新；支持搜索、按状态筛选、逐条更新与批量更新。
- **插件详情页**（`plugins.detail.badge` + `plugins.detail.actions`）：就地更新。标题旁出现「可更新 1.2.3」标签，页头出现「更新到 1.2.3」按钮，与内置插件管理器给官方插件提供 Update 的位置一致。

发现性问题由右下角的轻提醒补足：启动后若检测到可更新插件，会在当前浏览器会话内提示一次，点击「查看」跳到插件页。设置页、侧栏不新增入口——安装/维护插件属于插件页的职责。

## 功能

- 列出当前 profile 中通过 `plugin_manager` 安装的插件，显示当前版本与注册表上的最新版本。
- 状态：`可更新` / `已是最新` / `本地版本更新` / `检查失败` / `已忽略`，以及本地、Git、压缩包、随 DSH 提供等跳过状态；跳过与失败会直接在行内给出原因。
- 一键更新：点击「更新」立即执行（先卸载旧版本、再安装新版本；安装失败时自动尝试回滚），过程中轮询 Host 进度，实时显示「卸载旧版本 → 安装 x.y.z → 确认结果」与已用时长。
- 批量更新：「全部更新（N）」会先确认一次，然后按顺序逐个更新，结束后汇总成功/失败；失败行可单独重试。
- 忽略此版本：按“包名 + 版本”记录在浏览器本地，忽略后不计入可更新数量，可随时取消忽略。
- 版本自证：页脚显示「更新检查 v0.3.0」「Host v0.3.0」与最近检查时间；浏览器端与 Host 端版本不一致时会提示重启 DSH，便于确认当前页面实际跑的是哪一版。
- 需要重启时给出提示；安装日志写入 profile 的插件管理器日志。

## 更新规则

- 只处理来自 npm registry 的已安装 bundle；`link:`/`file:` 本地插件、Git、tarball 与随 DSH 分发的 official bundle 不在此处更新。
- 更新动作与内置插件管理器的 Update 语义一致：remove + install（安装失败则尽量装回旧版本）。
- 版本比较使用 SemVer；pre-release 版本按 SemVer 规则排序。
- 忽略记录只存在浏览器 `localStorage`（键 `dsh-plugin-updater/ignored`），不写入 profile。

## 实现

- Host 半（`index.js`）注册三条同源 JSON 路由：
  - `GET /dsh-plugin-updater/api/state[?force=1]`：聚合 `pluginManager.listBundles()` 的已装插件，向 registry 查询 packument 的 `dist-tags.latest`，返回每个插件的状态与自身版本。
  - `POST /dsh-plugin-updater/api/update`：body `{ "name": "<package>" }`，执行更新并返回结果（错误带稳定的 code 与 detail）。
  - `GET /dsh-plugin-updater/api/progress`：返回当前正在执行的更新所处阶段（checking / removing / installing / verifying）与开始时间，供前端显示进度。
  - registry 优先级：`pluginManager.registries()` 的 resolved / registry / fallbackRegistries → `pluginRegistryProbe.fastest()` → `https://registry.npmjs.org/`。
- Client 半（`client.js`）：注册 `plugins.tab` 槽位（order 10）渲染总览；注册 `plugins.detail.badge`（order 5）与 `plugins.detail.actions`（order 10）两个详情页槽位，按 `subject` 渲染当前插件的更新标签与按钮，对没有可更新内容的 subject 返回 `null`；注册 `shell.overlay` 槽位渲染右下角提醒。三者共享同一份 Host 状态缓存；文案走 Client locale（zh/en）；样式只使用 `--dsw-alias-*` 主题 token。

## 安装

```
plugin_manager action=install_bundle target=<本目录的绝对路径>
```

Host 半（`index.js`）改动需要重启 DSH 后才会载入；Client 半通常由 HMR 自动更新。

安装后可到 插件 → 更新检查 打开。

## License

[MIT](./LICENSE)
