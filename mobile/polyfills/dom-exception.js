// Polyfill: makes DOMException available as a global before InitializeCore runs.
// Uses plain function (no class extends) to avoid Babel helper require() calls
// that break when this file runs as an early polyfill.
if (!global.DOMException) {
  var DOMException = function DOMException(message, name) {
    this.message = message != null ? String(message) : '';
    this.name = name != null ? String(name) : 'Error';
    this.code = 0;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DOMException);
    }
  };
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;
  global.DOMException = DOMException;
}
