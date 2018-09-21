const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const serve = require('koa-static')
const path = require('path')
const fs = require('fs')

// const { Monetizer } = require('web-monetization-receiver')
const { Monetizer } = require('../..')
const monetizer = new Monetizer()

router.get('/videos/:id', async ctx => {
  const stream = fs.createReadStream(path.resolve(
    __dirname,
    'videos',
    ctx.params.id
  ))

  ctx.body = ctx.webMonetization.monetizeStream(stream, {
    freeBytes: 100000,
    costPerByte: (1 / 5000)
  })
})

app
  .use(monetizer.koa())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve(path.resolve(__dirname, './static')))
  .listen(process.env.PORT || 8096)

console.log('listening on',
  process.env.PORT || 8096)
