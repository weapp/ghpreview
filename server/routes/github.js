import {extname} from 'path'
import fs from 'fs'
import {renderError} from '../lib/utils'
import {contentsFor, blobFor} from '../lib/githubFetcher'
// import {getParamsFromPull} from '../lib/githubUtils'
import {renderAglio} from '../lib/aglioSupport'

function renderER(content, render) {
  render('er.ejs', {
    content: content,
    template: fs.readFileSync(__dirname + '/../../views/graph.ejs', 'utf8')
  })
}

export async function blob(req, res) {
  try {
    const content = await blobFor(req.gh.client, req.gh.repo, req.gh.branch, req.gh.path)
    const sender = res.send.bind(res)
    const render = res.render.bind(res)
    const ext = extname(req.gh.path)
    if (content.split('\n')[0] === 'FORMAT: 1A') {
      renderAglio(content, sender)
    } else if (ext === '.md' || ext === '.apib') {
      renderAglio(content, sender)
    } else if (ext === '.er') {
      renderER(content, render)
    } else {
      res.set('Content-Type', 'text/plain')
      res.send(content)
    }
  } catch(error) {
    renderError(res, error)
  }
}

export const pull = (req, res) => res.render('pulls', req.gh)

export async function tree(req, res) {
  try {
    const content = await contentsFor(req.gh.client, req.gh.repo, req.gh.branch, req.gh.path)
    res.render('list', { ...req.gh, files: content })
  } catch(error) {
    renderError(res, error)
  }
}
