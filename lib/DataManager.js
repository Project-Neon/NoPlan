const EventEmitter = require('events')
const Vector = require('./Vector')

module.exports = class DataManager extends EventEmitter {
  constructor (match) {
    super()
    this.match = match
    this.robots = null
    this.coach = null

    this.frameHistory = {
      size: 15,
      frames: []
    }

    this.visionParams = match.options.vision.params
    this.driverParams = match.options.driver.params
  }

 async init () {
	this.vision = require(this.visionParams.class)
	
    this.driver = require(this.driverParams.class)

    this.vision = new this.vision(this.visionParams.host, this.visionParams.port)
		this.driver = new this.driver(this.driverParams)

		this.vision.connect()

		this.driver.connect(this.driverParams['default-port'])
		this.driver.ready()

		this.vision.on('detection', this.emitVision.bind(this))
	}

	getBallProjection(goalLine=-680, robot) {
		let ballPos = {x: this.ball.x, y: this.ball.y}
		let ballSpeed = this.ball.speed
		let ballDir = Vector.norm(ballSpeed)
		let BallAngle = Math.abs(Vector.angle(ballDir))

								//   1||-1						* angulo da bola (em y) * 
		let ballProjectY = -1 * (ballDir.y/Math.abs(ballDir.y)) * Math.tan(BallAngle) * Math.abs(ballPos.x - goalLine) + ballPos.y
		return {x: goalLine, y: ballProjectY}
	}

	getLastBall() {
		if(this.frameHistory.frames.length > 0) {
			return this.frameHistory.frames[0].balls[0]
		}
		return {'x': 0, 'y': 0}
	}

	emitVision (frame) {
		// let side = this.match.state.state.side
		// cleanData['right'] = this.fixFrame(frame, 'right')
		// cleanData['left'] = this.fixFrame(frame, 'left')
		let data = frame
		this.updateFrameHistory(frame)

		data['cleanData'] = {}
		// TODO quando houverem mais tratamentos fazer algo mais elaborado

		if (data.balls.length > 0) {
			this.ball = frame.balls[0]
		}else {
			this.ball = this.getLastBall()
		}

		this.ball = {
			'x': this.ball['x'],
			'y': this.ball['y'],
			'speed': this.calculateBallSpeed()
		}

		if (this.frameHistory.frames.length > 1){
			let ballProjection = this.getBallProjection()
			this.ball['projection'] = ballProjection
		}

		data['cleanData']['ball'] = this.ball

		data = {
			'right': this.fixFrame(frame, 'right'),
			'left': this.fixFrame(frame, 'left')
		}

		this.emit('detection', data)
	}

	updateFrameHistory (frame) {
		if (frame.balls.length === 0) return
		// Ponto final no cálculo do vetor é a primeira posição do array
		if (this.frameHistory.frames.length === this.frameHistory.size) {
			this.frameHistory.frames.pop()
			this.frameHistory.frames.unshift(frame)
		} else {
			this.frameHistory.frames.unshift(frame)
		}
		//1551562891.27858 - 1551562891.246445/

	}

	fixFrame(frame_, side) {
		// Fix position and orientation from robots and ball:
		// Position just multiply by -1 (since the center of the field is the origin)
		// Orientation just sum PI (a 180 degrees rotation)

		let frame = JSON.parse(JSON.stringify(frame_))
		if(side == 'left') {
			let yellow_team = frame['robots_yellow']
			let blue_team = frame['robots_blue']
			let balls = frame['balls']
			let cleanData = frame.cleanData

			if (blue_team.length > 0) {
				for(let robot in blue_team) {
					blue_team[robot]['x'] *= -1
					blue_team[robot]['y'] *= -1
					blue_team[robot]['orientation'] += Math.PI
				}
			}
			if (yellow_team.length > 0) {
				for(let robot in yellow_team) {
					yellow_team[robot]['x'] *= -1
					yellow_team[robot]['y'] *= -1
					yellow_team[robot]['orientation'] += Math.PI
				}
			}

			if (balls.length > 0) {
				for(let ball in balls) {
					balls[ball]['x'] *= -1
					balls[ball]['y'] *= -1
				}
			}

			if (cleanData.ball) {
				let ball = cleanData.ball
				ball.x *= -1
				ball.y *= -1
				if(ball.speed){
					ball.speed = Vector.mult(ball.speed, -1)
				}
				if(ball.projection) {
					ball.projection = Vector.mult(ball.projection, -1)
				}
			}

			frame['robots_yellow'] = yellow_team
			frame['robots_blue'] = blue_team
			frame['balls'] = balls
      }

      return frame
    }

  updateFrameHistory (frame) {
    if (frame.balls.length === 0) return
    // Ponto final no cálculo do vetor é a primeira posição do array
    if (this.frameHistory.frames.length === this.frameHistory.size) {
      this.frameHistory.frames.pop()
      this.frameHistory.frames.unshift(frame)
    } else {
      this.frameHistory.frames.unshift(frame)
    }
  }
  calculateBallSpeed () {
    if (this.frameHistory.frames.length <= 1) return
    // TODO: zip e clone poderiam estar num arquivo de metodos uteis
    let zip = (rows) => rows[0].map((_, c) => rows.map(row => row[c]))

    let clone = (obj) => {
      if (obj == null || typeof obj !== 'object') return obj
      var copy = obj.constructor()
      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr]
      }
      return copy
    }
    let frameHistoryShifted = clone(this.frameHistory.frames)
    frameHistoryShifted.shift()
    let zipFrames = zip([this.frameHistory.frames, frameHistoryShifted])
    zipFrames.pop()

    let speeds = []
    for (let pairs in zipFrames) {
      let ballPosI = {
        x: zipFrames[pairs][0].balls[0].x,
        y: zipFrames[pairs][0].balls[0].y
      }
      let ballPosF = {
        x: zipFrames[pairs][1].balls[0].x,
        y: zipFrames[pairs][1].balls[0].y
      }

      const deltaPos = {x: ballPosF.x - ballPosI.x, y: ballPosF.y - ballPosI.y}

      let frameTimeF = zipFrames[pairs][0].t_capture
      let frameTimeI = zipFrames[pairs][1].t_capture
      const deltaTime = (frameTimeF - frameTimeI) * 10 // to Seconds
      const speed = {
        x: (deltaPos.x) / deltaTime,
        y: (deltaPos.y) / deltaTime
      }
      speeds.push(speed)
    }
    let finalSpeed = speeds.reduce(function (a, b) { return {x: a.x + b.x, y: a.y + b.y} }, {x: 0, y: 0})
    finalSpeed = {x: finalSpeed.x / speeds.length, y: finalSpeed.y / speeds.length}
    return finalSpeed
  }

}