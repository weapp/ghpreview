import {extractGithubUrl, renderError} from '../lib/utils'
import {ninvoke, all as qall} from 'q'

export function index(req, res) {
  const path = extractGithubUrl(req.query.url)
  if (path) { return res.redirect(path) }

  const client = req.gh.client

  // client.me().info(function(err, me, headers) {  })

  if (!client) { res.render('index') }

  ninvoke(client.me(), 'orgs')
  .then(([orgs, headers]) => orgs)
  .then(orgs => orgs.map(org => ninvoke(client.org(org.login), 'repos')))
  .then(org_repos => org_repos.concat(ninvoke(client.me(), 'repos')))
  .then(all_promises => qall(all_promises))
  .then(repos => repos.map(([body, metadata_]) => body))
  .then(repos => [].concat.apply([], repos))
  .then(repos => repos.sort((a, b)=>
    (a.pushed_at < b.pushed_at) ? 1
    : (a.pushed_at > b.pushed_at) ? -1
    : 0
  ))
  .then(repos => res.render('index', {repos}))
  .catch(renderError(res))
}
