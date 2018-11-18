# @nodertc/datachannel

[![stability-experimental](https://img.shields.io/badge/stability-experimental-orange.svg)](https://github.com/emersion/stability-badges#experimental)
[![Build Status](https://travis-ci.com/nodertc/datachannel.svg?branch=master)](https://travis-ci.com/nodertc/datachannel)
[![npm](https://img.shields.io/npm/v/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![node](https://img.shields.io/node/v/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![license](https://img.shields.io/npm/l/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![downloads](https://img.shields.io/npm/dm/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![telegram](https://img.shields.io/badge/telegram-nodertc-brightgreen.svg)](https://t.me/nodertc)

WebRTC Data Channel Establishment Protocol. Supported RFC:

* [WebRTC Data Channels](https://tools.ietf.org/html/draft-ietf-rtcweb-data-channel-13)
* [WebRTC Data Channel Establishment Protocol](https://tools.ietf.org/html/draft-ietf-rtcweb-data-protocol-09)
* [WebRTC 1.0: Real-time Communication](https://www.w3.org/TR/webrtc/#peer-to-peer-data-api)

## Usage

```js
const { createChannel } = require('@nodertc/datachannel');

const channel = createChannel(/* options */);

channel.on('data', data => {
  console.log('Channel %s says:', channel.label, data.toString())
});
```

## License

MIT, 2018 &copy; Dmitriy Tsvettsikh
