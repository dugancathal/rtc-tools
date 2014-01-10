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
  
};