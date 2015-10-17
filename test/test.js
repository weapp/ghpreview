require('babel/register')({
  optional: ['es7.functionBind']
})

require('./server/lib/githubUtilsSpec')
