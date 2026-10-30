window.__ModuleLoader__.load({
  id: 'dsh-plugin-updater',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-plugin-updater'
    const STATE_URL = '/dsh-plugin-updater/api/state'
    const UPDATE_URL = '/dsh-plugin-updater/api/update'

    const zh = {
      tab: '更新检查',
      title: '插件更新检查',
      intro: '检查已安装的插件是否有新版本。更新会先卸载当前版本、再安装新版本；若安装失败会尝试装回原版本。',
      loading: '正在检查插件版本…',
      error: '检查失败',
      retry: '重试',
      refresh: '重新检查',
      refreshing: '正在检查…',
      empty: '没有可检查的插件。',
      colName: '插件',
      colCurrent: '当前版本',
      colLatest: '最新版本',
      colStatus: '状态',
      colAction: '操作',
      update: '更新',
      updating: '正在更新…',
      confirmTitle: '更新 {name}',
      confirmBody: '将从 {current} 更新到 {latest}。更新期间请勿关闭 DSH。',
      confirm: '确认更新',
      cancel: '取消',
      dismiss: '关闭',
      noVersion: '—',
      checkedAt: '检查于 {time}',
      counts: '共 {total} 个插件，{updatable} 个可更新',
      registry: '注册表 {registry}',
      updateDone: '已更新 {name}：{from} → {to}',
      updateDoneUnverified: '已更新 {name}，但未能确认最终版本，请刷新查看。',
      updateRestart: '请重启 DSH 使更改生效。{reason}',
      updateFailed: '更新 {name} 失败：{detail}',
      updateRolledBack: '已尝试回滚到原版本。',
      updateRollbackFailed: '回滚失败：{error}',
      updatePendingBuilds: '该版本包含需要批准的构建脚本：{names}。请在插件管理器中批准后重试。',
      updateNoDetail: '未知错误',
      confirmBusy: '正在处理，请稍候…',
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
      sourceLabel: '来源：{source}',
      skipHint: '本地、Git、压缩包以及随 DSH 提供的插件不在此处更新。',
      detailBadge: '可更新 {latest}',
      detailUpdate: '更新到 {latest}',
      detailConfirm: '确认更新',
      detailCancel: '取消',
      detailBusy: '正在更新…',
      detailDone: '已更新到 {version}',
      detailDoneRestart: '已更新，重启 DSH 后生效',
      detailFailed: '更新失败：{detail}',
      detailRetry: '重试',
    }

    const en = {
      tab: 'Update check',
      title: 'Plugin updates',
      intro: 'Check installed plugins for newer versions. An update removes the current version and installs the new one; if the install fails it tries to restore the previous version.',
      loading: 'Checking plugin versions…',
      error: 'Check failed',
      retry: 'Retry',
      refresh: 'Check again',
      refreshing: 'Checking…',
      empty: 'No plugins to check.',
      colName: 'Plugin',
      colCurrent: 'Current',
      colLatest: 'Latest',
      colStatus: 'Status',
      colAction: 'Action',
      update: 'Update',
      updating: 'Updating…',
      confirmTitle: 'Update {name}',
      confirmBody: 'This updates from {current} to {latest}. Do not close DSH while the update runs.',
      confirm: 'Update',
      cancel: 'Cancel',
      dismiss: 'Dismiss',
      noVersion: '—',
      checkedAt: 'Checked {time}',
      counts: '{total} plugins, {updatable} updatable',
      registry: 'Registry {registry}',
      updateDone: 'Updated {name}: {from} → {to}',
      updateDoneUnverified: 'Updated {name}, but the final version could not be verified. Refresh to check.',
      updateRestart: 'Restart DSH to apply the change. {reason}',
      updateFailed: 'Updating {name} failed: {detail}',
      updateRolledBack: 'Tried to restore the previous version.',
      updateRollbackFailed: 'Restore failed: {error}',
      updatePendingBuilds: 'This version contains build scripts that need approval: {names}. Approve them in the plugin manager and try again.',
      updateNoDetail: 'unknown error',
      confirmBusy: 'Working, please wait…',
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
      sourceLabel: 'Source: {source}',
      skipHint: 'Local, Git, tarball and DSH-shipped plugins are not updated here.',
      detailBadge: 'Update {latest} available',
      detailUpdate: 'Update to {latest}',
      detailConfirm: 'Confirm update',
      detailCancel: 'Cancel',
      detailBusy: 'Updating…',
      detailDone: 'Updated to {version}',
      detailDoneRestart: 'Updated — restart DSH to apply',
      detailFailed: 'Update failed: {detail}',
      detailRetry: 'Retry',
    }

    const CSS = `
.dpu-root { display: flex; flex-direction: column; gap: 16px; padding: 4px 0 8px; color: var(--dsw-alias-label-primary); font-size: 13px; }
.dpu-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dpu-head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dpu-title { font-size: 15px; font-weight: 600; line-height: 20px; margin: 0; }
.dpu-intro { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; margin: 0; max-width: 720px; }
.dpu-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; display: flex; flex-wrap: wrap; gap: 12px; }
.dpu-head-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.dpu-btn { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border: 0; border-radius: 8px; padding: 6px 12px; font-size: 12px; line-height: 16px; cursor: pointer; transition: background 120ms ease; }
.dpu-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dpu-btn:disabled { opacity: 0.55; cursor: default; }
.dpu-btn-primary { box-shadow: none; background: var(--dsw-alias-brand-primary); color: #fff; }
.dpu-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-brand-primary); filter: brightness(1.08); }
.dpu-btn-ghost { box-shadow: none; background: transparent; }
.dpu-btn-ghost:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dpu-table-wrap { box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); border-radius: 10px; overflow: hidden; }
.dpu-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.dpu-table th { text-align: left; font-weight: 500; font-size: 12px; color: var(--dsw-alias-label-secondary); padding: 8px 12px; background: var(--dsw-alias-bg-layer-1); border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dpu-table td { padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); vertical-align: middle; }
.dpu-table tr:last-child td { border-bottom: 0; }
.dpu-col-name { width: 38%; }
.dpu-col-version { width: 13%; white-space: nowrap; }
.dpu-col-status { width: 15%; white-space: nowrap; }
.dpu-col-action { width: 17%; text-align: right; white-space: nowrap; }
.dpu-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dpu-name-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dpu-name-id { color: var(--dsw-alias-label-secondary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dpu-version { font-variant-numeric: tabular-nums; }
.dpu-version-old { color: var(--dsw-alias-label-secondary); }
.dpu-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 11px; line-height: 16px; white-space: nowrap; }
.dpu-badge-update { background: var(--dsw-alias-state-warn-primary); color: #1f2329; }
.dpu-badge-ok { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dpu-badge-error { background: var(--dsw-alias-state-error-primary); color: #fff; }
.dpu-badge-skip { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dpu-state { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; padding: 18px 0; color: var(--dsw-alias-label-secondary); }
.dpu-notice { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 18px; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.dpu-notice-error { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-error-primary); }
.dpu-notice-warn { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-warn-primary); }
.dpu-notice-ok { box-shadow: inset 0 0 0 1px var(--dsw-alias-state-success-primary); }
.dpu-notice-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dpu-confirm { display: flex; flex-direction: column; gap: 10px; border-radius: 10px; padding: 12px; box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); font-size: 12px; line-height: 18px; }
.dpu-confirm-title { font-weight: 600; font-size: 13px; }
.dpu-confirm-body { color: var(--dsw-alias-label-secondary); }
.dpu-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
.dpu-foot { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; }
.dpu-spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--dsw-alias-border-l2); border-top-color: var(--dsw-alias-brand-primary); animation: dpu-spin 0.8s linear infinite; }
@keyframes dpu-spin { to { transform: rotate(360deg); } }
`

    function format(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (values !== null && values !== undefined && Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match))
    }

    function formatTime(iso) {
      if (typeof iso !== 'string' || iso === '') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return iso
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    function abbreviateSource(source) {
      if (typeof source !== 'string') return ''
      if (source.length <= 64) return source
      return `${source.slice(0, 30)}…${source.slice(-30)}`
    }

    // A tiny shared cache so the tab and the detail-page contributions reuse one
    // check result instead of each hitting the Host separately.
    const stateCache = { value: null, promise: null }

    // A successful update is remembered for a short while so the detail page can
    // still confirm it after the page refreshes its own bundle facts.
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
    }

    function statusKey(status) {
      return `status_${String(status).replace(/-/g, '_')}`
    }

    function badge(t, status) {
      const className = STATUS_BADGE[status] !== undefined ? STATUS_BADGE[status] : 'dpu-badge-skip'
      return h('span', { className: `dpu-badge ${className}` }, t(statusKey(status)))
    }

    // Detail-page contributions: a tag beside the title and an update control in
    // the page head, exactly where the built-in page offers updates for official
    // bundles. Both read the same Host state and render null for other subjects.
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
        const [recent] = React.useState(() => {
          const entry = recentUpdates.get(name)
          return entry !== undefined && Date.now() - entry.at < 60000 ? entry : null
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

        // Reset only when the subject package changes; a version bump after our
        // own update must keep the success message visible.
        React.useEffect(() => {
          setPhase('idle')
          setMessage(null)
        }, [name])

        const latest = row !== null && typeof row.latestVersion === 'string' ? row.latestVersion : null

        function startUpdate() {
          if (name === null) return
          setPhase('busy')
          setMessage(null)
          postUpdate(name)
            .then(({ responseOk, payload }) => {
              if (!alive.current) return
              if (payload !== null && payload.ok === true) {
                const to = typeof payload.verifiedVersion === 'string'
                  ? payload.verifiedVersion
                  : typeof payload.toVersion === 'string'
                    ? payload.toVersion
                    : latest || ''
                const restart = payload.application === 'restart-required'
                const text = restart ? t('detailDoneRestart') : format(t('detailDone'), { version: to })
                recentUpdates.set(name, { message: text, at: Date.now() })
                setPhase('done')
                setMessage(text)
                return
              }
              const detail = payload !== null && typeof payload.detail === 'string'
                ? payload.detail
                : payload !== null && typeof payload.error === 'string'
                  ? payload.error
                  : t('updateNoDetail')
              setPhase('error')
              setMessage(format(t('detailFailed'), { detail }))
            })
            .catch((error) => {
              if (!alive.current) return
              const detail = error !== null && typeof error.message === 'string' ? error.message : t('updateNoDetail')
              setPhase('error')
              setMessage(format(t('detailFailed'), { detail }))
            })
        }

        if (name === null) return null
        if (phase === 'busy') return h('span', { style: hintStyle }, t('detailBusy'))
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
        if (row !== null && row.status === 'update-available') {
          if (phase === 'confirm') {
            return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } }, [
              h('button', { key: 'go', type: 'button', style: primaryButtonStyle, onClick: startUpdate }, latest === null ? t('detailConfirm') : `${t('detailConfirm')} ${latest}`),
              h('button', { key: 'cancel', type: 'button', style: ghostButtonStyle, onClick: () => setPhase('idle') }, t('detailCancel')),
            ])
          }
          return h('button', {
            type: 'button',
            style: primaryButtonStyle,
            onClick: () => setPhase('confirm'),
          }, latest === null ? t('detailUpdate') : format(t('detailUpdate'), { latest }))
        }
        if (recent !== null) return h('span', { style: hintStyle }, recent.message)
        return null
      }
    }

    function createTab(t) {
      return function PluginUpdaterTab() {
        const [phase, setPhase] = React.useState('loading')
        const [data, setData] = React.useState(null)
        const [errorText, setErrorText] = React.useState(null)
        const [busyName, setBusyName] = React.useState(null)
        const [pendingName, setPendingName] = React.useState(null)
        const [notice, setNotice] = React.useState(null)
        const alive = React.useRef(true)

        React.useEffect(() => {
          alive.current = true
          return () => {
            alive.current = false
          }
        }, [])

        const load = React.useCallback((force) => {
          if (force !== true) setPhase('loading')
          setErrorText(null)
          return fetch(STATE_URL + (force === true ? '?force=1' : ''), { headers: { accept: 'application/json' } })
            .then(async (response) => {
              const payload = await response.json().catch(() => null)
              if (!response.ok || payload === null || payload.ok !== true) {
                throw new Error(payload !== null && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`)
              }
              if (!alive.current) return
              setData(payload)
              setPhase('ready')
            })
            .catch((error) => {
              if (!alive.current) return
              setErrorText(error !== null && typeof error.message === 'string' ? error.message : t('updateNoDetail'))
              setPhase('error')
            })
        }, [])

        React.useEffect(() => {
          load(false)
        }, [load])

        const runUpdate = React.useCallback((name) => {
          setPendingName(null)
          setBusyName(name)
          setNotice(null)
          return postUpdate(name)
            .then(({ responseOk, payload }) => {
              const ok = responseOk
              if (!alive.current) return
              setBusyName(null)
              if (payload !== null && payload.ok === true) {
                const from = typeof payload.fromVersion === 'string' ? payload.fromVersion : t('noVersion')
                const to = typeof payload.verifiedVersion === 'string'
                  ? payload.verifiedVersion
                  : typeof payload.toVersion === 'string'
                    ? payload.toVersion
                    : t('noVersion')
                const verified = typeof payload.verifiedVersion === 'string'
                const lines = [verified ? format(t('updateDone'), { name, from, to }) : format(t('updateDoneUnverified'), { name })]
                if (payload.application === 'restart-required') {
                  lines.push(format(t('updateRestart'), { reason: typeof payload.restartReason === 'string' ? payload.restartReason : '' }).trim())
                }
                if (Array.isArray(payload.pendingBuilds) && payload.pendingBuilds.length > 0) {
                  lines.push(format(t('updatePendingBuilds'), { names: payload.pendingBuilds.join(', ') }))
                }
                if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
                  lines.push(payload.warnings.join('; '))
                }
                setNotice({ kind: 'ok', lines })
                load(true)
                return
              }
              const detail = payload !== null && typeof payload.detail === 'string'
                ? payload.detail
                : payload !== null && typeof payload.error === 'string'
                  ? payload.error
                  : ok
                    ? t('updateNoDetail')
                    : t('updateNoDetail')
              const lines = [format(t('updateFailed'), { name, detail })]
              if (payload !== null && Array.isArray(payload.pendingBuilds) && payload.pendingBuilds.length > 0) {
                lines.push(format(t('updatePendingBuilds'), { names: payload.pendingBuilds.join(', ') }))
              }
              if (payload !== null && payload.rolledBack === true) lines.push(t('updateRolledBack'))
              if (payload !== null && payload.rolledBack === false && typeof payload.rollbackError === 'string') {
                lines.push(format(t('updateRollbackFailed'), { error: payload.rollbackError }))
              }
              setNotice({ kind: 'error', lines })
              load(true)
            })
            .catch((error) => {
              if (!alive.current) return
              setBusyName(null)
              const detail = error !== null && typeof error.message === 'string' ? error.message : t('updateNoDetail')
              setNotice({ kind: 'error', lines: [format(t('updateFailed'), { name, detail })] })
            })
        }, [])

        const plugins = data !== null && Array.isArray(data.plugins) ? data.plugins : []
        const counts = data !== null && data.counts !== null && typeof data.counts === 'object' ? data.counts : null
        const isRefreshing = phase === 'loading' && data !== null
        const rows = []

        if (phase === 'loading' && data === null) {
          rows.push(h('div', { key: 'loading', className: 'dpu-state' }, [
            h('span', { key: 'spinner', className: 'dpu-spinner' }),
            h('span', { key: 'text' }, t('loading')),
          ]))
        } else if (phase === 'error' && data === null) {
          rows.push(h('div', { key: 'error', className: 'dpu-state' }, [
            h('span', { key: 'text' }, `${t('error')}: ${errorText === null ? t('updateNoDetail') : errorText}`),
            h('button', { key: 'retry', type: 'button', className: 'dpu-btn', onClick: () => load(true) }, t('retry')),
          ]))
        } else if (plugins.length === 0) {
          rows.push(h('div', { key: 'empty', className: 'dpu-state' }, t('empty')))
        }

        if (data !== null) {
          if (notice !== null) {
            rows.push(h('div', { key: 'notice', className: `dpu-notice dpu-notice-${notice.kind}` }, [
              h('div', { key: 'text', className: 'dpu-notice-text' }, notice.lines.map((line, index) => h('span', { key: index }, line))),
              h('button', { key: 'dismiss', type: 'button', className: 'dpu-btn dpu-btn-ghost', onClick: () => setNotice(null) }, t('dismiss')),
            ]))
          }

          if (pendingName !== null) {
            const row = plugins.find((entry) => entry !== null && typeof entry === 'object' && entry.name === pendingName)
            if (row !== undefined && row !== null) {
              rows.push(h('div', { key: 'confirm', className: 'dpu-confirm' }, [
                h('div', { key: 'title', className: 'dpu-confirm-title' }, format(t('confirmTitle'), { name: row.name })),
                h('div', { key: 'body', className: 'dpu-confirm-body' }, format(t('confirmBody'), {
                  current: typeof row.version === 'string' ? row.version : t('noVersion'),
                  latest: typeof row.latestVersion === 'string' ? row.latestVersion : t('noVersion'),
                })),
                h('div', { key: 'actions', className: 'dpu-confirm-actions' }, [
                  h('button', { key: 'cancel', type: 'button', className: 'dpu-btn dpu-btn-ghost', onClick: () => setPendingName(null) }, t('cancel')),
                  h('button', {
                    key: 'go',
                    type: 'button',
                    className: 'dpu-btn dpu-btn-primary',
                    disabled: busyName !== null,
                    onClick: () => runUpdate(row.name),
                  }, busyName === null ? t('confirm') : t('updating')),
                ]),
              ]))
            }
          }

          const body = plugins.map((row) => {
            const name = typeof row.name === 'string' ? row.name : ''
            const title = typeof row.title === 'string' && row.title !== '' ? row.title : name
            const current = typeof row.version === 'string' ? row.version : t('noVersion')
            const latest = typeof row.latestVersion === 'string' ? row.latestVersion : t('noVersion')
            const status = typeof row.status === 'string' ? row.status : 'unknown'
            const isBusy = busyName === name
            const canUpdate = status === 'update-available' && busyName === null
            const source = abbreviateSource(row.source)
            const cells = [
              h('td', { key: 'name', className: 'dpu-col-name' }, h('div', { className: 'dpu-name' }, [
                h('span', { key: 'title', className: 'dpu-name-title', title: name }, title === name ? name : `${title} (${name})`),
                source === ''
                  ? null
                  : h('span', { key: 'source', className: 'dpu-name-id', title: source }, source),
              ].filter(Boolean))),
              h('td', { key: 'current', className: 'dpu-col-version' }, h('span', { className: 'dpu-version dpu-version-old' }, current)),
              h('td', { key: 'latest', className: 'dpu-col-version' }, h('span', { className: 'dpu-version' }, latest)),
              h('td', { key: 'status', className: 'dpu-col-status' }, badge(t, status)),
              h('td', { key: 'action', className: 'dpu-col-action' },
                canUpdate
                  ? h('button', {
                    type: 'button',
                    className: 'dpu-btn dpu-btn-primary',
                    onClick: () => {
                      setNotice(null)
                      setPendingName(name)
                    },
                  }, t('update'))
                  : isBusy
                    ? h('span', { className: 'dpu-meta' }, t('updating'))
                    : null),
            ]
            return h('tr', { key: name }, cells)
          })

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

          const footer = []
          if (counts !== null) {
            footer.push(h('span', { key: 'counts' }, format(t('counts'), {
              total: counts.total === undefined ? plugins.length : counts.total,
              updatable: counts.updatable === undefined ? 0 : counts.updatable,
            })))
          }
          if (typeof data.checkedAt === 'string') footer.push(h('span', { key: 'checked' }, format(t('checkedAt'), { time: formatTime(data.checkedAt) })))
          if (typeof data.registry === 'string' && data.registry !== '') footer.push(h('span', { key: 'registry' }, format(t('registry'), { registry: data.registry })))
          footer.push(h('span', { key: 'hint' }, t('skipHint')))
          rows.push(h('div', { key: 'footer', className: 'dpu-foot' }, footer))
        }

        return h('div', { className: 'dpu-root' }, [
          h('style', { key: 'css' }, CSS),
          h('div', { key: 'head', className: 'dpu-head' }, [
            h('div', { key: 'text', className: 'dpu-head-text' }, [
              h('h3', { key: 'title', className: 'dpu-title' }, t('title')),
              h('p', { key: 'intro', className: 'dpu-intro' }, t('intro')),
            ]),
            h('div', { key: 'actions', className: 'dpu-head-actions' },
              h('button', {
                key: 'refresh',
                type: 'button',
                className: 'dpu-btn',
                disabled: phase === 'loading' || busyName !== null,
                onClick: () => load(true),
              }, isRefreshing ? t('refreshing') : t('refresh'))),
          ]),
          ...rows,
          busyName !== null ? h('div', { key: 'busy', className: 'dpu-meta' }, t('confirmBusy')) : null,
        ].filter(Boolean))
      }
    }

    function apply(ctx) {
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
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
