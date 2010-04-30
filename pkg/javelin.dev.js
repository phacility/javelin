/**
 * Javelin utility functions.
 *
 * @provides javelin-util
 *
 * @javelin-installs JX.$A
 * @javelin-installs JX.$AX
 * @javelin-installs JX.copy
 * @javelin-installs JX.bind
 * @javelin-installs JX.bag
 * @javelin-installs JX.keys
 * @javelin-installs JX.defer
 * @javelin-installs JX.occur
 * @javelin-installs JX.go
 * @javelin-installs JX.log
 *
 * @javelin
 */


/**
 *  Convert an array-like object (e.g., arguments) into an array. This avoids
 *  the Array.slice() trick because some bizarre COM object I dug up somewhere
 *  was freaking out when I tried to do it and it made me sad.
 *
 *  @param  obj     Array or array-like object.
 *  @return array   Actual array.
 *
 *  @heavy  $A
 *  @author epriestley
 */
JX.$A = function(mysterious_object) {
  var r = [];
  for (var ii = 0; ii < mysterious_object.length; ii++) {
    r.push(mysterious_object[ii]);
  }
  return r;
};


/**
 *  Cast a value into an array, by wrapping scalars into singletons. The "X"
 *  might stand for anything!
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
 *  toString property or anything else which isn't enumerable or is somehow
 *  magic or just doesn't work. But it's usually what you want.
 *
 *  @param  obj Destination object, which properties should be copied to.
 *  @param  obj Source object, which properties should be copied from.
 *  @return obj Destination object.
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
 *  ten pages of documentation. Of course, If you're looking at the open source
 *  version of Javelin, this is small comfort.
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
 *  "bag of holding"). Primarily, it's used as a placeholder when you want
 *  something to be callable but don't want it to actually do anything.
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
  var t = setTimeout(fn, timeout || 0);
  return {stop : function() { clearTimeout(t); }}
};


/**
 *  Cause execution of a function to occur.
 *
 *  @heavy  Function.occur()
 *  @author epriestley
 */
JX.occur = function(fn) {
  return fn.apply(window);
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
  (uri && (window.location = uri)) || window.location.reload(true);
};


