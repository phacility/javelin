/**
 *  Javelin utility functions.
 *
 *  @provides javelin-util
 */


/**
 *  Convert an array-like object (e.g., arguments) into an array.
 *
 *  @param  obj     Array or array-like object.
 *  @return array   Actual array.
 *
 *  @heavy  $A
 *  @author epriestley
 */
JX.$A = function(mysterious_object) {
  return Array.prototype.slice.apply(mysterious_object, []);
};


/**
 *  Cast a value into an array, by wrapping scalars into singletons.
 *
 *  @param  obj     Scalar or array.
 *  @return array   If the argument was a scalar, an array with the argument as
 *                  its only element. Otherwise, the original array.
 *
 *  @heavy  arrayize()
 *  @author epriestley
 */
JX.$AX = function(maybe_scalar) {
  return (maybe_scalar instanceof Array) ? maybe_scalar : [maybe_scalar];
};


/**
 *  Copy properties from one object to another. Note: does not copy the
 *  toString property.
 *
 *  @param  obj     Destination object, which properties should be copied to.
 *  @param  obj     Source object, which properties should be copied from.
 *  @return obj     Destination object.
 *
 *  @heavy  copy_properties()
 *  @author epriestley
 */
JX.copy = function(copy_dst, copy_src) {
  for (var k in copy_src) {
    copy_dst[k] = copy_src[k];
  }
  return copy_dst;
};


/**
 *  Bind is the king of all functions. Go look at the heavy one, it has like
 *  ten pages of documentation.
 *
 *  @param  obj|null  Context object to bind as `this'.
 *  @param  function  Function to bind context and arguments to.
 *  @param  ...       Zero or more arguments to bind.
 *  @return function  Function with context and arguments bound.
 *
 *  @heavy  bind()
 *  @author epriestley
 */
JX.bind = function(context, func/*, arg, arg, ...*/) {

  if (__DEV__) {
    if (typeof func != 'function') {
      throw new Error('Attempting to bind something that is not a function.');
    }
  }

  var bound = JX.$A(arguments).slice(2);
  return function() {
    return func.apply(context || window, bound.concat(JX.$A(arguments)));
  }
};


/**
 *  This function is guaranteed not to do anything (the name is derived from
 *  "bag of holding").
 *
 *  @return void
 *
 *  @heavy  bagofholding()
 *  @author epriestley
 */
JX.bag = function() {
  // \o\ \o/ /o/ woo dance party
};


/**
 *  Convert an object's keys into an list.
 *
 *  @param  obj     Object to retrieve keys from.
 *  @return list    List of keys.
 *
 *  @heavy  keys()
 *  @author epriestley
 */
JX.keys = function(obj) {
  var r = [];
  for (var k in obj) {
    r.push(k);
  }
  return r;
};


/**
 *  Defer a function for later execution.
 *
 *  @heavy  Function.defer()
 *  @author epriestley
 */
JX.defer = function(fn, timeout) {
  return setTimeout(fn, timeout || 0);
};


/**
 *  Redirect the browser to another page by changing the window location.
 *
 *  @param  string    Optional URI to redirect the browser to. If no URI is
 *                    provided, the current page will be reloaded.
 *  @return void
 *
 *  @author epriestley
 */
JX.go = function(uri) {

  if (__DEV__) {
    if (JX.Stratcom) {
      clearTimeout(JX._redirectTimeout);
      JX._redirectTimeout = null;
      if (!JX._redirectInitialized) {
        JX.Stratcom.listen('keypress', null, function(e) {
          if (e.getSpecialKey() == 'esc' && !e.getPrevented()) {
            if (JX._redirectTimeout) {
              clearTimeout(JX._redirectTimeout);
              JX._redirectTimeout = null;
              JX.log('Redirect cancelled.');
            }
          }
        });
      }
      if (!arguments[1]) {
        var sec = 3;
        JX.log('Redirecting to "'+uri+'" in '+sec+' seconds, press escape to '+
                'cancel.');
        JX._redirectTimeout = setTimeout(
          JX.bind(JX, JX.go, uri, true),
          sec * 1000);
        return;
      }
    }
  }

  (uri && (window.location = uri)) || window.location.reload(true);
};


//  TODO: This is only used in JX.Flash and we should probably inline it.
JX.ua = {isTrident : !!(document.attachEvent)};

