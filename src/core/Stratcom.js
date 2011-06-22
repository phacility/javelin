/**
 * @requires javelin-install javelin-event javelin-util javelin-magical-init
 * @provides javelin-stratcom
 * @javelin
 */

/**
 * Javelin strategic command, the master event delegation core. This class is
 * a sort of hybrid between Arbiter and traditional event delegation, and
 * serves to route event information to handlers in a general way.
 *
 * Each Javelin :JX.Event has a 'type', which may be a normal Javascript type
 * (for instance, a click or a keypress) or an application-defined type. It
 * also has a "path", based on the path in the DOM from the root node to the
 * event target. Note that, while the type is required, the path may be empty
 * (it often will be for application-defined events which do not originate
 * from the DOM).
 *
 * The path is determined by walking down the tree to the event target and
 * looking for nodes that have been tagged with metadata. These names are used
 * to build the event path, and unnamed nodes are ignored. Each named node may
 * also have data attached to it.
 *
 * Listeners specify one or more event types they are interested in handling,
 * and, optionally, one or more paths. A listener will only receive events
 * which occurred on paths it is listening to. See listen() for more details.
 *
 * @author epriestley
 *
 * @task invoke   Invoking Events
 * @task listen   Listening to Events
 * @task handle   Responding to Events
 * @task sigil    Managing Sigils
 * @task meta     Managing Metadata
 * @task internal Internals
 */
