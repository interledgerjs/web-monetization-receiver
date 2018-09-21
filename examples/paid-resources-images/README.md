# Paid Resources Images

Web server that charges users for images. When a web monetized user
goes to this page, they'll receive an image of a rabbit after they
send 300 drops.

## Setup

- [Make sure you're running Moneyd on the
  livenet.](https://medium.com/interledger-blog/joining-the-live-ilp-network-eab123a73665)

- Make sure you've either got an active [Coil](https://coil.com) subscription,
  or are running [your own Web Monetization
provider](https://github.com/interledgerjs/ilp-wm-provider).

```sh
npm install
node index.js
```

Then go to [http://localhost:8095](http://localhost:8095). After you pay 300
drops, you'll receive the example image.
