/* jshint node: true */
'use strict';

/**
  ## rtc/datachannel

  This is a helper for creating data channels on a particular peer connection
  via the signaller.  As the creation of a data channel is typically asymetric
  this helper takes into consideration the rtc.io related connection
  information (which is the offerer vs which is answerer) to ensure
  data channels are created correctly.

  ```js
  datachannel(pc, signaller, => name, opts?, callback)
  ```

  The above function supports partial application where it is possible to 
  provide the signaller and peerconnection and receive a function handler
  that can then be invoked to create data channels on the peer connection.

  This can be useful in the event that you wish to create multiple data
  channels as illustrated below:

  <<< examples/create-dcs.js
**/
module.exports = function(pc, signaller, name, opts, callback) {
  var targetId;
  var dc;
  var dcOpts = {};

  // handle the no opts case, but a callback specified
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // ensure we have a callback
  callback = callback || function() {};

  // get the target id from either the peer connection or the opts
  targetId = pc._targetId || (opts || {}).targetId;

  // if we don't have a targetid, specified, then abort
  if (! targetId) {
    return callback(new Error('no targetid found in peer connection or opts'));
  }

  // create the data channel
  dc = pc.createDataChannel(name, dcOpts);
  dc.negotiated = true;

  if (dc.readyState == 'open') {
    return callback(null, dc);
  }

  // wait for the data channel to open
  dc.onopen = function() {
    dc.onopen = null;
    callback(null, dc);
  }

  return dc;
};