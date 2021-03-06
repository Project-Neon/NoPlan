const Vector = require('../../lib/Vector')
const TensorMath = require('../../lib/TensorMath')
const OrbitalIntention = require('../../Intention/OrbitalIntention')
const PointIntention = require('../../Intention/PointIntention')
const LineIntention = require('../../Intention/LineIntention')

const RulePlays = require('./RulePlays')

const BASE_SPEED = 50

module.exports = class AttackerMain extends RulePlays {
    setup(){
        super.setup()

        const mid = () => {
          return this.match.gameManager.coaches[0].actualMidfielder.robots.self.position
        }
        let ball = () => {

            return {
                x: this.frame.cleanData.ball.x,
                y: this.frame.cleanData.ball.y
            }
        }

        let ballShiftedP = () => {
            let ball = {
                x: this.frame.cleanData.ball.x - 40,
                y: this.frame.cleanData.ball.y + 150
            }
            return ball
        }

        let ballShiftedN = () => {
            let ball = {
                x: this.frame.cleanData.ball.x - 40,
                y: this.frame.cleanData.ball.y - 150
            }
            return ball
        }

        let ballToGoalNormal = () => {
            let b = this.frame.cleanData.ball
            let c = {x: 680, y: 0}

            let ballToGoal = Vector.sub(b, c)

            // Vector normal
            ballToGoal = Vector.norm({x: ballToGoal.x, y: -ballToGoal.y})

            return Vector.angle(ballToGoal)
        }

        this.orbitalRight = new OrbitalIntention('FollowBall', {
            target: ballShiftedN,
            clockwise: -1,
            radius: 75,
            decay: TensorMath.new.finish,
            multiplier: BASE_SPEED * 0.7
        })

        this.addIntetion(this.orbitalRight)

        this.orbitalLeft = new OrbitalIntention('FollowBall', {
            target: ballShiftedP,
            clockwise: 1,
            radius: 75,
            decay: TensorMath.new.finish,
            multiplier: BASE_SPEED * 0.7
        })

        this.addIntetion(this.orbitalLeft)

        /*
        Aproxima o robo da bola quando ele esta a 10 cm dela.
        O torna mais rapido e mais preciso na interceptação da mesma.
        Deve ser mais fraca que o movimento orbial para não cagar.
        */
        this.addIntetion(new PointIntention('KeepOnBall', {
            target: ball,
            radius: 110,
            radiusMax: 110,
            decay: TensorMath.new.finish,
            multiplier: BASE_SPEED
        }))

        this.addIntetion(new PointIntention('KeepOnBall', {
            target: ball,
            radius: 500,
            decay: TensorMath.new.sin().finish,
            multiplier: BASE_SPEED * 0.7
        }))

        // this.addIntetion(new PointIntention('Avoid mid', {
        //   target: mid,
        //   decay: TensorMath.new.mult(-1).finish,
        //   radius: 200,
        //   radiusMax: 200,
        //   multiplier: BASE_SPEED * 1.3
        // }))

        this.avoidFieldWalls3 = new LineIntention('avoidFieldWalls3', {
          target: {x:-780, y: 0},
          theta: Vector.direction("up"),
          lineSize: 1700,
          lineDist: 100,
          lineDistMax: 100,
          decay: TensorMath.new.sum(1).mult(-1).finish,
          multiplier: BASE_SPEED
        })
        this.addIntetion(this.avoidFieldWalls3)

      }
      loop () {
        console.log(this.frame.cleanData.ball.y)
        const FIELD_ORBITAL_MARGIN = 200

        let ball = {
          x: this.frame.cleanData.ball.x,
          y: this.frame.cleanData.ball.y
        }

        if (this.position.y < (-650 + FIELD_ORBITAL_MARGIN)) {
          this.orbitalRight.weight = 0
          this.orbitalLeft.weight = 1
        }else if (this.position.y > (650 - FIELD_ORBITAL_MARGIN)) {
            this.orbitalRight.weight = 1
            this.orbitalLeft.weight = 0

        } else if (this.position.y > ball.y) {
            this.orbitalRight.weight = 0
            this.orbitalLeft.weight = 1
        } else {
            this.orbitalRight.weight = 1
            this.orbitalLeft.weight = 0
        }
      }
}
