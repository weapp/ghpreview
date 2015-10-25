import aReplace from 'async-replace'
import {nfcall, Promise as promise} from 'q'
import {stripTrailingSlash, cinvoke} from './utils'
import {resolve, dirname} from 'path'

const extractConent = data => new Buffer(data.content, 'base64').toString()

const inclueRegExp = /<!-- include\((.*)\) -->/g

const expandPath = (path, filename) => stripTrailingSlash(resolve(resolve('/', path), filename))

const replacer = (fetcher, client, repo, branch, path) =>
  async (match, filename, offset, string, done) =>
    done(null, await fetcher(client, repo, branch, expandPath(dirname(path), filename)))

export function contentsFor(client, repo, branch, path) {
  // console.log('contentsFor', [repo, branch, path])
  return cinvoke(client.repo(stripTrailingSlash(repo)), 'contents', stripTrailingSlash(path), branch)
}

export async function blobFor(client, repo, branch, path) {
    const data = await contentsFor(client, repo, branch, stripTrailingSlash(path))
    const content = await nfcall(aReplace,
             extractConent(data),
             inclueRegExp,
             replacer(blobFor, client, repo, branch, path))
    return content
}
