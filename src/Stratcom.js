/**
 *  @requires javelin-install javelin-event javelin-util javelin-magical-init
 *  @provides javelin-stratcom
 *  @javelin
 */

/**
 *  Javelin strategic command, the master event delegation core. This class is
 *  a sort of hybrid between Arbiter and traditional event delegation, and
 *  serves to route event information to handlers in a general way.
 *
 *  Each Javelin :JX.Event has a "type", which may be a normal Javascript type
 *  (for instance, a click or a keypress) or an application-defined type. It
 *  also has a "path", based on the path in the DOM from the root node to the
 *  event target. Note that, while the type is required, the path may be empty
 *  (it often will be for application-defined events which do not originate
 *  from the DOM).
 *
 *  The path is determined by walking down the tree to the event target and
 *  looking for nodes that have been tagged with metadata. These names are used
 *  to build the event path, and unnamed nodes are ignored. Each named node may
 *  also have data attached to it.
 *
 *  Listeners specify one or more event types they are interested in handling,
 *  and, optionally, one or more paths. A listener will only receive events
 *  which occurred on paths it is listening to. See listen() for more details.
 *
 *  @heavy  arbiter
 *  @author epriestley
 */
JX.install('Stratcom', {
  statics : {
    ready : false,
    _targets : {},
    _handlers : [],
    _need : {},
    _matchName : /\bFN_([^ ]+)/,
    _matchData : /\bFD_([^ ]+)/,
    _auto : '*',
    _data : {},
    _execContext : [],

    /**
     *  It's over nine THOUSSAANNND!!!!
     */
    _dataref : 9000,


    /**
     *  Dispatch a simple event that does not have a corresponding native event
     *  object. This is largely analagous to an Arbiter event. (If you are
     *  looking at the open source version of this, this is largely
     *  meaningless.)
     *
     *  @param  string  Event type.
     *  @param  object  Optionally, arbitrary data to send with the event.
     *  @param  array   Optionally, a path to attach to the event. This is
     *                  rarely meaingful for simple events.
     *  @return void
     *
     *  @author epriestley
     */
    invoke : function(type, path, data) {
      var proxy = new JX.Event()
        .setType(type)
        .setData(data || {})
        .setPath(path || []);

      return this._dispatchProxy(proxy);
    },


    /**
     *  Listen for events on given paths. Specify one or more event types, and
     *  zero or more paths to filter on. If you don't specify a path, you will
     *  receive all events of the given type:
     *
     *    // Listen to all clicks.
     *    JX.Stratcom.listen('click', null, handler);
     *
     *  This will notify you of all clicks anywhere in the document (unless
     *  they are intercepted and killed by a higher priority handler before they
     *  get to you).
     *
     *  Often, you may be interested in only clicks on certain elements. You
     *  can specify the paths you're interested in to filter out events which
     *  you do not want to be notified of.
     *
     *    //  Listen to all clicks inside elements annotated "news-feed".
     *    JX.Stratcom.listen('click', 'news-feed', handler);
     *
     *  By adding more elements to the path, you can create a finer-tuned
     *  filter:
     *
     *    //  Listen to only "like" clicks inside "news-feed".
     *    JX.Stratcom.listen('click', ['news-feed', 'like'], handler);
     *
     *
     *  TODO: Further explain these shenanigans.
     *
     *  @return object  A reference to the installed listener. You can later
     *                  remove the listener by calling this object's remove()
     *                  method.
     *  @author epriestley
     */
    listen : function(types, paths, func) {

      if (__DEV__) {
        if (arguments.length == 4) {
          throw new Error(
            'JX.Stratcom.listen(...): '+
            'requires exactly 3 arguments. Did you mean JX.DOM.listen?');
        }
        if (arguments.length != 3) {
          throw new Error(
            'JX.Stratcom.listen(...): '+
            'requires exactly 3 arguments.');
        }
        if (typeof func != 'function') {
          throw new Error(
            'JX.Stratcom.listen(...): '+
            'callback is not a function.');
        }
      }

      var ids = [];

      types = JX.$AX(types);

      if (!paths) {
        paths = this._auto;
      }
      if (!(paths instanceof Array)) {
        paths = [[paths]];
      } else if (!(paths[0] instanceof Array)) {
        paths = [paths];
      }

      //  To listen to multiple event types on multiple paths, we just install
      //  the same listener a whole bunch of times: if we install for two
      //  event types on three paths, we'll end up with six references to the
      //  listener.
      //
      //  TODO: we'll call your listener twice if you install on two paths where
      //  one path is a subset of another. The solution is "don't do that", but
      //  it would be nice to verify that the caller isn't doing so, in __DEV__.
      for (var ii = 0; ii < types.length; ++ii) {
        var type = types[ii];
        if (!(type in this._targets)) {
          this._targets[type] = {};
        }
        var type_target = this._targets[type];
        for (var jj = 0; jj < paths.length; ++jj) {
          var path = paths[jj];
          var id = this._handlers.length;
          this._handlers.push(func);
          this._need[id] = path.length;
          ids.push(id);
          for (var kk = 0; kk < path.length; ++kk) {
            if (__DEV__) {
              if (path[kk] == 'tag:#document') {
                throw new Error(
                  'JX.Stratcom.listen(..., "tag:#document", ...): '+
                  'listen for document events as "tag:window", not '+
                  '"tag:#document", in order to get consistent behavior '+
                  'across browsers.');
              }
            }
            if (!type_target[path[kk]]) {
              type_target[path[kk]] = [];
            }
            type_target[path[kk]].push(id);
          }
        }
      }

      return {
        remove : function() {
          for (var ii = 0; ii < ids.length; ii++) {
            delete JX.Stratcom._handlers[ids[ii]];
          }
        }
      };
    },


    /**
     *  Dispatch a native Javascript event through the Stratcom control flow.
     *  Generally, this is automatically called for you by the master dipatcher
     *  installed by init.js.
     */
    dispatch : function(event) {

      try {
        var target = event.srcElement || event.target;
        if (target === window || (!target || target.nodeName == '#document')) {
          target = {nodeName: 'window'};
        }
      } catch (x) {
        target = null;
      }

      var path = [];
      var nodes = [];
      var data = {};
      var cursor = target;
      while (cursor) {
        var data_source = cursor.className || '';
        var token;
        token = (data_source.match(this._matchName) || [])[1];
        if (token) {
          data[token] = this.getData(cursor);
          nodes[token] = cursor;
          path.push(token);
        }
        if (cursor.id) {
          token = 'id:'+cursor.id;
          data[token] = cursor;
          path.push(token);
        }
        cursor = cursor.parentNode;
      }

      if (target) {
        var tag_sigil = 'tag:'+target.nodeName.toLowerCase();
        path.push(tag_sigil);
        data[tag_sigil] = null;
      }

      var etype = event.type;
      var tmap = {
        focusin: 'focus',
        focusout: 'blur'
      };

      if (etype in tmap) {
        etype = tmap[etype];
      }

      var proxy = new JX.Event()
        .setRawEvent(event)
        .setType(etype)
        .setTarget(target)
        .setData(data)
        .setNodes(nodes)
        .setPath(path.reverse());

//      JX.log('~> '+proxy.toString());

      return this._dispatchProxy(proxy);
    },


    /**
     *  Dispatch a previously constructed proxy event.
     */
    _dispatchProxy : function(proxy) {

      var scope = this._targets[proxy.getType()];

      if (!scope) {
        return proxy;
      }

      var path = proxy.getPath();
      var len = path.length;
      var hits = {};
      var matches;

      for (var root = -1; root < len; ++root) {
        if (root == -1) {
          matches = scope[this._auto];
        } else {
          matches = scope[path[root]];
        }
        if (!matches) {
          continue;
        }
        for (var ii = 0; ii < matches.length; ++ii) {
          hits[matches[ii]] = (hits[matches[ii]] || 0) + 1;
        }
      }

      var exec = [];

      for (var k in hits) {
        if (hits[k] == this._need[k]) {
          var handler = this._handlers[k];
          if (handler) {
            exec.push(handler);
          }
        }
      }

      this._execContext.push({
        handlers: exec,
        event: proxy,
        cursor: 0
      });

      this.pass();

      this._execContext.pop();

      return proxy;
    },

    /**
     *  Pass on an event, allowing other handlers to process it. The use case
     *  here is generally something like:
     *
     *    if (JX.Stratcom.pass()) {
     *      // something else handled the event
     *      return;
     *    }
     *    // handle the event
     *    event.prevent();
     *
     *  This allows you to install event handlers that operate at a lower
     *  effective priority.
     *
     *  @return bool  True if the event was stopped or prevented by another
     *                handler.
     *  @author epriestley
     */
    pass : function() {
      var context = this._execContext[this._execContext.length - 1];
      while (context.cursor < context.handlers.length) {
        var cursor = context.cursor;
        ++context.cursor;
        (context.handlers[cursor] || JX.bag)(context.event);
        if (context.event.getStopped()) {
          break;
        }
      }
      return context.event.getStopped() || context.event.getPrevented();
    },


    /**
     *  Retrieve the event (if any) which is currently being dispatched.
     *
     *  @return JX.Event|null   Event which is currently being dispatched, or
     *                          null if there is no active dispatch.
     *  @author epriestley
     */
    context : function() {
      var len = this._execContext.length;
      if (!len) {
        return null;
      }
      return this._execContext[len - 1].event;
    },


    /**
     *  Merge metadata. You must call this (even if you have no metadata) to
     *  start the Stratcom queue.
     *
     *  @param  dict          Dictionary of metadata.
     *  @author epriestley
     */
    mergeData : function(data) {
      JX.copy(this._data, data);
      JX.Stratcom.ready = true;
      JX.__rawEventQueue({type: 'start-queue'});
    },


    /**
     *  Attach a sigil (and, optionally, metadata) to a node.
     */
    sigilize : function(node, sigil, data) {
      if (__DEV__) {
        if (node.className.match(this._matchName)) {
          throw new Error(
            'Stratcom.sigilize(<node>, '+sigil+', ...): '+
            'node already has a sigil, sigils may not be overwritten.');
        }
      }

      var base = [node.className];
      if (data) {
        this._data[this._dataref] = data;
        base.push('FD_'+(this._dataref++));
      }
      base.push('FN_'+sigil);
      node.className = base.reverse().join(' ');
    },


    /**
     *  Determine if a node has a specific sigil.
     *
     *  @param  Node    Node to test.
     *  @param  string  Sigil.
     *  @return bool    True if the node has the sigil.
     *
     *  @author epriestley
     */
    hasSigil : function(node, sigil) {
      return (node.className.match(this._matchName) || [])[1] == sigil;
    },


    /**
     *  Retrieve a node's metadata.
     *
     *  @param  Node    Node from which to retrieve data.
     *  @return dict    Data attached to the node, or an empty dictionary if
     *                  the node has no data attached.
     *
     *  @author epriestley
     */
    getData : function(node) {
      var idx = ((node.className || '').match(this._matchData) || [])[1];
      return (idx && this._data[idx]) || {};
    }
  },
  initialize : function() {

  }
});
