/* jshint node: true */

'use strict';

/**
  # rtc

  The `rtc` package is a convenience layer for working with the rtc.io toolkit.
  Consider it a boxed set of lego of the most common pieces required to build
  the front-end component of a WebRTC application.

  ## Getting Started

  TO BE COMPLETED.

**/

var gen = require('./generators');

// export detect
var detect = exports.detect = require('./detect');

// export cog logger for convenience
var logger = exports.logger = require('cog/logger');

// export peer connection
var RTCPeerConnection =
exports.RTCPeerConnection = detect('RTCPeerConnection');

// add the couple utility
var couple = exports.couple = require('./couple');

// add the datachannel helper
var datachannel = exports.datachannel = require('./datachannel');

/**
  ## Factories
**/

/**
  ### rtc.connect

  The `connect` helper is simplifies the process of creating a new peer
  connection and then coupling it to a target id via a signaller.

**/
exports.connect = function(signaller, targetId, opts, callback) {
  var pc;
  var monitor;

  // handle no opts, but a callback being specified
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // create a new connection
  pc = createConnection(opts, (opts || {}).constraints);

  // couple the connection and monitor the connection
  monitor = couple(pc, targetId, signaller, opts);

  // once the connection is active, trigger the callback
  if (typeof callback == 'function') {
    monitor.once('active', callback);
  }

  // return the peer connection
  return pc;
};

/**
  ### rtc.createConnection(opts?, constraints?)

  Create a new `RTCPeerConnection` auto generating default opts as required.

  ```js
  var conn;

  // this is ok
  conn = rtc.createConnection();

  // and so is this
  conn = rtc.createConnection({
    iceServers: []
  });
  ```
**/
var createConnection = exports.createConnection = function(opts, constraints) {
  return new RTCPeerConnection(
    // generate the config based on options provided
    gen.config(opts),

    // generate appropriate connection constraints
    gen.connectionConstraints(opts, constraints)
  );
};