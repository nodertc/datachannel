'use strict';

const {
  types: { uint8, uint16be, uint32be, string },
} = require('binary-data');

const Open = {
  messageType: uint8,
  channelType: uint8,
  priority: uint16be,
  reliability: uint32be,
  labelLength: uint16be,
  protocolLength: uint16be,
  label: string(({ current }) => current.labelLength),
  protocol: string(({ current }) => current.protocolLength),
};

const Act = uint8;

module.exports = {
  Open,
  Act,
};
