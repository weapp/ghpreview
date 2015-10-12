import aReplace from 'async-replace'
import github from 'octonode'
import cookieParser from 'cookie-parser'
import aglio from 'aglio'
import Q from 'q'
import {resolve, dirname, extname} from 'path'
import express from 'express'
// import redis from 'redis'
// import bluebird from 'bluebird'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.load()

// bluebird.promisifyAll(redis.RedisClient.prototype)

const app = express()
app.use(cookieParser(process.env.COOKIE_SECRET))
app.set('view engine', 'jade')
app.use(express.static(__dirname + '/../public'))
app.use(express.static(__dirname + '/../build'))

app.set('port', (process.env.PORT || 3000))

const extractStateFromAuthUrl = authUrl => [authUrl, authUrl.match(/&state=([0-9a-z]{32})/i)[1]]

const authUrl = () => extractStateFromAuthUrl(github.auth.config({
  id: process.env.GITHUB_ID,
  secret: process.env.GITHUB_SECRET
}).login(['user', 'repo']))

const extractConent = data => new Buffer(data.content, 'base64').toString()

const contentsFor = (token, repo, branch, path) => {
  console.log('contentsFor', [token, repo, branch, path])
  return Q.ninvoke(github.client(token).repo(repo), 'contents', path, branch)
}

const inclueRegExp = /(<!-- include\((.*)\) -->)/g

const stripTrailingSlash = str => {
  if (str.substr(-1) === '/') {
    return str.substr(0, str.length - 1)
  }
  return str
}

const expandPath = (path, filename) => stripTrailingSlash(resolve(resolve('/', path), filename))

const replacer = (token, repo, branch, path) =>
  (match, all, filename, offset, string, done) =>
    blobFor(token, repo, branch, expandPath(dirname(path), filename))
      .then(content => done(null, content))
      .catch(error => done(error))
      .done()

// ghrepo.blob(ok.sha, function (err, ok) {})
const blobFor = (token, repo, branch, path) => {
  console.log([token, repo, branch, path, expandPath(branch, path)])
  return Q.Promise((promiseResolve, reject, _notify) => {
    console.log('blobFor', [token, repo, branch, path])
    contentsFor(token, repo, branch, stripTrailingSlash(path))
      .then(([data, _metadata]) => {
        Q.nfcall(aReplace,
                 extractConent(data),
                 inclueRegExp,
                 replacer(token, repo, branch, path))
          .then(promiseResolve)
          .catch(reject)
          .done()
      })
      .catch(reject)
      .done()
  }
) }

const bytesToSize = bytes => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) { return '0 Byte' }
  const int = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 0)
  return Math.round(bytes / Math.pow(1024, int), 2) + ' ' + sizes[int]
}

app.use((_req, res, next) => {
  res.locals.bytesToSize = bytesToSize
  next()
})

app.get('/', (req, res) => {
  res.locals.token = req.signedCookies._gh_token
  if (req.query.url) {
    const url = req.query.url.match(/https?:\/(\/github\.com\/.*)/)[1]
    res.redirect(url)
  }
  res.render('index', {})
})

const login = (req, res) => {
  const [url, state] = authUrl()
  res.cookie('_gh_state', '' + state, { signed: true })
  res.redirect(url)
}

app.get('/login', login)

const getParamsFromPull = request => {
  const repo = request.params[0]
  const pull = request.params[1]
  const token = request.signedCookies._gh_token

  const branches = Q.ninvoke(github.client(token).repo(repo), 'branches')
    .then(([data, _metadata]) => data.map(it => it.name))

  const branch = Q.ninvoke(github.client(token).pr(repo, pull), 'info')
    .then(([data, _metadata]) => ({title: data.title, branch: data.head.ref}))

  const files = Q.ninvoke(github.client(token).pr(repo, pull), 'files')

  return Q.all([repo, branches, branch, files])
}

