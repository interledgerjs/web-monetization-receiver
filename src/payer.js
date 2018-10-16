const StreamWrapper = require('./stream-wrapper')

class Payer {
  constructor ({ streamOpts = {} } = {}) {
    this.receivers = new Map()
    this.streamOpts = streamOpts
    this.closed = false
  }

  async createReceiver (pointer) {
    const receiver = new StreamWrapper({
      streamOpts: this.streamOpts,
      pointer
    })
    this.receivers.set(pointer, receiver)

    try {
      await receiver.connect()
    } catch (e) {
      this.receivers.delete(pointer)
      throw e
    }

    receiver.getStream().once('end', () => {
      this.receivers.delete(pointer)
    })

    return receiver
  }

  async getReceiver (pointer) {
    return this.receivers.get(pointer) || this.createReceiver(pointer)
  }

  async pay (pointer, amount) {
    if (this.closed) {
      throw new Error('paying is closing so payments are stopped')
    }

    const receiver = await this.getReceiver(pointer)
    const stream = receiver.getStream()
    stream.setSendMax(Number(stream.sendMax) + Number(amount))
  }
}

module.exports = Payer
