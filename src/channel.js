'use strict';

const { Duplex, pipeline, finished } = require('readable-stream');
const { readable: isReadable, writable: isWritable } = require('is-stream');
const { encode, createEncodeStream } = require('binary-data');
const { HandshakeMachine } = require('./handshake');
const {
  messageType: { DATA_CHANNEL_ACK, DATA_CHANNEL_OPEN },
  channelType,
} = require('./constants');
const protocol = require('./protocol');

const _handshake = Symbol('handshake');
const _label = Symbol('label');
const _priority = Symbol('priority');
const _reliability = Symbol('reliability');
const _input = Symbol('input');
const _output = Symbol('output');
const _protocol = Symbol('protocol');
const _channelType = Symbol('channelType');
const _negotiated = Symbol('negotiated');
const _closed = Symbol('closed');

const MESSAGE_ACK = Buffer.allocUnsafe(1);
MESSAGE_ACK[0] = DATA_CHANNEL_ACK;

/**
 * This class implements WebRTC DataChannel interface.
 * It holds in/out sctp streams and channel metadata.
 */
module.exports = class Channel extends Duplex {
  /**
   * @class Channel
   * @param {Object} options
   * @param {stream.Readable} options.input
   * @param {stream.Writable} options.output
   * @param {number} options.channelType
   * @param {string} [options.label]
   * @param {string} [options.protocol]
   * @param {number} [options.priority]
   * @param {number} [options.reliability]
   * @param {boolean} [options.negotiated = false]
   */
  constructor(options) {
    super();

    if (!isReadable(options.input) || !isWritable(options.output)) {
      throw new Error('Invalid input or output stream');
    }

    this[_label] = '';
    this[_input] = options.input;
    this[_output] = options.output;
    this[_reliability] = 0;
    this[_priority] = 0;
    this[_protocol] = '';
    this[_channelType] = options.channelType;
    this[_negotiated] = false;
    this[_closed] = false;

    if (typeof options.label === 'string') {
      if (options.label.length > 0xffff) {
        throw new TypeError('Invalid label name');
      }

      this[_label] = options.label;
    }

    if (typeof options.protocol === 'string') {
      if (options.protocol.length > 0xffff) {
        throw new TypeError('Invalid protocol name');
      }

      this[_protocol] = options.protocol;
    }

    if (Number.isInteger(options.reliability)) {
      this[_reliability] = options.reliability;
    }

    if (isPriority(options.priority)) {
      this[_priority] = options.priority;
    }

    if (typeof options.negotiated === 'boolean') {
      this[_negotiated] = options.negotiated;
    }

    const handshake = new HandshakeMachine(this[_negotiated]);
    this[_handshake] = handshake;

    let readableClosed = false;
    let writableClosed = false;
    const maybeClose = () => {
      if (readableClosed && writableClosed && !this[_closed]) {
        this.close();
      }
    };

    pipeline(this[_input], handshake, err => {
      if (err) {
        this.emit('error', err);
      }

      readableClosed = true;
      maybeClose();
    });

    finished(this[_output], err => {
      if (err) {
        this.emit('error', err);
      }

      writableClosed = true;
      maybeClose();
    });

    handshake.on('data', data => this.push(data));

    handshake.once('final', () => {
      this.emit('open');
    });

    handshake.once('postopen', () => {
      const packet = {
        messageType: DATA_CHANNEL_OPEN,
        channelType: this.type,
        priority: this.priority,
        reliability: this[_reliability],
        labelLength: this.label.length,
        protocolLength: this.protocol.length,
        label: this.label,
        protocol: this.protocol,
      };

      const outstream = createEncodeStream();

      encode(packet, outstream, protocol.Open);
      options.output.write(outstream.slice());
    });

    handshake.once('postack', () => {
      options.output.write(MESSAGE_ACK);
    });

    handshake.once('handshake', packet => {
      this[_label] = packet.label;
      this[_protocol] = packet.protocol;
      this[_priority] = packet.priority;
      this[_channelType] = packet.channelType;
      this[_reliability] = packet.reliability;
    });

    if (!this[_negotiated]) {
      process.nextTick(() => {
        this[_handshake].opening();
      });
    }
  }

  /**
   * The name of the Data Channel.
   * @returns {string}
   */
  get label() {
    return this[_label];
  }

  /**
   * The priority of the Data Channel.
   * @returns {number}
   */
  get priority() {
    return this[_priority];
  }

  /**
   * The name of a protocol registered in the 'WebSocket Subprotocol Name Registry'.
   * @returns {string}
   */
  get protocol() {
    return this[_protocol];
  }

  /**
   * Get the channel type.
   * @returns {number}
   */
  get type() {
    return this[_channelType];
  }

  /**
   * Get the type of the delivery.
   * @returns {boolean}
   */
  get ordered() {
    return (
      this.type === channelType.DATA_CHANNEL_RELIABLE ||
      this.type === channelType.DATA_CHANNEL_PARTIAL_RELIABLE_TIMED ||
      this.type === channelType.DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT
    );
  }

  /**
   * Returns true if the Data Channel was negotiated by
   * the application, or false otherwise.
   * @returns {boolean}
   */
  get negotiated() {
    return this[_negotiated];
  }

  /**
   * For reliable Data Channels this field MUST be set to 0 on the
   * sending side and MUST be ignored on the receiving side.  If a
   * partial reliable Data Channel with limited number of
   * retransmissions is used, this field specifies the number of
   * retransmissions.  If a partial reliable Data Channel with limited
   * lifetime is used, this field specifies the maximum lifetime in
   * milliseconds.
   * @returns {number}
   */
  get reliability() {
    return this[_reliability];
  }

  /**
   * @private
   */
  _read() {} // eslint-disable-line class-methods-use-this

  /**
   * @private
   * @param {string|Buffer} chunk
   * @param {string} encoding
   * @param {Function} callback
   */
  _write(chunk, encoding, callback) {
    if (this[_handshake].ready) {
      this[_output].write(chunk, encoding, callback);
    } else {
      this[_handshake].once('final', () => {
        this[_output].write(chunk, encoding, callback);
      });
    }
  }

  /**
   * @private
   * @param {Error} err
   * @param {Function} callback
   */
  _destroy(err, callback) {
    this.close();
    callback();
  }

  /**
   * Closes the channel.
   */
  close() {
    if (this[_closed]) {
      return;
    }

    this[_closed] = true;
    this.emit('close');
  }
};

/**
 * Check if argument is valid priority.
 * @param {number} priority
 * @returns {boolean}
 */
function isPriority(priority) {
  return [0, 128, 256, 512, 1024].includes(priority);
}
