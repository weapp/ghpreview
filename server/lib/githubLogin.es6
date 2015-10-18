import github from 'octonode'

export function loadToken(req, res, next) {
  req.gh = {}
  req.gh.token = req.signedCookies._gh_token
  req.gh.client = req.gh.token && github.client(req.gh.token)

  res.locals.token = req.gh.token
  res.locals.gh = req.gh
  next()
}


const extractStateFromAuthUrl = authUrl => [authUrl, authUrl.match(/&state=([0-9a-z]{32})/i)[1]]

const authUrl = () => extractStateFromAuthUrl(github.auth.config({
  id: process.env.GITHUB_ID,
  secret: process.env.GITHUB_SECRET
}).login(['user', 'repo']))

export function auth(req, res) {
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
      if (prevUrl) { return res.redirect(prevUrl) }
      res.redirect('/')
    })
  }
}

export function login(req, res) {
  const [url, state] = authUrl()
  res.cookie('_gh_state', '' + state, { signed: true })
  res.redirect(url)
}

export function requireLogin(req, res, next) {
  if (req.gh.token) { return next() }
  res.cookie('_gh_prev_url', req.originalUrl, { signed: true })
  login(req, res)
}
