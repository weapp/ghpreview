import {extname} from 'path'
import fs from 'fs'
import {renderError} from '../lib/utils'
import {contentsFor, blobFor} from '../lib/githubFetcher'
import {getParamsFromPull, getParams} from '../lib/githubUtils'
import {renderAglio} from '../lib/aglioSupport'

export function blob(req, res) {
  try {
    getParams(req)
      .then(params =>
        blobFor(req.githubClient, params.repo, params.branch, params.path)
        .then(content => {
          if (content.split('\n')[0] === 'FORMAT: 1A') {
            renderAglio(content, res.send.bind(res))
          } else if (extname(params.path) === '.md') {
            renderAglio(content, res.send.bind(res))
          } else if (extname(params.path) === '.apib') {
            renderAglio(content, res.send.bind(res))
          } else if (extname(params.path) === '.er') {
            res.render('er.ejs', {
              content: content,
              template: fs.readFileSync(__dirname + '/../../views/graph.ejs', 'utf8')
            })
          } else {
            res.send('unknown format')
          }
        }))
        .catch(renderError(res))
        // .done()
  } catch (error) {
    renderError(res, error)
  }
}

export function pull(req, res) {
  try {
    getParamsFromPull(req)
      .then(([repo, branches, branch, files]) => {
        res.render('pulls', { repo, files: files[0], ...branch, branches })
      })
      .catch(renderError(res))
      .done()
  } catch (error) {
    renderError(res, error)
  }
}

export function tree(req, res) {
  try {
    getParams(req)
      .then(params =>
        contentsFor(req.githubClient, params.repo, params.branch, params.path)
        .then(([content, _metadata]) => res.render('list', { ...params, files: content })))
      .catch(renderError(res))
      .done()
  } catch (error) {
    renderError(res, error)
  }
}