if (__DEV__) {
  if (!window.console || !window.console.log) {
    window.console = {log: function() {}};
  }
  JX.log = function(message) {
    window.console.log(message);
  }
}
/**
 *  @requires javelin-util
 *  @provides javelin-install
 */

/**
 *  Install a class or function into the Javelin ("JX") namespace. The first
 *  argument is the name of whatever you want to install, and the second is a
 *  map of these attributes (all of which are optional):
 *
 *    construct (function)
 *      Class constructor. If you don't provide one, one will be created for
 *      you (but it will be very boring). You can also install functions by
 *      just defining them here and then calling the installed function without
 *      the "new" operator.
 *
 *    members (map)
 *      A map of instance methods and properties.
 *
 *    extend (string)
 *      The name of another JX-namespaced class to extend.
 *
 *    statics (map)
 *      A map of static methods and properties.
 *
 *    initialize (function)
 *      A function to run once this class or function has been installed.
 *
 *    properties (map)
 *      A map of properties that should have instance getters and setters
 *      automatically generated for them. The key is the property name and the
 *      value is its default value. For instance, if you provide the property
 *      "size", the installed class will have the methods "getSize()" and
 *      "setSize()". It will **NOT** have a property ".size" and no guarantees
 *      are made about where install is actually chosing to store the data. The
 *      motivation here is to let you cheaply define a stable interface and
 *      refine it later as necessary.
 *
 *  @param  string  Name of the class or function to install. It will appear
 *                  in the JX "namespace" (e.g., JX.Pancake).
 *  @param  map     Map of properties, documented above.
 *  @return void
 *
 *  @author epriestley
 */
