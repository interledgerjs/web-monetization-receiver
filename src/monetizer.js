const IlpStream = require('ilp-protocol-stream')
const makePlugin = require('ilp-plugin')
const EventEmitter = require('events')
const crypto = require('crypto')
const Bucket = require('./bucket')

const InitStates = {
  NOT_CONNECTED: 0,
  CONNECTING: 1,
  CONNECTED: 2
}

class Monetizer {
  constructor (opts = {}) {
    this.plugin = opts.plugin || makePlugin()

    this.buckets = new Map()
    this.bucketOpts = opts.buckets || {}
    this.bucketTimers = new Map()
    this.bucketTimeout = (opts.buckets && opts.buckets.timeout) ||
      60 * 1000

    this.events = new EventEmitter()
    this.initState = InitStates.NOT_CONNECTED
  }

  async listen () {
    if (this.initState === InitStates.CONNECTED) {
      return
    } else if (this.initState === InitStates.CONNECTING) {
      return new Promise(resolve => {
        this.events.once('connected', resolve)
      })
    }

    this.initState = InitStates.CONNECTING

    this.server = new IlpStream.Server({
      plugin: this.plugin,
      serverSecret: crypto.randomBytes(32)
    })

    this.server.on('connection', connection => {
      const tag = connection.connectionTag
      connection.on('stream', stream => {
        stream.setReceiveMax('999999999999999')
        stream.on('money', amount => {
          if (tag) this.getBucket(tag).fund(amount)
        })
      })
    })

    await this.server.listen()

    this.initState = InitStates.CONNECTED
    this.events.emit('connected')
  }

  async generateSPSPResponse (tag) {
    await this.listen()

    if (tag && !this.buckets.has(tag)) {
      this.buckets.set(tag, new Bucket(this.bucketOpts))
    }

    const details = this.server.generateAddressAndSecret(tag)
    return {
      destination_account: details.destinationAccount,
      shared_secret: details.sharedSecret
    }
  }

  removeBucket (tag) {
    this.buckets.delete(tag)
    this.bucketTimers.delete(tag)
  }

  touchBucket (tag) {
    if (!this.buckets.has(tag)) {
      this.buckets.set(tag, new Bucket(this.bucketOpts))
    }

    if (this.bucketTimers.has(tag)) {
      clearTimeout(this.bucketTimers.get(tag))
    }

    const timer = setTimeout(() => this.removeBucket(tag),
      this.bucketTimeout)
    this.bucketTimers.set(tag, timer)
  }

  getBucket (tag) {
    this.touchBucket(tag)
    return this.buckets.get(tag)
  }

  koa ({ spsp = true } = {}) {
    return async (ctx, next) => {
      if (!ctx.cookies.get('webMonetization')) {
        ctx.cookies.set('webMonetization', crypto.randomBytes(16).toString('hex'))
      }

      const tag = ctx.cookies.get('webMonetization')
      ctx.webMonetization = this.getBucket(tag)

      if (spsp && ctx.get('accept').includes('application/spsp4+json')) {
        ctx.body = await this.generateSPSPResponse(tag)
        return
      }

      return next()
    }
  }
}

module.exports = Monetizer
