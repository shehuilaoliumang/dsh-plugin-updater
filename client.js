window.__ModuleLoader__.load({
  id: 'dsh-plugin-updater',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const VERSION = '0.3.0'
    const NS = 'dsh-plugin-updater'
    const STATE_URL = '/dsh-plugin-updater/api/state'
    const UPDATE_URL = '/dsh-plugin-updater/api/update'
    const PROGRESS_URL = '/dsh-plugin-updater/api/progress'
    const IGNORE_KEY = 'dsh-plugin-updater/ignored'
    const TOAST_KEY = 'dsh-plugin-updater/toast-shown'
    const POLL_MS = 1200
    const STALE_AFTER_MS = 5 * 60 * 1000

    const zh = {
      tab: '更新检查',
      title: '插件更新检查',
      intro: '检查已安装插件的新版本。点击「更新」会先卸载旧版本再安装新版本，失败时自动回滚；批量更新前会再确认一次。',
      refresh: '重新检查',
      refreshing: '正在检查…',
      loading: '正在检查插件版本…',
      loadingHint: '正在查询 npm 注册表，首次检查通常需要几秒。',
      error: '检查失败',
      retry: '重试',
      dismiss: '关闭',
      noVersion: '—',
      countsTotal: '共 {n} 个插件',
      countUpdatable: '{n} 个可更新',
      countUpToDate: '{n} 个已最新',
      countSkipped: '{n} 个跳过',
      countFailed: '{n} 个失败',
      filterAll: '全部',
      filterUpdatable: '可更新',
      filterUpToDate: '已最新',
      filterSkipped: '已跳过',
      filterFailed: '失败',
      searchPlaceholder: '搜索插件名称…',
      noMatches: '没有匹配的插件。',
      allUpToDateTitle: '全部插件均为最新版本',
      allUpToDateBody: '检查于 {time}。有新版本发布会显示在这里，也可以随时点「重新检查」。',
      empty: '没有可检查的插件。',
      updateAll: '全部更新（{n}）',
      updateAllTitle: '批量更新 {n} 个插件',
      updateAllBody: '将按顺序更新：{names}。更新期间请勿关闭 DSH。',
      updateAllStart: '开始更新',
      updateAllCancel: '取消',
      batchRunning: '正在批量更新（{done}/{total}）：{name}',
      batchWaiting: '正在批量更新（{done}/{total}）…',
      batchSummaryOk: '全部 {n} 个插件已更新',
      batchSummaryPartial: '已更新 {ok} 个，失败 {failed} 个：{names}',
      update: '更新',
      updating: '正在更新…',
      ignoreVersion: '忽略此版本',
      unignore: '取消忽略',
      ignoredBadge: '已忽略',
      status_update_available: '可更新',
      status_up_to_date: '已是最新',
      status_ahead: '本地版本更新',
      status_shipped: '随 DSH 提供',
      status_local: '本地插件',
      status_git: 'Git 来源',
      status_tarball: '压缩包来源',
      status_unknown_source: '来源未知',
      status_unknown_version: '版本无法比较',
      status_error: '检查失败',
      status_unknown: '未知',
      status_ignored: '已忽略',
      skip_local: '本地开发链接，不检查更新；改完源码后在插件管理器里重装即可。',
      skip_git: 'Git 来源；请更新源仓库后重新安装。',
      skip_tarball: '压缩包来源；请安装新版本的压缩包。',
      skip_shipped: '随 DSH 提供，升级 DSH 即可获得新版本。',
      skip_unknown_source: '无法识别来源，不检查更新。',
      checkFailedHint: '检查失败：{detail}',
      unknownVersionHint: '版本无法比较：{detail}',
      detailBadge: '可更新 {latest}',
      detailUpdate: '更新到 {latest}',
      detailBusy: '正在更新…',
      detailDone: '已更新到 {version}',
      detailDoneRestart: '已更新，重启 DSH 后生效',
      detailFailed: '更新失败：{detail}',
      detailRetry: '重试',
      detailHint: '点击立即更新，失败会自动回滚',
      progressTitle: '正在更新 {name}',
      progressChecking: '正在检查版本…',
      progressRemoving: '正在卸载旧版本…',
      progressInstalling: '正在安装 {version}…',
      progressVerifying: '正在确认安装结果…',
      progressElapsed: '已用时 {seconds} 秒',
      updateDone: '已更新 {name}：{from} → {to}',
      updateDoneUnverified: '已更新 {name}，但未能确认最终版本，请刷新查看。',
      updateRestart: '请重启 DSH 使更改生效。{reason}',
      updateFailed: '更新 {name} 失败：{detail}',
      updateRolledBack: '已尝试回滚到原版本。',
      updateRollbackFailed: '回滚失败：{error}',
      updatePendingBuilds: '该版本包含需要批准的构建脚本：{names}。请在插件管理器中批准后重试。',
      updateNoDetail: '未知错误',
      updateWarning: '提示：{detail}',
      err_not_installed: '插件未安装',
      err_shipped_bundle: '随 DSH 提供的插件不能在这里更新',
      err_unsupported_source: '该来源类型不支持自动更新',
      err_registry_unreachable: '无法连接 npm 注册表',
      err_invalid_version: '版本号无法比较',
      err_no_update: '没有可用的新版本',
      err_remove_failed: '卸载旧版本失败',
      err_install_failed: '安装新版本失败',
      err_update_failed: '更新过程出错',
      err_busy: '另一个更新正在进行',
      err_invalid_name: '插件名无效',
      err_invalid_body: '请求内容无效',
      err_untrusted_origin: '请求来源不可信',
      versionFooter: '更新检查 v{client}',
      hostVersionFooter: 'Host v{host}',
      versionMismatch: '浏览器端 v{client} 与 Host 端 v{host} 不一致：请重启 DSH 以加载新代码。',
      checkedJustNow: '刚刚检查',
      checkedMinutesAgo: '{n} 分钟前检查',
      checkedAtTime: '检查于 {time}',
      registry: '注册表 {registry}',
      skipHint: '本地、Git、压缩包与随 DSH 提供的插件不在此更新。',
      openDetail: '插件详情',
      toastTitle: '有 {n} 个插件可更新',
      toastBody: '打开插件页的「更新检查」即可一键更新。',
      toastView: '查看',
      toastDismiss: '稍后',
    }

    const en = {
      tab: 'Update check',
      title: 'Plugin updates',
      intro: 'Check installed plugins for newer versions. Update removes the old version and installs the new one, restoring the old version if the install fails; batch updates ask once more before starting.',
      refresh: 'Check again',
      refreshing: 'Checking…',
      loading: 'Checking plugin versions…',
      loadingHint: 'Querying the npm registry; the first check usually takes a few seconds.',
      error: 'Check failed',
      retry: 'Retry',
      dismiss: 'Dismiss',
      noVersion: '—',
      countsTotal: '{n} plugins',
      countUpdatable: '{n} updatable',
      countUpToDate: '{n} up to date',
      countSkipped: '{n} skipped',
      countFailed: '{n} failed',
      filterAll: 'All',
      filterUpdatable: 'Updatable',
      filterUpToDate: 'Up to date',
      filterSkipped: 'Skipped',
      filterFailed: 'Failed',
      searchPlaceholder: 'Search plugins…',
      noMatches: 'No matching plugins.',
      allUpToDateTitle: 'Everything is up to date',
      allUpToDateBody: 'Checked {time}. New releases will show up here; you can check again anytime.',
      empty: 'No plugins to check.',
      updateAll: 'Update all ({n})',
      updateAllTitle: 'Update {n} plugins',
      updateAllBody: 'Updates in order: {names}. Do not close DSH while this runs.',
      updateAllStart: 'Start',
      updateAllCancel: 'Cancel',
      batchRunning: 'Updating {done}/{total}: {name}',
      batchWaiting: 'Updating {done}/{total}…',
      batchSummaryOk: 'Updated all {n} plugins',
      batchSummaryPartial: 'Updated {ok}, failed {failed}: {names}',
      update: 'Update',
      updating: 'Updating…',
      ignoreVersion: 'Ignore this version',
      unignore: 'Unignore',
      ignoredBadge: 'Ignored',
      status_update_available: 'Update available',
      status_up_to_date: 'Up to date',
      status_ahead: 'Installed is newer',
      status_shipped: 'Ships with DSH',
      status_local: 'Local plugin',
      status_git: 'Git source',
      status_tarball: 'Tarball source',
      status_unknown_source: 'Unknown source',
      status_unknown_version: 'Versions not comparable',
      status_error: 'Check failed',
      status_unknown: 'Unknown',
      status_ignored: 'Ignored',
      skip_local: 'Local development link — not checked; reinstall from the plugin manager after changing the source.',
      skip_git: 'Git source — update the source repository, then reinstall.',
      skip_tarball: 'Tarball source — install a newer tarball.',
      skip_shipped: 'Ships with DSH — upgrade DSH to get a newer version.',
      skip_unknown_source: 'Source not recognized — not checked.',
      checkFailedHint: 'Check failed: {detail}',
      unknownVersionHint: 'Versions not comparable: {detail}',
      detailBadge: 'Update {latest} available',
      detailUpdate: 'Update to {latest}',
      detailBusy: 'Updating…',
      detailDone: 'Updated to {version}',
      detailDoneRestart: 'Updated — restart DSH to apply',
      detailFailed: 'Update failed: {detail}',
      detailRetry: 'Retry',
      detailHint: 'Click to update now; restores the old version if it fails',
      progressTitle: 'Updating {name}',
      progressChecking: 'Checking version…',
      progressRemoving: 'Removing the old version…',
      progressInstalling: 'Installing {version}…',
      progressVerifying: 'Verifying the installation…',
      progressElapsed: '{seconds}s elapsed',
      updateDone: 'Updated {name}: {from} → {to}',
      updateDoneUnverified: 'Updated {name}, but the final version could not be verified. Refresh to check.',
      updateRestart: 'Restart DSH to apply the change. {reason}',
      updateFailed: 'Updating {name} failed: {detail}',
      updateRolledBack: 'Tried to restore the previous version.',
      updateRollbackFailed: 'Restore failed: {error}',
      updatePendingBuilds: 'This version contains build scripts that need approval: {names}. Approve them in the plugin manager and try again.',
      updateNoDetail: 'unknown error',
      updateWarning: 'Note: {detail}',
      err_not_installed: 'The plugin is not installed',
      err_shipped_bundle: 'DSH-shipped plugins cannot be updated here',
      err_unsupported_source: 'This source type cannot be updated automatically',
      err_registry_unreachable: 'The npm registry is unreachable',
      err_invalid_version: 'Versions cannot be compared',
      err_no_update: 'No newer version is available',
      err_remove_failed: 'Removing the old version failed',
      err_install_failed: 'Installing the new version failed',
      err_update_failed: 'The update failed',
      err_busy: 'Another update is already running',
      err_invalid_name: 'Invalid plugin name',
      err_invalid_body: 'Invalid request body',
      err_untrusted_origin: 'Untrusted request origin',
      versionFooter: 'Update check v{client}',
      hostVersionFooter: 'Host v{host}',
      versionMismatch: 'Browser half v{client} does not match host half v{host}: restart DSH to load the new code.',
      checkedJustNow: 'Checked just now',
      checkedMinutesAgo: 'Checked {n} min ago',
      checkedAtTime: 'Checked {time}',
      registry: 'Registry {registry}',
      skipHint: 'Local, Git, tarball and DSH-shipped plugins are not updated here.',
      openDetail: 'Plugin page',
      toastTitle: '{n} plugin updates available',
      toastBody: 'Open the “Update check” tab in the Plugins page to update them.',
      toastView: 'View',
      toastDismiss: 'Later',
    }

    const CSS = `
.dpu-root { display: flex; flex-direction: column; gap: 14px; padding: 4px 0 8px; color: var(--dsw-alias-label-primary); font-size: 13px; }
.dpu-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dpu-head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dpu-title { font-size: 15px; font-weight: 600; line-height: 20px; margin: 0; }
.dpu-intro { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; margin: 0; max-width: 760px; }
.dpu-head-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.dpu-btn { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border: 0; border-radius: 8px; padding: 6px 12px; font-size: 12px; line-height: 16px; cursor: pointer; transition: background 120ms ease; white-space: nowrap; }
.dpu-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dpu-btn:disabled { opacity: 0.55; cursor: default; }
.dpu-btn-primary { box-shadow: none; background: var(--dsw-alias-brand-primary); color: #fff; }
.dpu-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-brand-primary); filter: brightness(1.08); }
.dpu-btn-ghost { box-shadow: none; background: transparent; padding: 4px 8px; }
.dpu-btn-ghost:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dpu-btn-small { padding: 4px 10px; font-size: 11px; }
.dpu-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dpu-toolbar-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dpu-toolbar-right { display: flex; align-items: center; gap: 8px; }
.dpu-chips { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dpu-chip { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary); border: 0; border-radius: 999px; padding: 4px 10px; font-size: 12px; line-height: 16px; cursor: pointer; }
.dpu-chip:hover { background: var(--dsw-alias-bg-layer-1); }
.dpu-chip-active { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dpu-chip-warn { color: var(--dsw-alias-state-warn-primary); }
.dpu-search-input { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border: 0; border-radius: 8px; padding: 5px 10px; font-size: 12px; line-height: 16px; width: 200px; }
.dpu-search-input::placeholder { color: var(--dsw-alias-label-secondary); }
.dpu-table-wrap { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); border-radius: 10px; overflow: hidden; }
.dpu-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.dpu-table th { text-align: left; font-weight: 500; font-size: 12px; color: var(--dsw-alias-label-secondary); padding: 8px 12px; background: var(--dsw-alias-bg-layer-1); border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dpu-table td { padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); vertical-align: middle; }
.dpu-table tbody tr:hover td { background: var(--dsw-alias-bg-layer-1); }
.dpu-table tr:last-child td { border-bottom: 0; }
.dpu-col-name { width: 36%; }
.dpu-col-version { width: 13%; white-space: nowrap; }
.dpu-col-status { width: 16%; }
.dpu-col-action { width: 22%; text-align: right; white-space: nowrap; }
.dpu-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dpu-name-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dpu-name-id { color: var(--dsw-alias-label-secondary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dpu-name-note { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 15px; white-space: normal; }
.dpu-version { font-variant-numeric: tabular-nums; }
.dpu-version-old { color: var(--dsw-alias-label-secondary); }
.dpu-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px; line-height: 16px; white-space: nowrap; }
.dpu-badge-update { background: var(--dsw-alias-state-warn-primary); color: #1f2329; }
.dpu-badge-ok { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dpu-badge-error { background: var(--dsw-alias-state-error-primary); color: #fff; }
.dpu-badge-skip { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dpu-state { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; padding: 18px 0; color: var(--dsw-alias-label-secondary); }
.dpu-state-row { display: flex; align-items: center; gap: 10px; }
.dpu-notice { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 18px; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.dpu-notice-error { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-error-primary); }
.dpu-notice-warn { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-warn-primary); }
.dpu-notice-ok { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-success-primary); }
.dpu-notice-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dpu-notice-title { font-weight: 600; }
.dpu-confirm { display: flex; flex-direction: column; gap: 10px; border-radius: 10px; padding: 12px; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 18px; }
.dpu-confirm-title { font-weight: 600; font-size: 13px; }
.dpu-confirm-body { color: var(--dsw-alias-label-secondary); }
.dpu-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
.dpu-foot { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; display: flex; flex-wrap: wrap; gap: 12px; }
.dpu-progress { display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-primary); font-size: 12px; }
.dpu-progress-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dpu-progress-phase { font-weight: 500; }
.dpu-progress-elapsed { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.dpu-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--dsw-alias-border-l2); border-top-color: var(--dsw-alias-brand-primary); animation: dpu-spin 0.8s linear infinite; flex-shrink: 0; }
.dpu-inline-row { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; }
@keyframes dpu-spin { to { transform: rotate(360deg); } }
`

    // ---------------------------------------------------------------------
    // Small helpers
    // ---------------------------------------------------------------------

    function format(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (values !== null && values !== undefined && Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match))
    }

    function formatTime(iso) {
      if (typeof iso !== 'string' || iso === '') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return iso
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    function formatCheckedAt(t, iso) {
      if (typeof iso !== 'string' || iso === '') return ''
      const parsed = Date.parse(iso)
      if (!Number.isFinite(parsed)) return format(t('checkedAtTime'), { time: iso })
      const age = Date.now() - parsed
      if (age >= 0 && age < 45 * 1000) return t('checkedJustNow')
      const minutes = Math.round(age / 60000)
      if (minutes >= 0 && minutes < 60) return format(t('checkedMinutesAgo'), { n: minutes })
      return format(t('checkedAtTime'), { time: new Date(parsed).toLocaleString() })
    }

    function abbreviateSource(source) {
      if (typeof source !== 'string') return ''
      if (source.length <= 72) return source
      return `${source.slice(0, 34)}…${source.slice(-34)}`
    }

    function formatElapsed(progress) {
      if (progress === null || typeof progress !== 'object' || typeof progress.startedAt !== 'string') return ''
      const started = Date.parse(progress.startedAt)
      if (!Number.isFinite(started)) return ''
      return String(Math.max(0, Math.round((Date.now() - started) / 1000)))
    }

    function phaseText(t, progress) {
      if (progress === null || typeof progress !== 'object') return t('updating')
      const version = typeof progress.targetVersion === 'string' ? progress.targetVersion : ''
      if (progress.phase === 'checking') return t('progressChecking')
      if (progress.phase === 'removing') return t('progressRemoving')
      if (progress.phase === 'installing') return format(t('progressInstalling'), { version })
      if (progress.phase === 'verifying') return t('progressVerifying')
      return t('updating')
    }

    function labelOf(t, key) {
      const value = t(key)
      return typeof value === 'string' && value !== key ? value : null
    }

    function errorTextOf(t, payload) {
      if (payload === null || typeof payload !== 'object' || typeof payload.error !== 'string' || payload.error === '') return t('updateNoDetail')
      const codeKey = `err_${payload.error.replace(/-/g, '_')}`
      const label = labelOf(t, codeKey)
      const detail = typeof payload.detail === 'string' ? payload.detail.trim() : ''
      if (label !== null) return detail === '' ? label : `${label}：${detail}`
      return detail === '' ? payload.error : `${payload.error}：${detail}`
    }

    function skipTextOf(t, status) {
      return labelOf(t, `skip_${String(status).replace(/-/g, '_')}`)
    }

    // ---------------------------------------------------------------------
    // Client-side preferences (ignored versions) and shared state
    // ---------------------------------------------------------------------

    const SKIPPED_STATUSES = new Set(['local', 'git', 'tarball', 'unknown-source', 'shipped'])

    function readIgnored() {
      try {
        const raw = window.localStorage.getItem(IGNORE_KEY)
        if (typeof raw !== 'string' || raw === '') return {}
        const parsed = JSON.parse(raw)
        return parsed !== null && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }

    function writeIgnored(map) {
      try {
        window.localStorage.setItem(IGNORE_KEY, JSON.stringify(map))
      } catch {
        // localStorage may be unavailable; the tab still works without it.
      }
    }

    function ignoredVersionOf(name) {
      const map = readIgnored()
      return Object.prototype.hasOwnProperty.call(map, name) && typeof map[name] === 'string' ? map[name] : null
    }

    function setIgnore(name, latestVersion) {
      const map = readIgnored()
      if (latestVersion === null) delete map[name]
      else map[name] = latestVersion
      writeIgnored(map)
    }

    const stateCache = { value: null, promise: null }
    const recentUpdates = new Map()

    function invalidateState() {
      stateCache.value = null
      stateCache.promise = null
    }

    function loadState(force) {
      if (force !== true && stateCache.value !== null) return Promise.resolve(stateCache.value)
      if (force !== true && stateCache.promise !== null) return stateCache.promise
      const request = fetch(STATE_URL + (force === true ? '?force=1' : ''), { headers: { accept: 'application/json' } })
        .then(async (response) => {
          const payload = await response.json().catch(() => null)
          if (!response.ok || payload === null || payload.ok !== true) {
            throw new Error(payload !== null && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`)
          }
          stateCache.value = payload
          return payload
        })
        .finally(() => {
          if (stateCache.promise === request) stateCache.promise = null
        })
      stateCache.promise = request
      return request
    }

    function postUpdate(name) {
      return fetch(UPDATE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ name }),
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null)
          invalidateState()
          return { responseOk: response.ok, payload }
        })
        .catch((error) => {
          invalidateState()
          throw error
        })
    }

    function pollProgress(onProgress) {
      let stopped = false
      const tick = () => {
        if (stopped) return
        fetch(PROGRESS_URL, { headers: { accept: 'application/json' } })
          .then(async (response) => {
            if (!response.ok || stopped) return
            const payload = await response.json().catch(() => null)
            if (stopped || payload === null || payload.ok !== true) return
            onProgress(payload.running === true && payload.progress !== null && typeof payload.progress === 'object' ? payload.progress : null)
          })
          .catch(() => {
            // Progress is a nicety; a failed poll must never break an update.
          })
      }
      tick()
      const timer = window.setInterval(tick, POLL_MS)
      return () => {
        stopped = true
        window.clearInterval(timer)
      }
    }

    function findRow(state, name) {
      const plugins = state !== null && Array.isArray(state.plugins) ? state.plugins : []
      return plugins.find((entry) => entry !== null && typeof entry === 'object' && entry.name === name) || null
    }

    function subjectPackage(subject) {
      if (subject === null || typeof subject !== 'object') return null
      const pkg = subject.pkg
      if (pkg === null || typeof pkg !== 'object') return null
      if (typeof pkg.name !== 'string' || pkg.name === '') return null
      if (pkg.installed !== true) return null
      return pkg
    }

    const STATUS_BADGE = {
      'update-available': 'dpu-badge-update',
      'up-to-date': 'dpu-badge-ok',
      ahead: 'dpu-badge-ok',
      'unknown-version': 'dpu-badge-error',
      error: 'dpu-badge-error',
      shipped: 'dpu-badge-skip',
      local: 'dpu-badge-skip',
      git: 'dpu-badge-skip',
      tarball: 'dpu-badge-skip',
      'unknown-source': 'dpu-badge-skip',
      unknown: 'dpu-badge-skip',
      ignored: 'dpu-badge-skip',
    }

    function statusKey(status) {
      return `status_${String(status).replace(/-/g, '_')}`
    }

    function badge(t, status) {
      const className = STATUS_BADGE[status] !== undefined ? STATUS_BADGE[status] : 'dpu-badge-skip'
      return h('span', { className: `dpu-badge ${className}` }, t(statusKey(status)))
    }

    // ---------------------------------------------------------------------
    // Detail-page contributions
    // ---------------------------------------------------------------------

    const badgeStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: '999px',
      padding: '2px 8px',
      fontSize: '11px',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
      background: 'var(--dsw-alias-state-warn-primary)',
      color: '#1f2329',
    }

    const baseButtonStyle = {
      boxShadow: 'inset 0 0 0 1px var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)',
      border: 0,
      borderRadius: '8px',
      padding: '6px 12px',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '16px',
      cursor: 'pointer',
    }

    const primaryButtonStyle = {
      ...baseButtonStyle,
      boxShadow: 'none',
      background: 'var(--dsw-alias-brand-primary)',
      color: '#fff',
    }

    const ghostButtonStyle = {
      ...baseButtonStyle,
      boxShadow: 'none',
      background: 'transparent',
      padding: '4px 8px',
    }

    const hintStyle = { fontSize: '12px', lineHeight: '16px', color: 'var(--dsw-alias-label-secondary)' }
    const errorHintStyle = { ...hintStyle, color: 'var(--dsw-alias-state-error-primary)' }

    function createDetailBadge(t) {
      return function PluginUpdaterDetailBadge(props) {
        const pkg = subjectPackage(props !== null && typeof props === 'object' ? props.subject : null)
        const name = pkg === null ? null : pkg.name
        const version = pkg === null || typeof pkg.version !== 'string' ? '' : pkg.version
        const [row, setRow] = React.useState(null)

        React.useEffect(() => {
          if (name === null) {
            setRow(null)
            return undefined
          }
          let cancelled = false
          loadState(false)
            .then((state) => {
              if (!cancelled) setRow(findRow(state, name))
            })
            .catch(() => {
              if (!cancelled) setRow(null)
            })
          return () => {
            cancelled = true
          }
        }, [name, version])

        if (row === null || row.status !== 'update-available' || typeof row.latestVersion !== 'string') return null
        if (ignoredVersionOf(name) === row.latestVersion) return null
        return h('span', {
          style: badgeStyle,
          title: typeof row.source === 'string' ? row.source : undefined,
        }, format(t('detailBadge'), { latest: row.latestVersion }))
      }
    }

    function createDetailAction(t) {
      return function PluginUpdaterDetailAction(props) {
        const pkg = subjectPackage(props !== null && typeof props === 'object' ? props.subject : null)
        const name = pkg === null ? null : pkg.name
        const version = pkg === null || typeof pkg.version !== 'string' ? '' : pkg.version
        const [row, setRow] = React.useState(null)
        const [phase, setPhase] = React.useState('idle')
        const [message, setMessage] = React.useState(null)
        const [progress, setProgress] = React.useState(null)
        const [recent, setRecent] = React.useState(() => {
          const entry = name === null ? undefined : recentUpdates.get(name)
          return entry !== undefined && Date.now() - entry.at < 60000 ? entry.message : null
        })
        const alive = React.useRef(true)

        React.useEffect(() => {
          alive.current = true
          return () => {
            alive.current = false
          }
        }, [])

        React.useEffect(() => {
          if (name === null) {
            setRow(null)
            return undefined
          }
          let cancelled = false
          loadState(false)
            .then((state) => {
              if (!cancelled) setRow(findRow(state, name))
            })
            .catch(() => {
              if (!cancelled) setRow(null)
            })
          return () => {
            cancelled = true
          }
        }, [name, version])

        React.useEffect(() => {
          setPhase('idle')
          setMessage(null)
          setProgress(null)
        }, [name])

        const latest = row !== null && typeof row.latestVersion === 'string' ? row.latestVersion : null
        const ignored = latest !== null && ignoredVersionOf(name) === latest

        function startUpdate() {
          if (name === null || phase === 'busy') return
          setPhase('busy')
          setMessage(null)
          setProgress(null)
          const stop = pollProgress((value) => {
            if (alive.current) setProgress(value)
          })
          postUpdate(name)
            .then(({ payload }) => {
              stop()
              if (!alive.current) return
              setProgress(null)
              if (payload !== null && typeof payload === 'object' && payload.ok === true) {
                const to = typeof payload.verifiedVersion === 'string'
                  ? payload.verifiedVersion
                  : typeof payload.toVersion === 'string'
                    ? payload.toVersion
                    : latest || ''
                const restart = payload.application === 'restart-required'
                const text = restart ? t('detailDoneRestart') : format(t('detailDone'), { version: to })
                recentUpdates.set(name, { message: text, at: Date.now() })
                setRecent(text)
                setPhase('done')
                setMessage(text)
                loadState(false).then((state) => {
                  if (alive.current) setRow(findRow(state, name))
                }).catch(() => {})
                return
              }
              setPhase('error')
              setMessage(format(t('detailFailed'), { detail: errorTextOf(t, payload) }))
            })
            .catch((error) => {
              stop()
              if (!alive.current) return
              setProgress(null)
              const detail = error !== null && typeof error.message === 'string' ? error.message : t('updateNoDetail')
              setPhase('error')
              setMessage(format(t('detailFailed'), { detail }))
            })
        }

        if (name === null) return null
        if (phase === 'busy') {
          const phaseLabel = progress === null ? t('detailBusy') : phaseText(t, progress)
          const elapsed = progress === null ? '' : formatElapsed(progress)
          const text = elapsed === '' ? phaseLabel : `${phaseLabel} · ${format(t('progressElapsed'), { seconds: elapsed })}`
          return h('span', { style: hintStyle }, text)
        }
        if (phase === 'done') return h('span', { style: hintStyle }, message)
        if (phase === 'error') {
          return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { key: 'message', style: errorHintStyle }, message),
            h('button', {
              key: 'retry',
              type: 'button',
              style: ghostButtonStyle,
              onClick: () => {
                setPhase('idle')
                setMessage(null)
              },
            }, t('detailRetry')),
          ])
        }
        if (ignored) return h('span', { style: hintStyle }, t('ignoredBadge'))
        if (row !== null && row.status === 'update-available') {
          return h('button', {
            type: 'button',
            style: primaryButtonStyle,
            title: t('detailHint'),
            onClick: startUpdate,
          }, latest === null ? t('detailUpdate') : format(t('detailUpdate'), { latest }))
        }
        if (recent !== null) return h('span', { style: hintStyle }, recent)
        return null
      }
    }

    // ---------------------------------------------------------------------
    // Bottom-right reminder (shell.overlay)
    // ---------------------------------------------------------------------

    const toastStore = { visible: false, count: 0, listeners: new Set() }

    function emitToast() {
      for (const listener of toastStore.listeners) {
        try {
          listener(toastStore)
        } catch {
          // A broken listener must not break the toast.
        }
      }
    }

    function showToast(count) {
      toastStore.count = count
      toastStore.visible = true
      emitToast()
    }

    function hideToast() {
      toastStore.visible = false
      emitToast()
    }

    let runtimeContext = null

    function openPluginsPage() {
      try {
        if (runtimeContext === null) return false
        const navigation = typeof runtimeContext.get === 'function' ? runtimeContext.get('pluginNavigation') : null
        if (navigation !== null && typeof navigation === 'object' && typeof navigation.openList === 'function') {
          navigation.openList()
          return true
        }
      } catch {
        // Navigation is optional; fall through.
      }
      return false
    }

    function createToast(t) {
      return function PluginUpdaterToast() {
        const [state, setState] = React.useState({ visible: toastStore.visible, count: toastStore.count })

        React.useEffect(() => {
          const listener = (value) => setState({ visible: value.visible, count: value.count })
          toastStore.listeners.add(listener)
          return () => {
            toastStore.listeners.delete(listener)
          }
        }, [])

        if (!state.visible) return null
        return h('div', {
          style: {
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '300px',
            borderRadius: '12px',
            padding: '12px 14px',
            background: 'var(--dsw-alias-bg-overlay)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.28), inset 0 0 0 1px var(--dsw-alias-border-l1)',
            color: 'var(--dsw-alias-label-primary)',
            fontSize: '12px',
            lineHeight: '18px',
          },
        }, [
          h('div', { key: 'title', style: { fontWeight: 600, fontSize: '13px' } }, format(t('toastTitle'), { n: state.count })),
          h('div', { key: 'body', style: { color: 'var(--dsw-alias-label-secondary)' } }, t('toastBody')),
          h('div', { key: 'actions', style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' } }, [
            h('button', {
              key: 'later',
              type: 'button',
              style: { ...ghostButtonStyle, font: 'inherit', fontSize: '12px' },
              onClick: hideToast,
            }, t('toastDismiss')),
            h('button', {
              key: 'view',
              type: 'button',
              style: { ...primaryButtonStyle, font: 'inherit', fontSize: '12px' },
              onClick: () => {
                openPluginsPage()
                hideToast()
              },
            }, t('toastView')),
          ]),
        ])
      }
    }

    // ---------------------------------------------------------------------
    // Update check tab
    // ---------------------------------------------------------------------

    function createTab(t) {
      return function PluginUpdaterTab(props) {
        const openPackage = props !== null && typeof props === 'object' && typeof props.openPackage === 'function' ? props.openPackage : null
        const [phase, setPhase] = React.useState('loading')
        const [data, setData] = React.useState(null)
        const [errorText, setErrorText] = React.useState(null)
        const [busy, setBusy] = React.useState(null)
        const [progress, setProgress] = React.useState(null)
        const [notice, setNotice] = React.useState(null)
        const [filter, setFilter] = React.useState('all')
        const [query, setQuery] = React.useState('')
        const [batchConfirm, setBatchConfirm] = React.useState(null)
        const [batchRun, setBatchRun] = React.useState(null)
        const [ignoredRevision, setIgnoredRevision] = React.useState(0)
        const alive = React.useRef(true)
        const busyRef = React.useRef(false)
        const dataRef = React.useRef(null)
        const lastLoadedAt = React.useRef(0)

        React.useEffect(() => {
          alive.current = true
          return () => {
            alive.current = false
          }
        }, [])

        React.useEffect(() => {
          dataRef.current = data
        }, [data])

        const load = React.useCallback((force) => {
          setPhase('loading')
          setErrorText(null)
          return loadState(force)
            .then((payload) => {
              lastLoadedAt.current = Date.now()
              if (!alive.current) return null
              setData(payload)
              setPhase('ready')
              return payload
            })
            .catch((error) => {
              if (!alive.current) return
              setErrorText(error !== null && typeof error.message === 'string' ? error.message : t('updateNoDetail'))
              setPhase('error')
              return null
            })
        }, [])

        React.useEffect(() => {
          load(false)
        }, [load])

        React.useEffect(() => {
          const onVisible = () => {
            if (document.visibilityState !== 'visible') return
            if (Date.now() - lastLoadedAt.current < STALE_AFTER_MS) return
            load(false).catch(() => {})
          }
          document.addEventListener('visibilitychange', onVisible)
          return () => document.removeEventListener('visibilitychange', onVisible)
        }, [load])

        const updateOne = React.useCallback((name) => {
          setProgress(null)
          const stop = pollProgress((value) => {
            if (alive.current) setProgress(value)
          })
          return postUpdate(name)
            .then(({ payload }) => {
              stop()
              if (alive.current) setProgress(null)
              return payload
            })
            .catch((error) => {
              stop()
              if (alive.current) setProgress(null)
              throw error
            })
        }, [])

        const successLines = (name, payload) => {
          const from = typeof payload.fromVersion === 'string' ? payload.fromVersion : t('noVersion')
          const to = typeof payload.verifiedVersion === 'string'
            ? payload.verifiedVersion
            : typeof payload.toVersion === 'string'
              ? payload.toVersion
              : t('noVersion')
          const verified = typeof payload.verifiedVersion === 'string'
          const lines = [verified ? format(t('updateDone'), { name, from, to }) : format(t('updateDoneUnverified'), { name })]
          if (payload.application === 'restart-required') {
            const reason = typeof payload.restartReason === 'string' ? payload.restartReason : ''
            lines.push(format(t('updateRestart'), { reason }).trim())
          }
          if (Array.isArray(payload.pendingBuilds) && payload.pendingBuilds.length > 0) {
            lines.push(format(t('updatePendingBuilds'), { names: payload.pendingBuilds.join(', ') }))
          }
          if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
            payload.warnings.forEach((warning) => lines.push(format(t('updateWarning'), { detail: String(warning) })))
          }
          return lines
        }

        const failureLines = (name, payload) => {
          const lines = [format(t('updateFailed'), { name, detail: errorTextOf(t, payload) })]
          if (payload !== null && typeof payload === 'object') {
            if (Array.isArray(payload.pendingBuilds) && payload.pendingBuilds.length > 0) {
              lines.push(format(t('updatePendingBuilds'), { names: payload.pendingBuilds.join(', ') }))
            }
            if (payload.rolledBack === true) lines.push(t('updateRolledBack'))
            if (payload.rolledBack === false && typeof payload.rollbackError === 'string') {
              lines.push(format(t('updateRollbackFailed'), { error: payload.rollbackError }))
            }
          }
          return lines
        }

        const runSingle = (name) => {
          if (busyRef.current) return
          busyRef.current = true
          setNotice(null)
          setBusy({ name })
          updateOne(name)
            .then((payload) => {
              busyRef.current = false
              if (!alive.current) return
              setBusy(null)
              if (payload !== null && typeof payload === 'object' && payload.ok === true) {
                setNotice({ kind: 'ok', lines: successLines(name, payload) })
              } else {
                setNotice({ kind: 'error', lines: failureLines(name, payload) })
              }
              load(false).catch(() => {})
            })
            .catch((error) => {
              busyRef.current = false
              if (!alive.current) return
              setBusy(null)
              const detail = error !== null && typeof error.message === 'string' ? error.message : t('updateNoDetail')
              setNotice({ kind: 'error', lines: [format(t('updateFailed'), { name, detail })] })
            })
        }

        const runBatch = async (names) => {
          setBatchConfirm(null)
          setBatchRun({ done: 0, total: names.length, current: names[0] })
          busyRef.current = true
          setNotice(null)
          const failed = []
          let done = 0
          for (const name of names) {
            if (!alive.current) break
            setBatchRun({ done, total: names.length, current: name })
            setBusy({ name })
            try {
              const payload = await updateOne(name)
              if (payload !== null && typeof payload === 'object' && payload.ok === true) {
                // success
              } else {
                failed.push(name)
              }
            } catch {
              failed.push(name)
            }
            done += 1
            if (alive.current) setBatchRun({ done, total: names.length, current: null })
          }
          busyRef.current = false
          if (!alive.current) return
          setBusy(null)
          setBatchRun(null)
          if (failed.length === 0) {
            setNotice({ kind: 'ok', lines: [format(t('batchSummaryOk'), { n: names.length })] })
          } else {
            setNotice({
              kind: 'error',
              lines: [format(t('batchSummaryPartial'), {
                ok: names.length - failed.length,
                failed: failed.length,
                names: failed.join(', '),
              })],
            })
          }
          load(false).catch(() => {})
        }

        const plugins = data !== null && Array.isArray(data.plugins) ? data.plugins : []
        const decorated = plugins.map((row) => {
          const name = typeof row.name === 'string' ? row.name : ''
          const latest = typeof row.latestVersion === 'string' ? row.latestVersion : null
          const ignored = latest !== null && ignoredVersionOf(name) === latest
          return { row, name, latest, ignored }
        })
        const ignoredCount = decorated.filter((entry) => entry.ignored).length
        const updatableRows = decorated.filter((entry) => entry.row.status === 'update-available' && !entry.ignored)
        const upToDateCount = decorated.filter((entry) => entry.row.status === 'up-to-date' || entry.row.status === 'ahead').length
        const skippedCount = decorated.filter((entry) => SKIPPED_STATUSES.has(entry.row.status) || entry.ignored).length
        const failedCount = decorated.filter((entry) => entry.row.status === 'error' || entry.row.status === 'unknown-version').length
        const totalCount = decorated.length
        const hostVersion = data !== null && typeof data.version === 'string' ? data.version : null
        const versionMismatch = hostVersion !== null && hostVersion !== VERSION

        const queryText = query.trim().toLowerCase()
        const matchesQuery = (entry) => {
          if (queryText === '') return true
          const title = typeof entry.row.title === 'string' ? entry.row.title : ''
          return entry.name.toLowerCase().includes(queryText) || title.toLowerCase().includes(queryText)
        }

        const matchesFilter = (entry) => {
          if (filter === 'updatable') return entry.row.status === 'update-available' && !entry.ignored
          if (filter === 'up-to-date') return entry.row.status === 'up-to-date' || entry.row.status === 'ahead'
          if (filter === 'skipped') return SKIPPED_STATUSES.has(entry.row.status) || entry.ignored
          if (filter === 'failed') return entry.row.status === 'error' || entry.row.status === 'unknown-version'
          return true
        }

        const visibleRows = decorated.filter((entry) => matchesFilter(entry) && matchesQuery(entry))
        const busyName = busy === null ? null : busy.name
        const isBatch = batchRun !== null

        const counts = {
          total: totalCount,
          updatable: updatableRows.length,
          upToDate: upToDateCount,
          skipped: skippedCount,
          failed: failedCount,
        }

        const chips = [
          { key: 'all', label: format(t('countsTotal'), { n: counts.total }) },
          { key: 'updatable', label: format(t('countUpdatable'), { n: counts.updatable }), warn: counts.updatable > 0 },
          { key: 'up-to-date', label: format(t('countUpToDate'), { n: counts.upToDate }) },
          { key: 'skipped', label: format(t('countSkipped'), { n: counts.skipped }) },
          { key: 'failed', label: format(t('countFailed'), { n: counts.failed }), warn: counts.failed > 0 },
        ]

        const rows = []

        if (phase === 'loading' && data === null) {
          rows.push(h('div', { key: 'loading', className: 'dpu-state' }, [
            h('div', { key: 'row', className: 'dpu-state-row' }, [
              h('span', { key: 'spinner', className: 'dpu-spinner' }),
              h('span', { key: 'text' }, t('loading')),
            ]),
            h('div', { key: 'hint', className: 'dpu-foot' }, t('loadingHint')),
          ]))
        } else if (phase === 'error' && data === null) {
          rows.push(h('div', { key: 'error', className: 'dpu-state' }, [
            h('span', { key: 'text' }, `${t('error')}：${errorText === null ? t('updateNoDetail') : errorText}`),
            h('button', { key: 'retry', type: 'button', className: 'dpu-btn', onClick: () => load(true) }, t('retry')),
          ]))
        } else if (totalCount === 0) {
          rows.push(h('div', { key: 'empty', className: 'dpu-state' }, t('empty')))
        }

        if (data !== null) {
          if (versionMismatch) {
            rows.push(h('div', { key: 'mismatch', className: 'dpu-notice dpu-notice-warn' }, [
              h('div', { key: 'text', className: 'dpu-notice-text' }, format(t('versionMismatch'), { client: VERSION, host: hostVersion })),
            ]))
          }

          if (notice !== null) {
            rows.push(h('div', { key: 'notice', className: `dpu-notice dpu-notice-${notice.kind}` }, [
              h('div', { key: 'text', className: 'dpu-notice-text' }, notice.lines.map((line, index) => h('span', { key: index }, line))),
              h('button', { key: 'dismiss', type: 'button', className: 'dpu-btn dpu-btn-ghost', onClick: () => setNotice(null) }, t('dismiss')),
            ]))
          }

          if (batchRun !== null) {
            rows.push(h('div', { key: 'batch', className: 'dpu-notice dpu-notice-warn' }, [
              h('div', { key: 'text', className: 'dpu-progress' }, [
                h('span', { key: 'spinner', className: 'dpu-spinner' }),
                h('div', { key: 'text', className: 'dpu-progress-text' }, [
                  h('span', { key: 'phase', className: 'dpu-progress-phase' }, batchRun.current === null
                    ? format(t('batchWaiting'), { done: batchRun.done, total: batchRun.total })
                    : format(t('batchRunning'), { done: batchRun.done + 1, total: batchRun.total, name: batchRun.current })),
                ]),
              ]),
            ]))
          }

          if (batchConfirm !== null) {
            rows.push(h('div', { key: 'confirm', className: 'dpu-confirm' }, [
              h('div', { key: 'title', className: 'dpu-confirm-title' }, format(t('updateAllTitle'), { n: batchConfirm.names.length })),
              h('div', { key: 'body', className: 'dpu-confirm-body' }, format(t('updateAllBody'), { names: batchConfirm.names.join('、') })),
              h('div', { key: 'actions', className: 'dpu-confirm-actions' }, [
                h('button', { key: 'cancel', type: 'button', className: 'dpu-btn dpu-btn-ghost', onClick: () => setBatchConfirm(null) }, t('updateAllCancel')),
                h('button', {
                  key: 'go',
                  type: 'button',
                  className: 'dpu-btn dpu-btn-primary',
                  onClick: () => { runBatch(batchConfirm.names) },
                }, t('updateAllStart')),
              ]),
            ]))
          }

          if (updatableRows.length === 0 && counts.failed === 0 && batchRun === null && batchConfirm === null) {
            rows.push(h('div', { key: 'uptodate', className: 'dpu-notice dpu-notice-ok' }, [
              h('div', { key: 'text', className: 'dpu-notice-text' }, [
                h('span', { key: 'title', className: 'dpu-notice-title' }, t('allUpToDateTitle')),
                h('span', { key: 'body' }, format(t('allUpToDateBody'), {
                  time: typeof data.checkedAt === 'string' ? formatTime(data.checkedAt) : t('noVersion'),
                })),
              ]),
            ]))
          }

          const body = visibleRows.map((entry) => {
            const row = entry.row
            const name = entry.name
            const title = typeof row.title === 'string' && row.title !== '' ? row.title : name
            const current = typeof row.version === 'string' ? row.version : t('noVersion')
            const latest = entry.latest === null ? t('noVersion') : entry.latest
            const status = entry.ignored && row.status === 'update-available' ? 'ignored' : (typeof row.status === 'string' ? row.status : 'unknown')
            const isBusy = busyName === name
            const isActionable = row.status === 'update-available' && !entry.ignored
            const source = abbreviateSource(row.source)
            const noteLines = []
            const detail = typeof row.error === 'string' && row.error !== '' ? row.error : ''
            if (row.status === 'error' || row.status === 'unknown-version') {
              noteLines.push(format(row.status === 'error' ? t('checkFailedHint') : t('unknownVersionHint'), { detail: detail === '' ? t('updateNoDetail') : detail }))
            } else if (SKIPPED_STATUSES.has(row.status)) {
              const hint = skipTextOf(t, row.status)
              if (hint !== null && hint !== '') noteLines.push(hint)
            }
            const actionCell = h('td', { key: 'action', className: 'dpu-col-action' }, isBusy
              ? h('span', { className: 'dpu-inline-row' }, [
                h('span', { key: 'spinner', className: 'dpu-spinner' }),
                h('span', { key: 'text', className: 'dpu-progress-text' }, [
                  h('span', { key: 'phase', className: 'dpu-progress-phase' }, progress === null ? t('updating') : phaseText(t, progress)),
                  h('span', { key: 'elapsed', className: 'dpu-progress-elapsed' }, progress === null ? '' : formatElapsed(progress) === '' ? '' : format(t('progressElapsed'), { seconds: formatElapsed(progress) })),
                ]),
              ])
              : h('span', { className: 'dpu-inline-row' }, [
                isActionable
                  ? h('button', {
                    key: 'update',
                    type: 'button',
                    className: 'dpu-btn dpu-btn-primary dpu-btn-small',
                    disabled: isBatch,
                    onClick: () => runSingle(name),
                  }, t('update'))
                  : null,
                isActionable
                  ? h('button', {
                    key: 'ignore',
                    type: 'button',
                    className: 'dpu-btn dpu-btn-ghost dpu-btn-small',
                    disabled: isBatch,
                    onClick: () => {
                      setIgnore(name, entry.latest)
                      setIgnoredRevision((value) => value + 1)
                    },
                  }, t('ignoreVersion'))
                  : null,
                entry.ignored
                  ? h('button', {
                    key: 'unignore',
                    type: 'button',
                    className: 'dpu-btn dpu-btn-ghost dpu-btn-small',
                    disabled: isBatch,
                    onClick: () => {
                      setIgnore(name, null)
                      setIgnoredRevision((value) => value + 1)
                    },
                  }, t('unignore'))
                  : null,
                (row.status === 'error' || row.status === 'unknown-version')
                  ? h('button', {
                    key: 'retry',
                    type: 'button',
                    className: 'dpu-btn dpu-btn-small',
                    onClick: () => load(true),
                  }, t('retry'))
                  : null,
                (!isActionable && !entry.ignored && row.status !== 'error' && row.status !== 'unknown-version' && openPackage !== null)
                  ? h('button', {
                    key: 'open',
                    type: 'button',
                    className: 'dpu-btn dpu-btn-ghost dpu-btn-small',
                    onClick: () => { openPackage(name) },
                  }, t('openDetail'))
                  : null,
              ].filter(Boolean)),
            )
            const nameCell = h('td', { key: 'name', className: 'dpu-col-name' }, h('div', { className: 'dpu-name' }, [
              h('span', { key: 'title', className: 'dpu-name-title', title: name }, title === name ? name : `${title} (${name})`),
              source === ''
                ? null
                : h('span', { key: 'source', className: 'dpu-name-id', title: source }, source),
              noteLines.map((line, index) => h('span', { key: `note-${index}`, className: 'dpu-name-note' }, line)),
            ].filter(Boolean)))
            return h('tr', { key: name }, [
              nameCell,
              h('td', { key: 'current', className: 'dpu-col-version' }, h('span', { className: 'dpu-version dpu-version-old' }, current)),
              h('td', { key: 'latest', className: 'dpu-col-version' }, h('span', { className: 'dpu-version' }, latest)),
              h('td', { key: 'status', className: 'dpu-col-status' }, badge(t, status)),
              actionCell,
            ])
          })

          rows.push(h('div', { key: 'toolbar', className: 'dpu-toolbar' }, [
            h('div', { key: 'left', className: 'dpu-toolbar-left' }, [
              h('div', { key: 'chips', className: 'dpu-chips' }, chips.map((chip) => h('button', {
                key: chip.key,
                type: 'button',
                className: `dpu-chip${filter === chip.key ? ' dpu-chip-active' : ''}${chip.warn ? ' dpu-chip-warn' : ''}`,
                onClick: () => setFilter(chip.key),
              }, chip.label))),
            ]),
            h('div', { key: 'right', className: 'dpu-toolbar-right' }, [
              h('input', {
                key: 'search',
                type: 'search',
                className: 'dpu-search-input',
                value: query,
                placeholder: t('searchPlaceholder'),
                onChange: (event) => setQuery(event.target.value),
              }),
            ]),
          ]))

          if (visibleRows.length === 0) {
            rows.push(h('div', { key: 'nomatch', className: 'dpu-state' }, t('noMatches')))
          } else {
            rows.push(h('div', { key: 'table', className: 'dpu-table-wrap' }, h('table', { className: 'dpu-table' }, [
              h('thead', { key: 'head' }, h('tr', null, [
                h('th', { key: 'name', className: 'dpu-col-name' }, t('colName')),
                h('th', { key: 'current', className: 'dpu-col-version' }, t('colCurrent')),
                h('th', { key: 'latest', className: 'dpu-col-version' }, t('colLatest')),
                h('th', { key: 'status', className: 'dpu-col-status' }, t('colStatus')),
                h('th', { key: 'action', className: 'dpu-col-action' }, t('colAction')),
              ])),
              h('tbody', { key: 'body' }, body),
            ])))
          }

          const footer = [
            h('span', { key: 'version' }, format(t('versionFooter'), { client: VERSION })),
          ]
          if (hostVersion !== null) footer.push(h('span', { key: 'host' }, format(t('hostVersionFooter'), { host: hostVersion })))
          if (typeof data.checkedAt === 'string') footer.push(h('span', { key: 'checked' }, formatCheckedAt(t, data.checkedAt)))
          if (typeof data.registry === 'string' && data.registry !== '') footer.push(h('span', { key: 'registry' }, format(t('registry'), { registry: data.registry })))
          footer.push(h('span', { key: 'hint' }, t('skipHint')))
          rows.push(h('div', { key: 'foot', className: 'dpu-foot' }, footer))
        }

        return h('div', { className: 'dpu-root' }, [
          h('style', { key: 'css' }, CSS),
          h('div', { key: 'head', className: 'dpu-head' }, [
            h('div', { key: 'text', className: 'dpu-head-text' }, [
              h('h3', { key: 'title', className: 'dpu-title' }, t('title')),
              h('p', { key: 'intro', className: 'dpu-intro' }, t('intro')),
            ]),
            h('div', { key: 'actions', className: 'dpu-head-actions' }, [
              updatableRows.length > 0
                ? h('button', {
                  key: 'all',
                  type: 'button',
                  className: 'dpu-btn dpu-btn-primary',
                  disabled: busyRef.current || isBatch,
                  onClick: () => {
                    const names = updatableRows.map((entry) => entry.name)
                    if (names.length === 0) return
                    setBatchConfirm({ names })
                  },
                }, format(t('updateAll'), { n: updatableRows.length }))
                : null,
              h('button', {
                key: 'refresh',
                type: 'button',
                className: 'dpu-btn',
                disabled: phase === 'loading' || busyRef.current,
                onClick: () => load(true),
              }, phase === 'loading' ? t('refreshing') : t('refresh')),
            ].filter(Boolean)),
          ]),
          ...rows,
        ].filter(Boolean))
      }
    }

    function apply(ctx) {
      runtimeContext = ctx
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-updater: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.slots.inject('plugins.tab', () => ctx.slots.register({
        name: 'plugins.tab',
        id: NS,
        order: 10,
        label: () => t('tab'),
        locale: NS,
      }, createTab(t)))

      ctx.slots.inject('plugins.detail.badge', () => ctx.slots.register({
        name: 'plugins.detail.badge',
        id: 'dsh-plugin-updater-badge',
        order: 5,
        locale: NS,
      }, createDetailBadge(t)))

      ctx.slots.inject('plugins.detail.actions', () => ctx.slots.register({
        name: 'plugins.detail.actions',
        id: 'dsh-plugin-updater-action',
        order: 10,
        locale: NS,
      }, createDetailAction(t)))

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-plugin-updater-toast',
        label: () => 'dsh-plugin-updater',
      }, createToast(t)))

      // One gentle, session-scoped reminder: only when something is actually
      // updatable and the tab was never opened in this browser session.
      ctx.effect(() => {
        let cancelled = false
        const timer = window.setTimeout(() => {
          try {
            if (window.sessionStorage.getItem(TOAST_KEY) === '1') return
          } catch {
            return
          }
          loadState(false)
            .then((state) => {
              if (cancelled || state === null || typeof state !== 'object') return
              const counts = state.counts
              if (counts === null || typeof counts !== 'object' || typeof counts.updatable !== 'number' || counts.updatable <= 0) return
              try {
                window.sessionStorage.setItem(TOAST_KEY, '1')
              } catch {
                return
              }
              showToast(counts.updatable)
            })
            .catch(() => {})
        }, 6000)
        return () => {
          cancelled = true
          window.clearTimeout(timer)
        }
      }, 'dsh-plugin-updater: update reminder')
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
