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

    const ready = receiver.connect()
      .then(() => receiver)
      .catch((err) => {
        this.receivers.delete(pointer)
        throw err
      })
    this.receivers.set(pointer, ready)
    await ready

    receiver.getStream()
      .once('end', () => {
        this.receivers.delete(pointer)
      })
      .once('close', () => {
        this.receivers.delete(pointer)
      })
      .once('error', () => {
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
