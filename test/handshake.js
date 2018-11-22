'use strict';

const { HandshakeMachine } = require('../src/handshake');

jest.mock('binary-data', () => ({
  decode: jest.fn(),
}));

jest.mock('src/protocol', () => ({}));

const msgOpen = Buffer.allocUnsafe(15);
const msgRegular = Buffer.allocUnsafe(5);
const msgAck = Buffer.from([0x02]);

msgOpen[0] = 0x03;

test('should work with negotiated channel', () => {
  const handshake = new HandshakeMachine(true);
  expect(handshake.ready).toBe(false);

  handshake.push = jest.fn();
  const onhandshake = jest.fn();
  const onpostack = jest.fn();
  const onfinal = jest.fn();

  handshake.on('handshake', onhandshake);
  handshake.on('postack', onpostack);
  handshake.on('final', onfinal);

  handshake.write(msgOpen);
  expect(handshake.push).toBeCalledTimes(0);
  expect(onhandshake).toBeCalledTimes(1);
  expect(onpostack).toBeCalledTimes(1);
  expect(onfinal).toBeCalledTimes(1);

  handshake.write(msgRegular);

  expect(handshake.ready).toBe(true);
  expect(handshake.push).toBeCalledTimes(1);
});

test('should work only with buffers', () => {
  const handshake = new HandshakeMachine(true);

  const callback = jest.fn();
  handshake.on('error', callback);

  handshake._handshake = jest.fn();
  handshake.write({});

  expect(callback).toBeCalledTimes(1);
  expect(handshake._handshake).toBeCalledTimes(0);
});

test('should work with non-negotiated channel', () => {
  const handshake = new HandshakeMachine(false);
  expect(handshake.ready).toBe(false);

  handshake.push = jest.fn();
  const onpostopen = jest.fn();
  const onfinal = jest.fn();

  handshake.on('postopen', onpostopen);
  handshake.on('final', onfinal);

  handshake.opening();
  expect(onpostopen).toBeCalledTimes(1);
  expect(onfinal).toBeCalledTimes(0);

  handshake.write(msgAck);
  expect(handshake.ready).toBe(true);
  expect(onfinal).toBeCalledTimes(1);
  expect(handshake.push).toBeCalledTimes(0);

  handshake.write(msgRegular);
  expect(handshake.push).toBeCalledTimes(1);
});
