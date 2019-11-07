const util = require('./util')
const Intention = require('./')
const assert = require('assert')
const Vector = require('../lib/Vector')

module.exports = class OrbitalIntention extends Intention {
  constructor (name, params) {
    super(name, params)

    // Asserting that the parameters exist
    assert(params)
    this.params = params

    // Target has to exist
    assert.notEqual(this.params.target, null)
    this.target = this.params.target

    assert.notEqual(this.params.clockwise, null)
    this.clockwise = this.params.clockwise

    // Radius of the orbitation movement
    assert.notEqual(this.params.radius, null)
    this.radius = this.params.radius

    // If multiplier is not declared it is 1
    this.multiplier = this.params.multiplier || 1
  }

  compute ({x, y}) {
    // Instanciate target values
    let target = util.callOrReturn(this.target)
    let clockwise = util.callOrReturn(this.clockwise)
    let angleToTarget = -Math.atan2(target.y - y, x - target.x)
    let K = 100
    let distanceBetweenTarget = Vector.distBetween({x, y}, target)
    let endAngle

    if (distanceBetweenTarget > this.radius) {
      endAngle = angleToTarget + clockwise * Math.PI / 2 * (2 + (this.radius + K) / (distanceBetweenTarget + K))
    } else {
      endAngle = angleToTarget + clockwise * Math.PI / 2 * Math.sqrt(distanceBetweenTarget / this.radius)
    }
    let finalVector = Vector.norm(Vector.fromTheta(endAngle))

    return {
      // Returning result vector times the multiplier as output.
      vx: finalVector.x * this.multiplier,
      vy: finalVector.y * this.multiplier,
      vtheta: 0
    }
  }
}
