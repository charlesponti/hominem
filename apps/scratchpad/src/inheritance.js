/**
 * This file displays how 
 */
function Bird () {}

Bird.prototype.makeNoise = function () {
  return 'chirp'
}

Bird.prototype.fly = function () {
  return 'fly'
}

var bird = new Bird()

console.log(bird.makeNoise() === 'chirp')
console.log(bird.fly() === 'fly')

/**
 * Extend Bird by copying prototype to Parrot.prototype
 * @param {*} params
 */
function Parrot (params) {}
Parrot.prototype = Bird.prototype

var parrot = new Parrot()

Parrot.prototype.makeNoise = () => 'hello'

console.log(parrot.makeNoise() === 'hello')
console.log(parrot.fly() === 'fly')
