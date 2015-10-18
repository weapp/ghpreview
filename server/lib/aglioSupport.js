import aglio from 'aglio'

const formatLocation = location => `index: ${location.index} length: ${location.length}`

const toHtml = obj => {
  return `code ${obj.code}:\n  ${obj.message}\n    ${obj.location.map(formatLocation).join('\n    ')}`
}

export function renderAglio(content, done) {
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