const getParams = request => {
  console.log('params:', request.params)
  return Q.Promise((promiseResolve, reject, _notify) => {
    const repo = request.params[0]
    const branchSlashPath = request.params[1]
    const token = request.signedCookies._gh_token

    Q.ninvoke(github.client(token).repo(repo), 'branches')
    .then(([data, _metadata]) => {
      const branches = data.map(it => it.name)
      let branch = 'master'
      let path = '/'
      if (branchSlashPath) {
        branch = branches.filter(it => (branchSlashPath === it) || branchSlashPath.startsWith(`${it}/`))[0]
        path = branchSlashPath.slice(branch.length)
      }
      if (branch) {
        promiseResolve({token, repo, branches, branch, path})
      } else {
        reject(new Error('branch not found'))
      }
    })
    .catch(reject)
    .done()
  })
}

const formatLocation = location => `index: ${location.index} length: ${location.length}`

const toHtml = obj => {
  return `code ${obj.code}:\n  ${obj.message}\n    ${obj.location.map(formatLocation).join('\n    ')}`
}

const renderAglio = (content, done) => {
  const options = { themeVariables: 'default' }
  aglio.render(content, options, (err, html, warnings) => {
    if (err) {
      done(err)
      return console.log(err)
    }
    if (warnings) {
      done(html + '<div class="container"><div class="row"><div class="content"><pre>' + warnings.map(obj => toHtml(obj)).join('\n') + '</pre></div></div></div>')
    } else {
      done(html)
    }
  })
}

app.get('/github.com/*/blob/*', (req, res) => {
  try {
    getParams(req)
      .then(params =>
        blobFor(params.token, params.repo, params.branch, params.path)
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
              template: fs.readFileSync(__dirname + '/../views/graph.ejs', 'utf8')
            })
          } else {
            res.send('unknown format')
          }
        }))
        .catch(error => {
          console.trace(error)
          if (req.signedCookies._gh_token) {
            res.send(req.signedCookies._gh_token)
          } else {
            res.cookie('_gh_prev_url', req.url, { signed: true })
            login(req, res)
          }
        })
        .done()
  } catch (error) {
    console.trace(error)
    res.send(error)
  }
})

app.get('/github.com/*/pull/*', (req, res) => {
  try {
    getParamsFromPull(req)
      .then(([repo, branches, branch, files]) => {
        res.render('list', { repo, files: files[0], ...branch, branches })
      })
      .done()
  } catch (error) {
    console.trace(error)
    res.send(error)
  }
})

app.get(['/github.com/*/tree/*', '/github.com/*'], (req, res) => {
  try {
    getParams(req)
      .then(params =>
        // dirFor(params.token, params.repo, params.branch, params.path)
        contentsFor(params.token, params.repo, params.branch, stripTrailingSlash(params.path))
        .then(([content, _metadata]) => res.render('list', { ...params, files: content })))
        .catch(error => {
          console.trace(error)
          if (req.signedCookies._gh_token) {
            res.send('error??')
          } else {
            res.cookie('_gh_prev_url', req.url, { signed: true })
            login(req, res)
          }
        })
        .done()
  } catch (error) {
    console.trace(error)
    res.send(error)
  }
})

// app.get('/showCookie', (req, res) => {
//   let signedCookie = req.signedCookies._gh_token
//   res.send({signedCookie})
// })

app.get('/auth', (req, res) => {
  console.dir('query:', req.query)
  const params = req.query
  const state = req.signedCookies._gh_state

  // Check against CSRF attacks
  if (!state || state !== params.state) {
    res.sendStatus(403)
    res.set('Content-Type', 'text/plain')

    res.end('')
  } else {
    github.auth.login(params.code, (err, token) => {
      if (err) { return console.error(err) }
      console.log(token)
      res.cookie('_gh_token', '' + token, { signed: true })
      const prevUrl = req.signedCookies._gh_prev_url
      if (prevUrl) {
        res.redirect(prevUrl)
      } else {
        res.redirect('/')
      }
    })
  }
})

app.listen(app.get('port'), () => console.log('Server started on ', app.get('port')))
