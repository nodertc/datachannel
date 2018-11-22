'use strict';

const Channel = require('./channel');
const { channelType } = require('./constants');

module.exports = {
  createChannel,
};

/**
 * Creates the Data Channel.
 * @param {Object} options
 * @param {stream.Readable} options.input
 * @param {stream.Writable} options.output
 * @param {boolean} [options.negotiated = false]
 * @param {string} [options.label]
 * @param {string} [options.protocol]
 * @param {number} [options.priority]
 * @param {boolean} [options.ordered] The type of the delivery.
 * @param {number} [options.retries] The number of retransmissions.
 * @param {number} [options.lifetime] The maximum lifetime in milliseconds.
 * @returns {Channel}
 */
function createChannel(options = {}) {
  const { ordered, retries, lifetime } = options;

  return new Channel({
    ...options,
    channelType: createChannelType(ordered, retries, lifetime),
    reliability: createReliability(retries, lifetime),
  });
}

/**
 * Creates a valid channel type for provided parameters.
 * @param {boolean} ordered The type of the delivery.
 * @param {number} [retries] The number of retransmissions.
 * @param {number} [lifetime] The maximum lifetime in milliseconds.
 * @returns {number}
 */
function createChannelType(ordered, retries, lifetime) {
  if (Number.isInteger(retries) && Number.isInteger(lifetime)) {
    throw new TypeError('You cannot set both `retries` and `lifetime`');
  }

  if (ordered) {
    if (Number.isInteger(retries)) {
      return channelType.DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT;
    }

    if (Number.isInteger(lifetime)) {
      return channelType.DATA_CHANNEL_PARTIAL_RELIABLE_TIMED;
    }

    return channelType.DATA_CHANNEL_RELIABLE;
  }

  if (Number.isInteger(retries)) {
    return channelType.DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT_UNORDERED;
  }

  if (Number.isInteger(lifetime)) {
    return channelType.DATA_CHANNEL_PARTIAL_RELIABLE_TIMED_UNORDERED;
  }

  return channelType.DATA_CHANNEL_RELIABLE_UNORDERED;
}

/**
 * Get `reliability` attribute value.
 * @param {number} [retries] The number of retransmissions.
 * @param {number} [lifetime] The maximum lifetime in milliseconds.
 * @returns {number}
 */
function createReliability(retries, lifetime) {
  if (Number.isInteger(retries)) {
    return retries;
  }

  if (Number.isInteger(lifetime)) {
    return lifetime;
  }

  return 0;
}
