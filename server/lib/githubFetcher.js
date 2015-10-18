import aReplace from 'async-replace'
import {ninvoke, nfcall, Promise as promise} from 'q'
import {stripTrailingSlash} from './utils'
import {resolve, dirname} from 'path'

const extractConent = data => new Buffer(data.content, 'base64').toString()

const inclueRegExp = /(<!-- include\((.*)\) -->)/g

const expandPath = (path, filename) => stripTrailingSlash(resolve(resolve('/', path), filename))

const replacer = (fetcher, client, repo, branch, path) =>
  (match, all, filename, offset, string, done) =>
    fetcher(client, repo, branch, expandPath(dirname(path), filename))
      .then(content => done(null, content))
      .catch(error => done(error))
      .done()

export function contentsFor(client, repo, branch, path) {
  console.log('contentsFor', [repo, branch, path])
  return ninvoke(client.repo(stripTrailingSlash(repo)), 'contents', stripTrailingSlash(path), branch)
}

// ghrepo.blob(ok.sha, function (err, ok) {})
export function blobFor(client, repo, branch, path) {
  return promise((resolve_, reject, _notify) => {
    console.log('blobFor', {client, repo, branch, path})
    contentsFor(client, repo, branch, stripTrailingSlash(path))
      .then(([data, _metadata]) => {
        nfcall(aReplace,
                 extractConent(data),
                 inclueRegExp,
                 replacer(blobFor, client, repo, branch, path))
          .then(resolve_)
          .catch(reject)
          .done()
      })
      .catch(reject)
      .done()
  }
) }
