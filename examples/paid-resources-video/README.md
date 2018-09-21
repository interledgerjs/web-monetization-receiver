# Paid Resources Video

Stream a video with streaming payments. When a web monetized user goes to this
page, they'll receive a video of ["Big Buck
Bunny"](https://en.wikipedia.org/wiki/Big_Buck_Bunny). If they stop paying,
then the video will stop (after its buffer is exhausted).

## Setup

- [Make sure you're running Moneyd on the
  livenet.](https://medium.com/interledger-blog/joining-the-live-ilp-network-eab123a73665)

- Make sure you've either got an active [Coil](https://coil.com) subscription,
  or are running [your own Web Monetization
provider](https://github.com/interledgerjs/ilp-wm-provider).

```sh
# download the video because it's too large to put into git
mkdir videos
wget https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.webm -O videos/example.webm

npm install
node index.js
```

Then go to [http://localhost:8096](http://localhost:8096). Hit play on the
video, and you'll see it stream. If you stop moneyd or your web monetization
provider, you'll see the video stop after a minute (or however long you've
buffered).