if (__DEV__) {
  if (!window.console || !window.console.log) {
    if (window.opera && window.opera.postError) {
      window.console = {log: function(m) { window.opera.postError(m); }};
    } else {
      window.console = {log: function(m) { }};
    }
  }
  JX.log = function(message) {
    window.console.log(message);
  }

  window.alert = (function(native_alert) {
    var recent_alerts = [];
    var in_alert = false;
    return function(msg) {
      if (in_alert) {
        JX.log(
          'alert(...): '+
          'discarded reentrant alert.');
        return;
      }
      in_alert = true;
      recent_alerts.push(new Date().getTime());

      if (recent_alerts.length > 3) {
        recent_alerts.splice(0, recent_alerts.length - 3);
      }

      if (recent_alerts.length >= 3 &&
          (recent_alerts[recent_alerts.length - 1] - recent_alerts[0]) < 5000) {
        if (confirm(msg + "\n\nLots of alert()s recently. Kill them?")) {
          window.alert = JX.bag;
        }
      } else {
        //  Note that we can't .apply() the IE6 version of this "function"
        native_alert(msg);
      }
      in_alert = false;
    }
  })(window.alert);

}
/**
 * @requires javelin-util
 * @provides javelin-install
 * @javelin-installs JX.install
 * @javelin
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
 *      The name of another JX-namespaced class to extend via prototypal
 *      inheritance.
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

  //  If we've already installed this, something is up.
  if (new_name in JX) {
    if (__DEV__) {
      throw new Error(
        'JX.install("'+new_name+'", ...): '+
        'trying to reinstall something that has already been installed.');
    }
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

      //  Install time! First, get this out of the queue.
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
              'JX.install("'+name+'", {"'+k+'": ...}): '+
              'trying to install unknown property `'+k+'`.');
          }
        }
        if (junk.constructor !== {}.constructor) {
          throw new Error(
            'JX.install("'+name+'", {"constructor": ...}): '+
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
      //      List of delegate tokens. (This is a list of Stratcom names for
      //      the class and all of its parents.)
      //
      //    constructor.__readable__
      //      DEV ONLY! Readable class name.
      //
      //    constructor.__events__
      //      DEV ONLY! Map of valid event types.


      //  First, build the constructor. If construct is just a function, this
      //  won't change its behavior (unless you have provided a really awesome
      //  function, in which case it will correctly punish you for your attempt
      //  at creativity).
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
        var prop = '__auto__'+k;
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
      //  like "class:Dog", and each object has a path component like
      //  "obj:23". When you invoke on an object, it emits an event with
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
        JX[name].__name__ = 'class:'+name;
        var ancestry = parent.__path__ || [];
        JX[name].__path__ = ancestry.concat([JX[name].__name__]);

        proto.invoke = function(type) {
          if (__DEV__) {
            if (!(type in this.__class__.__events__)) {
              throw new Error(
                name+'.invoke("'+type+'", ...): '+
                'invalid event type. Valid event types are: '+
                JX.keys(this.__class__.__events__).join(', ')+'.');
            }
          }
          // Here and below, this nonstandard access notation is used to mask
          // these callsites from the static analyzer. JX.Stratcom is always
          // available by the time we hit these execution points.
          return JX['Stratcom'].invoke(
            'obj:'+type,
            this.__class__.__path__.concat([this.__id__]),
            {args : JX.$A(arguments).slice(1)});
        };

        proto.listen = function(type, callback) {
          if (__DEV__) {
            if (!(type in this.__class__.__events__)) {
              throw new Error(
                this.__class__.__readable__+'.listen("'+type+'", ...): '+
                'invalid event type. Valid event types are: '+
                JX.keys(this.__class__.__events__).join(', ')+'.');
            }
          }
          return JX['Stratcom'].listen(
            'obj:'+type,
            this.__id__,
            JX.bind(this, function(e) {
              return callback.apply(this, e.getData().args);
            }));
        };

        JX[name].listen = function(type, callback) {
          if (__DEV__) {
            if (!(type in this.__events__)) {
              throw new Error(
                this.__readable__+'.listen("'+type+'", ...): '+
                'invalid event type. Valid event types are: '+
                JX.keys(this.__events__).join(', ')+'.');
            }
          }
          return JX['Stratcom'].listen(
            'obj:'+type,
            this.__name__,
            JX.bind(this, function(e) {
              return callback.apply(this, e.getData().args);
            }));
        };
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
 *   @javelin
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
        var target = null;
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
/**
 * @provides javelin-behavior
 *
 * @javelin-installs JX.behavior
 * @javelin-installs JX.initBehaviors
 *
 * @javelin
 */

(function(JX) {

  var behaviors = {};
  var initialized = {};

  JX.behavior = function(name, control_function) {
    if (__DEV__) {
      if (name in behaviors) {
        throw new Error(
          'JX.behavior("'+name+'", ...): '+
          'behavior is already registered.');
      }
      if (!control_function) {
        throw new Error(
          'JX.behavior("'+name+'", <nothing>): '+
          'initialization function is required.');
      }
      if (typeof control_function != 'function') {
        throw new Error(
          'JX.behavior("'+name+'", <garbage>): '+
          'initialization function is not a function.');
      }
    }
    behaviors[name] = control_function;
  };

  JX.initBehaviors = function(map) {
    for (var name in map) {
      if (__DEV__) {
        if (!(name in behaviors)) {
          throw new Error(
            'JX.initBehavior("'+name+'", ...): '+
            'behavior is not registered.');
        }
      }
      var configs = map[name];
      if (!configs.length) {
        if (name in initialized) {
          continue;
        } else {
          configs = [null];
        }
      }
      for (var ii = 0; ii < configs.length; ii++) {
        behaviors[name](configs[ii]);
      }
      initialized[name] = true;
    }
  };

})(JX);
/**
 *  Make lightweight, AsyncResponse-compatible requests.
 *
 *  @requires javelin-install javelin-stratcom javelin-behavior javelin-util
 *  @provides javelin-request
 *  @javelin
 */

