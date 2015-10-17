import {ninvoke, Promise as promise, all as qall} from 'q'
import {stripTrailingSlash} from './utils'

export function getParamsFromPull(req) {
  const repo = req.params[0]
  const pull = req.params[1]

  const branches = ninvoke(req.githubClient.repo(repo), 'branches')
    .then(([data, _metadata]) => data.map(it => it.name))

  const branch = ninvoke(req.githubClient.pr(repo, pull), 'info')
    .then(([data, _metadata]) => ({title: data.title, branch: data.head.ref}))

  const files = ninvoke(req.githubClient.pr(repo, pull), 'files')

  return qall([repo, branches, branch, files])
}

export function extractBranchAndPath(branchAndPath, branches) {
  const branch = branches.filter(it => (branchAndPath === it) || branchAndPath.startsWith(`${it}/`))[0]
  const path = branch && branchAndPath.slice(branch.length)
  return branchAndPath ? [branch, path] : ['master', '/']
}

export function getParams(req) {
  console.log('params:', req.params)
  return promise((resolve, reject, _notify) => {
    const repo = stripTrailingSlash(req.params[0])
    const branchAndPath = req.params[1]
    ninvoke(req.githubClient.repo(repo), 'branches')
    .then(([data, _metadata]) => {
      const branches = data.map(it => it.name)
      const [branch, path] = extractBranchAndPath(branchAndPath, branches)
      if (branch) {
        resolve({repo, branches, branch, path})
      } else {
        reject(new Error('branch not found'))
      }
    })
    .catch(reject)
    .done()
  })
}
