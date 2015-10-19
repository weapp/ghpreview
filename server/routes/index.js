import {extractGithubUrl, renderError, cinvoke} from '../lib/utils'
import {all as qall} from 'q'

const cmp = (one, other) => 0 + (one < other) - (one > other)
const cmpKey = key => (one, other) => cmp(one[key], other[key])

export function index(req, res) {
  const path = extractGithubUrl(req.query.url)
  if (path) { return res.redirect(path) }

  const client = req.gh.client

  // client.me().info(function(err, me, headers) {  })

  if (!client) { res.render('index') }

  const getRepos = user => cinvoke(user, 'repos')

  cinvoke(client.me(), 'orgs')
  .then(orgs => orgs.map(org => client.org(org.login)).concat(client.me()))
  .then(users => qall(users.map(getRepos)))
  .then(repos => [].concat.apply([], repos))
  .then(repos => repos.sort(cmpKey('pushed_at')))
  .then(repos => res.render('index', {repos}))
  .catch(renderError(res))
}
