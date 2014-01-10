var signaller = require('rtc-signaller')('http://rtc.io/switchboard/');
var rtc = require('..');
var peers = {};

// look for friends
signaller.on('peer:announce', function(data) {
  // create a peer connection for our new friend
  var pc = peers[data.id] = rtc.createConnection();

  // create a test channel
  // NOTE: the callback will only fire once the channel is open and ready
  // for use.  It's advisable that you monitor it in case it closes though.
  rtc.datachannel(pc, signaller, 'test-channel', function(err, channel) {
    channel.onmessage = function(evt) {
      console.log('received message via the channel: ', evt);
    };

    channel.send('hello');
  });

  // couple the connection
  // NOTE: order is not theoretically important and you should be able to
  // create more data channels at a later stage.  In practice, however,
  // browser support for connection renogiation varies so if possible
  // it is probably worth trying to create any data channels before coupling
  // the connection
  rtc.couple(pc, data.id, signaller);
  console.log('attempting to connect to peer: ' + data.id);
});

// announce ourself in the dc-demo room
signaller.announce({ room: 'dc-demo' });