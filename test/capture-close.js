var couple = require('../couple');
var signaller = require('rtc-signaller');
var test = require('tape');
var rtc = require('..');
var conns = [];
var signallers = [];
var monitors = [];
var scope = [];
var messengers = [];
var dcs = [];
var roomId = require('uuid').v4();

// require('cog/logger').enable('*');

test('create peer connections', function(t) {
  t.plan(2);

  t.ok(conns[0] = rtc.createConnection(), 'created a');
  t.ok(conns[1] = rtc.createConnection(), 'created b');
});

test('create signallers', function(t) {
  t.plan(2);

  t.ok(signallers[0] = signaller(location.origin), 'created signaller a');
  t.ok(signallers[1] = signaller(location.origin), 'created signaller b');
});

test('announce signallers', function(t) {
  t.plan(2);
  signallers[0].once('peer:announce', t.pass.bind(t, '0 knows about 1'));
  signallers[1].once('peer:announce', t.pass.bind(t, '1 knows about 0'));

  signallers[0].announce({ room: roomId });
  signallers[1].announce({ room: roomId });
});

test('couple a --> b', function(t) {
  t.plan(1);

  monitors[0] = couple(conns[0], signallers[1].id, signallers[0], {
    debugLabel: 'conn:0'
  });

  t.ok(monitors[0], 'ok');
});

test('couple b --> a', function(t) {
  t.plan(1);

  monitors[1] = couple(conns[1], signallers[0].id, signallers[1], {
    debugLabel: 'conn:1'
  });

  t.ok(monitors[1], 'ok');
});

test('create a data channel on the master connection', function(t) {
  var masterIdx = signallers[0].isMaster(signallers[1].id) ? 0 : 1;

  t.plan(2);

  dcs[masterIdx] = conns[masterIdx].createDataChannel('test');
  conns[masterIdx ^ 1].ondatachannel = function(evt) {
    dcs[masterIdx ^ 1] = evt.channel;
    t.ok(evt && evt.channel, 'got data channel');
    t.equal(evt.channel.label, 'test', 'dc named test');
  };

  monitors[0].createOffer();
});

test('close a, b aware', function(t) {
  var closeTimeout = setTimeout(function() {
    t.fail('close monitor timed out');
  }, 30000);

  function handleClose() {
    t.pass('captured close');
    clearTimeout(closeTimeout);
  };

  t.plan(1);
  monitors[1].once('closed', handleClose);
  conns[0].close();
});

test('release references', function(t) {
  t.plan(1);

  conns = [];
  monitors = [];
  dcs = [];
  t.pass('done');
});