JX.install = function(new_name, new_junk) {

  if (typeof JX.install._nextObjectID == 'undefined') {
    JX.install._nextObjectID = 0;
  }

  //  If we've already installed this, ignore it.
  if (new_name in JX) {
    return;
  }

  //  Since we may end up loading things out of order (e.g., Dog extends Animal
  //  but we load Dog first) we need to keep a list of things that we've been
  //  asked to install but haven't yet been able to install around.
  var install_queue = [];
  install_queue.push([new_name, new_junk]);
  do {
    var junk;
    var name = null;
    for (var ii = 0; ii < install_queue.length; ++ii) {
      junk = install_queue[ii][1];
      if (junk.extend && !JX[junk.extend]) {
        //  We need to extend something that we haven't been able to install
        //  yet, so just keep this in queue.
        continue;
      }

      name = install_queue[ii][0];
      install_queue.splice(ii, 1);
      --ii;

      if (__DEV__) {
        var valid = {
          construct : 1,
          statics : 1,
          members : 1,
          extend : 1,
          initialize: 1,
          properties : 1,
          events : 1
        };
        for (var k in junk) {
          if (!(k in valid)) {
            throw new Error(
              'JX.install('+name+', ...): '+
              'trying to install unknown property `'+k+'`.');
          }
        }
        if (junk.constructor !== {}.constructor) {
          throw new Error(
            'JX.install('+name+', ...): '+
            'property `constructor` should be called `construct`.');
        }
      }

      //  BOOK OF __MAGIC__ SPELLS
      //
      //    instance.__id__
      //      Globally unique scalar attached to each instance.
      //
      //    prototype.__class__
      //      Reference to the constructor on each prototype.
      //
      //    constructor.__path__
      //      List of delegate tokens.
      //
      //    constructor.__readable__
      //      DEV ONLY! Readable class name.
      //
      //    constructor.__events__
      //      DEV ONLY! Map of valid event types.


      //  First, build the constructor. If construct is just a function, this
      //  won't change its behavior.
      JX[name] = function() {
        this.__id__ = '__obj__'+(++JX.install._nextObjectID);
        return (junk.construct || JX.bag).apply(this, arguments);
        //  TODO: Allow mixins to initialize here?
        //  TODO: Also, build mixins?
      };

      //  Copy in all the static methods and properties.
      JX.copy(JX[name], junk.statics);

      if (__DEV__) {
        JX[name].__readable__ = name;
      }

      var proto;
      if (junk.extend) {
        //  TODO: Flag this junk so it knows it's prototyping?
        proto = JX[name].prototype = new JX[junk.extend]();
      } else {
        proto = JX[name].prototype = {};
      }

      proto.__class__ = JX[name];

      //  Build getters and setters from the `prop' map.
      for (var k in (junk.properties || {})) {
        var base = k.charAt(0).toUpperCase()+k.substr(1);
        var prop = '_'+k;
        proto[prop] = junk.properties[k];
        proto['set'+base] = (function(prop) {
          return function(v) {
            this[prop] = v;
            return this;
          }
        })(prop);

        proto['get'+base] = (function(prop) {
          return function() {
            return this[prop];
          }
        })(prop);
      }


      //  This execution order intentionally allows you to override methods
      //  generated from the "properties" initializer.
      JX.copy(proto, junk.members);


      //  Build this ridiculous event model thing. Basically, this defines
      //  two instance methods, invoke() and listen(), and one static method,
      //  listen(). If you listen to an instance you get events for that
      //  instance; if you listen to a class you get events for all instances
      //  of that class (including instances of classes which extend it).
      //
      //  This is rigged up through Stratcom. Each class has a path component
      //  like "__class__Dog", and each object has a path component like
      //  "__obj__23". When you invoke on an object, it emits an event with
      //  a path that includes its class, all parent classes, and its object
      //  ID.
      //
      //  Calling listen() on an instance listens for just the object ID.
      //  Calling listen() on a class listens for that class's name. This
      //  has the effect of working properly, but installing them is pretty
      //  messy.
      if (junk.events && junk.events.length) {

        var parent = JX[junk.extend] || {};

        //  If we're in dev, we build up a list of valid events (for this
        //  class or some parent class) and then check them whenever we try
        //  to listen or invoke.
        if (__DEV__) {
          var valid_events = parent.__events__ || {};
          for (var ii = 0; ii < junk.events.length; ++ii) {
            valid_events[junk.events[ii]] = true;
          }
          JX[name].__events__ = valid_events;
        }

        //  Build the class name chain.
        JX[name].__name__ = '__class__'+name;
        var ancestry = parent.__path__ || [];
        JX[name].__path__ = ancestry.concat([JX[name].__name__]);

        proto.invoke = function(type) {
          if (__DEV__) {
            if (!(type in this.__class__.__events__)) {
              throw new Error(
                name+'.invoke('+type+', ...): '+
                'invalid event type. Valid event types are: '+
                JX.keys(this.__class__.__events__).join(', ')+'.');
            }
          }
          return JX.Stratcom.invoke(
            'obj:'+type,
            {args : JX.$A(arguments).slice(1)},
            this.__class__.__path__.concat([this.__id__]));
        }

        proto.listen = function(type, callback) {
          if (__DEV__) {
            if (!(type in this.__class__.__events__)) {
              throw new Error(
                this.__class__.__readable__+'.listen('+type+', ...): '+
                'invalid event type. Valid event types are: '+
                JX.keys(this.__class__.__events__).join(', ')+'.');
            }
          }
          return JX.Stratcom.listen(
            'obj:'+type,
            this.__id__,
            JX.bind(this, function(e) {
              return callback.apply(this, e.getData().args);
            }));
        }

        JX[name].listen = function(type, callback) {
          if (__DEV__) {
            if (!(type in this.__events__)) {
              throw new Error(
                this.__readable__+'.listen('+type+', ...): '+
                'invalid event type. Valid event types are: '+
                JX.keys(this.__events__).join(', ')+'.');
            }
          }
          return JX.Stratcom.listen(
            'obj:'+type,
            this.__name__,
            JX.bind(this, function(e) {
              return callback.apply(this, e.getData().args);
            }));
        }
      }

      //  Finally, run the init function if it was provided.
      (junk.initialize || JX.bag)();
    }

    //  In effect, this exits the loop as soon as we didn't make any progress
    //  installing things, which means we've installed everything we have the
    //  dependencies for.
  } while (name);
}
/**
 *  @requires javelin-install
 *  @provides javelin-event
 */

/**
 *  A generic event, routable by :JX.Stratcom. All events within Javelin are
 *  represented by an :JX.Event, regardless of whether they originate from
 *  a native DOM event or are raw invoked events.
 *
 *  Events have a propagation model similar to native Javascript events, in that
 *  they can be stopped (which stops them from continuing to propagate to
 *  other handlers) or prevented (which prevents them from taking their default
 *  action, e.g. following a link). You can do both at once kill().
 *
 *  @author epriestley
 */
