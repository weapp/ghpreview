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

dotenv.load();

// bluebird.promisifyAll(redis.RedisClient.prototype)

var app = express()
app.use(cookieParser(process.env.COOKIE_SECRET))
app.set('view engine', 'jade')
app.use(express.static(__dirname + '/../public'))
app.use(express.static(__dirname + '/../build'))

app.set('port', (process.env.PORT || 3000));

var extractStateFromAuthUrl = authUrl => [authUrl, authUrl.match(/&state=([0-9a-z]{32})/i)[1]]

var authUrl = () => extractStateFromAuthUrl(github.auth.config({
  id: process.env.GITHUB_ID,
  secret: process.env.GITHUB_SECRET
}).login(['user', 'repo']))

var extractConent = data => new Buffer(data.content, 'base64').toString()

var contentsFor = (token, repo, branch, path) => {
  console.log('contentsFor', [token, repo, branch, path])
  return Q.ninvoke(github.client(token).repo(repo), 'contents', path, branch)
}

var inclueRegExp = /(<!-- include\((.*)\) -->)/g

function stripTrailingSlash (str) {
  if (str.substr(-1) === '/') {
    return str.substr(0, str.length - 1)
  }
  return str
}

var expandPath = (path, filename) => stripTrailingSlash(resolve(resolve('/', path), filename))

var replacer = (token, repo, branch, path) =>
  (match, all, filename, offset, string, done) =>
    blobFor(token, repo, branch, expandPath(dirname(path), filename))
      .then(content => done(null, content))
      .catch(error => done(error))
      .done()

// ghrepo.blob(ok.sha, function (err, ok) {})
var blobFor = (token, repo, branch, path) => {
  console.log([token, repo, branch, path, expandPath(branch, path)])
  return Q.Promise((resolve, reject, notify) => {
    console.log('blobFor', [token, repo, branch, path])
    contentsFor(token, repo, branch, stripTrailingSlash(path))
      .then(([data, metadata]) => {
        Q.nfcall(aReplace,
                 extractConent(data),
                 inclueRegExp,
                 replacer(token, repo, branch, path))
          .then(resolve)
          .catch(reject)
          .done()
      })
      .catch(reject)
      .done()
  }
) }

function bytesToSize (bytes) {
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) { return '0 Byte' }
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 0)
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

app.use(function (req, res, next) {
  res.locals.bytesToSize = bytesToSize
  next()
})

app.get('/', function (req, res) {
  res.locals.token = req.signedCookies._gh_token
  if (req.query.url){
    var url = req.query.url.match(/https?:\/(\/github\.com\/.*)/)[1]
    res.redirect(url)
  }
  res.render('index', {})
})

var login = (req, res) => {
  var [url, state] = authUrl()
  res.cookie('_gh_state', '' + state, { signed: true })
  res.redirect(url)
}

app.get('/login', login)

function getParamsFromPull (request) {
  var repo = request.params[0]
  var pull = request.params[1]
  var token = request.signedCookies._gh_token

  var branches = Q.ninvoke(github.client(token).repo(repo), 'branches')
    .then(([data, metadata]) => data.map(e => e.name))

  var branch = Q.ninvoke(github.client(token).pr(repo, pull), 'info')
    .then(([data, metadata]) => ({title: data.title, branch: data.head.ref}))

  var files = Q.ninvoke(github.client(token).pr(repo, pull), 'files')

  return Q.all([repo, branches, branch, files])
}

function getParams (request) {
  console.log('params:', request.params)
  return Q.Promise((resolve, reject, notify) => {
    var repo = request.params[0]
    var branch_path = request.params[1]
    var token = request.signedCookies._gh_token

    Q.ninvoke(github.client(token).repo(repo), 'branches')
    .then(([data, metadata]) => {
      var branches = data.map(e => e.name)
      var branch = 'master'
      var path = '/'
      if (branch_path) {
        branch = branches.filter(e => (branch_path === e) || branch_path.startsWith(`${e}/`))[0]
        path = branch_path.slice(branch.length)
      }
      if (branch) {
        resolve({token, repo, branches, branch, path})
      } else {
        reject(new Error('branch not found'))
      }
    })
    .catch(reject)
    .done()
  })
}

var formatLocation = location => `index: ${location.index} length: ${location.length}`

var toHtml = obj => {
  return `code ${obj.code}:\n  ${obj.message}\n    ${obj.location.map(formatLocation).join('\n    ')}`
}

var renderAglio = (content, done) => {
  var options = { themeVariables: 'default' }
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
        res.render('pulls', { repo, files: files[0], ...branch, branches })
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
        .then(([content, metadata]) => res.render('list', { ...params, files: content })))
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
//   var signedCookie = req.signedCookies._gh_token
//   res.send({signedCookie})
// })

app.get('/auth', function (req, res) {
  console.dir('query:', req.query)
  var params = req.query
  var state = req.signedCookies._gh_state

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
      var prevUrl = req.signedCookies._gh_prev_url
      if (prevUrl) {
        res.redirect(prevUrl)
      } else {
        res.redirect('/')
      }
    })
  }
})

app.listen(app.get('port'), () => console.log('Server started on ', app.get('port')))
