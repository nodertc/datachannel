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

const _negotiated = Symbol('negotiated');
const _state = Symbol('state');

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
    this[_negotiated] = negotiated;
  }

  /**
   * Check is channel ready.
   */
  get ready() {
    return this.state === STATE_FINISHED;
  }

  /**
   * Switch to 'opening' state.
   */
  opening() {
    this[_state] = STATE_OPENING;

    // Suggest to send `OPEN` message
    this.emit('postopen');
  }

  /**
   * Process an arrived message.
   * @private
   * @param {Buffer} message Arrived message.
   */
  _handshake(message) {
    if (this[_negotiated]) {
      /**
       * The channel should wait for OPEN message
       * and respond with ACK one.
       */
      if (message.length < 12) {
        throw new Error('invalid handshake');
      }

      if (message[0] !== DATA_CHANNEL_OPEN) {
        throw new Error('Unexpected message');
      }

      const packet = decode(message, protocol.Open);

      // Notify an uppen layer about `Open` message
      this.emit('handshake', packet);

      // Suggest to send `ACK` message
      this.emit('postack');

      this[_state] = STATE_FINISHED;
      this.emit('final');
    } else {
      /**
       * The channel should send Open message at the start
       * and wait for ACK message.
       */
      assert(
        this.state,
        STATE_OPENING,
        'Unexpected state: you should send `Open` message before'
      );

      const isAck = message.length === 1 && message[0] === DATA_CHANNEL_ACK;

      if (!isAck) {
        throw new Error('Invalid handshake');
      }

      this[_state] = STATE_FINISHED;
      this.emit('final');
    }
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
      try {
        this._handshake(chunk);
      } catch (error) {
        currentError = error;
      }
    }

    callback(currentError);
  }

  /**
   * Get the current state.
   */
  get state() {
    return this[_state];
  }
}

module.exports = {
  HandshakeMachine,
  constants: {
    STATE_INIT,
    STATE_OPENING,
    STATE_ACK,
    STATE_FINISHED,
  },
};
