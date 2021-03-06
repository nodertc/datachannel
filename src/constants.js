'use strict';

const messageType = {
  DATA_CHANNEL_ACK: 0x02,
  DATA_CHANNEL_OPEN: 0x03,
};

const channelType = {
  DATA_CHANNEL_RELIABLE: 0x00,
  DATA_CHANNEL_RELIABLE_UNORDERED: 0x80,
  DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT: 0x01,
  DATA_CHANNEL_PARTIAL_RELIABLE_REXMIT_UNORDERED: 0x81,
  DATA_CHANNEL_PARTIAL_RELIABLE_TIMED: 0x02,
  DATA_CHANNEL_PARTIAL_RELIABLE_TIMED_UNORDERED: 0x82,
};

module.exports = {
  messageType,
  channelType,
};
