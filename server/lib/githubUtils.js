import {ninvoke, all as qall} from 'q'
import {stripTrailingSlash, renderError} from './utils'

export function getParamsFromPullMid(req, res, next) {
  req.gh.repo = req.params[0]
  req.gh.pull = req.params[1]

  const branches_ = ninvoke(req.gh.client.repo(req.gh.repo), 'branches')
  .then(([data, _metadata]) => data.map(it => it.name))

  const branch_ = ninvoke(req.gh.client.pr(req.gh.repo, req.gh.pull), 'info')
  .then(([data, _metadata]) => ({title: data.title, branch: data.head.ref}))

  const files_ = ninvoke(req.gh.client.pr(req.gh.repo, req.gh.pull), 'files')
  .then(([data, _metadata]) => data)

  qall([branches_, branch_, files_])
  .then(([branches, branch, files]) => {
    Object.assign(req.gh, {branches, files, ...branch})
    next()
  })
  .catch(renderError(res))
  .done()
}

export function extractBranchAndPath(branchAndPath, branches) {
  if (!branchAndPath) { return ['master', '/'] }
  const branch = branches.filter(it => (branchAndPath === it) || branchAndPath.startsWith(`${it}/`))[0]
  const path = branch && branchAndPath.slice(branch.length)
  return [branch, path]
}

export function getParamsMid(req, res, next) {
  console.log('params:', req.params)
  req.gh.repo = stripTrailingSlash(req.params[0])
  const branchAndPath = req.params[1]
  ninvoke(req.gh.client.repo(req.gh.repo), 'branches')
  .then(([data, _metadata]) => {
    req.gh.branches = data.map(it => it.name)
    const [branch, path] = extractBranchAndPath(branchAndPath, req.gh.branches)
    if (!branch) {
      return res.status(404).send('branch not found')
    }
    req.gh.branch = branch
    req.gh.path = path
    next()
  })
  .catch(renderError(res))
  .done()
}