JX.install('Request', {
  construct : function(uri, handler) {
    this.setURI(uri);
    if (handler) {
      this.listen('done', handler);
    }
  },

  events : ['done', 'error', 'finally'],

  members : {

    _xhrkey : null,
    _transport : null,
    _aborted : false,

    send : function() {
      var xport = null;

      try {
        try {
          xport = new XMLHttpRequest();
        } catch (x) {
          xport = new ActiveXObject("Msxml2.XMLHTTP");
        }
      } catch (x) {
        xport = new ActiveXObject("Microsoft.XMLHTTP");
      }

      this._transport = xport;
      this._xhrkey = JX.Request._xhr.length;
      JX.Request._xhr.push(this);

      xport.onreadystatechange = JX.bind(this, this._onreadystatechange);

      var q = [];
      var data = this.getData() || {};
      data.__async__ = true;
      for (var k in data) {
        q.push(encodeURIComponent(k)+'='+encodeURIComponent(data[k]));
      }
      q = q.join('&');

      var uri = this.getURI();

      if (this.getMethod() == 'GET') {
        uri += ((uri.indexOf('?') === -1) ? '?' : '&') + q;
      }

      xport.open(this.getMethod(), uri, true);

      if (this.getMethod() == 'POST') {
        xport.setRequestHeader(
          'Content-Type',
          'application/x-www-form-urlencoded');
        xport.send(q);
      } else {
        xport.send(null);
      }
    },

    abort : function() {
      this._aborted = true;
      this._transport.abort();
      delete JX.Request._xhr[this._xhrkey];
    },

    _onreadystatechange : function() {
      var xport = this._transport;
      try {
        if (this._aborted) {
          return;
        }
        if (xport.readyState != 4) {
          return;
        }
        if (xport.status < 200 && xport.status >= 300) {
          this._fail();
          return;
        }

        if (__DEV__) {
          if (!xport.responseText.length) {
            throw new Error(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an empty response.');
          }
          if (xport.responseText.indexOf('for (;;);') != 0) {
            throw new Error(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an invalid response.');
          }
        }

        var text = xport.responseText.substring('for (;;);'.length);
        var response = eval('('+text+')');
      } catch (exception) {

        if (__DEV__) {
          JX.log(
            'JX.Request("'+this.getURI()+'", ...): '+
            'caught exception processing response: '+exception);
        }
        this._fail();
        return;
      }

      try {
        if (response.error) {
          this._fail(response.error);
        } else {
          JX.Stratcom.mergeData(response.javelin_metadata || {});
          this._done(response);
          JX.initBehaviors(response.javelin_behaviors || {});
        }
      } catch (exception) {
        //  In Firefox+Firebug, at least, something eats these. :/
        JX.defer(function() {
          throw exception;
        });
      }
    },

    _fail : function(error) {
      this.invoke('error', error);
      delete JX.Request._xhr[this._xhrkey];
      this.invoke('finally');
    },

    _done : function(response) {
      if (response.onload) {
        for (var ii = 0; ii < response.onload.length; ii++) {
          (new Function(response.onload[ii]))();
        }
      }

      this.invoke('done', this.getRaw() ? response : response.payload);
      delete JX.Request._xhr[this._xhrkey];
      this.invoke('finally');
    }

  },

  statics : {
    _xhr : [],
    shutdown : function() {
      for (var ii = 0; ii < JX.Request._xhr.length; ii++) {
        try {
          JX.Request._xhr[ii] && JX.Request._xhr[ii].abort();
        } catch (x) {
          // Ignore.
        }
      }
      JX.Request._xhr = [];
    }
  },

  properties : {
    URI : null,
    data : null,
    method : 'POST',
    raw : false
  },

  initialize : function() {
    JX.Stratcom.listen('unload', 'tag:window', JX.Request.shutdown);
  }

});

/**
 * @requires javelin-install javelin-event
 * @provides javelin-vector
 * @javelin
 */

/**
 *  Query and update positions and dimensions within a document.
 *
 *  @heavy  Vector2
 *  @author epriestley
 */
JX.install('$V', {
  construct : function(x, y) {
    if (this == JX || this == window) {
      return new JX.$V(x, y);
    }
    if (typeof y == 'undefined') {
      return JX.$V.getPos(x);
    }

    this.x = parseFloat(x);
    this.y = parseFloat(y);

    if (__DEV__) {
      this.toString = function() {
        return '<'+this.x+', '+this.y+'>';
      }
    }
  },
  members : {
    x : null,
    y : null,
    setPos : function(n) {
      n.style.left    = (this.x === null) ? '' : (parseInt(this.x, 10) + 'px');
      n.style.top     = (this.y === null) ? '' : (parseInt(this.y, 10) + 'px');
      return this;
    },
    setDim : function(n) {
      n.style.width   = (this.x === null) ? '' : (parseInt(this.x, 10) + 'px');
      n.style.height  = (this.y === null) ? '' : (parseInt(this.y, 10) + 'px');
      return this;
    },
    add : function(x, y) {
      if (x instanceof JX.$V) {
        return this.add(x.x, x.y);
      }
      return JX.$V(this.x + parseFloat(x), this.y + parseFloat(y));
    }
  },
  statics : {
    _viewport: null,
    getPos : function(n) {

      JX.Event && (n instanceof JX.Event) && (n = n.getRawEvent());

      if (('pageX' in n) || ('clientX' in n)) {
        var c = JX.$V._viewport;
        return JX.$V(
          n.pageX || (n.clientX + c.scrollLeft),
          n.pageY || (n.clientY + c.scrollTop));
      }

      var x = n.offsetLeft;
      var y = n.offsetTop;
      while (n.offsetParent && (n.offsetParent != document.body)) {
        n = n.offsetParent;
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      return JX.$V(x, y);
    },
    getDim : function(n) {
      return JX.$V(n.offsetWidth, n.offsetHeight);
    },
    getScroll : function() {
      //  We can't use $V._viewport here because there's diversity between
      //  browsers with respect to where position/dimension and scroll position
      //  information is stored.
      var b = document.body;
      var e = document.documentElement;
      return JX.$V(b.scrollLeft || e.scrollLeft, b.scrollTop || e.scrollTop);
    },
    getViewport : function() {
      var c = JX.$V._viewport;
      var w = window;

      return JX.$V(
        w.innerWidth || c.clientWidth || 0,
        w.innerHeight || c.clientHeight || 0
      );
    },
    getDocument : function() {
      var c = JX.$V._viewport;
      return JX.$V(c.scrollWidth || 0, c.scrollHeight || 0);
    }
  },
  initialize : function() {
    var c = ((c = document) && (c = c.documentElement)) ||
            ((c = document) && (c = c.body))
    JX.$V._viewport = c;
  }
});
/**
 * @requires javelin-install javelin-util javelin-vector javelin-stratcom
 * @provides javelin-dom
 * @javelin
 */

JX.install('HTML', {
  construct : function(str) {
    if (this == JX || this == window) {
      return new JX.HTML(str);
    }

    if (__DEV__) {
      var tags = ['legend', 'thead', 'tbody', 'tfoot', 'column', 'colgroup',
                  'caption', 'tr', 'th', 'td', 'option'];

      var evil_stuff = new RegExp('^\\s*<('+tags.join('|')+')\\b', 'i');
      var match = null;
      if (match = str.match(evil_stuff)) {
        throw new Error(
          'JX.HTML("<'+match[1]+'>..."): '+
          'call initializes an HTML object with an invalid partial fragment '+
          'and can not be converted into DOM nodes. The enclosing tag of an '+
          'HTML content string must be appendable to a document fragment. '+
          'For example, <table> is allowed but <tr> or <tfoot> are not.');
      }

      var really_evil = /<script\b/;
      if (str.match(really_evil)) {
        throw new Error(
          'JX.HTML("...<script>..."): '+
          'call initializes an HTML object with an embedded script tag! '+
          'Are you crazy?! Do NOT do this!!!');
      }

      var wont_work = /<object\b/;
      if (str.match(wont_work)) {
        throw new Error(
          'JX.HTML("...<object>..."): '+
          'call initializes an HTML object with an embedded <object> tag. IE '+
          'will not do the right thing with this.');
      }

      //  TODO(epriestley): May need to deny <option> more broadly, see
      //  http://support.microsoft.com/kb/829907 and the whole mess in the
      //  heavy stack. But I seem to have gotten away without cloning into the
      //  documentFragment below, so this may be a nonissue.
    }

    this._content = str;
  },
  members : {
    _content : null,
    getFragment : function() {
      var wrapper = JX.$N('div');
      wrapper.innerHTML = this._content;
      var fragment = document.createDocumentFragment();
      while (wrapper.firstChild) {
        //  TODO(epriestley): Do we need to do a bunch of cloning junk here?
        //  See heavy stack. I'm disconnecting the nodes instead; this seems
        //  to work but maybe my test case just isn't extensive enough.
        fragment.appendChild(wrapper.removeChild(wrapper.firstChild));
      }
      return fragment;
    }
  }
});

JX.install('$', {
  construct : function(id) {

    if (__DEV__) {
      if (!id) {
        throw new Error('Empty ID passed to JX.$()!');
      }
    }

    var node = document.getElementById(id);
    if (!node || (node.id != id)) {
      if (__DEV__) {
        if (node && (node.id != id)) {
          throw new Error(
            'JX.$("'+id+'"): '+
            'document.getElementById() returned an element without the '+
            'correct ID. This usually means that the element you are trying '+
            'to select is being masked by a form with the same value in its '+
            '"name" attribute.');
        }
      }
      throw JX.$.NotFound;
    }

    return node;
  },
  statics : {
    NotFound : {}
  },
  initialize : function() {
    if (__DEV__) {
      //  If we're in dev, upgrade this object into an Error so that it will
      //  print something useful if it escapes the stack after being thrown.
      JX.$.NotFound = new Error(
        'JX.$() or JX.DOM.find() call matched no nodes.');
    }
  }
});

JX.install('$N', {
  construct : function(tag, attr, content) {
    if (typeof content == 'undefined' &&
        (typeof attr != 'object' || attr instanceof JX.HTML)) {
      content = attr;
      attr = {};
    }

    var node = document.createElement(tag);

    if (attr.style) {
      JX.copy(node.style, attr.style);
      delete attr.style;
    }

    if (attr.sigil) {
      JX.Stratcom.sigilize(node, attr.sigil, attr.meta);
      delete attr.sigil;
      delete attr.meta;
    }

    if (__DEV__) {
      if (attr.meta) {
        throw new Error(
          '$N('+tag+', ...): '+
          'if you specify `meta` metadata, you must also specify a `sigil`.');
      }
    }

    JX.copy(node, attr);
    if (content) {
      JX.DOM.setContent(node, content);
    }

    return node;
  }
});

JX.install('DOM', {
  statics : {
    _autoid : 0,
    _metrics : {},
    _bound : {},
    setContent : function(node, content) {
      if (__DEV__) {
        if (!JX.DOM.isNode(node)) {
          throw new Error(
            'JX.DOM.setContent(<yuck>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      while (node.firstChild) {
        JX.DOM.remove(node.firstChild);
      }
      JX.DOM.appendContent(node, content);
    },
    prependContent : function(node, content) {
      if (__DEV__) {
        if (!JX.DOM.isNode(node)) {
          throw new Error(
            'JX.DOM.prependContent(<junk>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      this._insertContent(node, content, this._mechanismPrepend);
    },
    appendContent : function(node, content) {
      if (__DEV__) {
        if (!JX.DOM.isNode(node)) {
          throw new Error(
            'JX.DOM.appendContent(<bleh>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      this._insertContent(node, content, this._mechanismAppend);
    },
    _mechanismPrepend : function(node, content) {
      node.insertBefore(content, node.firstChild);
    },
    _mechanismAppend : function(node, content) {
      node.appendChild(content);
    },
    _insertContent : function(parent, content, mechanism) {
      if (content === null || typeof content == 'undefined') {
        return;
      }
      if (content instanceof JX.HTML) {
        content = content.getFragment();
      }
      if (content instanceof Array) {
        for (var ii = 0; ii < content.length; ii++) {
          var child = (typeof content[ii] == 'string')
            ? document.createTextNode(content[ii])
            : content[ii];
          mechanism(parent, child);
        }
      } else if (content.nodeType) {
        mechanism(parent, content);
      } else {
        mechanism(parent, document.createTextNode(content));
      }
    },

    remove : function(node) {
      node.parentNode && JX.DOM.replace(node, null);
      return node;
    },

    replace : function(node, replacement) {
      if (__DEV__) {
        if (!node.parentNode) {
          throw new Error(
            'JX.DOM.replace(<node>, ...): '+
            'node has no parent node, so it can not be replaced.');
        }
      }

      var mechanism;
      if (node.nextSibling) {
        mechanism = JX.bind(node.nextSibling, function(parent, content) {
          parent.insertBefore(content, this);
        });
      } else {
        mechanism = this._mechanismAppend;
      }
      var parent = node.parentNode;
      node.parentNode.removeChild(node);
      this._insertContent(parent, replacement, mechanism);

      return node;
    },

    serialize : function(form) {
      var elements = form.getElementsByTagName('*');
      var data = {};
      for (var ii = 0; ii < elements.length; ++ii) {
        if (!elements[ii].name) {
          continue;
        }
        var type = elements[ii].type;
        var tag  = elements[ii].tagName;
        if ((type in {radio: 1, checkbox: 1} && elements[ii].checked) ||
             type in {text: 1, hidden: 1, password: 1} ||
              tag in {TEXTAREA: 1, SELECT: 1}) {
          data[elements[ii].name] = elements[ii].value;
        }
      }
      return data;
    },

    isNode : function(node) {
      return !!(node && node.nodeName && (node !== window));
    },
    isType : function(node, of_type) {
      node = (''+node.nodeName || '').toUpperCase();
      of_type = JX.$AX(of_type);
      for (var ii = 0; ii < of_type.length; ++ii) {
        if (of_type[ii].toUpperCase() == node) {
          return true;
        }
      }
      return false;
    },
    listen : function(node, type, path, callback) {
      return JX.Stratcom.listen(
        type,
        ['id:'+JX.DOM.uniqID(node)].concat(JX.$AX(path || [])),
        callback);
    },
    uniqID : function(node) {
      if (!node.id) {
        node.id = 'autoid_'+(++JX.DOM._autoid);
      }
      return node.id;
    },
    alterClass : function(node, className, add) {
      var has = ((' '+node.className+' ').indexOf(' '+className+' ') > -1);
      if (add && !has) {
        node.className += ' '+className;
      } else if (has && !add) {
        node.className = node.className.replace(
          new RegExp('(^|\\s)' + className + '(?:\\s|$)', 'g'), ' ');
      }
    },
    htmlize : function(str) {
      return (''+str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },
    show : function() {
      if (__DEV__) {
        for (var ii = 0; ii < arguments.length; ++ii) {
          if (!arguments[ii]) {
            throw new Error('Null element passed to JX.DOM.show()');
          }
        }
      }

      for (var ii = 0; ii < arguments.length; ++ii) {
        arguments[ii].style.display = '';
      }
    },
    hide : function() {
      if (__DEV__) {
        for (var ii = 0; ii < arguments.length; ++ii) {
          if (!arguments[ii]) {
            throw new Error('Null element passed to JX.DOM.hide()');
          }
        }
      }

      for (var ii = 0; ii < arguments.length; ++ii) {
        arguments[ii].style.display = 'none';
      }
    },

    textMetrics : function(node, pseudoclass, x) {
      if (!this._metrics[pseudoclass]) {
        var n = JX.$N(
          'var',
          {className: pseudoclass});
        this._metrics[pseudoclass] = n;
      }
      var proxy = this._metrics[pseudoclass];
      document.body.appendChild(proxy);
        proxy.style.width = x ? (x+'px') : '';
        JX.DOM.setContent(
          proxy,
          JX.HTML(JX.DOM.htmlize(node.value).replace(/\n/g, '<br />')));
        var metrics = JX.$V.getDim(proxy);
      document.body.removeChild(proxy);
      return metrics;
    },


    /**
     *  Search the document for DOM nodes by providing a root node to look
     *  beneath, a tag name, and (optionally) a sigil. Nodes which match all
     *  specified conditions are returned.
     *
     *  @param  Node    Root node to search beneath.
     *  @param  string  Tag name, like 'a' or 'textarea'.
     *  @param  string  Optionally, a sigil which nodes are required to have.
     *
     *  @return list    List of matching nodes, which may be empty.
     *
     *  @heavy  DOM.scry
     *  @author epriestley
     */
    scry : function(root, tagname, sigil) {
      if (__DEV__) {
        if (!JX.DOM.isNode(root)) {
          throw new Error(
            'JX.DOM.scry(<yuck>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      var nodes = root.getElementsByTagName(tagname);
      if (!sigil) {
        return JX.$A(nodes);
      }
      var result = [];
      for (var ii = 0; ii < nodes.length; ii++) {
        if (JX.Stratcom.hasSigil(nodes[ii], sigil)) {
          result.push(nodes[ii]);
        }
      }
      return result;
    },


    /**
     *  Select a node uniquely identified by a root, tagname and sigil. This
     *  is similar to JX.DOM.scry() but expects exactly one result. It will
     *  throw JX.$.NotFound if it matches no results.
     *
     *  @param  Node    Root node to search beneath.
     *  @param  string  Tag name, like 'a' or 'textarea'.
     *  @param  string  Optionally, sigil which selected node must have.
     *
     *  @return Node    Node uniquely identified by the criteria.
     *
     *  @heavy  DOM.find
     *  @author epriestley
     */
    find : function(root, tagname, sigil) {
      if (__DEV__) {
        if (!JX.DOM.isNode(root)) {
          throw new Error(
            'JX.DOM.find(<glop>, "'+tagname+'", "'+sigil+'"): '+
            'first argument must be a DOM node.');
        }
      }

      var result = JX.DOM.scry(root, tagname, sigil);

      if (__DEV__) {
        if (result.length > 1) {
          throw new Error(
            'JX.DOM.find(<node>, "'+tagname+'", "'+sigil+'"): '+
            'matched more than one node.');
        }
      }

      if (!result.length) {
        throw JX.$.NotFound;
      }

      return result[0];
    },

    bindController : function(node, name, construct) {
      var id = JX.DOM.uniqID(node);
      var map = (this._bound[name] = (this._bound[name] || {}));
      return (map[id] = (map[id] || (construct())));
    },

    focus : function(node) {
      try { node.focus(); } catch (lol_ie) {}
    }

  }
});

/**
 *  Simple JSON serializer.
 *
 *  @requires javelin-install javelin-util
 *  @provides javelin-json
 *  @javelin
 */

JX.install('JSON', {
  statics : {
    serialize : function(obj) {
      if (__DEV__) {
        try {
          return JX.JSON._val(obj);
        } catch (x) {
          JX.log(
            'JX.JSON.serialize(...): '+
            'caught exception while serializing object.');
        }
      } else {
        return JX.JSON._val(obj);
      }
    },
    _val : function(val) {
      var out = [];
      if (val.push && val.pop) {
        for (var ii = 0; ii < val.length; ii++) {
          out.push(JX.JSON._val(val[ii]));
        }
        return '['+out.join(',')+']';
      } else if (val === null) {
        return 'null';
      } else if (val === true) {
        return 'true';
      } else if (val === false) {
        return 'false';
      } else if (typeof val == 'string') {
        return JX.JSON._esc(val);
      } else if (typeof val == 'number') {
        return val;
      } else {
        for (var k in val) {
          out.push(JX.JSON._esc(k)+':'+JX.JSON._val(val[k]));
        }
        return '{'+out.join(',')+'}';
      }
    },
    _esc : function(str) {
      return '"'+str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')+'"';
    }
  }
});
