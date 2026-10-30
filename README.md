# dsh-plugin-updater

> Check installed DeepSeek Harness plugins for newer versions and update them with one click.

在 DeepSeek Harness 的 **插件（Plugins）** 页里检查已安装插件是否有新版本，并对可更新的插件提供一键更新。

入口分两处，各司其职：

- **插件 → 更新检查**（`plugins.tab`）：总览页。列出全部已安装插件，一眼看到哪些能更新、哪些已是最新，并批量处理。
- **插件详情页**（`plugins.detail.badge` + `plugins.detail.actions`）：就地更新。标题旁出现「可更新 1.2.3」标签，页头出现「更新到 1.2.3」按钮，与内置插件管理器给官方插件提供 Update 的位置一致。

这样把“发现”（总览）与“执行”（详情页就地操作）分开：用户既能在列表里扫一遍，也能在查看某插件详情时直接更新，不必来回切换。

## 功能

- 列出当前 profile 中通过 `plugin_manager` 安装的插件，显示当前版本与注册表上的最新版本。
- 状态：`可更新` / `已是最新` / `本地版本更新` / `检查失败` / 以及本地、Git、压缩包、随 DSH 提供等跳过状态。
- 插件详情页内联更新：可更新时标题旁显示标签、页头显示更新按钮，点击后就地确认并执行，无需离开详情页。
- 点击“更新”按钮：确认后先卸载当前版本，再安装最新版本；安装失败时尝试回滚到原版本。
- 需要重启时给出提示；安装日志写入 profile 的插件管理器日志。

## 更新规则

- 只处理来自 npm registry 的已安装 bundle；`link:`/`file:` 本地插件、Git、tarball 与随 DSH 分发的 official bundle 不在此处更新。
- 更新动作与内置插件管理器的 Update 语义一致：remove + install（安装失败则尽量装回旧版本）。
- 版本比较使用 SemVer；pre-release 版本按 SemVer 规则排序。

## 实现

- Host 半（`index.js`）：注册两条同源 JSON 路由
  - `GET /dsh-plugin-updater/api/state[?force=1]`：聚合 `pluginManager.listBundles()` 的已装插件，向 registry 查询 packument 的 `dist-tags.latest`，返回每个插件的状态。
  - `POST /dsh-plugin-updater/api/update`：body `{ "name": "<package>" }`，执行更新并返回结果。
  - registry 优先级：`pluginManager.registries()` 的 resolved / registry / fallbackRegistries → `pluginRegistryProbe.fastest()` → `https://registry.npmjs.org/`。
- Client 半（`client.js`）：注册 `plugins.tab` 槽位（order 10）渲染总览表格；同时注册 `plugins.detail.badge`（order 5）与 `plugins.detail.actions`（order 10）两个详情页槽位，按 `subject` 渲染当前插件的更新标签与按钮，对没有可更新内容的 subject 返回 `null`。三者共享同一份 Host 状态缓存；文案走 Client locale（zh/en）；样式只使用 `--dsw-alias-*` 主题 token。

## 安装

```
plugin_manager action=install_bundle target=<本目录的绝对路径>
```

安装后可到 插件 → 更新检查 打开。

## License

[MIT](./LICENSE)
