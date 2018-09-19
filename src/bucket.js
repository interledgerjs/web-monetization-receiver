const EventEmitter = require('events')

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
      this.events.on('fund', newBalance => {
        if (newBalance >= balance) {
          resolve()
        }
      })
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
}
