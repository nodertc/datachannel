'use strict';

const assert = require('assert');
const { Transform } = require('readable-stream');
const { decode } = require('binary-data');
const {
  messageType: { DATA_CHANNEL_ACK, DATA_CHANNEL_OPEN },
} = require('./constants');
const protocol = require('./protocol');

const STATE_INIT = 'init';
const STATE_OPENING = 'open';
const STATE_ACK = 'ack';
const STATE_FINISHED = 'finished';

const states = {
  [STATE_INIT]: STATE_OPENING,
  [STATE_OPENING]: STATE_ACK,
  [STATE_ACK]: STATE_FINISHED,
};

const _negotiated = Symbol('negotiated');
const _state = Symbol('state');
const _message = Symbol('message');
const _onOpen = Symbol('onOpen');
const _onAck = Symbol('onAck');

const handlers = {
  [STATE_OPENING]: _onOpen,
  [STATE_ACK]: _onAck,
};

const EVENT_SEND_OPENING = 'EVENT_SEND_OPENING';
const EVENT_SEND_ACK = 'EVENT_SEND_ACK';
const EVENT_GOT_OPENING = 'EVENT_GOT_OPENING';

/**
 * Simple state machine to process webrtc datachannel handshake.
 */
class HandshakeMachine extends Transform {
  /**
   * @class HandshakeMachine
   * @param {boolean} negotiated
   */
  constructor(negotiated) {
    super();

    this[_state] = STATE_INIT;
    this[_message] = null;
    this[_negotiated] = negotiated;
  }

  /**
   * Check is channel ready.
   */
  get ready() {
    return this.state === STATE_FINISHED;
  }

  /**
   * Switch to the next state.
   * @param {string} [state] Next state.
   */
  next(state) {
    const currentState = this.state;
    const allowedNextState = states[currentState];

    if (state) {
      assert.strictEqual(state, allowedNextState, 'Forbidden transition');
    }

    this[_state] = state;

    try {
      const handler = handlers[state];

      if (typeof handler === 'function') {
        handler();
      }

      this.emit(state);
    } catch (error) {
      this[_state] = currentState;

      this.emit('error', error);
    }
  }

  /**
   * Switch to 'opening' state.
   */
  opening() {
    this.next(STATE_OPENING);
  }

  /**
   * @private
   * @param {Buffer} chunk
   * @param {string} encoding
   * @param {Function} callback
   */
  _transform(chunk, encoding, callback) {
    if (encoding !== 'buffer') {
      callback(new TypeError('Invalid chunk'));
      return;
    }

    let currentError = null;

    if (this.ready) {
      this.push(chunk);
    } else {
      this[_message] = chunk;

      try {
        this.next();
      } catch (error) {
        currentError = error;
      }

      this[_message] = null;
    }

    callback(currentError);
  }

  /**
   * Get the current state.
   */
  get state() {
    return this[_state];
  }

  /**
   * Notify the socket to send a message.
   * @param {string} type Message type.
   */
  send(type) {
    this.emit(type);
  }

  /**
   * @private
   */
  [_onOpen]() {
    if (!this[_negotiated]) {
      this.send(EVENT_SEND_OPENING);
    } else {
      const message = this[_message];

      if (message.length < 12) {
        throw new Error('invalid handshake');
      }

      if (message[0] !== DATA_CHANNEL_OPEN) {
        throw new Error('Unexpected message');
      }

      const packet = decode(message, protocol.Open);

      this.emit(EVENT_GOT_OPENING, packet);

      process.nextTick(() => {
        this.next(STATE_ACK);
      });
    }
  }

  /**
   * @private
   */
  [_onAck]() {
    if (!this[_negotiated]) {
      const message = this[_message];

      if (message.length === 1 && message[0] === DATA_CHANNEL_ACK) {
        process.nextTick(() => {
          this.next(STATE_FINISHED);
        });
      } else {
        throw new Error('Invalid handshake');
      }
    } else {
      this.send(EVENT_SEND_ACK);
    }
  }
}

module.exports = {
  HandshakeMachine,
  constants: {
    EVENT_SEND_OPENING,
    EVENT_SEND_ACK,
    EVENT_GOT_OPENING,
    STATE_INIT,
    STATE_OPENING,
    STATE_ACK,
    STATE_FINISHED,
  },
};
