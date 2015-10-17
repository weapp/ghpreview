require('babel/register')({
  optional: ['es7.functionBind']
})
// require('coffee-script/register')
require('./server/app')
