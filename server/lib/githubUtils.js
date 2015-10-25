import {all as qall} from 'q'
import {stripTrailingSlash, renderError, cinvoke} from './utils'

export async function getParamsFromPullMid(req, res, next) {
  try {
    const client = req.gh.client
    const repo = req.gh.repo = req.params[0]
    const pull = req.gh.pull = req.params[1]

    const branchesPromise = async () => {
      const branches = await cinvoke(client.repo(repo), 'branches')
      return branches.map(({name}) => name)
    }()

    const branchPromise = async () => {
      const {title, head} = await cinvoke(client.pr(repo, pull), 'info')
      return {title, branch: head.ref}
    }()

    const filesPromise = cinvoke(client.pr(repo, pull), 'files')

    const branches = await branchesPromise
    const branch = await branchPromise
    const files = await filesPromise

    Object.assign(req.gh, {branches, files, ...branch})
    next()
  } catch(error) {
    renderError(res, error)
  }
}

export function extractBranchAndPath(branchAndPath, branches) {
  if (!branchAndPath) { return ['master', '/'] }
  const branch = branches.filter(it => (branchAndPath === it) || branchAndPath.startsWith(`${it}/`))[0]
  const path = branch && branchAndPath.slice(branch.length)
  return [branch, path]
}

export async function getParamsMid(req, res, next) {
  try {
    req.gh.repo = stripTrailingSlash(req.params[0])
    const branchAndPath = req.params[1]
    const data = await cinvoke(req.gh.client.repo(req.gh.repo), 'branches')
    req.gh.branches = data.map(({name}) => name)
    const [branch, path] = extractBranchAndPath(branchAndPath, req.gh.branches)
    if (!branch) return res.status(404).send('branch not found')
    req.gh.branch = branch
    req.gh.path = path
    next()
  } catch(error) {
    renderError(res, error)
  }
}
