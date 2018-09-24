# Web Monetization Receiver
> Server-side library for advanced Web Monetization integrations

- [Overview](#overview)
- [Examples](#examples)
- [API](#api)
  - [`Monetizer`](#monetizer)
  - [`Monetizer.koa`](#monetizerkoa)
  - [`Monetizer.generateSPSPResponse`](#monetizergeneratespspresponse)
  - [`Monetizer.listen`](#monetizerlisten)
  - [`Monetizer.getBucket`](#monetizergetbucket)
  - [`Bucket`](#bucket)
  - [`Bucket.fund`](#bucketfund)
  - [`Bucket.spend`](#bucketspend)
  - [`Bucket.awaitBalance`](#bucketawaitbalance)
  - [`Bucket.awaitAndSpend`](#bucketawaitandspend)
  - [`Bucket.monetizeStream`](#bucketmonetizestream)

## Overview

Lots of sites can benefit from [Web Monetization](https://webmonetization.org).
Most of the time, you can add a little bit of javascript that causes Web
Monetization enabled users to donate to you ([The scripts are available
here](https://github.com/interledgerjs/web-monetization-scripts)).

Some sites might want to do more than this. For example, an image gallery might
want to offer some images only to its Web Monetization enabled users. Or a
video site might charge per second of video streamed.

This repository contains tools which aim to make these advanced integrations easier.

## Examples

Run `npm install` in this repository's root, then follow the README of the
example you want to run.

- [Serve Paid Images](https://github.com/sharafian/web-monetization-receiver/tree/master/examples/paid-resources-images)
- [Serve Paid Video](https://github.com/sharafian/web-monetization-receiver/tree/master/examples/paid-resources-video)

## API

### `Monetizer`

```js
const { Monetizer } = require('web-monetization-receiver')
const monetizer = new Monetizer()
```

Creates a "Monetizer" that wraps an [ILP/STREAM
server](https://github.com/interledgerjs/ilp-protocol-stream) and exposes an
easy to use API.

You can use Monetizer to charge for different actions on your server using Web
Monetization. It's best suited for web apps where your user is browsing your
site and paying continuously with Web Monetization.

#### Parameters

- `opts: Object` - (Optional) Options for this Monetizer.

- `opts.plugin: IlpPlugin`  - (Optional) ILP Plugin to listen for payments
  with. By default, Monetizer creates a plugin to your local `moneyd` server.

- `opts.buckets: Object` - (Optional) Options regarding buckets of payment that
  have been received by different site users.

- `opts.buckets.timeout: Number` - (Optional) How long to wait before clearing
  an unused bucket.

- `opts.buckets.capacity: Number` - (Optional) Maximum amount of payment to
  accumulate in a single bucket.

### `Monetizer.koa`

```js
app.use(monetizer.koa())
```

Connects this Monetizer instance to a [Koa](https://koajs.com/) app.

- Adds an
  [SPSP](https://github.com/interledger/rfcs/tree/master/0009-simple-payment-setup-protocol)
receiver to the server (responds to requests with `Accept: application/spsp4+json`)

- Sets a `webMonetization` cookie on every client that hits the site. This is
  then used to associate each client with a bucket of payment, so that they can
request paid resources from the server.

- Adds `ctx.webMonetization` to the server, with the payment bucket associate
  with the current client. This can be used to charge for requests server-side.
Look at the [Examples](#examples) section to see some ways to use it, or keep
reading the API.

#### Parameters

- `opts: Object` - (Optional) Additional options for the receiver

- `opts.spsp: boolean` - (Optional) (Default `true`) Whether to respond to SPSP
  requests. If this is set to false, you must write an SPSP receiver endpoint
yourself using the `generateSPSPResponse` function.

#### Return

- Async middleware function for use by Koa.

### `Monetizer.generateSPSPResponse`

```js
const jsonResponse = await monetizer.generateSPSPResponse(tag)
```

Returns an SPSP response that allows a client to pay us. If you're using the
`monetizer.koa()` you don't need to call this function anywhere. If you're not
using Koa, then return `await monetizer.generateSPSPResponse(tag)` for any
request that has `Accept` of `application/spsp4+json`. The `tag` should be a
cookie that identifies the user.

#### Parameters

- `tag: string` - (Optional) Tag corresponding to this user.

#### Return

- `response: Object` - SPSP details that let your client pay you over
  Interledger.  If they pay to these details, then their payment will
accumulate in a bucket identified by their `tag`.

- `response.destination_account: string` - ILP address for the client to pay
  to.

- `response.shared_secret: string` - Shared secret used for authentication and
  encryption of data passed over Interledger.

### `Monetizer.listen`

```js
await monetizer.listen()
```

Initializes the STREAM server of this Monetizer. If you use
`generateSPSPResponse` then it will call this function automatically.

#### Parameters

- None

#### Return

- Promise to null, resolves when server is initialized.

### `Monetizer.getBucket`

```js
const bucket = monetizer.getBucket(tag)
```

Gets a bucket associated with a given tag. If you're using the Koa middleware
then on any route you can access `ctx.webMonetization` to access the current user's
bucket (equivalent of `monetizer.getBucket(ctx.cookie.get('webMonetization'))`).

If no money has been paid into the bucket, you'll just get an empty bucket.

After a timeout (configurable via `opts.buckets.timeout` in the Monetizer
constructor) any bucket that hasn't been used will be cleaned up.

#### Parameters 

- `tag: string` - Tag corresponding to this user.

#### Return

- `bucket: Bucket` - [Bucket](#bucket) of payment for this user

### `Bucket`

A bucket represents the payment received by the server from a specific user.
You can use a bucket object to add/spend funds.

The bucket constructor shouldn't be called directly, instead you should get it
from `monetizer.getBucket` (or from `ctx.webMonetization` if you're using Koa).

### `Bucket.fund`

```js
bucket.fund('1000')
```

This function adds the given number of units to the bucket. There usually is no
reason to call this directly, because the Monetizer's SPSP server will
automatically fund the necessary buckets whenever payments are received.

#### Parameters

- `amount: string` - Amount of units (denominated in the units of your
  plugin/local moneyd) to add to this bucket.

#### Return

None

### `Bucket.spend`

```js
if (bucket.spend('300')) {
  return paidContent
} else {
  throw new Error('insufficient funds')
}
```

Subtracts funds from the bucket. Returns `true` if there were enough funds,
and `false` otherwise.

#### Parameters

- `amount: string` - Amount of units (denominated in the units of your
  plugin/local moneyd) to subtract from this bucket.

#### Return

- `success: boolean` - Whether the bucket had enough funds and was subtracted
  from.

### `Bucket.awaitBalance`

```js
await bucket.awaitBalance('1000')
console.log('user can spend 1000 units')
```

Waits until the user has accumulated a certain number of units in their bucket.
This is useful for a web server where the client attempts to load all resources
immediately but will take some time to pay for all of them (See [Examples](#examples)).

This represents an absolute amount. If you `awaitBalance('1000')` it waits for
the user to have 1000 units total, not 1000 units more than they did when the
function was called.

#### Parameters

- `amount: string` - Amount of units (denominated in the units of your
  plugin/local moneyd) to wait for.

#### Return

- Promise to void which resolves when the amount is reached.

### `Bucket.awaitAndSpend`

```js
await bucket.awaitAndSpend('1000')
return paidContent
```

Combines `awaitBalance` and `spend` into an atomic operation. First the balance
is awaited, and then it is spent. If the spend fails, the await is repeated.

#### Parameters

- `amount: string` - Amount of units (denominated in the units of your
  plugin/local moneyd) to wait for and then spend.

#### Return

- Promise to void which resolves when the amount is reached and spent.

### `Bucket.monetizeStream`

```js
const stream = fs.createReadStream('video.webm')
return bucket.monetizeStream(stream)
```

```js
const stream = fs.createReadStream('video.webm')
return bucket.monetizeStream(stream, {
  freeBytes: 10000,
  costPerByte: (1 / 5000)
})
```

Turns a boring regular stream into a cool paid stream. Whenever a chunk of data
is ready on the stream being read from, `chunk.length * costPerByte` units are
subtracted from the bucket. If the bucket hasn't got sufficient funds, the read
stream is paused. Once the bucket gets sufficient funds, the stream is resumed.

You can use `freeBytes` to send a certain amount of data upfront without requiring
payment (useful for buffering video quickly). `costPerByte` lets you fine-tune how
much payment bandwidth is required to keep up with the stream.

To see an example of usage, refer to the [video example](#examples).

#### Parameters

- `stream: ReadableStream` - [Node.js Readable
  Stream](https://nodejs.org/api/stream.html#stream_readable_streams) which is
being monetized.

- `opts: Object` - (Optional) Options to fine-tune the payment for this stream.

- `opts.freeBytes: Number` - (Optional) How many free bytes to send up front.
  Default `0`.

- `opts.costPerByte: Number` - (Optional) How much to charge per byte sent over
  this stream.  Default `1 / 5000` (on a typical [Coil](https://coil.com) plan,
  this represents a rate of 500Kb/s)

#### Return

- `stream: ReadableStream` - Transformed stream which will charge for money as
  it goes. This stream also implements a special `money` event which fires
  whenever payment is charged for data going through the stream.
