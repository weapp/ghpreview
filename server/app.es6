import cookieParser from 'cookie-parser'
import express from 'express'
// import redis from 'redis'
// import bluebird from 'bluebird'
import dotenv from 'dotenv'
import {bytesToSize} from './lib/utils'
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

app::router()

app.listen(app.get('port'), () => console.log('Server started on ', app.get('port')))
