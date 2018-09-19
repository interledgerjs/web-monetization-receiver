const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const serve = require('koa-static')
const path = require('path')
const fs = require('fs')

// const { Monetizer } = require('web-monetization-receiver')
const { Monetizer } = require('../..')
const monetizer = new Monetizer()

router.get('/.well-known/pay', async ctx => {
  if (ctx.get('accept').indexOf('application/spsp4+json') >= 0) {
    const tag = ctx.query.webMonetizationPaidResourceUser
    ctx.body = await monetizer.generateSPSPResponse(tag)
  }
})

const cost = 300

router.get('/images/:id', async ctx => {
  const tag = ctx.query.webMonetizationPaidResourceUser
  const bucket = monetizer.getBucket(tag)

  // wait for the user to accumulate enough money
  await bucket.awaitBalance(cost)

  if (bucket.spend(cost)) {
    ctx.body = fs.readFileSync(path.resolve(
      __dirname,
      'images',
      ctx.params.id
    ))
  } else {
    return ctx.throw(402, 'insufficient balance to download image')
  }
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve(path.resolve(__dirname, './static')))
  .listen(process.env.PORT || 8095)

console.log('listening on',
  process.env.PORT || 8095)
