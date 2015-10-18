import {extractGithubUrl, renderError} from '../lib/utils'
import {ninvoke, all as qall} from 'q'

const cmp = (one, other) => 0 + (one < other) - (one > other)
const cmpKey = key => (one, other) => cmp(one[key], other[key])

export function index(req, res) {
  const path = extractGithubUrl(req.query.url)
  if (path) { return res.redirect(path) }

  const client = req.gh.client

  // client.me().info(function(err, me, headers) {  })

  if (!client) { res.render('index') }

  ninvoke(client.me(), 'orgs')
  .then(([orgs, _headers]) => orgs)
  .then(orgs => orgs.map(org => ninvoke(client.org(org.login), 'repos')))
  .then(orgRepos => orgRepos.concat(ninvoke(client.me(), 'repos')))
  .then(allPromises => qall(allPromises))
  .then(repos => repos.map(([body, _metadata]) => body))
  .then(repos => [].concat.apply([], repos))
  .then(repos => repos.sort(cmpKey('pushed_at')))
  .then(repos => res.render('index', {repos}))
  .catch(renderError(res))
}
