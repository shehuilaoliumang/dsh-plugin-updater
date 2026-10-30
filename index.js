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
 * this half over two same-origin JSON routes registered on the host's webServer
 * service. Nothing here is exposed outside the local web server.
 */

const STATE_PATH = '/dsh-plugin-updater/api/state'
const UPDATE_PATH = '/dsh-plugin-updater/api/update'

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
// Plugin
// ---------------------------------------------------------------------------

export function apply(ctx) {
  const manager = ctx.pluginManager
  const packumentCache = new Map()
  let registryState = null
  let preferredRegistry = null
  let updateInFlight = false

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
      checkedAt: new Date().toISOString(),
      registry: preferredRegistry === null ? registries.length > 0 ? registries[0] : null : preferredRegistry,
      registries,
      counts,
      plugins: rows,
    }
  }

  async function runUpdate(packageName) {
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
    const registries = await registryCandidates(true)
    const packument = await loadPackument(classified.packageName, registries, true)
    if (!packument.ok) {
      return { ok: false, error: 'registry-unreachable', detail: packument.error }
    }
    const targetVersion = packument.latest
    const installedVersion = typeof bundle.version === 'string' ? bundle.version : null
    const comparison = compareSemver(targetVersion, installedVersion)
    if (comparison === null) {
      return { ok: false, error: 'invalid-version', detail: `installed ${installedVersion === null ? 'unknown' : installedVersion}, latest ${targetVersion}` }
    }
    if (comparison <= 0) {
      return { ok: false, error: 'no-update', detail: `installed ${installedVersion === null ? 'unknown' : installedVersion}, latest ${targetVersion}` }
    }
    const saveExact = !isRangedSpec(classified.range)
    const enabled = bundle.enabled !== false
    try {
      const removal = await manager.removeBundle(packageName)
      if (removal !== null && typeof removal === 'object' && (removal.application === 'failed' || removal.application === 'cancelled')) {
        return { ok: false, error: 'remove-failed', detail: describeChange(removal), fromVersion: installedVersion, targetVersion }
      }
    } catch (error) {
      return { ok: false, error: 'remove-failed', detail: errorMessage(error), fromVersion: installedVersion, targetVersion }
    }
    let installation
    try {
      installation = await manager.installBundle(`${classified.packageName}@${targetVersion}`, { enabled, saveExact })
    } catch (error) {
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
      sendJson(response, 200, result)
    } catch (error) {
      sendJson(response, 500, { ok: false, error: 'update-failed', detail: errorMessage(error) })
    } finally {
      updateInFlight = false
    }
  }

  const disposers = []
  try {
    disposers.push(ctx.webServer.register({ kind: 'exact', path: STATE_PATH, handler: handleState }))
    disposers.push(ctx.webServer.register({ kind: 'exact', path: UPDATE_PATH, handler: handleUpdate }))
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
}
