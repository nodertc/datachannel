# @nodertc/datachannel

[![Build Status](https://travis-ci.com/nodertc/datachannel.svg?branch=master)](https://travis-ci.com/nodertc/datachannel)
[![npm](https://img.shields.io/npm/v/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![node](https://img.shields.io/node/v/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![license](https://img.shields.io/npm/l/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![downloads](https://img.shields.io/npm/dm/@nodertc/datachannel.svg)](https://www.npmjs.com/package/@nodertc/datachannel)
[![Coverage Status](https://coveralls.io/repos/github/nodertc/datachannel/badge.svg?branch=master)](https://coveralls.io/github/nodertc/datachannel?branch=master)
[![telegram](https://img.shields.io/badge/telegram-nodertc-brightgreen.svg)](https://t.me/nodertc)

WebRTC Data Channel Establishment Protocol. Supported RFC:

* [WebRTC Data Channels](https://tools.ietf.org/html/draft-ietf-rtcweb-data-channel-13)
* [WebRTC Data Channel Establishment Protocol](https://tools.ietf.org/html/draft-ietf-rtcweb-data-protocol-09)
* [WebRTC 1.0: Real-time Communication](https://www.w3.org/TR/webrtc/#peer-to-peer-data-api)

## Usage

```js
const { createChannel } = require('@nodertc/datachannel');

const input = createSctpSourceStream({ id: 1 });
const output = createSctpTargetStream({ id: 1 });

const channel = createChannel({ input, output, label: 'nodertc' });

channel.on('data', data => {
  console.log('Channel %s says:', channel.label, data.toString())
});
```

## API

* `createChannel(options: Options): Channel`

Creates the Data Channel.

* `Options.input: stream.Readable`

Source stream.

* `Options.output: stream.Writable`

Target stream.

* `Options.negotiated: boolean, default false`

The default value of false tells the user agent to announce the channel in-band and instruct the other peer to dispatch a corresponding Channel object. If set to true, it is up to the application to negotiate the channel.

* `Options.label: string, default ""`

A label that can be used to distinguish this Channel object from other one.

* `Options.protocol: string, default ""`

Subprotocol name used for this channel.

* `Options.priority: number, default 0`

Priority of this channel.

* `Options.ordered: boolean, default false`

The type of the delivery. Default `false`.

* `Options.retries: number, optional`

The number of retransmissions.

* `Options.lifetime: number, optional`

The maximum lifetime in milliseconds.

* `class Channel`

This class is an abstraction of the Data Channel. A `Channel` is also a [duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex), so it can be both readable and writable, and it is also a [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter).

* `Channel.label: string, readonly`

The name of the Data Channel.

* `Channel.priority: number, readonly`

The priority of the Data Channel.

* `Channel.protocol: string, readonly`

The name of a protocol registered in the ['WebSocket Subprotocol Name Registry'](https://www.iana.org/assignments/websocket/websocket.xml).

* `Channel.type: number, readonly`

Get the channel type.

* `Channel.ordered: boolean, readonly`

Get the type of the delivery.

* `Channel.negotiated: boolean, readonly`

Returns true if the Data Channel was negotiated by the application, or false otherwise.

* `Channel.reliability: number, readonly`

For reliable Data Channels this field MUST be set to 0 on the sending side and MUST be ignored on the receiving side. If a partial reliable Data Channel with limited number of retransmissions is used, this field specifies the number of retransmissions.  If a partial reliable Data Channel with limited lifetime is used, this field specifies the maximum lifetime in milliseconds.

* `Channel.close()`

Closes the channel. The `input` and `output` channels keeps untouched.

## License

MIT, 2018 &copy; Dmitriy Tsvettsikh
