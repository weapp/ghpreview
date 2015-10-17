import github from 'octonode'
import cookieParser from 'cookie-parser'
import Q from 'q'
import {extname} from 'path'
import express from 'express'
// import redis from 'redis'
// import bluebird from 'bluebird'
import fs from 'fs'
import dotenv from 'dotenv'
import {bytesToSize, renderError, stripTrailingSlash, extractGithubUrl} from './lib/utils'
import {loadToken, requireLogin, login, auth} from './lib/githubLogin'
import {contentsFor, blobFor} from './lib/githubFetcher'
import {getParamsFromPull, extractBranchAndPath, getParams} from './lib/githubUtils'
import {renderAglio} from './lib/aglioSupport'
import router from './router'

dotenv.load()

// bluebird.promisifyAll(redis.RedisClient.prototype)

const app = express()

app.locals.bytesToSize = bytesToSize

app.set('view engine', 'jade')
app.set('port', (process.env.PORT || 3000))

app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(express.static(__dirname + '/../public'))
app.use(express.static(__dirname + '/../build'))
app.use(loadToken)
app.use('/github.com', requireLogin)

app::router()

app.listen(app.get('port'), () => console.log('Server started on ', app.get('port')))
