/**
 * Javelin core; installs Javelin and Stratcom event delegation.
 *
 * @provides javelin-magical-init
 * @nopackage
 *
 * @javelin-installs JX.__rawEventQueue
 * @javelin-installs JX.__simulate
 * @javelin-installs JX.enableDispatch
 * @javelin-installs JX.onload
 *
 * @javelin
 */
(function() {


  if (window.JX) {
    return;
  }

  window.JX = {};
  window['__DEV__'] = window['__DEV__'] || 0;

  var loaded = false;
  var onload = [];
  var master_event_queue = [];
  JX.__rawEventQueue = function (what) {

    what = what || window.event;
    master_event_queue.push(what);


    // Evade static analysis.
    if (JX['Stratcom'] && JX['Stratcom'].ready) {
      //  Empty the queue now so that exceptions don't cause us to repeatedly
      //  try to handle events.
      var local_queue = master_event_queue;
      master_event_queue = [];
      for (var ii = 0; ii < local_queue.length; ++ii) {
        var evt = local_queue[ii];

        //  Sometimes IE gives us events which throw when ".type" is accessed;
        //  just ignore them since we can't meaningfully dispatch them. TODO:
        //  figure out where these are coming from.
        try { var test = evt.type; } catch (x) { continue; }

        if (!loaded && evt.type == 'domready') {
          document.body && (document.body.id = null);
          loaded = true;

          for (var ii = 0; ii < onload.length; ii++) {
            onload[ii]();
          }

        }

        JX['Stratcom'].dispatch(evt);
      }
    } else {
      var t = what.srcElement || what.target;
      if (t
          && (what.type in {click:1, submit:1})
          && (' '+t.className+' ').match(/ FI_CAPTURE /)) {
        what.returnValue = false;
        what.preventDefault && what.preventDefault();
        document.body.id = 'event_capture';
        return false;
      }
    }
  }

  JX.enableDispatch = function(root, event) {
    if (root.addEventListener) {
      root.addEventListener(event, JX.__rawEventQueue, true);
    } else {
      root.attachEvent('on'+event, JX.__rawEventQueue);
    }
  };

  var root = document.documentElement;
  var document_events = [
    'click',
    'keypress',
    'mousedown',
    'mouseover',
    'mouseout',
    'mouseup',
    'keydown',
    //  Opera is multilol: it propagates focus/blur oddly and propagates submit
    //  in a way different from other browsers.
    !window.opera && 'submit',
     window.opera && 'focus',
     window.opera && 'blur'
  ];
  for (var ii = 0; ii < document_events.length; ++ii) {
    document_events[ii] && JX.enableDispatch(root, document_events[ii]);
  }

  //  In particular, we're interested in capturing window focus/blur here so
  //  long polls can abort when the window is not focused.
  var window_events = [
    'unload',
    'focus',
    'blur'
  ];
  for (var ii = 0; ii < window_events.length; ++ii) {
    JX.enableDispatch(window, window_events[ii]);
  }

  JX.__simulate = function(node, event) {
    if (root.attachEvent) {
      var e = {target: node, type: event};
      JX.__rawEventQueue(e);
      if (e.returnValue === false) {
        return false;
      }
    }
  };

  //  TODO: Document the gigantic IE mess here with focus/blur.
  //  TODO: beforeactivate/beforedeactivate?
  //  http://www.quirksmode.org/blog/archives/2008/04/delegating_the.html
  if (!root.addEventListener) {
    root.onfocusin  = JX.__rawEventQueue;
    root.onfocusout = JX.__rawEventQueue;
  }

  root = document;
  if (root.addEventListener) {
    if (navigator.userAgent.match(/WebKit/)) {
      var timeout = setInterval(function() {
        if (/loaded|complete/.test(document.readyState)) {
          JX.__rawEventQueue({type: 'domready'});
          clearTimeout(timeout);
        }
      }, 3);
    } else {
      root.addEventListener('DOMContentLoaded', function() {
        JX.__rawEventQueue({type: 'domready'});
        }, true);
    }
  } else {
    var src = 'javascript:void(0)';
    var action = 'JX.__rawEventQueue({\'type\':\'domready\'});';

    //  TODO: this is throwing, do we need it?
    //             'this.parentNode.removeChild(this);';

    document.write(
      '<script onreadystatechange="'+action+'" defer="defer" src="'+src+'">'+
      '<\/s'+'cript\>');
  }

  JX.onload = function(func) {
    if (loaded) {
      func();
      return;
    }
    onload.push(func);
  }


})();
