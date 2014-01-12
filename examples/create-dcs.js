var signaller = require('rtc-signaller')('http://rtc.io/switchboard/');
var rtc = require('..');
var peers = {};

// look for friends
signaller.on('peer:announce', function(data) {
  // create a peer connection for our new friend
  var pc = peers[data.id] = rtc.connect(signaller, data.id);

  // create a test channel
  // NOTE: the callback will only fire once the channel is open and ready
  // for use.  It's advisable that you monitor it in case it closes though.
  rtc.datachannel(pc, signaller, 'test-channel', function(err, dc) {
    dc.onmessage = function(evt) {
      console.log('received message via the channel: ', evt);
    };

    console.log('detected data channel open: ', dc);
    dc.send('hello');
  });
});

// announce ourself in the dc-demo room
signaller.announce({ room: 'dc-demo' });