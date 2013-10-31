var quickconnect = require('rtc-quickconnect');
var connectMedia = require('../connect-media');

// incldue the media module and immediately request to capture media
var media = require('../media')();

// create a new quickconnection instance in the test namespace
quickconnect('test')
  .on('peer', function(conn) {
    // when a new peer is connected, connect the media instance
    // to the new connection which is coupled behind the scenes in quickconnect
    connectMedia(media, conn);
  });