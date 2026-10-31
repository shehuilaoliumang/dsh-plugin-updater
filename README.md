# dsh-plugin-updater

> Check installed DeepSeek Harness plugins for newer versions and update them with one click.

在 DeepSeek Harness 的 **插件（Plugins）** 页里检查已安装插件是否有新版本，并对可更新的插件提供一键更新。

入口分三处，各司其职：

- **侧栏 → 更新检查**（`sidebar.panellist` 图标 + 同名 `main` 面板）：日常入口。图标与插件页图标同排，有可更新插件时右上角带提示点；点开就是完整的检查面板与自动更新设置。
- **插件 → 更新检查**（`plugins.tab`）：插件页内的总览标签页，内容与侧栏面板一致（复用同一组件），支持搜索、按状态筛选、逐条更新与批量更新。
- **插件详情页**（`plugins.detail.badge` + `plugins.detail.actions`）：就地更新。标题旁出现「可更新 1.2.3」标签，页头出现「更新到 1.2.3」按钮，与内置插件管理器给官方插件提供 Update 的位置一致。

发现性问题由右下角的限时提醒补足：启动后若检测到可更新插件，会弹出一个 5 秒后自动消失、也可手动关闭的提醒卡，可直接「全部更新」或跳到插件页；同一批可更新插件在同一浏览器会话内只提醒一次。设置页不新增入口——自动更新设置就在本插件的总览与侧栏面板里。

## 功能

- 列出当前 profile 中通过 `plugin_manager` 安装的插件，显示当前版本与注册表上的最新版本。
- 状态：`可更新` / `已是最新` / `本地版本更新` / `检查失败` / `已忽略`，以及本地、Git、压缩包、随 DSH 提供等跳过状态；跳过与失败会直接在行内给出原因。
- 一键更新：点击「更新」立即执行（先卸载旧版本、再安装新版本；安装失败时自动尝试回滚），过程中轮询 Host 进度，实时显示「卸载旧版本 → 安装 x.y.z → 确认结果」与已用时长。
- 批量更新：「全部更新（N）」会先确认一次，然后由 Host 顺序执行，结束后汇总成功/失败；失败行可单独重试。
- 忽略此版本：按“包名 + 版本”记录在 Host 端设置文件里，忽略后不计入可更新数量，可随时取消忽略；旧版存在浏览器 `localStorage` 的忽略记录会在首次升级后自动迁移。
- 自动更新（默认关闭，在「更新检查」页顶部设置：）
  - **打开页面时自动更新**：DSH Web UI 每次打开时检查一次，并把所有可更新插件自动更新掉，完成后用限时提醒汇总结果。
  - **定时后台更新**：DSH 运行期间按固定间隔检查并更新，间隔可设 30 分钟～30 天；开启后约 1.5 秒会先执行一次。
  - 自动更新同样只处理 npm 第三方插件，并复用“失败自动回滚”的更新流程。
- 版本自证：页脚显示「更新检查 v0.4.0」「Host v0.4.0」与最近检查时间；浏览器端与 Host 端版本不一致时会提示重启 DSH，便于确认当前页面实际跑的是哪一版。
- 需要重启时给出提示；安装日志写入 profile 的插件管理器日志。

## 更新规则

- 只处理来自 npm registry 的已安装 bundle；`link:`/`file:` 本地插件、Git、tarball 与随 DSH 分发的 official bundle 不在此处更新。
- 更新动作与内置插件管理器的 Update 语义一致：remove + install（安装失败则尽量装回旧版本）。
- 版本比较使用 SemVer；pre-release 版本按 SemVer 规则排序。
- 忽略记录与自动更新设置存在 `~/.dsh/plugin-updater/settings.json`（可用 `DSH_HOME` 覆盖用户目录），不写入 profile 的 `package.json` 或 `cordis.patch.yml`。

## 实现

- Host 半（`index.js`）注册五条同源 JSON 路由：
  - `GET /dsh-plugin-updater/api/state[?force=1]`：聚合 `pluginManager.listBundles()` 的已装插件，向 registry 查询 packument 的 `dist-tags.latest`，返回每个插件的状态、自身版本、自动更新设置、下次定时时间与上次自动执行结果。
  - `POST /dsh-plugin-updater/api/update`：body `{ "name": "<package>" }`，执行单个更新并返回结果（错误带稳定的 code 与 detail）。
  - `GET /dsh-plugin-updater/api/progress`：返回当前正在执行的更新所处阶段（checking / removing / installing / verifying）、序号与总数，供前端显示进度。
  - `GET|POST /dsh-plugin-updater/api/settings`：读取/合并保存自动更新设置（`autoUpdate.pageOpen`、`autoUpdate.scheduled.{enabled,intervalMinutes}` 与忽略表 `ignored`），设置写入 `~/.dsh/plugin-updater/settings.json`，与 profile 配置隔离。
  - `POST /dsh-plugin-updater/api/update-batch`：body `{ "names": ["..."] }`（省略则用当前全部可更新项），顺序更新并汇总成功/失败。
  - registry 优先级：`pluginManager.registries()` 的 resolved / registry / fallbackRegistries → `pluginRegistryProbe.fastest()` → `https://registry.npmjs.org/`。
- Client 半（`client.js`）：注册 `sidebar.panellist`（`id: dsh-plugin-updater`，order 2）提供侧栏图标（有可更新插件时带提示点），并注册同名 `main` 面板（`key: dsh-plugin-updater`）承载完整检查面板；注册 `plugins.tab` 槽位（order 10）渲染同一份总览与自动更新设置卡；注册 `plugins.detail.badge`（order 5）与 `plugins.detail.actions`（order 10）两个详情页槽位，按 `subject` 渲染当前插件的更新标签与按钮，对没有可更新内容的 subject 返回 `null`；注册 `shell.overlay` 槽位渲染右下角 5 秒限时提醒（倒计时进度条、可关闭、可直接全部更新）。启动时会把旧 `localStorage` 忽略记录迁移到 Host，并按设置决定自动更新还是弹提醒。各组件共享同一份 Host 状态缓存；文案走 Client locale（zh/en）；样式只使用 `--dsw-alias-*` 主题 token。

## 安装

```
plugin_manager action=install_bundle target=<本目录的绝对路径>
```

Host 半（`index.js`）改动需要重启 DSH 后才会载入；Client 半通常由 HMR 自动更新。插件页顶部「更新检查」里可打开自动更新设置。

## License

[MIT](./LICENSE)
