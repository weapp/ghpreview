import {login, auth, requireLogin, loadToken} from './lib/githubLogin'
import {getParamsMid, getParamsFromPullMid} from './lib/githubUtils'
import {index} from './routes/index'
import {blob, pull, tree} from './routes/github'

export default function() {
  this.use(loadToken)

  this.get('/', index)
  this.get('/login', login)
  this.get('/auth', auth)
  this.get('/github.com/*/blob/*', requireLogin, getParamsMid, blob)
  this.get('/github.com/*/pull/*', requireLogin, getParamsFromPullMid, pull)
  this.get(['/github.com/*/tree/*', '/github.com/*'], requireLogin, getParamsMid, tree)
}
