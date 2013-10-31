/* jshint node: true */
'use strict';

/**
  ## rtc/connect-media

  The `rtc/connect-media` helper module is a convenience helper for
  associating an `rtc-media` capture source with a peer connection.  It
  primarily does two things that are of major benefit:

  1. if the media stream is ready adds it immediately, otherwise waits for a
     media `capture` event and adds the stream at that point.

  2. Current WebRTC implementations in Firefox do not trigger relevant
     `negotiationneeded` events when a stream is added to a peer. This is
     important behaviour in rtc.io and the WebRTC spec, and thus this
     'connect-media` helper manually triggers that event once a stream is
     added (after a short delay).

  ### Example Usage

  <<< examples/connect-media.js

**/
module.exports = function(media, peer) {

};