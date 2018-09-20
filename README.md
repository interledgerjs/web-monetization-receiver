# Web Monetization Receiver
> Server-side library for advanced Web Monetization integrations

## Examples

### SPSP Receiver

```js
const { Monetizer } = require('web-monetization-receiver')
const monetizer = new Monetizer()

router.get('/.well-known/pay', ctx => {
  if (ctx.get('accept').indexOf('application/spsp4+json') >= 0) {
    ctx.body = await monetizer.generateAddressAndSecret()
  }
})
```

### User-associated Buckets

```js
const { Monetizer } = require('web-monetization-receiver')
const monetizer = new Monetizer()

router.get('/.well-known/pay', ctx => {
  if (ctx.get('accept').indexOf('application/spsp4+json') >= 0) {
    const tag = ctx.cookies.get('webMonetization')
    ctx.body = await monetizer.generateAddressAndSecret(tag)
  }
})

const cost = 1000

router.get('/images/:id', ctx => {
  const tag = ctx.cookies.get('webMonetization')
  const bucket = monetizer.getBucket(tag)

  // wait for the user to accumulate enough money
  await bucket.awaitBalance(cost)

  if (bucket.spend(cost)) {
    ctx.body = fs.readFileSync(path.resolve('images', ctx.params.id))
  } else {
    return ctx.throw(402, 'insufficient balance to download image')
  }
})
```
