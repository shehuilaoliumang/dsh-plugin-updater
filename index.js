/**
 * dsh-plugin-updater — Host half.
 *
 * Checks the package registry for newer versions of the bundles installed in
 * this profile, and performs one-click updates. A version change is the same
 * replace flow the built-in plugin manager uses: remove the installed package,
 * then install the newer version. When the install fails after the removal the
 * previous version is installed again (best effort rollback).
 *
 * The browser half (client.js) is a compiled-format Client module; it talks to
 * this half over same-origin JSON routes registered on the host's webServer
 * service. Nothing here is exposed outside the local web server.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const VERSION = '0.4.0'

const STATE_PATH = '/dsh-plugin-updater/api/state'
const UPDATE_PATH = '/dsh-plugin-updater/api/update'
const PROGRESS_PATH = '/dsh-plugin-updater/api/progress'
const SETTINGS_PATH = '/dsh-plugin-updater/api/settings'
const BATCH_PATH = '/dsh-plugin-updater/api/update-batch'

const MIN_INTERVAL_MINUTES = 30
const MAX_INTERVAL_MINUTES = 30 * 24 * 60
const DEFAULT_INTERVAL_MINUTES = 6 * 60
const ENABLE_RUN_DELAY_MS = 1500
const DSH_HOME = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh')
const SETTINGS_FILE = join(DSH_HOME, 'plugin-updater', 'settings.json')

const PACKUMENT_TTL_MS = 5 * 60 * 1000
const FAILURE_TTL_MS = 45 * 1000
const REGISTRY_TTL_MS = 60 * 1000
const FETCH_TIMEOUT_MS = 12000
const MAX_BODY_BYTES = 16 * 1024
const CHECK_CONCURRENCY = 4
const USER_AGENT = 'dsh-plugin-updater'

const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/
const LOCAL_SPEC_RE = /^(?:link:|file:|\.{1,2}[\\/]|[A-Za-z]:[\\/]|\/|~[\\/])/
const GIT_SPEC_RE = /^(?:github:|gitlab:|bitbucket:|gist:|git\+|git:|https?:\/\/[^/]*\.git(?:[#/]|$))/
const TARBALL_SPEC_RE = /\.(?:tgz|tar\.gz)(?:#.*)?$/i
const DEFAULT_REGISTRY = 'https://registry.npmjs.org/'

const STATUS_RANK = {
  'update-available': 0,
  error: 1,
  'unknown-version': 1,
  'up-to-date': 2,
  ahead: 3,
  local: 4,
  git: 4,
  tarball: 4,
  'unknown-source': 4,
  shipped: 5,
}

const SKIPPED_STATUSES = new Set(['local', 'git', 'tarball', 'unknown-source', 'shipped'])

export const name = 'dsh-plugin-updater'
export const inject = ['webServer', 'pluginManager']

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

function parseSemver(value) {
  if (typeof value !== 'string') return null
  const match = SEMVER_RE.exec(value.trim())
  if (match === null) return null
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), pre: match[4] || '' }
}

function compareSemver(a, b) {
  const left = parseSemver(a)
  const right = parseSemver(b)
  if (left === null || right === null) return null
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] < right[key] ? -1 : 1
  }
  if (left.pre === right.pre) return 0
  if (left.pre === '') return 1
  if (right.pre === '') return -1
  const leftParts = left.pre.split('.')
  const rightParts = right.pre.split('.')
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]
    if (leftPart === undefined) return -1
    if (rightPart === undefined) return 1
    const leftNumeric = /^\d+$/.test(leftPart)
    const rightNumeric = /^\d+$/.test(rightPart)
    if (leftNumeric && rightNumeric) {
      const leftNumber = Number(leftPart)
      const rightNumber = Number(rightPart)
      if (leftNumber !== rightNumber) return leftNumber < rightNumber ? -1 : 1
      continue
    }
    if (leftNumeric) return -1
    if (rightNumeric) return 1
    if (leftPart !== rightPart) return leftPart < rightPart ? -1 : 1
  }
  return 0
}

function pickLatest(document) {
  if (document === null || typeof document !== 'object') return null
  const tags = document['dist-tags']
  if (tags !== null && typeof tags === 'object' && typeof tags.latest === 'string' && parseSemver(tags.latest) !== null) {
    return tags.latest
  }
  const versions = document.versions !== null && typeof document.versions === 'object' ? Object.keys(document.versions) : []
  let best = null
  for (const version of versions) {
    if (parseSemver(version) === null) continue
    if (best === null || compareSemver(version, best) > 0) best = version
  }
  return best
}

// ---------------------------------------------------------------------------
// Package spec helpers
// ---------------------------------------------------------------------------

function packageNameOfSpec(spec) {
  if (typeof spec !== 'string') return null
  let rest = spec.trim()
  if (rest.startsWith('npm:')) rest = rest.slice(4)
  if (rest.startsWith('@')) {
    const slash = rest.indexOf('/')
    if (slash <= 0) return null
    const at = rest.indexOf('@', slash)
    return at === -1 ? rest : rest.slice(0, at)
  }
  const at = rest.indexOf('@')
  return at === -1 ? rest : rest.slice(0, at)
}

function classifySource(bundle) {
  const source = typeof bundle.source === 'string' ? bundle.source.trim() : ''
  const bundleName = typeof bundle.name === 'string' ? bundle.name : ''
  const fallback = PACKAGE_NAME_RE.test(bundleName) ? bundleName : null
  if (source === '') {
    return fallback === null
      ? { kind: 'unknown-source', packageName: null, range: '' }
      : { kind: 'npm', packageName: fallback, range: '' }
  }
  if (LOCAL_SPEC_RE.test(source)) return { kind: 'local', packageName: null, range: '' }
  if (GIT_SPEC_RE.test(source)) return { kind: 'git', packageName: null, range: '' }
  if (TARBALL_SPEC_RE.test(source)) return { kind: 'tarball', packageName: null, range: '' }
  const packageName = packageNameOfSpec(source)
  if (packageName === null || !PACKAGE_NAME_RE.test(packageName)) {
    return { kind: 'unknown-source', packageName: null, range: '' }
  }
  const index = source.indexOf(packageName)
  const rawRange = index === -1 ? '' : source.slice(index + packageName.length)
  const range = rawRange.startsWith('@') ? rawRange.slice(1) : rawRange
  return { kind: 'npm', packageName, range }
}

function isRangedSpec(range) {
  if (typeof range !== 'string') return false
  const trimmed = range.trim()
  if (trimmed === '') return false
  return /[\^~<>*|]|\s-\s|\bx\b/i.test(trimmed)
}

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

function normalizeRegistry(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString().replace(/\/+$/, '') + '/'
  } catch {
    return null
  }
}

function registryUrlFor(registry, packageName) {
  const base = registry.replace(/\/+$/, '')
  if (packageName.startsWith('@')) return `${base}/${packageName.replace('/', '%2F')}`
  return `${base}/${encodeURIComponent(packageName)}`
}

function errorMessage(error) {
  if (error === null || error === undefined) return 'unknown error'
  if (typeof error === 'string') return error
  if (typeof error.message === 'string' && error.message !== '') return error.message
  return String(error)
}

async function fetchPackument(registry, packageName) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(registryUrlFor(registry, packageName), {
      headers: {
        accept: 'application/vnd.npm.install-v1+json, application/json;q=0.9',
        'user-agent': USER_AGENT,
      },
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` }
    const document = await response.json()
    const latest = pickLatest(document)
    if (latest === null) return { ok: false, error: 'no published version' }
    return { ok: true, latest, registry }
  } catch (error) {
    return { ok: false, error: error !== null && error.name === 'AbortError' ? 'timed out' : errorMessage(error) }
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function loopbackAuthority(authority) {
  if (typeof authority !== 'string' || authority === '') return false
  let hostname
  try {
    hostname = new URL(`http://${authority}`).hostname
  } catch {
    return false
  }
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]'
}

function isSameOrigin(request) {
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const authority = typeof request.headers.host === 'string' ? request.headers.host : ''
  if (!loopbackAuthority(authority)) return false
  const origin = request.headers.origin
  if (typeof origin !== 'string' || origin === '') return true
  try {
    return new URL(origin).host === authority
  } catch {
    return false
  }
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

function readJsonBody(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('request body too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

async function mapLimit(items, limit, worker) {
  const queue = items.slice()
  const runners = []
  for (let index = 0; index < Math.min(limit, queue.length); index += 1) {
    runners.push((async () => {
      for (;;) {
        const item = queue.shift()
        if (item === undefined) return
        await worker(item)
      }
    })())
  }
  await Promise.all(runners)
}

function describeChange(result) {
  if (result === null || typeof result !== 'object') return 'no result'
  const parts = []
  if (typeof result.application === 'string') parts.push(`application=${result.application}`)
  if (result.error) {
    const code = result.error.code && typeof result.error.code === 'string' ? result.error.code : 'unknown'
    const message = result.error.message && typeof result.error.message === 'string' ? result.error.message : ''
    parts.push(`error=${code}${message === '' ? '' : ` (${message})`}`)
  }
  if (Array.isArray(result.warnings) && result.warnings.length > 0) {
    parts.push(`warnings=${result.warnings.map((warning) => String(warning)).slice(0, 4).join('; ')}`)
  }
  if (result.failedAt) parts.push(`failedAt=${result.failedAt}`)
  return parts.length === 0 ? 'unknown result' : parts.join(' ')
}

function pendingBuildsOf(result) {
  if (result === null || typeof result !== 'object') return null
  const pending = Array.isArray(result.pendingBuilds) ? result.pendingBuilds : []
  if (pending.length === 0) return null
  return pending.slice(0, 8).map((entry) => {
    if (typeof entry === 'string') return entry
    if (entry !== null && typeof entry === 'object' && typeof entry.name === 'string') return entry.name
    return String(entry)
  })
}

// ---------------------------------------------------------------------------
// Auto-update settings (persisted next to the DSH home directory)
// ---------------------------------------------------------------------------

function defaultSettings() {
  return {
    autoUpdate: { pageOpen: false, scheduled: { enabled: false, intervalMinutes: DEFAULT_INTERVAL_MINUTES } },
    ignored: {},
  }
}

function clampIntervalMinutes(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return DEFAULT_INTERVAL_MINUTES
  return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(number)))
}

function normalizeIgnored(value) {
  const result = {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return result
  for (const [name, version] of Object.entries(value)) {
    if (typeof name !== 'string' || name === '' || name.length > 200) continue
    if (typeof version !== 'string' || version === '' || version.length > 100) continue
    result[name] = version
  }
  return result
}

function normalizeSettings(value) {
  const source = value !== null && typeof value === 'object' ? value : {}
  const autoUpdate = source.autoUpdate !== null && typeof source.autoUpdate === 'object' ? source.autoUpdate : {}
  const scheduled = autoUpdate.scheduled !== null && typeof autoUpdate.scheduled === 'object' ? autoUpdate.scheduled : {}
  return {
    autoUpdate: {
      pageOpen: autoUpdate.pageOpen === true,
      scheduled: {
        enabled: scheduled.enabled === true,
        intervalMinutes: clampIntervalMinutes(scheduled.intervalMinutes),
      },
    },
    ignored: normalizeIgnored(source.ignored),
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function apply(ctx) {
  const manager = ctx.pluginManager
  const packumentCache = new Map()
  let registryState = null
  let preferredRegistry = null
  let updateInFlight = false

  // Progress of the update that is running right now. The browser half polls it
  // so a long pnpm remove/install stays legible instead of one silent spinner.
  let progress = null

  function beginProgress(name, fromVersion, targetVersion, meta) {
    const options = meta !== null && typeof meta === 'object' ? meta : {}
    progress = {
      kind: typeof options.kind === 'string' ? options.kind : 'single',
      index: typeof options.index === 'number' ? options.index : 0,
      total: typeof options.total === 'number' ? options.total : 1,
      name,
      fromVersion: typeof fromVersion === 'string' ? fromVersion : null,
      targetVersion: typeof targetVersion === 'string' ? targetVersion : null,
      phase: 'checking',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  function setProgressPhase(phase) {
    if (progress === null) return
    progress.phase = phase
    progress.updatedAt = new Date().toISOString()
  }

  function clearProgress() {
    progress = null
  }

  // Persisted auto-update preferences and the background schedule. The browser
  // half edits these through the settings route; the timer only acts while this
  // plugin is mounted, i.e. while DSH is running.
  let settings = defaultSettings()
  let lastAutoRun = null
  let nextRunAt = null
  let backgroundTimer = null

  function isIgnored(name, latestVersion) {
    if (typeof name !== 'string' || name === '') return false
    if (typeof latestVersion !== 'string' || latestVersion === '') return false
    return settings.ignored[name] === latestVersion
  }

  async function loadSettings() {
    try {
      const raw = await readFile(SETTINGS_FILE, 'utf8')
      settings = normalizeSettings(JSON.parse(raw))
    } catch {
      settings = defaultSettings()
    }
    return settings
  }

  async function saveSettings() {
    await mkdir(dirname(SETTINGS_FILE), { recursive: true })
    await writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  }

  function computeNextRunAt() {
    if (!settings.autoUpdate.scheduled.enabled) return null
    return new Date(Date.now() + settings.autoUpdate.scheduled.intervalMinutes * 60 * 1000).toISOString()
  }

  function reschedule() {
    if (backgroundTimer !== null) {
      clearInterval(backgroundTimer)
      backgroundTimer = null
    }
    if (settings.autoUpdate.scheduled.enabled) {
      backgroundTimer = setInterval(() => {
        void runAutoUpdate('scheduled')
      }, settings.autoUpdate.scheduled.intervalMinutes * 60 * 1000)
      if (typeof backgroundTimer.unref === 'function') backgroundTimer.unref()
    }
    nextRunAt = computeNextRunAt()
  }

  function updatableNamesOf(state) {
    const plugins = state !== null && Array.isArray(state.plugins) ? state.plugins : []
    return plugins
      .filter((row) => row !== null && typeof row === 'object' && row.status === 'update-available' && !isIgnored(row.name, row.latestVersion))
      .map((row) => row.name)
  }

  async function updateMany(names, kind) {
    const updated = []
    const failed = []
    const total = names.length
    for (let index = 0; index < total; index += 1) {
      const name = names[index]
      let result
      try {
        result = await runUpdate(name, { kind, index, total })
      } catch (error) {
        result = { ok: false, error: 'update-failed', detail: errorMessage(error) }
      }
      clearProgress()
      if (result !== null && result.ok === true) {
        updated.push({
          name,
          fromVersion: result.fromVersion === undefined ? null : result.fromVersion,
          toVersion: result.toVersion === undefined ? null : result.toVersion,
          verifiedVersion: result.verifiedVersion === undefined ? null : result.verifiedVersion,
        })
      } else {
        failed.push({
          name,
          error: result !== null && typeof result.error === 'string' ? result.error : 'update-failed',
          detail: result !== null && typeof result.detail === 'string' ? result.detail : null,
          rolledBack: result !== null && result.rolledBack === true,
        })
      }
    }
    return { updated, failed }
  }

  async function runAutoUpdate(kind) {
    if (updateInFlight) return { ok: false, error: 'busy' }
    const enabled = kind === 'scheduled' ? settings.autoUpdate.scheduled.enabled : settings.autoUpdate.pageOpen
    if (!enabled && kind !== 'enable') return { ok: false, error: 'disabled' }
    updateInFlight = true
    const record = { kind, startedAt: new Date().toISOString(), finishedAt: null, checked: 0, updated: [], failed: [] }
    lastAutoRun = record
    try {
      const state = await buildState(true)
      record.checked = state.counts.total
      const names = updatableNamesOf(state)
      if (names.length > 0) {
        const result = await updateMany(names, 'auto')
        record.updated = result.updated
        record.failed = result.failed
        packumentCache.clear()
      }
      return { ok: true, kind, checked: record.checked, updated: record.updated, failed: record.failed }
    } catch (error) {
      record.error = errorMessage(error)
      return { ok: false, error: record.error }
    } finally {
      record.finishedAt = new Date().toISOString()
      clearProgress()
      updateInFlight = false
      if (kind === 'scheduled') nextRunAt = computeNextRunAt()
    }
  }

  async function handleSettings(request, response) {
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: 'untrusted-origin' })
      return
    }
    if (request.method === 'GET') {
      sendJson(response, 200, { ok: true, version: VERSION, settings, nextRunAt, lastAutoRun })
      return
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'GET, POST' })
      response.end()
      return
    }
    let body
    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJson(response, 400, { ok: false, error: 'invalid-body', detail: errorMessage(error) })
      return
    }
    const patch = body !== null && typeof body === 'object' ? body : {}
    const previousEnabled = settings.autoUpdate.scheduled.enabled
    const merged = {
      autoUpdate: {
        pageOpen: settings.autoUpdate.pageOpen,
        scheduled: { ...settings.autoUpdate.scheduled },
      },
      ignored: { ...settings.ignored },
    }
    if (patch.autoUpdate !== null && typeof patch.autoUpdate === 'object') {
      if (typeof patch.autoUpdate.pageOpen === 'boolean') merged.autoUpdate.pageOpen = patch.autoUpdate.pageOpen
      const scheduledPatch = patch.autoUpdate.scheduled
      if (scheduledPatch !== null && typeof scheduledPatch === 'object') {
        if (typeof scheduledPatch.enabled === 'boolean') merged.autoUpdate.scheduled.enabled = scheduledPatch.enabled
        if (scheduledPatch.intervalMinutes !== undefined) merged.autoUpdate.scheduled.intervalMinutes = scheduledPatch.intervalMinutes
      }
    }
    if (patch.ignored !== null && typeof patch.ignored === 'object' && !Array.isArray(patch.ignored)) {
      for (const [name, version] of Object.entries(patch.ignored)) {
        if (typeof version === 'string' && version !== '') merged.ignored[name] = version
        else delete merged.ignored[name]
      }
    }
    settings = normalizeSettings(merged)
    try {
      await saveSettings()
    } catch (error) {
      sendJson(response, 500, { ok: false, error: 'settings-unavailable', detail: errorMessage(error) })
      return
    }
    reschedule()
    if (!previousEnabled && settings.autoUpdate.scheduled.enabled) {
      const timer = setTimeout(() => {
        void runAutoUpdate('enable')
      }, ENABLE_RUN_DELAY_MS)
      if (typeof timer.unref === 'function') timer.unref()
    }
    sendJson(response, 200, { ok: true, version: VERSION, settings, nextRunAt, lastAutoRun })
  }

  async function handleBatch(request, response) {
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: 'untrusted-origin' })
      return
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }
    let body
    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJson(response, 400, { ok: false, error: 'invalid-body', detail: errorMessage(error) })
      return
    }
    if (updateInFlight) {
      sendJson(response, 409, { ok: false, error: 'busy', detail: 'another update is already running' })
      return
    }
    let names = null
    if (body !== null && typeof body === 'object' && Array.isArray(body.names)) {
      const requested = body.names
        .filter((value) => typeof value === 'string' && PACKAGE_NAME_RE.test(value.trim()))
        .map((value) => value.trim())
      names = [...new Set(requested)]
    }
    updateInFlight = true
    try {
      if (names === null || names.length === 0) {
        const state = await buildState(true)
        names = updatableNamesOf(state)
      }
      if (names.length === 0) {
        sendJson(response, 200, { ok: true, version: VERSION, total: 0, updated: [], failed: [] })
        return
      }
      const result = await updateMany(names, 'batch')
      packumentCache.clear()
      sendJson(response, 200, { ok: true, version: VERSION, total: names.length, updated: result.updated, failed: result.failed })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: 'update-failed', detail: errorMessage(error) })
    } finally {
      clearProgress()
      updateInFlight = false
    }
  }

  async function registryCandidates(force) {
    if (!force && registryState !== null && registryState.expiresAt > Date.now()) return registryState.value
    const registries = []
    const push = (value) => {
      const normalized = normalizeRegistry(value)
      if (normalized !== null && !registries.includes(normalized)) registries.push(normalized)
    }
    try {
      const config = await manager.registries()
      if (config !== null && typeof config === 'object') {
        push(config.resolved)
        push(config.registry)
        if (Array.isArray(config.fallbackRegistries)) config.fallbackRegistries.forEach(push)
      }
    } catch {
      // A profile without a configured registry still has the public default.
    }
    try {
      const probe = ctx.get('pluginRegistryProbe')
      if (probe !== null && typeof probe === 'object' && typeof probe.fastest === 'function') {
        push(await probe.fastest())
      }
    } catch {
      // Probe is optional.
    }
    push(DEFAULT_REGISTRY)
    registryState = { value: registries, expiresAt: Date.now() + REGISTRY_TTL_MS }
    return registries
  }

  async function loadPackument(packageName, registries, force) {
    const cached = packumentCache.get(packageName)
    if (!force && cached !== undefined && cached.expiresAt > Date.now()) return cached.value
    const ordered = registries.slice()
    if (preferredRegistry !== null) {
      const index = ordered.indexOf(preferredRegistry)
      if (index > 0) {
        ordered.splice(index, 1)
        ordered.unshift(preferredRegistry)
      }
    }
    let lastResult = { ok: false, error: 'no registry available' }
    for (const registry of ordered) {
      const result = await fetchPackument(registry, packageName)
      if (result.ok) {
        preferredRegistry = registry
        packumentCache.set(packageName, { value: result, expiresAt: Date.now() + PACKUMENT_TTL_MS })
        return result
      }
      lastResult = result
    }
    packumentCache.set(packageName, { value: lastResult, expiresAt: Date.now() + FAILURE_TTL_MS })
    return lastResult
  }

  function createRow(bundle) {
    const classified = classifySource(bundle)
    const meta = bundle.meta !== null && typeof bundle.meta === 'object' ? bundle.meta : null
    return {
      name: typeof bundle.name === 'string' ? bundle.name : '',
      title: meta !== null && typeof meta.title === 'string' ? meta.title : null,
      description: meta !== null && typeof meta.description === 'string' ? meta.description : null,
      version: typeof bundle.version === 'string' ? bundle.version : null,
      source: typeof bundle.source === 'string' ? bundle.source : null,
      official: bundle.official === true,
      enabled: bundle.enabled !== false,
      kind: classified.kind,
      packageName: classified.packageName,
      range: classified.range,
      saveExact: !isRangedSpec(classified.range),
      latestVersion: null,
      registry: null,
      status: 'unknown',
      error: null,
    }
  }

  function applyComparison(row) {
    const comparison = compareSemver(row.latestVersion, row.version)
    if (comparison === null) {
      row.status = 'unknown-version'
      row.error = `installed ${row.version === null ? 'unknown' : row.version}, latest ${row.latestVersion}`
      return
    }
    if (comparison > 0) row.status = 'update-available'
    else if (comparison === 0) row.status = 'up-to-date'
    else row.status = 'ahead'
  }

  async function installedVersionOf(packageName) {
    try {
      const bundles = await manager.listBundles()
      const found = (Array.isArray(bundles) ? bundles : []).find((bundle) => bundle !== null && typeof bundle === 'object' && bundle.name === packageName)
      return found !== undefined && found !== null && typeof found.version === 'string' ? found.version : null
    } catch {
      return null
    }
  }

  async function rollbackTo(packageName, version, enabled, saveExact) {
    if (typeof version !== 'string' || parseSemver(version) === null) return { ok: false, error: 'no recorded version' }
    try {
      await manager.installBundle(`${packageName}@${version}`, { enabled, saveExact })
      const verified = await installedVersionOf(packageName)
      return { ok: true, version: verified === null ? version : verified }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  }

  async function buildState(force) {
    const bundles = await manager.listBundles()
    const installed = (Array.isArray(bundles) ? bundles : []).filter((bundle) => bundle !== null && typeof bundle === 'object' && bundle.installed === true)
    const registries = await registryCandidates(force)
    const rows = installed.map(createRow)
    const registryRows = rows.filter((row) => row.kind === 'npm' && row.packageName !== null && row.official !== true)
    await mapLimit(registryRows, CHECK_CONCURRENCY, async (row) => {
      const packument = await loadPackument(row.packageName, registries, force)
      if (!packument.ok) {
        row.status = 'error'
        row.error = packument.error
        return
      }
      row.latestVersion = packument.latest
      row.registry = packument.registry
      applyComparison(row)
    })
    for (const row of rows) {
      if (row.official === true) {
        row.status = 'shipped'
        continue
      }
      if (row.kind !== 'npm') row.status = row.kind
    }
    rows.sort((left, right) => {
      const rank = (row) => (STATUS_RANK[row.status] === undefined ? 4 : STATUS_RANK[row.status])
      const difference = rank(left) - rank(right)
      if (difference !== 0) return difference
      return left.name.localeCompare(right.name)
    })
    const counts = {
      total: rows.length,
      updatable: rows.filter((row) => row.status === 'update-available').length,
      upToDate: rows.filter((row) => row.status === 'up-to-date').length,
      skipped: rows.filter((row) => SKIPPED_STATUSES.has(row.status)).length,
      failed: rows.filter((row) => row.status === 'error' || row.status === 'unknown-version').length,
    }
    return {
      ok: true,
      version: VERSION,
      checkedAt: new Date().toISOString(),
      settings,
      nextRunAt,
      lastAutoRun,
      registry: preferredRegistry === null ? registries.length > 0 ? registries[0] : null : preferredRegistry,
      registries,
      counts,
      plugins: rows,
    }
  }

  async function runUpdate(packageName, meta) {
    const bundles = await manager.listBundles()
    const bundle = (Array.isArray(bundles) ? bundles : []).find((entry) => entry !== null && typeof entry === 'object' && entry.name === packageName)
    if (bundle === undefined || bundle === null || bundle.installed !== true) {
      return { ok: false, error: 'not-installed', detail: `${packageName} is not installed` }
    }
    if (bundle.official === true) {
      return { ok: false, error: 'shipped-bundle', detail: `${packageName} ships with DSH; update DSH instead` }
    }
    const classified = classifySource(bundle)
    if (classified.kind !== 'npm' || classified.packageName === null) {
      return { ok: false, error: 'unsupported-source', detail: classified.kind }
    }
    const installedVersion = typeof bundle.version === 'string' ? bundle.version : null
    beginProgress(packageName, installedVersion, null, meta)
    const registries = await registryCandidates(true)
    const packument = await loadPackument(classified.packageName, registries, true)
    if (!packument.ok) {
      return { ok: false, error: 'registry-unreachable', detail: packument.error }
    }
    const targetVersion = packument.latest
    progress.targetVersion = targetVersion
    const comparison = compareSemver(targetVersion, installedVersion)
    if (comparison === null) {
      return { ok: false, error: 'invalid-version', detail: `installed ${installedVersion === null ? 'unknown' : installedVersion}, latest ${targetVersion}` }
    }
    if (comparison <= 0) {
      return { ok: false, error: 'no-update', detail: `installed ${installedVersion === null ? 'unknown' : installedVersion}, latest ${targetVersion}` }
    }
    const saveExact = !isRangedSpec(classified.range)
    const enabled = bundle.enabled !== false
    setProgressPhase('removing')
    try {
      const removal = await manager.removeBundle(packageName)
      if (removal !== null && typeof removal === 'object' && (removal.application === 'failed' || removal.application === 'cancelled')) {
        return { ok: false, error: 'remove-failed', detail: describeChange(removal), fromVersion: installedVersion, targetVersion }
      }
    } catch (error) {
      return { ok: false, error: 'remove-failed', detail: errorMessage(error), fromVersion: installedVersion, targetVersion }
    }
    setProgressPhase('installing')
    let installation
    try {
      installation = await manager.installBundle(`${classified.packageName}@${targetVersion}`, { enabled, saveExact })
    } catch (error) {
      setProgressPhase('verifying')
      const rollback = await rollbackTo(classified.packageName, installedVersion, enabled, saveExact)
      return {
        ok: false,
        error: 'install-failed',
        detail: errorMessage(error),
        fromVersion: installedVersion,
        targetVersion,
        rolledBack: rollback.ok,
        rollbackVersion: rollback.ok ? rollback.version : null,
        rollbackError: rollback.ok ? null : rollback.error,
      }
    }
    setProgressPhase('verifying')
    const failed = installation === null
      || typeof installation !== 'object'
      || installation.application === 'failed'
      || installation.application === 'cancelled'
      || installation.error !== undefined
    const verifiedVersion = await installedVersionOf(packageName)
    const base = {
      fromVersion: installedVersion,
      targetVersion,
      verifiedVersion,
      pendingBuilds: pendingBuildsOf(installation),
    }
    if (failed) {
      const rollback = await rollbackTo(classified.packageName, installedVersion, enabled, saveExact)
      return {
        ok: false,
        error: 'install-failed',
        detail: describeChange(installation),
        ...base,
        rolledBack: rollback.ok,
        rollbackVersion: rollback.ok ? rollback.version : null,
        rollbackError: rollback.ok ? null : rollback.error,
      }
    }
    return {
      ok: true,
      name: packageName,
      toVersion: targetVersion,
      application: typeof installation.application === 'string' ? installation.application : 'applied',
      restartReason: typeof installation.restartReason === 'string' ? installation.restartReason : null,
      warnings: Array.isArray(installation.warnings) && installation.warnings.length > 0 ? installation.warnings.map((warning) => String(warning)) : null,
      ...base,
    }
  }

  async function handleState(request, response) {
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: 'untrusted origin' })
      return
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { allow: 'GET' })
      response.end()
      return
    }
    const force = /[?&]force=1(?:&|$)/.test(typeof request.url === 'string' ? request.url : '')
    try {
      sendJson(response, 200, await buildState(force))
    } catch (error) {
      sendJson(response, 500, { ok: false, error: errorMessage(error) })
    }
  }

  async function handleProgress(request, response) {
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: 'untrusted origin' })
      return
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { allow: 'GET' })
      response.end()
      return
    }
    sendJson(response, 200, {
      ok: true,
      version: VERSION,
      running: progress !== null,
      progress: progress === null ? null : { ...progress },
    })
  }

  async function handleUpdate(request, response) {
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: 'untrusted origin' })
      return
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }
    let body
    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJson(response, 400, { ok: false, error: 'invalid-body', detail: errorMessage(error) })
      return
    }
    const packageName = body !== null && typeof body === 'object' && typeof body.name === 'string' ? body.name.trim() : ''
    if (!PACKAGE_NAME_RE.test(packageName)) {
      sendJson(response, 400, { ok: false, error: 'invalid-name' })
      return
    }
    if (updateInFlight) {
      sendJson(response, 409, { ok: false, error: 'busy', detail: 'another update is already running' })
      return
    }
    updateInFlight = true
    try {
      const result = await runUpdate(packageName)
      clearProgress()
      sendJson(response, 200, result)
    } catch (error) {
      clearProgress()
      sendJson(response, 500, { ok: false, error: 'update-failed', detail: errorMessage(error) })
    } finally {
      updateInFlight = false
    }
  }

  const disposers = []
  try {
    disposers.push(ctx.webServer.register({ kind: 'exact', path: STATE_PATH, handler: handleState }))
    disposers.push(ctx.webServer.register({ kind: 'exact', path: UPDATE_PATH, handler: handleUpdate }))
    disposers.push(ctx.webServer.register({ kind: 'exact', path: PROGRESS_PATH, handler: handleProgress }))
    disposers.push(ctx.webServer.register({ kind: 'exact', path: SETTINGS_PATH, handler: handleSettings }))
    disposers.push(ctx.webServer.register({ kind: 'exact', path: BATCH_PATH, handler: handleBatch }))
  } catch (error) {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // best effort
      }
    }
    throw error
  }
  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // best effort
      }
    }
  })
  void loadSettings()
    .then(() => {
      reschedule()
    })
    .catch(() => {
      // Settings are optional; defaults keep the plugin usable.
    })
  ctx.effect(() => () => {
    if (backgroundTimer !== null) {
      clearInterval(backgroundTimer)
      backgroundTimer = null
    }
  }, 'dsh-plugin-updater: auto-update schedule')
}
