const fs = require('fs')
const Handlebars = require('handlebars')
const path = require('path')

const constants = require('./constants')

function getPrecompiledTemplates() {
  const precompiledTemplates = {}

  Object.entries(constants.partials).forEach(([name, filename]) => {
    const partial = Handlebars.compile(
      fs.readFileSync(path.resolve(__dirname, 'templates/partials', `${filename}.hbs`), 'utf8')
    )
    Handlebars.registerPartial(name, partial)
  })

  Object.values(constants.emailTemplates).forEach((name) => {
    precompiledTemplates[name] = Handlebars.compile(
      fs.readFileSync(path.resolve(__dirname, 'templates', `${name}.hbs`), 'utf8')
    )
  })

  return precompiledTemplates
}

module.exports = { getPrecompiledTemplates }
