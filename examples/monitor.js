var rtc = require('../');
var monitor = require('../monitor');
var pc = rtc.createConnection();

// watch pc and when active do something
monitor(pc).once('active', function() {
  // active and ready to go
});
