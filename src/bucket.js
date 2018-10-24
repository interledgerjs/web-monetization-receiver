const stream = require('stream')
const debug = require('debug')('web-monetization-receiver:bucket')
const EventEmitter = require('events')
const DEFAULT_THROUGHPUT = 100000
const DEFAULT_WINDOW = 5000
const DEFAULT_FREE_BYTES = 0
const DEFAULT_COST_PER_BYTE = 1 / 5000

class Bucket {
  constructor (opts = {}) {
    // default bucket capacity is infinite
    this.capacity = opts.capacity || Infinity
    this.balance = 0
    this.events = new EventEmitter()

    // sliding window of payment events
    this.window = []
    this.pulse = 0
  }

  fund (amount) {
    const n = Number(amount)
    if (isNaN(n)) {
      throw new Error('invalid amount. amount=' + amount)
    }

    let total = 0
    const now = Date.now()
    this.window.push({ amount: n, date: now })
    for (let i = 0; i < this.window.length; ++i) {
      if (this.window[i].date + DEFAULT_WINDOW > now) {
        this.window.splice(i, 1)
        --i
        continue
      }
      total += this.window[i].amount
    }

    this.pulse = total / (DEFAULT_THROUGHPUT * (DEFAULT_WINDOW / 1000))
    this.balance = Math.min(
      this.balance + n,
      this.capacity)
    this.events.emit('fund', this.balance)
  }

  pulse () {
    return this.pulse
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
      throw new Error('invalid balance. balance=' + balance)
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
  } = {}) {
    const bucket = this
    const transform = new stream.Transform({
      writableObjectMode: true,
      transform: function (chunk, encoding, cb) {
        if (readStream.bytesRead < freeBytes) {
          cb(null, chunk)
          return
        }

        const cost = Math.ceil(chunk.length * costPerByte)
        if (!bucket.spend(cost)) {
          readStream.pause()

          bucket.awaitBalance(cost)
            .then(() => {
              this.emit('money', cost)
              cb(null, chunk)
              readStream.resume()
            })
            .catch(e => {
              debug('failed to resume stream. error=' + e.stack)
            })
        } else {
          this.emit('money', cost)
          cb(null, chunk)
        }
      }
    })

    return readStream.pipe(transform)
  }
}

module.exports = Bucket
