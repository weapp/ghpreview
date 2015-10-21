import {extractGithubUrl, renderError, cinvoke} from '../lib/utils'
import {all as qall} from 'q'

const cmp = (one, other) => 0 + (one < other) - (one > other)
const cmpKey = key => (one, other) => cmp(one[key], other[key])

export async function index(req, res) {
  const path = extractGithubUrl(req.query.url)
  if (path) { return res.redirect(path) }

  const client = req.gh.client

  if (!client) { return res.render('index') }

  try {
    var repos = await cinvoke(client.me(), 'repos')
    repos = repos.sort(cmpKey('pushed_at'))
    res.render('index', {repos})
  }
  catch (error) {
    renderError(res, error)
  }
}
