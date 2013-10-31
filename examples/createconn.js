var rtc = require('..');
var conn;

// this is ok
conn = rtc.createConnection();

// and so is this
conn = rtc.createConnection({
  iceServers: []
});
