# Web Monetization Receiver
> Server-side library for advanced Web Monetization integrations

## SPSP Receiver

```
const { SPSP } = require('web-monetization-receiver')

router.get('/.well-known/pay', ctx => {
  if (ctx.get('Accept').indexOf('appplication/spsp4+json'') >= 0) {
    ctx.body = await SPSP.generateAddressAndSecret()
  }
})
```

## User-associated Buckets

```
const { Buckets } = require('web-monetization-receiver')

router.get('/.well-known/pay', ctx => {
  if (ctx.get('Accept').indexOf('appplication/spsp4+json'') >= 0) {
    ctx.body = await Buckets.generateAddressAndSecret(ctx.query.userId)
  }
})

const cost = 1000

router.get('/images/:id', ctx => {
  const bucket = Buckets.get(ctx.query.userId)

  // wait for the user to accumulate enough money
  await bucket.awaitBalance(cost)

  if (bucket.spend(cost)) {
    ctx.body = fs.readFileSync(path.resolve('images', ctx.params.id))
  } else {
    return ctx.throw(402, 'insufficient balance to download image')
  }
})
```
