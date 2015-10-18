import {extname} from 'path'
import fs from 'fs'
import {renderError} from '../lib/utils'
import {contentsFor, blobFor} from '../lib/githubFetcher'
// import {getParamsFromPull} from '../lib/githubUtils'
import {renderAglio} from '../lib/aglioSupport'

export function blob(req, res) {
  blobFor(req.gh.client, req.gh.repo, req.gh.branch, req.gh.path)
  .then(content => {
    if (content.split('\n')[0] === 'FORMAT: 1A') {
      renderAglio(content, res.send.bind(res))
    } else if (extname(req.gh.path) === '.md') {
      renderAglio(content, res.send.bind(res))
    } else if (extname(req.gh.path) === '.apib') {
      renderAglio(content, res.send.bind(res))
    } else if (extname(req.gh.path) === '.er') {
      res.render('er.ejs', {
        content: content,
        template: fs.readFileSync(__dirname + '/../../views/graph.ejs', 'utf8')
      })
    } else {
      res.set('Content-Type', 'text/plain')
      res.send(content)
    }
  })
  .catch(renderError(res))
  .done()
}

export function pull(req, res) {
  res.render('pulls', req.gh)
}

export function tree(req, res) {
  contentsFor(req.gh.client, req.gh.repo, req.gh.branch, req.gh.path)
  .then(([content, _metadata]) => res.render('list', { ...req.gh, files: content }))
  .catch(renderError(res))
  .done()
}