JX.install('Stratcom', {
  statics : {
    ready : false,
    _targets : {},
    _handlers : [],
    _need : {},
    _auto : '*',
    _data : {},
    _execContext : [],

    /**
     * Node metadata is stored in a series of blocks to prevent collisions
     * between indexes that are generated on the server side (and potentially
     * concurrently). Block 0 is for metadata on the initial page load, block 1
     * is for metadata added at runtime with JX.Stratcom.siglize(), and blocks
     * 2 and up are for metadata generated from other sources (e.g. JX.Request).
     * Use allocateMetadataBlock() to reserve a block, and mergeData() to fill
     * a block with data.
     *
     * When a JX.Request is sent, a block is allocated for it and any metadata
     * it returns is filled into that block.
     */
    _dataBlock : 2,

    /**
     * Within each datablock, data is identified by a unique index. The data
     * pointer (data-meta attribute) on a node looks like this:
     *
     *  1_2
     *
     * ...where 1 is the block, and 2 is the index within that block. Normally,
     * blocks are filled on the server side, so index allocation takes place
     * there. However, when data is provided with JX.Stratcom.addData(), we
     * need to allocate indexes on the client.
     */
    _dataIndex : 0,

    /**
     * Dispatch a simple event that does not have a corresponding native event
     * object. It is unusual to call this directly. Generally, you will instead
     * dispatch events from an object using the invoke() method present on all
     * objects. See @{JX.Base.invoke()} for documentation.
     *
     * @param  string       Event type.
     * @param  list?        Optionally, a path to attach to the event. This is
     *                      rarely meaningful for simple events.
     * @param  object?      Optionally, arbitrary data to send with the event.
     * @return @{JX.Event}  The event object which was dispatched to listeners.
     *                      The main use of this is to test whether any
     *                      listeners prevented the event.
     * @task invoke
     */
    invoke : function(type, path, data) {
      var proxy = new JX.Event()
        .setType(type)
        .setData(data || {})
        .setPath(path || []);

      return this._dispatchProxy(proxy);
    },


    /**
     * Listen for events on given paths. Specify one or more event types, and
     * zero or more paths to filter on. If you don't specify a path, you will
     * receive all events of the given type:
     *
     *   // Listen to all clicks.
     *   JX.Stratcom.listen('click', null, handler);
     *
     * This will notify you of all clicks anywhere in the document (unless
     * they are intercepted and killed by a higher priority handler before they
     * get to you).
     *
     * Often, you may be interested in only clicks on certain elements. You
     * can specify the paths you're interested in to filter out events which
     * you do not want to be notified of.
     *
     *   //  Listen to all clicks inside elements annotated "news-feed".
     *   JX.Stratcom.listen('click', 'news-feed', handler);
     *
     * By adding more elements to the path, you can create a finer-tuned
     * filter:
     *
     *   //  Listen to only "like" clicks inside "news-feed".
     *   JX.Stratcom.listen('click', ['news-feed', 'like'], handler);
     *
     *
     * TODO: Further explain these shenanigans.
     *
     * @param  string|list<string>  Event type (or list of event names) to
     *                   listen for. For example, ##'click'## or
     *                   ##['keydown', 'keyup']##.
     *
     * @param  wild      Sigil paths to listen for this event on. See discussion
     *                   in method documentation.
     *
     * @param  function  Callback to invoke when this event is triggered. It
     *                   should have the signature ##f(:JX.Event e)##.
     *
     * @return object    A reference to the installed listener. You can later
     *                   remove the listener by calling this object's remove()
     *                   method.
     * @author epriestley
     * @task listen
     */
    listen : function(types, paths, func) {

      if (__DEV__) {
        if (arguments.length != 3) {
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
        if (('onpagehide' in window) && type == 'unload') {
          // If we use "unload", we break the bfcache ("Back-Forward Cache") in
          // Safari and Firefox. The BFCache makes using the back/forward
          // buttons really fast since the pages can come out of magical
          // fairyland instead of over the network, so use "pagehide" as a proxy
          // for "unload" in these browsers.
          type = 'pagehide';
        }
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
                  'JX.Stratcom.listen(..., "tag:#document", ...): ' +
                  'listen for all events using null, not "tag:#document"');
              }
              if (path[kk] == 'tag:window') {
                throw new Error(
                  'JX.Stratcom.listen(..., "tag:window", ...): ' +
                  'listen for window events using null, not "tag:window"');
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
     * Dispatch a native Javascript event through the Stratcom control flow.
     * Generally, this is automatically called for you by the master dispatcher
     * installed by ##init.js##. When you want to dispatch an application event,
     * you should instead call invoke().
     *
     * @param  Event       Native event for dispatch.
     * @return :JX.Event   Dispatched :JX.Event.
     * @task internal
     */
    dispatch : function(event) {
      var path = [];
      var nodes = {};
      var push = function(key, node) {
        // we explicitly only store the first occurrence of each key
        if (!nodes.hasOwnProperty(key)) {
          nodes[key] = node;
          path.push(key);
        }
      };

      var target = event.srcElement || event.target;

      // Touch events may originate from text nodes, but we want to start our
      // traversal from the nearest Element, so we grab the parentNode instead.
      if (target && target.nodeType === 3) {
        target = target.parentNode;
      }

      // Since you can only listen by tag, id, or sigil we unset the target if
      // it isn't an Element. Document and window are Nodes but not Elements.
      if (!target || !target.getAttribute) {
        target = null;
      }

      var cursor = target;
      while (cursor && cursor.getAttribute) {
        push('tag:' + cursor.nodeName.toLowerCase(), cursor);

        var id = cursor.id;
        if (id) {
          push('id:' + id, cursor);
        }

        var sigils = cursor.getAttribute('data-sigil');
        if (sigils) {
          sigils = sigils.split(' ');
          for (var ii = 0; ii < sigils.length; ii++) {
            push(sigils[ii], cursor);
          }
        }

        cursor = cursor.parentNode;
      }

      var etype = event.type;
      if (etype == 'focusin') {
        etype = 'focus';
      } else if (etype == 'focusout') {
        etype = 'blur';
      }

      var proxy = new JX.Event()
        .setRawEvent(event)
        .setType(etype)
        .setTarget(target)
        .setNodes(nodes)
        .setPath(path.reverse());

      //JX.log('~> '+proxy.toString());

      return this._dispatchProxy(proxy);
    },


    /**
     * Dispatch a previously constructed proxy :JX.Event.
     *
     * @param  :JX.Event Event to dispatch.
     * @return :JX.Event Returns the event argument.
     * @task internal
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
     * Pass on an event, allowing other handlers to process it. The use case
     * here is generally something like:
     *
     *   if (JX.Stratcom.pass()) {
     *     // something else handled the event
     *     return;
     *   }
     *   // handle the event
     *   event.prevent();
     *
     * This allows you to install event handlers that operate at a lower
     * effective priority, and provide a default behavior which is overridable
     * by listeners.
     *
     * @return bool  True if the event was stopped or prevented by another
     *               handler.
     * @task handle
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
     * Retrieve the event (if any) which is currently being dispatched.
     *
     * @return :JX.Event|null   Event which is currently being dispatched, or
     *                          null if there is no active dispatch.
     * @task handle
     */
    context : function() {
      var len = this._execContext.length;
      if (!len) {
        return null;
      }
      return this._execContext[len - 1].event;
    },


    /**
     * Merge metadata. You must call this (even if you have no metadata) to
     * start the Stratcom queue.
     *
     * @param  int          The datablock to merge data into.
     * @param  dict          Dictionary of metadata.
     * @return void
     * @task internal
     */
    mergeData : function(block, data) {
      this._data[block] = data;
      if (block == 0) {
        JX.Stratcom.ready = true;
        JX.flushHoldingQueue('install-init', function(fn) {
          fn();
        });
        JX.__rawEventQueue({type: 'start-queue'});
      }
    },


    /**
     * Determine if a node has a specific sigil.
     *
     * @param  Node    Node to test.
     * @param  string  Sigil to check for.
     * @return bool    True if the node has the sigil.
     *
     * @task sigil
     */
    hasSigil : function(node, sigil) {
      if (__DEV__) {
        if (!node || !node.getAttribute) {
          throw new Error(
            'JX.Stratcom.hasSigil(<non-element>, ...): ' +
            'node is not an element. Most likely, you\'re passing window or ' +
            'document, which are not elements and can\'t have sigils.');
        }
      }

      var sigils = node.getAttribute('data-sigil') || false;
      return sigils && (' ' + sigils + ' ').indexOf(' ' + sigil + ' ') > -1;
    },


    /**
     * Add a sigil to a node.
     *
     * @param   Node    Node to add the sigil to.
     * @param   string  Sigil to name the node with.
     * @return  void
     * @task sigil
     */
    addSigil: function(node, sigil) {
      if (__DEV__) {
        if (!node || !node.getAttribute) {
          throw new Error(
            'JX.Stratcom.addSigil(<non-element>, ...): ' +
            'node is not an element. Most likely, you\'re passing window or ' +
            'document, which are not elements and can\'t have sigils.');
        }
      }

      var sigils = node.getAttribute('data-sigil');
      if (sigils && !JX.Stratcom.hasSigil(node, sigil)) {
        sigil = sigils + ' ' + sigil;
      }

      node.setAttribute('data-sigil', sigil);
    },


    /**
     * Retrieve a node's metadata.
     *
     * @param   Node    Node from which to retrieve data.
     * @return  object  Data attached to the node. If no data has been attached
     *                  to the node yet, an empty object will be returned, but
     *                  subsequent calls to this method will always retrieve the
     *                  same object.
     * @task meta
     */
    getData : function(node) {
      if (__DEV__) {
        if (!node || !node.getAttribute) {
          throw new Error(
            'JX.Stratcom.getData(<non-element>): ' +
            'node is not an element. Most likely, you\'re passing window or ' +
            'document, which are not elements and can\'t have data.');
        }
      }

      var meta_id = (node.getAttribute('data-meta') || '').split('_');
      if (meta_id[0] && meta_id[1]) {
        var block = this._data[meta_id[0]];
        var index = meta_id[1];
        if (block && (index in block)) {
          return block[index];
        }
      }

      var data = {};
      if (!this._data[1]) { // data block 1 is reserved for JavaScript
        this._data[1] = {};
      }
      this._data[1][this._dataIndex] = data;
      node.setAttribute('data-meta', '1_' + (this._dataIndex++));
      return data;
    },


    /**
     * Add data to a node's metadata.
     *
     * @param   Node    Node which data should be attached to.
     * @param   object  Data to add to the node's metadata.
     * @return  object  Data attached to the node that is returned by
     *                  JX.Stratcom.getData().
     * @task meta
     */
    addData : function(node, data) {
      if (__DEV__) {
        if (!node || !node.getAttribute) {
          throw new Error(
            'JX.Stratcom.addData(<non-element>, ...): ' +
            'node is not an element. Most likely, you\'re passing window or ' +
            'document, which are not elements and can\'t have sigils.');
        }
        if (!data || typeof data != 'object') {
          throw new Error(
            'JX.Stratcom.addData(..., <nonobject>): ' +
            'data to attach to node is not an object. You must use ' +
            'objects, not primitives, for metadata.');
        }
      }

      return JX.copy(JX.Stratcom.getData(node), data);
    },


    /**
     * @task internal
     */
    allocateMetadataBlock : function() {
      return this._dataBlock++;
    }
  }
});
