const stream = require('stream')
const debug = require('debug')('web-monetization-receiver:bucket')
const EventEmitter = require('events')
const DEFAULT_FREE_BYTES = 0
const DEFAULT_COST_PER_BYTE = 1 / 5000

class Bucket {
  constructor (opts = {}) {
    // default bucket capacity is infinite
    this.capacity = opts.capacity || Infinity
    this.balance = 0
    this.events = new EventEmitter()
  }

  fund (amount) {
    const n = Number(amount)
    if (isNaN(n)) {
      throw new Error('invalid amount. amount=' + amount)
    }

    this.balance = Math.min(
      this.balance + n,
      this.capacity)
    this.events.emit('fund', this.balance)
  }

  spend (amount) {
    const n = Number(amount)
    if (isNaN(n)) {
      throw new Error('invalid amount. amount=' + amount)
    }

    if (n > this.balance) {
      return false
    } else {
      this.balance -= n
      return true
    }
  }

  awaitBalance (balance) {
    const b = Number(balance)
    if (isNaN(b)) {
      throw new Error('invalid balance. balance=' + amount)
    }

    return new Promise(resolve => {
      const onFund = newBalance => {
        if (newBalance >= balance) {
          setImmediate(() =>
            this.events.removeListener('fund', onFund))
          resolve()
        }
      }

      this.events.on('fund', onFund)
    })
  }

  async awaitAndSpend (amount) {
    while (true) {
      await this.awaitBalance(amount)    
      if (this.spend(amount)) {
        return
      }
    }
  }

  monetizeStream (readStream, {
    freeBytes = DEFAULT_FREE_BYTES,
    costPerByte = DEFAULT_COST_PER_BYTE
  }) {
    const transform = new stream.Transform({
      writableObjectMode: true,
      transform: (chunk, encoding, cb) => {
        if (readStream.bytesRead < freeBytes) {
          cb(null, chunk)
          return
        }

        const cost = chunk.length * costPerByte
        if (!this.spend(cost)) {
          readStream.pause()

          this.awaitBalance(cost)
            .then(() => {
              readStream.resume()
            })
            .catch(e => {
              debug('failed to resume stream. error=' + e.stack)      
            })
        }

        cb(null, chunk)
      }
    })

    return readStream.pipe(transform)
  }
}

module.exports = Bucket
