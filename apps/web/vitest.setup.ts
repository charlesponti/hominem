import '@testing-library/jest-dom'

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// JSDOM doesn't implement HTMLDialogElement methods — polyfill for tests
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
  this.dispatchEvent(new Event('open'))
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
