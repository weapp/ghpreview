import {ninvoke} from 'q'

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

export function cinvoke(obj, action, ...args) {
  console.log(cacheKey(obj, action, ...args))
  return ninvoke(obj, action, ...args).then(([data, ]) => data)
}