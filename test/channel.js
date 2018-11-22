'use strict';

const { Readable, Writable, finished } = require('readable-stream');
const { createChannel } = require('../src');
const { channelType } = require('../src/constants');

test('ordered reliable channel', () => {
  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: true,
  });

  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(0);
  expect(channel.type).toBe(channelType.DATA_CHANNEL_RELIABLE);
  expect(channel.ordered).toBe(true);
});

test('unordered reliable channel', () => {
  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: false,
  });

  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(0);
  expect(channel.type).toBe(channelType.DATA_CHANNEL_RELIABLE_UNORDERED);
  expect(channel.ordered).toBe(false);
});

test('ordered unreliable channel with limited lifetime', () => {
  const lifetime = 100;

  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: true,
    lifetime,
  });

  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(lifetime);
  expect(channel.type).toBe(channelType.DATA_CHANNEL_PARTIAL_RELIABLE_TIMED);
  expect(channel.ordered).toBe(true);
});

test('unordered unreliable channel with limited lifetime', () => {
  const lifetime = 100;

  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: false,
    lifetime,
  });

  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(lifetime);
  expect(channel.type).toBe(
    channelType.DATA_CHANNEL_PARTIAL_RELIABLE_TIMED_UNORDERED
  );
  expect(channel.ordered).toBe(false);
});

test('ordered unreliable channel with retransmissions', () => {
  const retries = 5;

  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: true,
    retries,
  });

  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(retries);
  expect(channel.type).toBe(channelType.DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT);
  expect(channel.ordered).toBe(true);
});

test('unordered unreliable channel with retransmissions', () => {
  const retries = 5;

  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: false,
    retries,
  });

  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(retries);
  expect(channel.type).toBe(
    channelType.DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT_UNORDERED
  );
  expect(channel.ordered).toBe(false);
});

test('should not be able to set lifetime and retries at the same time', () => {
  expect(() =>
    createChannel({
      input: new Readable({ read() {} }),
      output: new Writable({ write() {} }),
      negotiated: true,
      ordered: true,
      retries: 100,
      lifetime: 200,
    })
  ).toThrow('You cannot set both `retries` and `lifetime`');
});

test('should set label and protocol', () => {
  const label = 'hello';
  const protocol = 'world';

  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: true,
    label,
    protocol,
  });

  expect(channel.label).toBe(label);
  expect(channel.protocol).toBe(protocol);
});

test('label and protocol should be empty by default', () => {
  const channel = createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: true,
  });

  expect(channel.label.length).toBe(0);
  expect(channel.protocol.length).toBe(0);
});

test('should set params from an arrived message', () => {
  const opening = Buffer.from('030000000000000000070000636f6e736f6c65', 'hex');
  const istream = new Readable({ read() {} });
  const label = 'console';
  const protocol = '';
  const onopen = jest.fn();

  const channel = createChannel({
    input: istream,
    output: new Writable({ write() {} }),
    negotiated: true,
    ordered: false,
    label: 'label',
    protocol: 'proto',
  });

  channel.on('open', onopen);
  istream.emit('data', opening);

  expect(onopen).toBeCalledTimes(1);

  expect(channel.label).toBe(label);
  expect(channel.protocol).toBe(protocol);
  expect(channel.negotiated).toBe(true);
  expect(channel.reliability).toBe(0);
  expect(channel.type).toBe(channelType.DATA_CHANNEL_RELIABLE);
  expect(channel.ordered).toBe(true);
  expect(channel.priority).toBe(0);
});

test('should send `open` message', done => {
  const opening = Buffer.from('030000000000000000070000636f6e736f6c65', 'hex');

  const write = (chunk, enc, cb) => {
    expect(chunk).toEqual(opening);

    cb();
    done();
  };

  createChannel({
    input: new Readable({ read() {} }),
    output: new Writable({ write }),
    negotiated: false,
    ordered: true,
    label: 'console',
    priority: 0,
  });
});

test('should close', done => {
  const istream = new Readable({ read() {} });
  const ostream = new Writable({ write() {} });
  const onclose = jest.fn();

  const channel = createChannel({
    input: istream,
    output: ostream,
    negotiated: true,
    ordered: false,
    label: 'label',
    protocol: 'proto',
  });

  channel.on('close', onclose);
  channel.on('error', done.fail);

  finished(ostream, () => {
    expect(onclose).toBeCalledTimes(1);

    done();
  });

  finished(istream, () => {
    expect(onclose).toBeCalledTimes(0);

    ostream.end();
  });

  istream.push(null);
});

test('should receive data', done => {
  const istream = new Readable({ read() {} });
  const ostream = new Writable({ write() {} });

  const opening = Buffer.from('030000000000000000070000636f6e736f6c65', 'hex');
  const message = Buffer.allocUnsafe(5);

  const channel = createChannel({
    input: istream,
    output: ostream,
    negotiated: true,
    ordered: true,
  });

  channel.on('data', data => {
    expect(data).toEqual(message);
    done();
  });

  istream.push(opening);
  istream.push(message);
});

test('should write data', () => {
  const istream = new Readable({ read() {} });
  const ostream = new Writable({ write() {} });

  const opening = Buffer.from('030000000000000000070000636f6e736f6c65', 'hex');
  const message = Buffer.allocUnsafe(5);

  ostream.write = jest.fn();

  const channel = createChannel({
    input: istream,
    output: ostream,
    negotiated: true,
    ordered: true,
  });

  channel.write(message);
  expect(ostream.write).toBeCalledTimes(0);

  istream.emit('data', opening);
  expect(ostream.write).toBeCalledTimes(2);
});
