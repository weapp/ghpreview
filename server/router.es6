import {login, auth} from './lib/githubLogin'
import {index} from './routes/index'
import {blob, pull, tree} from './routes/github'

export default function(){
  this.get('/', index)
  this.get('/login', login)
  this.get('/auth', auth)
  this.get('/github.com/*/blob/*', blob)
  this.get('/github.com/*/pull/*', pull)
  this.get(['/github.com/*/tree/*', '/github.com/*'], tree)
}
