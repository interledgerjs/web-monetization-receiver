# Web Monetization Receiver
> Server-side library for advanced Web Monetization integrations

## Examples

### SPSP Receiver

```js
const { Monetizer } = require('web-monetization-receiver')
const monetizer = new Monetizer()

app.use(monetizer.koa())
```

### User-associated Buckets

```js
const { Monetizer } = require('web-monetization-receiver')
const monetizer = new Monetizer()

const cost = 1000

router.get('/images/:id', ctx => {
  await ctx.webMonetization.awaitAndSpend(cost)
  ctx.body = fs.readFileSync(path.resolve('images', ctx.params.id))
})

app.use(monetizer.koa())
```
