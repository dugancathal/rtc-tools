/* jshint node: true */
/* global RTCIceCandidate: false */
/* global RTCSessionDescription: false */
'use strict';

var debug = require('cog/logger')('couple');
var async = require('async');
var monitor = require('./monitor');
var detect = require('./detect');

/**
  ## rtc/couple

  ### couple(pc, targetAttr, signaller, opts?)

  Couple a WebRTC connection with another webrtc connection via a
  signalling scope.  The `targetAttr` argument specifies the criteria that
  are passed onto a `/request` command when looking for remote peer
  to couple and exchange messages with.

  ### Example Usage

  ```js
  var couple = require('rtc/couple');

  couple(new RTCPeerConnection(), { id: 'test' }, signaller);
  ```

  ### Using Filters

  In certain instances you may wish to modify the raw SDP that is provided
  by the `createOffer` and `createAnswer` calls.  This can be done by passing
  a `sdpfilter` function (or array) in the options.  For example:

  ```js
  // run the sdp from through a local tweakSdp function.
  couple(pc, { id: 'blah' }, signaller, { sdpfilter: tweakSdp });
  ```

**/
function couple(conn, targetAttr, signaller, opts) {
  // create a monitor for the connection
  var mon = monitor(conn);
  var blockId;
  var stages = {};
  var channel;
  var queuedCandidates = [];
  var sdpFilter = (opts || {}).sdpfilter;

  // retry implementation
  var maxAttempts = (opts || {}).maxAttempts || 1;
  var attemptDelay = (opts || {}).attemptDelay || 3000;
  var attempt = 1;
  var attemptTimer;
  var offerTimeout;

  // initilaise the negotiation helpers
  var createOffer = negotiate('createOffer');
  var createAnswer = negotiate('createAnswer');

  // initialise the connection index
  var cidx = (opts || {}).connectionIdx || 0;

  // initialise the processing queue (one at a time please)
  var q = async.queue(function(task, cb) {
    // if the task has no operation, then trigger the callback immediately
    if (typeof task.op != 'function') {
      return cb();
    }

    // process the task operation
    task.op(task, cb);
  }, 1);

  // initialise session description and icecandidate objects
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  var RTCIceCandidate = (opts || {}).RTCIceCandidate ||
    detect('RTCIceCandidate');

  function abort(stage, sdp, cb) {
    var stageHandler = stages[stage];

    return function(err) {
      // log the error
      debug('captured error: ', err);
      q.push({ op: lockRelease });

      // reattempt coupling?
      if (stageHandler && attempt < maxAttempts && (! attemptTimer)) {
        attemptTimer = setTimeout(function() {
          attempt += 1;
          attemptTimer = 0;

          debug('reattempting connection (attempt: ' + attempt + ')');
          stageHandler();
        }, attemptDelay);
      }

      if (typeof cb == 'function') {
        cb(err);
      }
    };
  }

  function negotiate(methodName) {
    var hsDebug = require('cog/logger')('handshake-' + methodName);

    return function(task, cb) {
      // if we don't have an open channel, then abort
      if (! channel) {
        return cb(new Error('no channel for signalling'));
      }

      // create the offer
      conn[methodName](
        function(desc) {

          // if a filter has been specified, then apply the filter
          if (typeof sdpFilter == 'function') {
            desc.sdp = sdpFilter(desc.sdp, conn, methodName);
          }

          // initialise the local description
          conn.setLocalDescription(
            desc,

            // if successful, then send the sdp over the wire
            function() {
              // send the sdp
              channel.send('/sdp:' + cidx, desc);

              // callback
              cb();
            },

            // on error, abort
            abort(methodName, desc.sdp, cb)
          );
        },

        // on error, abort
        abort(methodName, '', cb)
      );
    };
  }

  function handleLocalCandidate(evt) {
    if (evt.candidate && openChannel) {
      openChannel.send('/candidate:' + cidx, evt.candidate);
    }
  }

  function handleRemoteCandidate(targetId, data) {
    if (! conn.remoteDescription) {
      return queuedCandidates.push(data);
    }

    debug('adding remote candidate');
    try {
      conn.addIceCandidate(new RTCIceCandidate(data));
    }
    catch (e) {
      debug('invalidate candidate specified: ', data);
    }
  }

  function handleSdp(targetId, data) {
    // reset the queue
    queueReset();

    // prioritize setting the remote description operation
    q.push({ op: function(task, cb) {
      debug('setting remote description: ', data);

      // TODO: better validation
      if (data.type === 'answer' && conn.remoteDescription) {
        return;
      }

      // update the remote description
      // once successful, send the answer
      conn.setRemoteDescription(
        new RTCSessionDescription(data),

        function() {
          // apply any queued candidates
          queuedCandidates.splice(0).forEach(function(data) {
            debug('applying queued candidate');
            conn.addIceCandidate(new RTCIceCandidate(data));
          });

          // create the answer
          if (data.type === 'offer') {
            queue(createAnswer)();
          }

          // trigger the callback
          cb();
        },

        abort(data.type === 'offer' ? 'createAnswer' : 'createOffer', data.sdp, cb)
      );
    }});
  }

  function lockAcquire(task, cb) {
    debug('attempting to acquire channel writelock');

    // attempt to aquire a write lock for the channel
    channel.writeLock(function(err, lock) {
      // if we received an error, then wait for the lock to be released and
      // try again
      if (err) {
        debug('could not acquire writelock, waiting for release notification');
        channel.once('writelock:release', function() {
          debug('release notification received');
          lockAcquire(task, cb);
        });

        return;
      }

      debug('writelock acquired');

      // proceed to the next step
      cb(null, lock);
    });
  }

  function lockRelease(task, cb) {
    if (channel.lock && typeof channel.lock.release == 'function') {
      debug('writelock released');
      channel.lock.release();
    }

    cb();
  }

  function openChannel(task, cb) {
    if (channel) {
      // ping the channel, if not active then clear and reopen
      channel.ping(function(err) {
        if (err) {
          // close the channel
          signaller.closeChannel(channel);
          channel = null;

          // try opening a new channel for the specified target
          return openChannel(task, cb);
        }

        cb(null, channel);
      });

      return;
    }

    signaller.request(targetAttr, function(err, c) {
      if (err) {
        debug('was unable to open a channel for target: ', targetAttr);
      }
      else {
        // update the target attributes to retarget the same peer
        targetAttr = { id: c.targetId };
      }

      cb(err, channel = err ? null : c);
    });
  }

  function queue(negotiateTask) {
    return function() {
      q.push([
        { op: openChannel },
        { op: lockAcquire },
        { op: negotiateTask },
        { op: lockRelease }
      ]);
    };
  }

  function queueReset() {
    q.tasks = q.tasks.filter(function(task) {
      return task.op === lockRelease;
    });
  }

  // when regotiation is needed look for the peer
  conn.addEventListener('negotiationneeded', function() {
    clearTimeout(offerTimeout);
    offerTimeout = setTimeout(queue(createOffer), 50);
  });

  conn.addEventListener('icecandidate', handleLocalCandidate);

  // when we receive sdp, then
  signaller.on('sdp:' + cidx, handleSdp);
  signaller.on('candidate:' + cidx, handleRemoteCandidate);

  // when the connection closes, remove event handlers
  mon.once('closed', function() {
    debug('closed');

    // remove listeners
    signaller.removeListener('sdp:' + cidx, handleSdp);
    signaller.removeListener('candidate:' + cidx, handleRemoteCandidate);
  });

  // patch in the create offer functions
  mon.createOffer = queue(createOffer);

  // open a channel
  q.push({ op: openChannel });

  return mon;
}

module.exports = couple;