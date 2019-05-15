const IlpStream = require('ilp-protocol-stream')
const makePlugin = require('ilp-plugin')
const axios = require('axios')
const EventEmitter = require('events')

const StreamStates = {
  NOT_CONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2
}

function pointerToUrl (pointer) {
  return pointer.startsWith('$')
    ? 'https://' + pointer.substring(1)
    : pointer
}

class StreamWrapper extends EventEmitter {
  constructor ({ pointer, streamOpts }) {
    super()

    this.pointer = pointer
    this.state = StreamStates.NOT_CONNECTED
    this.connection = null
    this.stream = null
    this.streamOpts = streamOpts
  }

  getConnection () {
    return this.connection
  }

  getStream () {
    return this.stream
  }

  isConnected () {
    return this.state === StreamStates.CONNECTED
  }

  async connect () {
    if (this.state === StreamStates.CONNECTED) {
      return
    }

    if (this.state === StreamStates.CONNECTING) {
      return new Promise(resolve => {
        this.once('connected', resolve)
      })
    }

    this.state = StreamStates.CONNECTING

    console.log('requesting pointer', this.pointer, pointerToUrl(this.pointer))
    const res = await axios({
      method: 'GET',
      url: pointerToUrl(this.pointer),
      headers: {
        accept: 'application/spsp4+json'
      }
    })

    this.connection = await IlpStream.createConnection({
      plugin: makePlugin(),
      destinationAccount: res.data.destination_account,
      sharedSecret: Buffer.from(res.data.shared_secret, 'base64'),
      ...this.streamOpts
    })

    this.connection
      .once('close', () => {
        this.state = StreamStates.NOT_CONNECTED
      })
      .once('error', (_err) => {
        this.state = StreamStates.NOT_CONNECTED
      })

    this.stream = this.connection.createStream()
    this.state = StreamStates.CONNECTED
    this.emit('connected')
  }
}

module.exports = StreamWrapper
