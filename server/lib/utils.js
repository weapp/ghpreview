import {ninvoke, fcall, all as qall} from 'q'
import cache from 'memory-cache'
import {range} from 'lodash'


export function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) { return '0 Byte' }
  const order = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 0)
  return Math.round(bytes / Math.pow(1024, order), 2) + ' ' + sizes[order]
}

export function renderError(res, error_) {
  const inner = error => {
    console.trace(error)
    res.set('Content-Type', 'text/plain')
    // res.send('' + error)
    res.send('error')
  }
  return (arguments.length > 1) ? inner(error_) : inner
}


export function stripTrailingSlash(str) {
  if (str.substr(-1) === '/') {
    return str.substr(0, str.length - 1)
  }
  return str
}

export function extractGithubUrl(url) {
  if (!url) return void 0
  const match = url.match(/https?:\/(\/github\.com\/.*)/)
  if (match) return match[1]
}

function cacheKey(obj, ...extras) {
  const props = {__:obj.constructor.name, ...obj, client: obj.client.token}
  return Object.keys(props).map(key => props[key]).concat(extras).join("::")
}

const SECONDS = 1000
const MINUTES = 60 * SECONDS

const parsePages = link => parseInt(link.match(/=(\d*)>; rel="last"/)[1], 10)

export async function cinvoke(obj, action, ...args) {
  const key = cacheKey(obj, action, ...args)
  const cached = cache.get(key)
  if (cached) {
    console.log(`HIT  - ${key}`)
    return cached
  }
  console.log(`MISS - ${key}`)
  const [data, headers] = await ninvoke(obj, action, ...args)

  if (headers.link) {
    const pages = range(2, parsePages(headers.link) + 1)
    const ninvoke_page = async page => (await ninvoke(obj, action, page, ...args))[0]

    const results = await qall(pages.map(ninvoke_page))
    const all = [].concat.apply([], results.concat(data) )
    return cache.put(key, all, 5 * MINUTES)
  }
  return cache.put(key, data, 5 * MINUTES)
}
