const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()
const serve = require('koa-static')
const path = require('path')
const fs = require('fs')

// const { Monetizer } = require('web-monetization-receiver')
const { Monetizer } = require('../..')
const monetizer = new Monetizer()

const cost = 300

router.get('/images/:id', async ctx => {
  await ctx.webMonetization.awaitAndSpend(cost)
  ctx.body = fs.readFileSync(path.resolve(
    __dirname,
    'images',
    ctx.params.id
  ))
})

app
  .use(monetizer.koa())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve(path.resolve(__dirname, './static')))
  .listen(process.env.PORT || 8095)

console.log('listening on',
  process.env.PORT || 8095)