JX.install('Event', {
  members : {


    /**
     *  Stop an event from continuing to propagate. No other handler will
     *  receive this event. See ""Using Events"".
     *
     *  @return this
     *  @author epriestley
     */
    stop : function() {
      var r = this.getRawEvent();
      if (r) {
        r.cancelBubble = true;
        r.stopPropagation && r.stopPropagation();
      }
      this.setStopped(true);
      return this;
    },


    /**
     *  Prevent an event's default action.
     *
     *  @return this
     *  @author epriestley
     */
    prevent : function() {
      var r = this.getRawEvent();
      if (r) {
        r.returnValue = false;
        r.preventDefault && r.preventDefault();
      }
      this.setPrevented(true);
      return this;
    },


    /**
     *  Stop and prevent an event.
     *
     *  @return this
     *  @author epriestley
     */
    kill : function() {
      this.prevent();
      this.stop();
      return this;
    },


    /**
     *  Get the special (i.e., noncharacter) key, if any, associated with this
     *  event.
     */
    getSpecialKey : function() {
      var r = this.getRawEvent();
      if (!r || r.shiftKey) {
        return null;
      }

      var c = r.keyCode;
      do {
        c = JX.Event._keymap[c] || null;
      } while (c && JX.Event._keymap[c])

      return c;
    }
  },

  statics : {
    _keymap : {
      8     : 'delete',
      9     : 'tab',
      13    : 'return',
      27    : 'esc',
      37    : 'left',
      38    : 'up',
      39    : 'right',
      40    : 'down',
      63232 : 38,
      63233 : 40,
      62234 : 37,
      62235 : 39
    }
  },

  properties : {

    /**
     *  Native Javascript event which generated this JX.Event. Not every
     *  event is generated by a native event, so there may be no value in
     *  this field.
     */
    rawEvent : null,

    /**
     *  String describing the event type, like "click" or "mousedown". This
     *  may also be an application or object event.
     */
    type : null,

    /**
     *  If available, the DOM node where this event occurred. For example, if
     *  this event is a click on a button, the target will be the button which
     *  was clicked.
     */
    target : null,

    /**
     *  Map of event information. For application or object events, this is
     *  defined at invocation.
     *
     *  For native events, the DOM is walked from the event target to the root
     *  element. Each sigil which is encountered while walking up the tree is
     *  added to the map as a key. If the node has associated metainformation,
     *  it is set as the value; otherwise, the value is null.
     */
    data : null,

    /**
     *  Sigil path this event was activated from. TODO: explain this
     */
    path : [],

    /**
     *  True if propagation of the event has been stopped. See stop().
     */
    stopped : false,

    /**
     *  True if default behavior of the event has been prevented. See prevent().
     */
    prevented : false,

    nodes : {}
  },

  initialize : function() {
    if (__DEV__) {
      JX.Event.prototype.toString = function() {
        var path = '['+this.getPath().join(', ')+']';
        return 'Event<'+this.getType()+', '+path+', '+this.getTarget()+'>';
      }
    }
  }
});





/**
 *  @requires javelin-install javelin-event
 *  @provides javelin-stratcom
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
     *  object. This is largely analagous to an Arbiter event.
     *
     *  @param  string  Event type.
     *  @param  object  Optionally, arbitrary data to send with the event.
     *  @param  array   Optionally, a path to attach to the event. This is
     *                  rarely meaingful for simple events.
     *  @return void
     *
     *  @author epriestley
     */
    invoke : function(type, data, path) {
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
        if (arguments.length != 3) {
          throw new Error('listen() expects exactly 3 arguments.');
        }
        if (typeof func != 'function') {
          throw new Error('listen() callback is not a function.');
        }
      }

      var ids = [];

      types = JX.$AX(types);

      if (!paths) {
        paths = this._auto;
      }
      if (!(paths instanceof Array)) {
        paths = [[paths]];
      }
      if (!(paths[0] instanceof Array)) {
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
      } catch (x) {
        var target = null;
      }

      var path = [];
      var nodes = [];
      var data = {};
      var cursor = target;
      while (cursor) {
        var data_source = cursor.className || '';
        var token;
        if (token = (data_source.match(this._matchName) || [])[1]) {
          data[token] = (data_source.match(this._matchData) || [])[1];
          if (data[token]) {
            data[token] = this._data[data[token]];
          }
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

//      JX.log('~> '+proxy);

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
          if (!handler) {
            continue;
          }
          exec.push(handler);
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
      if (!this._execContext.length) {
        return null;
      }
      return this._execContext[this._execContext.length - 1].event;
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
     *  Attach a sigil to a node.
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
    }

  }
});

