import {extractGithubUrl} from '../lib/utils'

export function index(req, res) {
  const path = extractGithubUrl(req.query.url)
  return path ? res.redirect(path) : res.render('index', {})
}
