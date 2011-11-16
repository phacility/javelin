/**
 * Javelin utility functions.
 *
 * @provides javelin-util
 *
 * @javelin-installs JX.$E
 * @javelin-installs JX.$A
 * @javelin-installs JX.$AX
 * @javelin-installs JX.isArray
 * @javelin-installs JX.copy
 * @javelin-installs JX.bind
 * @javelin-installs JX.bag
 * @javelin-installs JX.keys
 * @javelin-installs JX.log
 * @javelin-installs JX.id
 * @javelin-installs JX.now
 *
 * @javelin
 */

/**
 * Throw an exception and attach the caller data in the exception.
 *
 * @param  string  Exception message.
 *
 * @group util
 */
JX.$E = function(message) {
  var e = new Error(message);
  var caller_fn = JX.$E.caller;
  if (caller_fn) {
    e.caller_fn = caller_fn.caller;
  }
  throw e;
};


/**
 * Convert an array-like object (usually ##arguments##) into a real Array. An
 * "array-like object" is something with a ##length## property and numerical
 * keys. The most common use for this is to let you call Array functions on the
 * magical ##arguments## object.
 *
 *   JX.$A(arguments).slice(1);
 *
 * @param  obj     Array, or array-like object.
 * @return Array   Actual array.
 *
 * @group util
 */
JX.$A = function(mysterious_arraylike_object) {
  // NOTE: This avoids the Array.slice() trick because some bizarre COM object
  // I dug up somewhere was freaking out when I tried to do it and it made me
  // very upset, so do not replace this with Array.slice() cleverness.
  var r = [];
  for (var ii = 0; ii < mysterious_arraylike_object.length; ii++) {
    r.push(mysterious_arraylike_object[ii]);
  }
  return r;
};


/**
 * Cast a value into an array, by wrapping scalars into singletons. If the
 * argument is an array, it is returned unmodified. If it is a scalar, an array
 * with a single element is returned. For example:
 *
 *   JX.$AX([3]); // Returns [3].
 *   JX.$AX(3);   // Returns [3].
 *
 * Note that this function uses a @{function:JX.isArray} check whether or not
 * the argument is an array, so you may need to convert array-like objects (such
 * as ##arguments##) into real arrays with @{function:JX.$A}.
 *
 * This function is mostly useful to create methods which accept either a
 * value or a list of values.
 *
 * @param  wild    Scalar or Array.
 * @return Array   If the argument was a scalar, an Array with the argument as
 *                 its only element. Otherwise, the original Array.
 *
 * @group util
 */
JX.$AX = function(maybe_scalar) {
  return JX.isArray(maybe_scalar) ? maybe_scalar : [maybe_scalar];
};


/**
 * Checks whether a value is an array.
 *
 *   JX.isArray(['an', 'array']); // Returns true.
 *   JX.isArray('Not an Array');  // Returns false.
 *
 * @param  wild     Any value.
 * @return bool     true if the argument is an array, false otherwise.
 *
 * @group util
 */
JX.isArray = Array.isArray || function(maybe_array) {
  return Object.prototype.toString.call(maybe_array) == '[object Array]';
};


/**
 * Copy properties from one object to another. If properties already exist, they
 * are overwritten.
 *
 *   var cat  = {
 *     ears: 'clean',
 *     paws: 'clean',
 *     nose: 'DIRTY OH NOES'
 *   };
 *   var more = {
 *     nose: 'clean',
 *     tail: 'clean'
 *   };
 *
 *   JX.copy(cat, more);
 *
 *   // cat is now:
 *   //  {
 *   //    ears: 'clean',
 *   //    paws: 'clean',
 *   //    nose: 'clean',
 *   //    tail: 'clean'
 *   //  }
 *
 * NOTE: This function does not copy the ##toString## property or anything else
 * which isn't enumerable or is somehow magic or just doesn't work. But it's
 * usually what you want.
 *
 * @param  obj Destination object, which properties should be copied to.
 * @param  obj Source object, which properties should be copied from.
 * @return obj Modified destination object.
 *
 * @group util
 */
JX.copy = function(copy_dst, copy_src) {
  for (var k in copy_src) {
    copy_dst[k] = copy_src[k];
  }
  return copy_dst;
};


/**
 * Create a function which invokes another function with a bound context and
 * arguments (i.e., partial function application) when called; king of all
 * functions.
 *
 * Bind performs context binding (letting you select what the value of ##this##
 * will be when a function is invoked) and partial function application (letting
 * you create some function which calls another one with bound arguments).
 *
 * = Context Binding =
 *
 * Normally, when you call ##obj.method()##, the magic ##this## object will be
 * the ##obj## you invoked the method from. This can be undesirable when you
 * need to pass a callback to another function. For instance:
 *
 *   COUNTEREXAMPLE
 *   var dog = new JX.Dog();
 *   dog.barkNow(); // Makes the dog bark.
 *
 *   JX.Stratcom.listen('click', 'bark', dog.barkNow); // Does not work!
 *
 * This doesn't work because ##this## is ##window## when the function is
 * later invoked; @{method:JX.Stratcom.listen} does not know about the context
 * object ##dog##. The solution is to pass a function with a bound context
 * object:
 *
 *   var dog = new JX.Dog();
 *   var bound_function = JX.bind(dog, dog.barkNow);
 *
 *   JX.Stratcom.listen('click', 'bark', bound_function);
 *
 * ##bound_function## is a function with ##dog## bound as ##this##; ##this##
 * will always be ##dog## when the function is called, no matter what
 * property chain it is invoked from.
 *
 * You can also pass ##null## as the context argument to implicitly bind
 * ##window##.
 *
 * = Partial Function Application =
 *
 * @{function:JX.bind} also performs partial function application, which allows
 * you to bind one or more arguments to a function. For instance, if we have a
 * simple function which adds two numbers:
 *
 *   function add(a, b) { return a + b; }
 *   add(3, 4); // 7
 *
 * Suppose we want a new function, like this:
 *
 *   function add3(b) { return 3 + b; }
 *   add3(4); // 7
 *
 * Instead of doing this, we can define ##add3()## in terms of ##add()## by
 * binding the value ##3## to the ##a## argument:
 *
 *   var add3_bound = JX.bind(null, add, 3);
 *   add3_bound(4); // 7
 *
 * Zero or more arguments may be bound in this way. This is particularly useful
 * when using closures in a loop:
 *
 *   COUNTEREXAMPLE
 *   for (var ii = 0; ii < button_list.length; ii++) {
 *     button_list[ii].onclick = function() {
 *       JX.log('You clicked button number '+ii+'!'); // Fails!
 *     };
 *   }
 *
 * This doesn't work; all the buttons report the highest number when clicked.
 * This is because the local ##ii## is captured by the closure. Instead, bind
 * the current value of ##ii##:
 *
 *   var func = function(button_num) {
 *     JX.log('You clicked button number '+button_num+'!');
 *   }
 *   for (var ii = 0; ii < button_list.length; ii++) {
 *     button_list[ii].onclick = JX.bind(null, func, ii);
 *   }
 *
 * @param  obj|null  Context object to bind as ##this##.
 * @param  function  Function to bind context and arguments to.
 * @param  ...       Zero or more arguments to bind.
 * @return function  New function which invokes the original function with
 *                   bound context and arguments when called.
 *
 * @group util
 */
JX.bind = function(context, func, more) {
  if (__DEV__) {
    if (typeof func != 'function') {
      JX.$E(
        'JX.bind(context, <yuck>, ...): '+
        'Attempting to bind something that is not a function.');
    }
  }

  var bound = JX.$A(arguments).slice(2);
  if (func.bind) {
    return func.bind.apply(func, [context].concat(bound));
  }

  return function() {
    return func.apply(context || window, bound.concat(JX.$A(arguments)));
  }
};


/**
 * "Bag of holding"; function that does nothing. Primarily, it's used as a
 * placeholder when you want something to be callable but don't want it to
 * actually have an effect.
 *
 * @return void
 *
 * @group util
 */
JX.bag = function() {
  // \o\ \o/ /o/ woo dance party
};


/**
 * Convert an object's keys into a list. For example:
 *
 *   JX.keys({sun: 1, moon: 1, stars: 1}); // Returns: ['sun', 'moon', 'stars']
 *
 * @param  obj    Object to retrieve keys from.
 * @return list   List of keys.
 *
 * @group util
 */
JX.keys = function(obj) {
  var r = [];
  for (var k in obj) {
    r.push(k);
  }
  return r;
};


/**
 * Identity function; returns the argument unmodified. This is primarily useful
 * as a placeholder for some callback which may transform its argument.
 *
 * @param   wild  Any value.
 * @return  wild  The passed argument.
 *
 * @group util
 */
JX.id = function(any) {
  return any;
};


JX.log = JX.bag;

if (__DEV__) {
  if (!window.console || !window.console.log) {
    if (window.opera && window.opera.postError) {
      window.console = {log: function(m) { window.opera.postError(m); }};
    } else {
      window.console = {log: function(m) { }};
    }
  }

  /**
   * Print a message to the browser debugging console (like Firebug). This
   * method exists only in ##__DEV__##.
   *
   * @param  string Message to print to the browser debugging console.
   * @return void
   *
   * @group util
   */
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
      recent_alerts.push(JX.now());

      if (recent_alerts.length > 3) {
        recent_alerts.splice(0, recent_alerts.length - 3);
      }

      if (recent_alerts.length >= 3 &&
          (recent_alerts[recent_alerts.length - 1] - recent_alerts[0]) < 5000) {
        if (confirm(msg + "\n\nLots of alert()s recently. Kill them?")) {
          window.alert = JX.bag;
        }
      } else {
        //  Note that we can't .apply() the IE6 version of this "function".
        native_alert(msg);
      }
      in_alert = false;
    }
  })(window.alert);
}

/**
 * Date.now is the fastest timestamp function, but isn't supported by every
 * browser. This gives the fastest version the environment can support.
 * The wrapper function makes the getTime call even slower, but benchmarking
 * shows it to be a marginal perf loss. Considering how small of a perf
 * difference this makes overall, it's not really a big deal. The primary
 * reason for this is to avoid hacky "just think of the byte savings" JS
 * like +new Date() that has an unclear outcome for the unexposed.
 *
 * @return Int A Unix timestamp of the current time on the local machine
 */
JX.now = (Date.now || function() { return new Date().getTime(); });


/**
 * @requires javelin-util
 *           javelin-magical-init
 * @provides javelin-install
 *
 * @javelin-installs JX.install
 * @javelin-installs JX.createClass
 *
 * @javelin
 */

/**
 * Install a class into the Javelin ("JX") namespace. The first argument is the
 * name of the class you want to install, and the second is a map of these
 * attributes (all of which are optional):
 *
 *   - ##construct## //(function)// Class constructor. If you don't provide one,
 *       one will be created for you (but it will be very boring).
 *   - ##extend## //(string)// The name of another JX-namespaced class to extend
 *       via prototypal inheritance.
 *   - ##members## //(map)// A map of instance methods and properties.
 *   - ##statics## //(map)// A map of static methods and properties.
 *   - ##initialize## //(function)// A function which will be run once, after
 *       this class has been installed.
 *   - ##properties## //(map)// A map of properties that should have instance
 *       getters and setters automatically generated for them. The key is the
 *       property name and the value is its default value. For instance, if you
 *       provide the property "size", the installed class will have the methods
 *       "getSize()" and "setSize()". It will **NOT** have a property ".size"
 *       and no guarantees are made about where install is actually chosing to
 *       store the data. The motivation here is to let you cheaply define a
 *       stable interface and refine it later as necessary.
 *   - ##events## //(list)// List of event types this class is capable of
 *       emitting.
 *
 * For example:
 *
 *   JX.install('Dog', {
 *     construct : function(name) {
 *       this.setName(name);
 *     },
 *     members : {
 *       bark : function() {
 *         // ...
 *       }
 *     },
 *     properites : {
 *       name : null,
 *     }
 *   });
 *
 * This creates a new ##Dog## class in the ##JX## namespace:
 *
 *   var d = new JX.Dog();
 *   d.bark();
 *
 * Javelin classes are normal Javascript functions and generally behave in
 * the expected way. Some properties and methods are automatically added to
 * all classes:
 *
 *   - ##instance.__id__## Globally unique identifier attached to each instance.
 *   - ##prototype.__class__## Reference to the class constructor.
 *   - ##constructor.__path__## List of path tokens used emit events. It is
 *       probably never useful to access this directly.
 *   - ##constructor.__readable__## Readable class name. You could use this
 *       for introspection.
 *   - ##constructor.__events__## //DEV ONLY!// List of events supported by
 *       this class.
 *   - ##constructor.listen()## Listen to all instances of this class. See
 *       @{JX.Base}.
 *   - ##instance.listen()## Listen to one instance of this class. See
 *       @{JX.Base}.
 *   - ##instance.invoke()## Invoke an event from an instance. See @{JX.Base}.
 *
 *
 * @param  string  Name of the class to install. It will appear in the JX
 *                 "namespace" (e.g., JX.Pancake).
 * @param  map     Map of properties, see method documentation.
 * @return void
 *
 * @group install
 */
JX.install = function(new_name, new_junk) {

  // If we've already installed this, something is up.
  if (new_name in JX) {
    if (__DEV__) {
      JX.$E(
        'JX.install("' + new_name + '", ...): ' +
        'trying to reinstall something that has already been installed.');
    }
    return;
  }

  if (__DEV__) {
    if ('name' in new_junk) {
      JX.$E(
        'JX.install("' + new_name + '", {"name": ...}): ' +
        'trying to install with "name" property.' +
        'Either remove it or call JX.createClass directly.');
    }
  }

  // Since we may end up loading things out of order (e.g., Dog extends Animal
  // but we load Dog first) we need to keep a list of things that we've been
  // asked to install but haven't yet been able to install around.
  (JX.install._queue || (JX.install._queue = [])).push([new_name, new_junk]);
  var name;
  do {
    var junk;
    var initialize;
    name = null;
    for (var ii = 0; ii < JX.install._queue.length; ++ii) {
      junk = JX.install._queue[ii][1];
      if (junk.extend && !JX[junk.extend]) {
        // We need to extend something that we haven't been able to install
        // yet, so just keep this in queue.
        continue;
      }

      // Install time! First, get this out of the queue.
      name = JX.install._queue.splice(ii, 1)[0][0];
      --ii;

      if (junk.extend) {
        junk.extend = JX[junk.extend];
      }

      initialize = junk.initialize;
      delete junk.initialize;
      junk.name = 'JX.' + name;

      JX[name] = JX.createClass(junk);

      if (initialize) {
        if (JX['Stratcom'] && JX['Stratcom'].ready) {
          initialize.apply(null);
        } else {
          // This is a holding queue, defined in init.js.
          JX['install-init'](initialize);
        }
      }
    }

    // In effect, this exits the loop as soon as we didn't make any progress
    // installing things, which means we've installed everything we have the
    // dependencies for.
  } while (name);
};

/**
 * Creates a class from a map of attributes. Requires ##extend## property to
 * be an actual Class object and not a "String". Supports ##name## property
 * to give the created Class a readable name.
 *
 * @see JX.install for description of supported attributes.
 *
 * @param  junk     Map of properties, see method documentation.
 * @return function Constructor of a class created
 *
 * @group install
 */
JX.createClass = function(junk) {
  var name = junk.name || '';
  var k;
  var ii;

  if (__DEV__) {
    var valid = {
      construct : 1,
      statics : 1,
      members : 1,
      extend : 1,
      properties : 1,
      events : 1,
      name : 1
    };
    for (k in junk) {
      if (!(k in valid)) {
        JX.$E(
          'JX.createClass("' + name + '", {"' + k + '": ...}): ' +
          'trying to create unknown property `' + k + '`.');
      }
    }
    if (junk.constructor !== {}.constructor) {
      JX.$E(
        'JX.createClass("' + name + '", {"constructor": ...}): ' +
        'property `constructor` should be called `construct`.');
    }
  }

  // First, build the constructor. If construct is just a function, this
  // won't change its behavior (unless you have provided a really awesome
  // function, in which case it will correctly punish you for your attempt
  // at creativity).
  var Class = (function(name, junk) {
    var result = function() {
      this.__id__ = '__obj__' + (++JX.install._nextObjectID);
      return (junk.construct || junk.extend || JX.bag).apply(this, arguments);
      // TODO: Allow mixins to initialize here?
      // TODO: Also, build mixins?
    };

    if (__DEV__) {
      var inner = result;
      result = function() {
        if (this == window || this == JX) {
          JX.$E(
            '<' + Class.__readable__ + '>: ' +
            'Tried to construct an instance without the "new" operator.');
        }
        return inner.apply(this, arguments);
      };
    }
    return result;
  })(name, junk);

  Class.__readable__ = name;

  // Copy in all the static methods and properties.
  for (k in junk.statics) {
    // Can't use JX.copy() here yet since it may not have loaded.
    Class[k] = junk.statics[k];
  }

  var proto;
  if (junk.extend) {
    var Inheritance = function() {};
    Inheritance.prototype = junk.extend.prototype;
    proto = Class.prototype = new Inheritance();
  } else {
    proto = Class.prototype = {};
  }

  proto.__class__ = Class;
  var setter = function(prop) {
    return function(v) {
      this[prop] = v;
      return this;
    };
  };
  var getter = function(prop) {
    return function(v) {
      return this[prop];
    };
  };

  // Build getters and setters from the `prop' map.
  for (k in (junk.properties || {})) {
    var base = k.charAt(0).toUpperCase() + k.substr(1);
    var prop = '__auto__' + k;
    proto[prop] = junk.properties[k];
    proto['set' + base] = setter(prop);
    proto['get' + base] = getter(prop);
  }

  if (__DEV__) {

    // Check for aliasing in default values of members. If we don't do this,
    // you can run into a problem like this:
    //
    //  JX.install('List', { members : { stuff : [] }});
    //
    //  var i_love = new JX.List();
    //  var i_hate = new JX.List();
    //
    //  i_love.stuff.push('Psyduck');  // I love psyduck!
    //  JX.log(i_hate.stuff);          // Show stuff I hate.
    //
    // This logs ["Psyduck"] because the push operation modifies
    // JX.List.prototype.stuff, which is what both i_love.stuff and
    // i_hate.stuff resolve to. To avoid this, set the default value to
    // null (or any other scalar) and do "this.stuff = [];" in the
    // constructor.

    for (var member_name in junk.members) {
      if (junk.extend && member_name[0] == '_') {
        JX.$E(
          'JX.createClass("' + name + '", ...): ' +
          'installed member "' + member_name + '" must not be named with ' +
          'a leading underscore because it is in a subclass. Variables ' +
          'are analyzed and crushed one file at a time, and crushed ' +
          'member variables in subclasses alias crushed member variables ' +
          'in superclasses. Remove the underscore, refactor the class so ' +
          'it does not extend anything, or fix the minifier to be ' +
          'capable of safely crushing subclasses.');
      }
      var member_value = junk.members[member_name];
      if (typeof member_value == 'object' && member_value !== null) {
        JX.$E(
          'JX.createClass("' + name + '", ...): ' +
          'installed member "' + member_name + '" is not a scalar or ' +
          'function. Prototypal inheritance in Javascript aliases object ' +
          'references across instances so all instances are initialized ' +
          'to point at the exact same object. This is almost certainly ' +
          'not what you intended. Make this member static to share it ' +
          'across instances, or initialize it in the constructor to ' +
          'prevent reference aliasing and give each instance its own ' +
          'copy of the value.');
      }
    }
  }


  // This execution order intentionally allows you to override methods
  // generated from the "properties" initializer.
  for (k in junk.members) {
    proto[k] = junk.members[k];
  }

  // IE does not enumerate some properties on objects
  var enumerables = JX.install._enumerables;
  if (junk.members && enumerables) {
    ii = enumerables.length;
    while (ii--){
      var property = enumerables[ii];
      if (junk.members[property]) {
        proto[property] = junk.members[property];
      }
    }
  }

  // Build this ridiculous event model thing. Basically, this defines
  // two instance methods, invoke() and listen(), and one static method,
  // listen(). If you listen to an instance you get events for that
  // instance; if you listen to a class you get events for all instances
  // of that class (including instances of classes which extend it).
  //
  // This is rigged up through Stratcom. Each class has a path component
  // like "class:Dog", and each object has a path component like
  // "obj:23". When you invoke on an object, it emits an event with
  // a path that includes its class, all parent classes, and its object
  // ID.
  //
  // Calling listen() on an instance listens for just the object ID.
  // Calling listen() on a class listens for that class's name. This
  // has the effect of working properly, but installing them is pretty
  // messy.

  var parent = junk.extend || {};
  var old_events = parent.__events__;
  var new_events = junk.events || [];
  var has_events = old_events || new_events.length;

  if (has_events) {
    var valid_events = {};

    // If we're in dev, we build up a list of valid events (for this class
    // and our parent class), and then check them on listen and invoke.
    if (__DEV__) {
      for (var key in old_events || {}) {
        valid_events[key] = true;
      }
      for (ii = 0; ii < new_events.length; ++ii) {
        valid_events[junk.events[ii]] = true;
      }
    }

    Class.__events__ = valid_events;

    // Build the class name chain.
    Class.__name__ = 'class:' + name;
    var ancestry = parent.__path__ || [];
    Class.__path__ = ancestry.concat([Class.__name__]);

    proto.invoke = function(type) {
      if (__DEV__) {
        if (!(type in this.__class__.__events__)) {
          JX.$E(
            this.__class__.__readable__ + '.invoke("' + type + '", ...): ' +
            'invalid event type. Valid event types are: ' +
            JX.keys(this.__class__.__events__).join(', ') + '.');
        }
      }
      // Here and below, this nonstandard access notation is used to mask
      // these callsites from the static analyzer. JX.Stratcom is always
      // available by the time we hit these execution points.
      return JX['Stratcom'].invoke(
        'obj:' + type,
        this.__class__.__path__.concat([this.__id__]),
        {args : JX.$A(arguments).slice(1)});
    };

    proto.listen = function(type, callback) {
      if (__DEV__) {
        if (!(type in this.__class__.__events__)) {
          JX.$E(
            this.__class__.__readable__ + '.listen("' + type + '", ...): ' +
            'invalid event type. Valid event types are: ' +
            JX.keys(this.__class__.__events__).join(', ') + '.');
        }
      }
      return JX['Stratcom'].listen(
        'obj:' + type,
        this.__id__,
        JX.bind(this, function(e) {
          return callback.apply(this, e.getData().args);
        }));
    };

    Class.listen = function(type, callback) {
      if (__DEV__) {
        if (!(type in this.__events__)) {
          JX.$E(
            this.__readable__ + '.listen("' + type + '", ...): ' +
            'invalid event type. Valid event types are: ' +
            JX.keys(this.__events__).join(', ') + '.');
        }
      }
      return JX['Stratcom'].listen(
        'obj:' + type,
        this.__name__,
        JX.bind(this, function(e) {
          return callback.apply(this, e.getData().args);
        }));
    };
  } else if (__DEV__) {
    var error_message =
      'class does not define any events. Pass an "events" property to ' +
      'JX.createClass() to define events.';
    Class.listen = Class.listen || function() {
      JX.$E(
        this.__readable__ + '.listen(...): ' +
        error_message);
    };
    Class.invoke = Class.invoke || function() {
      JX.$E(
        this.__readable__ + '.invoke(...): ' +
        error_message);
    };
    proto.listen = proto.listen || function() {
      JX.$E(
        this.__class__.__readable__ + '.listen(...): ' +
        error_message);
    };
    proto.invoke = proto.invoke || function() {
      JX.$E(
        this.__class__.__readable__ + '.invoke(...): ' +
        error_message);
    };
  }

  return Class;
};

JX.install._nextObjectID = 0;
JX.flushHoldingQueue('install', JX.install);

(function() {
  // IE does not enter this loop.
  for (var i in {toString: 1}) {
    return;
  }

  JX.install._enumerables = [
    'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf',
    'propertyIsEnumerable', 'toLocaleString', 'constructor'
  ];
})();


/**
 * @requires javelin-install
 * @provides javelin-event
 * @javelin
 */

/**
 * A generic event, routed by @{class:JX.Stratcom}. All events within Javelin
 * are represented by a {@class:JX.Event}, regardless of whether they originate
 * from a native DOM event (like a mouse click) or are custom application
 * events.
 *
 * See @{article:Concepts: Event Delegation} for an introduction to Javelin's
 * event delegation model.
 *
 * Events have a propagation model similar to native Javascript events, in that
 * they can be stopped with stop() (which stops them from continuing to
 * propagate to other handlers) or prevented with prevent() (which prevents them
 * from taking their default action, like following a link). You can do both at
 * once with kill().
 *
 * @task stop Stopping Event Behaviors
 * @task info Getting Event Information
 * @group event
 */
JX.install('Event', {
  members : {

    /**
     * Stop an event from continuing to propagate. No other handler will
     * receive this event, but its default behavior will still occur. See
     * ""Using Events"" for more information on the distinction between
     * 'stopping' and 'preventing' an event. See also prevent() (which prevents
     * an event but does not stop it) and kill() (which stops and prevents an
     * event).
     *
     * @return this
     * @task stop
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
     * Prevent an event's default action. This depends on the event type, but
     * the common default actions are following links, submitting forms,
     * and typing text. Event prevention is generally used when you have a link
     * or form which work properly without Javascript but have a specialized
     * Javascript behavior. When you intercept the event and make the behavior
     * occur, you prevent it to keep the browser from following the link.
     *
     * Preventing an event does not stop it from propagating, so other handlers
     * will still receive it. See ""Using Events"" for more information on the
     * distinction between 'stopping' and 'preventing' an event. See also
     * stop() (which stops an event but does not prevent it) and kill()
     * (which stops and prevents an event).
     *
     * @return this
     * @task stop
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
     * Stop and prevent an event, which stops it from propagating and prevents
     * its defualt behavior. This is a convenience function, see stop() and
     * prevent() for information on what it means to stop or prevent an event.
     *
     * @return this
     * @task stop
     */
    kill : function() {
      this.prevent();
      this.stop();
      return this;
    },


    /**
     * Get the special key (like tab or return), if any,  associated with this
     * event. Browsers report special keys differently;  this method allows you
     * to identify a keypress in a browser-agnostic way. Note that this detects
     * only some special keys: delete, tab, return escape, left, up, right,
     * down.
     *
     * For example, if you want to react to the escape key being pressed, you
     * could install a listener like this:
     *
     *  JX.Stratcom.listen('keydown', 'example', function(e) {
     *    if (e.getSpecialKey() == 'esc') {
     *      JX.log("You pressed 'Escape'! Well done! Bravo!");
     *    }
     *  });
     *
     * @return string|null ##null## if there is no associated special key,
     *                     or one of the strings 'delete', 'tab', 'return',
     *                     'esc', 'left', 'up', 'right', or 'down'.
     * @task info
     */
    getSpecialKey : function() {
      var r = this.getRawEvent();
      if (!r || r.shiftKey) {
        return null;
      }

      return JX.Event._keymap[r.keyCode] || null;
    },


    /**
     * Get whether the mouse button associated with the mouse event is the
     * right-side button in a browser-agnostic way.
     *
     * @return bool
     * @task info
     */
    isRightButton : function() {
      var r = this.getRawEvent();
      return r.which == 3 || r.button == 2;
    },


    /**
     * Get the node corresponding to the specified key in this event's node map.
     * This is a simple helper method that makes the API for accessing nodes
     * less ugly.
     *
     *  JX.Stratcom.listen('click', 'tag:a', function(e) {
     *    var a = e.getNode('tag:a');
     *    // do something with the link that was clicked
     *  });
     *
     * @param  string     sigil or stratcom node key
     * @return node|null  Node mapped to the specified key, or null if it the
     *                    key does not exist. The available keys include:
     *                    - 'tag:'+tag - first node of each type
     *                    - 'id:'+id - all nodes with an id
     *                    - sigil - first node of each sigil
     * @task info
     */
    getNode : function(key) {
      return this.getNodes()[key] || null;
    },


    /**
     * Get the metadata associated with the node that corresponds to the key
     * in this event's node map.  This is a simple helper method that makes
     * the API for accessing metadata associated with specific nodes less ugly.
     *
     *  JX.Stratcom.listen('click', 'tag:a', function(event) {
     *    var anchorData = event.getNodeData('tag:a');
     *    // do something with the metadata of the link that was clicked
     *  });
     *
     * @param  string   sigil or stratcom node key
     * @return dict     dictionary of the node's metadata
     * @task info
     */
    getNodeData : function(key) {
      // Evade static analysis - JX.Stratcom
      return JX['Stratcom'].getData(this.getNode(key));
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
      63232 : 'up',
      63233 : 'down',
      62234 : 'left',
      62235 : 'right'
    }
  },

  properties : {

    /**
     * Native Javascript event which generated this @{class:JX.Event}. Not every
     * event is generated by a native event, so there may be ##null## in
     * this field.
     *
     * @type Event|null
     * @task info
     */
    rawEvent : null,

    /**
     * String describing the event type, like 'click' or 'mousedown'. This
     * may also be an application or object event.
     *
     * @type string
     * @task info
     */
    type : null,

    /**
     * If available, the DOM node where this event occurred. For example, if
     * this event is a click on a button, the target will be the button which
     * was clicked. Application events will not have a target, so this property
     * will return the value ##null##.
     *
     * @type DOMNode|null
     * @task info
     */
    target : null,

    /**
     * Metadata attached to nodes associated with this event.
     *
     * For native events, the DOM is walked from the event target to the root
     * element. Each sigil which is encountered while walking up the tree is
     * added to the map as a key. If the node has associated metainformation,
     * it is set as the value; otherwise, the value is null.
     *
     * @type dict<string, *>
     * @task info
     */
    data : null,

    /**
     * Sigil path this event was activated from. TODO: explain this
     *
     * @type list<string>
     * @task info
     */
    path : [],

    /**
     * True if propagation of the event has been stopped. See stop().
     *
     * @type bool
     * @task stop
     */
    stopped : false,

    /**
     * True if default behavior of the event has been prevented. See prevent().
     *
     * @type bool
     * @task stop
     */
    prevented : false,

    /**
     * @task info
     */
    nodes : {},

    /**
     * @task info
     */
    nodeDistances : {}
  },

  /**
   * @{class:JX.Event} installs a toString() method in ##__DEV__## which allows
   * you to log or print events and get a reasonable representation of them:
   *
   *  Event<'click', ['path', 'stuff'], [object HTMLDivElement]>
   */
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
 * @task invoke   Invoking Events
 * @task listen   Listening to Events
 * @task handle   Responding to Events
 * @task sigil    Managing Sigils
 * @task meta     Managing Metadata
 * @task internal Internals
 * @group event
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
     * @param  string|list? Optionally, a sigil path to attach to the event.
     *                      This is rarely meaningful for simple events.
     * @param  object?      Optionally, arbitrary data to send with the event.
     * @return @{JX.Event}  The event object which was dispatched to listeners.
     *                      The main use of this is to test whether any
     *                      listeners prevented the event.
     * @task invoke
     */
    invoke : function(type, path, data) {
      if (__DEV__) {
        if (path && typeof path !== 'string' && !JX.isArray(path)) {
          throw new Error(
            'JX.Stratcom.invoke(...): path must be a string or an array.');
        }
      }

      path = JX.$AX(path);

      return this._dispatchProxy(
        new JX.Event()
          .setType(type)
          .setData(data || {})
          .setPath(path || [])
      );
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
     * @task listen
     */
    listen : function(types, paths, func) {

      if (__DEV__) {
        if (arguments.length != 3) {
          JX.$E(
            'JX.Stratcom.listen(...): '+
            'requires exactly 3 arguments. Did you mean JX.DOM.listen?');
        }
        if (arguments.length != 3) {
          JX.$E(
            'JX.Stratcom.listen(...): '+
            'requires exactly 3 arguments.');
        }
        if (typeof func != 'function') {
          JX.$E(
            'JX.Stratcom.listen(...): '+
            'callback is not a function.');
        }
      }

      var ids = [];

      types = JX.$AX(types);

      if (!paths) {
        paths = this._auto;
      }
      if (!JX.isArray(paths)) {
        paths = [[paths]];
      } else if (!JX.isArray(paths[0])) {
        paths = [paths];
      }

      var listener = { _callback : func };

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
          this._handlers.push(listener);
          this._need[id] = path.length;
          ids.push(id);
          for (var kk = 0; kk < path.length; ++kk) {
            if (__DEV__) {
              if (path[kk] == 'tag:#document') {
                JX.$E(
                  'JX.Stratcom.listen(..., "tag:#document", ...): ' +
                  'listen for all events using null, not "tag:#document"');
              }
              if (path[kk] == 'tag:window') {
                JX.$E(
                  'JX.Stratcom.listen(..., "tag:window", ...): ' +
                  'listen for window events using null, not "tag:window"');
              }
            }
            (type_target[path[kk]] || (type_target[path[kk]] = [])).push(id);
          }
        }
      }

      // Add a remove function to the listener
      listener['remove'] = function() {
        for (var ii = 0; ii < ids.length; ii++) {
          delete JX.Stratcom._handlers[ids[ii]];
        }
      }

      return listener;
    },


    /**
     * Sometimes you may be interested in removing a listener directly from it's
     * handler. This is possible by calling JX.Stratcom.removeCurrentListener()
     *
     *   // Listen to only the first click on the page
     *   JX.Stratcom.listen('click', null, function() {
     *     // do interesting things
     *     JX.Stratcom.removeCurrentListener();
     *   });
     *
     * @task remove
     */
    removeCurrentListener : function() {
      var context = this._execContext[this._execContext.length - 1];
      var listeners = context.listeners;
      // JX.Stratcom.pass will have incremented cursor by now
      var cursor = context.cursor - 1;
      if (listeners[cursor]) {
        listeners[cursor].handler.remove();
      }
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
      var distances = {};
      var push = function(key, node, distance) {
        // we explicitly only store the first occurrence of each key
        if (!nodes.hasOwnProperty(key)) {
          nodes[key] = node;
          distances[key] = distance;
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

      var distance = 1;
      var cursor = target;
      while (cursor && cursor.getAttribute) {
        push('tag:' + cursor.nodeName.toLowerCase(), cursor, distance);

        var id = cursor.id;
        if (id) {
          push('id:' + id, cursor, distance);
        }

        var sigils = cursor.getAttribute('data-sigil');
        if (sigils) {
          sigils = sigils.split(' ');
          for (var ii = 0; ii < sigils.length; ii++) {
            push(sigils[ii], cursor, distance);
          }
        }

        ++distance;
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
        .setNodeDistances(distances)
        .setPath(path.reverse());

      // Don't touch this for debugging purposes
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
      var distances = proxy.getNodeDistances();
      var len = path.length;
      var hits = {};
      var hit_distances = {};
      var matches;

      // A large number (larger than any distance we will ever encounter), but
      // we need to do math on it in the sort function so we can't use
      // Number.POSITIVE_INFINITY.
      var far_away = 1000000;

      for (var root = -1; root < len; ++root) {
        matches = scope[(root == -1) ? this._auto : path[root]];
        if (matches) {
          var distance = distances[path[root]] || far_away;
          for (var ii = 0; ii < matches.length; ++ii) {
            var match = matches[ii];
            hits[match] = (hits[match] || 0) + 1;
            hit_distances[match] = Math.min(
              hit_distances[match] || distance,
              distance
            );
          }
        }
      }

      var listeners = [];

      for (var k in hits) {
        if (hits[k] == this._need[k]) {
          var handler = this._handlers[k];
          if (handler) {
            listeners.push({
              distance: hit_distances[k],
              handler: handler
            });
          }
        }
      }

      // Sort listeners by matched sigil closest to the target node
      // Listeners with the same closest sigil are called in an undefined order
      listeners.sort(function(a, b) {
        if (__DEV__) {
          // Make sure people play by the rules. >:)
          return (a.distance - b.distance) || (Math.random() - 0.5);
        }
        return a.distance - b.distance;
      });

      this._execContext.push({
        listeners: listeners,
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
      var event = context.event;
      var listeners = context.listeners;
      while (context.cursor < listeners.length) {
        var cursor = context.cursor++;
        if (listeners[cursor]) {
          listeners[cursor].handler._callback(event);
        }
        if (event.getStopped()) {
          break;
        }
      }
      return event.getStopped() || event.getPrevented();
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
      return len ? this._execContext[len - 1].event : null;
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
          JX.$E(
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
          JX.$E(
            'JX.Stratcom.addSigil(<non-element>, ...): ' +
            'node is not an element. Most likely, you\'re passing window or ' +
            'document, which are not elements and can\'t have sigils.');
        }
      }

      var sigils = node.getAttribute('data-sigil') || '';
      if (!JX.Stratcom.hasSigil(node, sigil)) {
        sigils += ' ' + sigil;
      }

      node.setAttribute('data-sigil', sigils);
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
          JX.$E(
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
          JX.$E(
            'JX.Stratcom.addData(<non-element>, ...): ' +
            'node is not an element. Most likely, you\'re passing window or ' +
            'document, which are not elements and can\'t have sigils.');
        }
        if (!data || typeof data != 'object') {
          JX.$E(
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


/**
 * @provides javelin-behavior
 * @requires javelin-magical-init
 *
 * @javelin-installs JX.behavior
 * @javelin-installs JX.initBehaviors
 *
 * @javelin
 */

/**
 * Define a Javelin behavior, which holds glue code in a structured way. See
 * @{article:Concepts: Behaviors} for a detailed description of Javelin
 * behaviors.
 *
 * To define a behavior, provide a name and a function:
 *
 *   JX.behavior('win-a-hog', function(config, statics) {
 *     alert("YOU WON A HOG NAMED " + config.hogName + "!");
 *   });
 *
 * @param string    Behavior name.
 * @param function  Behavior callback/definition.
 * @return void
 * @group behavior
 */
JX.behavior = function(name, control_function) {
  if (__DEV__) {
    if (JX.behavior._behaviors.hasOwnProperty(name)) {
      JX.$E(
        'JX.behavior("' + name + '", ...): '+
        'behavior is already registered.');
    }
    if (!control_function) {
      JX.$E(
        'JX.behavior("' + name + '", <nothing>): '+
        'initialization function is required.');
    }
    if (typeof control_function != 'function') {
      JX.$E(
        'JX.behavior("' + name + '", <garbage>): ' +
        'initialization function is not a function.');
    }
    // IE does not enumerate over these properties
    var enumerables = [
      'toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf',
      'propertyIsEnumerable', 'toLocaleString', 'constructor'
    ];
    if (~enumerables.indexOf(name)) {
      JX.$E(
        'JX.behavior("' + name + '", <garbage>): ' +
        'do not use any of these properties as behaviors: ' +
        enumerables.join(', ')
      );
    }
  }
  JX.behavior._behaviors[name] = control_function;
  JX.behavior._statics[name] = {};
};


/**
 * Execute previously defined Javelin behaviors, running the glue code they
 * contain to glue stuff together. See @{article:Concepts: Behaviors} for more
 * information on Javelin behaviors.
 *
 * Normally, you do not call this function yourself; instead, your server-side
 * library builds it for you.
 *
 * @param dict  Map of behaviors to invoke: keys are behavior names, and values
 *              are lists of configuration dictionaries. The behavior will be
 *              invoked once for each configuration dictionary.
 * @return void
 * @group behavior
 */
JX.initBehaviors = function(map) {
  var missing_behaviors = [];
  for (var name in map) {
    if (!(name in JX.behavior._behaviors)) {
      missing_behaviors.push(name);
      continue;
    }
    var configs = map[name];
    if (!configs.length) {
      if (JX.behavior._initialized.hasOwnProperty(name)) {
        continue;
      }
      configs = [null];
    }
    for (var ii = 0; ii < configs.length; ii++) {
      JX.behavior._behaviors[name](configs[ii], JX.behavior._statics[name]);
    }
    JX.behavior._initialized[name] = true;
  }
  if (missing_behaviors.length) {
    JX.$E(
      'JX.initBehavior(map): behavior(s) not registered: ' +
      missing_behaviors.join(', ')
    );
  }
};

JX.behavior._behaviors = {};
JX.behavior._statics = {};
JX.behavior._initialized = {};
JX.flushHoldingQueue('behavior', JX.behavior);


/**
 * @requires javelin-install
 *           javelin-stratcom
 *           javelin-util
 *           javelin-behavior
 *           javelin-json
 * @provides javelin-request
 * @javelin
 */

/**
 * Make basic AJAX XMLHTTPRequests.
 *
 * @group workflow
 */
JX.install('Request', {
  construct : function(uri, handler) {
    this.setURI(uri);
    if (handler) {
      this.listen('done', handler);
    }
  },

  events : ['open', 'send', 'done', 'error', 'finally'],

  members : {

    _xhrkey : null,
    _transport : null,
    _sent : false,
    _finished : false,
    _block : null,
    _data : null,

    getTransport : function() {
      var xport = this._transport;
      if (!xport) {
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
      }
      return xport;
    },

    send : function() {
      if (this._sent) {
        if (__DEV__) {
          JX.$E(
            'JX.Request.send(): '+
            'attempting to send a Request that has already been sent.');
        }
        return;
      }

      var xport = this.getTransport();
      xport.onreadystatechange = JX.bind(this, this._onreadystatechange);

      var list_of_pairs = this._data || [];
      list_of_pairs.push(['__ajax__', true]);

      this._block = JX.Stratcom.allocateMetadataBlock();
      list_of_pairs.push(['__metablock__', this._block]);

      var q = (this.getDataSerializer() ||
               JX.Request.defaultDataSerializer)(list_of_pairs);
      var uri = this.getURI();
      var method = this.getMethod().toUpperCase();

      if (method == 'GET') {
        uri += ((uri.indexOf('?') === -1) ? '?' : '&') + q;
      }

      if (this.getTimeout()) {
        this._timer = setTimeout(
          JX.bind(
            this,
            this._fail,
            JX.Request.ERROR_TIMEOUT),
          this.getTimeout());
      }

      xport.open(method, uri, true);

      // Must happen after xport.open so that listeners can modify the transport
      // Some transport properties can only be set after the transport is open
      this.invoke('open', this);

      if (__DEV__) {
        if (this.getFile()) {
          if (method != 'POST') {
            JX.$E(
              'JX.Request.send(): ' +
              'attempting to send a file over GET. You must use POST.');
          }
          if (this._data) {
            JX.$E(
              'JX.Request.send(): ' +
              'attempting to send data and a file. You can not send both ' +
              'at once.');
          }
        }
      }

      this.invoke('send', this);

      if (method == 'POST') {
        if (this.getFile()) {
          xport.send(this.getFile());
        } else {
          xport.setRequestHeader(
            'Content-Type',
            'application/x-www-form-urlencoded');
          xport.send(q);
        }
      } else {
        xport.send(null);
      }

      this._sent = true;
    },

    abort : function() {
      this._cleanup();
    },

    _onreadystatechange : function() {
      var xport = this.getTransport();
      var response;
      try {
        if (this._finished) {
          return;
        }
        if (xport.readyState != 4) {
          return;
        }
        // XHR requests to 'file:///' domains return 0 for success, which is why
        // we treat it as a good result in addition to HTTP 2XX responses.
        if (xport.status !== 0 && (xport.status < 200 || xport.status >= 300)) {
          this._fail();
          return;
        }

        if (__DEV__) {
          if (!xport.responseText.length) {
            JX.$E(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an empty response.');
          }
          if (xport.responseText.indexOf('for (;;);') != 0) {
            JX.$E(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an invalid response.');
          }
          if (xport.responseText == 'for (;;);') {
            JX.$E(
              'JX.Request("'+this.getURI()+'", ...): '+
              'server returned an empty response.');
          }
        }

        var text = xport.responseText.substring('for (;;);'.length);
        response = JX.JSON.parse(text);
        if (!response) {
          JX.$E(
            'JX.Request("'+this.getURI()+'", ...): '+
            'server returned an invalid response.');
        }
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
          JX.Stratcom.mergeData(
            this._block,
            response.javelin_metadata || {});
          this._done(response);
          JX.initBehaviors(response.javelin_behaviors || {});
        }
      } catch (exception) {
        //  In Firefox+Firebug, at least, something eats these. :/
        setTimeout(function() {
          throw exception;
        }, 0);
      }
    },

    _fail : function(error) {
      this._cleanup();

      this.invoke('error', error, this);
      this.invoke('finally');
    },

    _done : function(response) {
      this._cleanup();

      if (response.onload) {
        for (var ii = 0; ii < response.onload.length; ii++) {
          (new Function(response.onload[ii]))();
        }
      }

      this.invoke('done', this.getRaw() ? response : response.payload, this);
      this.invoke('finally');
    },

    _cleanup : function() {
      this._finished = true;
      clearTimeout(this._timer);
      this._timer = null;
      this._transport.abort();
    },

    setData : function(dictionary) {
      this._data = [];
      for (var k in dictionary) {
        this._data.push([k, dictionary[k]]);
      }
      return this;
    },

    setDataWithListOfPairs : function(list_of_pairs) {
      this._data = list_of_pairs;
      return this;
    }

  },

  statics : {
    ERROR_TIMEOUT : -9000,
    defaultDataSerializer : function(list_of_pairs) {
      var uri = [];
      for (var ii = 0; ii < list_of_pairs.length; ii++) {
        var pair = list_of_pairs[ii];
        var name = encodeURIComponent(pair[0]);
        var value = encodeURIComponent(pair[1]);
        uri.push(name + '=' + value);
      }
      return uri.join('&');
    }
  },

  properties : {
    URI : null,
    dataSerializer : null,
    /**
     * Configure which HTTP method to use for the request. Permissible values
     * are "POST" (default) or "GET".
     *
     * @param string HTTP method, one of "POST" or "GET".
     */
    method : 'POST',
    file : null,
    raw : false,

    /**
     * Configure a timeout, in milliseconds. If the request has not resolved
     * (either with success or with an error) within the provided timeframe,
     * it will automatically fail with error JX.Request.ERROR_TIMEOUT.
     *
     * @param int Timeout, in milliseconds (e.g. 3000 = 3 seconds).
     */
    timeout : null
  }

});


/**
 * @requires javelin-install
 *           javelin-event
 * @provides javelin-vector
 *
 * @javelin-installs JX.$V
 *
 * @javelin
 */


/**
 * Convenience function that returns a @{class:JX.Vector} instance. This allows
 * you to concisely write things like:
 *
 *  JX.$V(x, y).add(10, 10);                // Explicit coordinates.
 *  JX.$V(node).add(50, 50).setDim(node);   // Position of a node.
 *
 * @param number|Node         If a node, returns the node's position vector.
 *                            If numeric, the x-coordinate for the new vector.
 * @param number?             The y-coordinate for the new vector.
 * @return @{class:JX.Vector} New vector.
 *
 * @group dom
 */
JX.$V = function(x, y) {
  return new JX.Vector(x, y);
};


/**
 * Query and update positions and dimensions of nodes (and other things) within
 * within a document. Each vector has two elements, 'x' and 'y', which usually
 * represent width/height ('dimension vector') or left/top ('position vector').
 *
 * Vectors are used to manage the sizes and positions of elements, events,
 * the document, and the viewport (the visible section of the document, i.e.
 * how much of the page the user can actually see in their browser window).
 * Unlike most Javelin classes, @{class:JX.Vector} exposes two bare properties,
 * 'x' and 'y'. You can read and manipulate these directly:
 *
 *   // Give the user information about elements when they click on them.
 *   JX.Stratcom.listen(
 *     'click',
 *     null,
 *     function(e) {
 *       var p = new JX.Vector(e);
 *       var d = JX.Vector.getDim(e.getTarget());
 *
 *       alert('You clicked at <' + p.x + ',' + p.y + '> and the element ' +
 *             'you clicked is ' + d.x + 'px wide and ' + d.y + 'px high.');
 *     });
 *
 * You can also update positions and dimensions using vectors:
 *
 *   // When the user clicks on something, make it 10px wider and 10px taller.
 *   JX.Stratcom.listen(
 *     'click',
 *     null,
 *     function(e) {
 *       var target = e.getTarget();
 *       JX.$V(target).add(10, 10).setDim(target);
 *     });
 *
 * Additionally, vectors can be used to query document and viewport information:
 *
 *   var v = JX.Vector.getViewport(); // Viewport (window) width and height.
 *   var d = JX.Vector.getDocument(); // Document width and height.
 *   var visible_area = parseInt(100 * (v.x * v.y) / (d.x * d.y), 10);
 *   alert('You can currently see ' + visible_area + ' % of the document.');
 *
 * The function @{function:JX.$V} provides convenience construction of common
 * vectors.
 *
 * @task query  Querying Positions and Dimensions
 * @task update Changing Positions and Dimensions
 * @task manip  Manipulating Vectors
 *
 * @group dom
 */
JX.install('Vector', {

  /**
   * Construct a vector, either from explicit coordinates or from a node
   * or event. You can pass two Numbers to construct an explicit vector:
   *
   *   var p = new JX.Vector(35, 42);
   *
   * Otherwise, you can pass a @{class:JX.Event} or a Node to implicitly
   * construct a vector:
   *
   *   var q = new JX.Vector(some_event);
   *   var r = new JX.Vector(some_node);
   *
   * These are just like calling JX.Vector.getPos() on the @{class:JX.Event} or
   * Node.
   *
   * For convenience, @{function:JX.$V} constructs a new vector so you don't
   * need to use the 'new' keyword. That is, these are equivalent:
   *
   *   var s = new JX.Vector(x, y);
   *   var t = JX.$V(x, y);
   *
   * Methods like @{method:getScroll}, @{method:getViewport} and
   * @{method:getDocument} also create new vectors.
   *
   * Once you have a vector, you can manipulate it with add():
   *
   *   var u = JX.$V(35, 42);
   *   var v = u.add(5, -12); // v = <40, 30>
   *
   * @param wild      'x' component of the vector, or a @{class:JX.Event}, or a
   *                  Node.
   * @param Number?   If providing an 'x' component, the 'y' component of the
   *                  vector.
   * @return @{class:JX.Vector} Specified vector.
   * @task query
   */
  construct : function(x, y) {
    if (typeof y == 'undefined') {
      return JX.Vector.getPos(x);
    }

    this.x = parseFloat(x);
    this.y = parseFloat(y);
  },

  members : {
    x : null,
    y : null,

    /**
     * Move a node around by setting the position of a Node to the vector's
     * coordinates. For instance, if you want to move an element to the top left
     * corner of the document, you could do this (assuming it has 'position:
     * absolute'):
     *
     *   JX.$V(0, 0).setPos(node);
     *
     * @param Node Node to move.
     * @return this
     * @task update
     */
    setPos : function(node) {
      node.style.left = (this.x === null) ? '' : (parseInt(this.x, 10) + 'px');
      node.style.top  = (this.y === null) ? '' : (parseInt(this.y, 10) + 'px');
      return this;
    },

    /**
     * Change the size of a node by setting its dimensions to the vector's
     * coordinates. For instance, if you want to change an element to be 100px
     * by 100px:
     *
     *   JX.$V(100, 100).setDim(node);
     *
     * Or if you want to expand a node's dimensions by 50px:
     *
     *   JX.$V(node).add(50, 50).setDim(node);
     *
     * @param Node Node to resize.
     * @return this
     * @task update
     */
    setDim : function(node) {
      node.style.width =
        (this.x === null)
          ? ''
          : (parseInt(this.x, 10) + 'px');
      node.style.height =
        (this.y === null)
          ? ''
          : (parseInt(this.y, 10) + 'px');
      return this;
    },

    /**
     * Change a vector's x and y coordinates by adding numbers to them, or
     * adding the coordinates of another vector. For example:
     *
     *   var u = JX.$V(3, 4).add(100, 200); // u = <103, 204>
     *
     * You can also add another vector:
     *
     *   var q = JX.$V(777, 999);
     *   var r = JX.$V(1000, 2000);
     *   var s = q.add(r); // s = <1777, 2999>
     *
     * Note that this method returns a new vector. It does not modify the
     * 'this' vector.
     *
     * @param wild      Value to add to the vector's x component, or another
     *                  vector.
     * @param Number?   Value to add to the vector's y component.
     * @return @{class:JX.Vector} New vector, with summed components.
     * @task manip
     */
    add : function(x, y) {
      if (x instanceof JX.Vector) {
        y = x.y;
        x = x.x;
      }
      return new JX.Vector(this.x + parseFloat(x), this.y + parseFloat(y));
    }
  },

  statics : {
    _viewport: null,

    /**
     * Determine where in a document an element is (or where an event, like
     * a click, occurred) by building a new vector containing the position of a
     * Node or @{class:JX.Event}. The 'x' component of the vector will
     * correspond to the pixel offset of the argument relative to the left edge
     * of the document, and the 'y' component will correspond to the pixel
     * offset of the argument relative to the top edge of the document. Note
     * that all vectors are generated in document coordinates, so the scroll
     * position does not affect them.
     *
     * See also @{method:getDim}, used to determine an element's dimensions.
     *
     * @param  Node|@{class:JX.Event}  Node or event to determine the position
     *                                 of.
     * @return @{class:JX.Vector}      New vector with the argument's position.
     * @task query
     */
    getPos : function(node) {
      JX.Event && (node instanceof JX.Event) && (node = node.getRawEvent());

      if (('pageX' in node) || ('clientX' in node)) {
        var c = JX.Vector._viewport;
        return new JX.Vector(
          node.pageX || (node.clientX + c.scrollLeft),
          node.pageY || (node.clientY + c.scrollTop)
        );
      }

      var x = 0;
      var y = 0;
      do {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent;
      } while (node && node != document.body);

      return new JX.Vector(x, y);
    },

    /**
     * Determine the width and height of a node by building a new vector with
     * dimension information. The 'x' component of the vector will correspond
     * to the element's width in pixels, and the 'y' component will correspond
     * to its height in pixels.
     *
     * See also @{method:getPos}, used to determine an element's position.
     *
     * @param  Node      Node to determine the display size of.
     * @return @{JX.$V}  New vector with the node's dimensions.
     * @task query
     */
    getDim : function(node) {
      return new JX.Vector(node.offsetWidth, node.offsetHeight);
    },

    /**
     * Determine the current scroll position by building a new vector where
     * the 'x' component corresponds to how many pixels the user has scrolled
     * from the left edge of the document, and the 'y' component corresponds to
     * how many pixels the user has scrolled from the top edge of the document.
     *
     * See also @{method:getViewport}, used to determine the size of the
     * viewport.
     *
     * @return @{JX.$V}  New vector with the document scroll position.
     * @task query
     */
    getScroll : function() {
      // We can't use JX.Vector._viewport here because there's diversity between
      // browsers with respect to where position/dimension and scroll position
      // information is stored.
      var b = document.body;
      var e = document.documentElement;
      return new JX.Vector(
        window.pageXOffset || b.scrollLeft || e.scrollLeft,
        window.pageYOffset || b.scrollTop || e.scrollTop
      );
    },

    /**
     * Determine the size of the viewport (basically, the browser window) by
     * building a new vector where the 'x' component corresponds to the width
     * of the viewport in pixels and the 'y' component corresponds to the height
     * of the viewport in pixels.
     *
     * See also @{method:getScroll}, used to determine the position of the
     * viewport, and @{method:getDocument}, used to determine the size of the
     * entire document.
     *
     * @return @{class:JX.Vector}  New vector with the viewport dimensions.
     * @task query
     */
    getViewport : function() {
      var c = JX.Vector._viewport;
      return new JX.Vector(
        window.innerWidth || c.clientWidth || 0,
        window.innerHeight || c.clientHeight || 0
      );
    },

    /**
     * Determine the size of the document, including any area outside the
     * current viewport which the user would need to scroll in order to see, by
     * building a new vector where the 'x' component corresponds to the document
     * width in pixels and the 'y' component corresponds to the document height
     * in pixels.
     *
     * @return @{class:JX.Vector} New vector with the document dimensions.
     * @task query
     */
    getDocument : function() {
      var c = JX.Vector._viewport;
      return new JX.Vector(c.scrollWidth || 0, c.scrollHeight || 0);
    }
  },

  /**
   * On initialization, the browser-dependent viewport root is determined and
   * stored.
   *
   * In ##__DEV__##, @{class:JX.Vector} installs a toString() method so
   * vectors print in a debuggable way:
   *
   *   <23, 92>
   *
   * This string representation of vectors is not available in a production
   * context.
   *
   * @return void
   */
  initialize : function() {
    JX.Vector._viewport = document.documentElement || document.body;

    if (__DEV__) {
      JX.Vector.prototype.toString = function() {
        return '<' + this.x + ', ' + this.y + '>';
      };
    }
  }

});


/**
 * @requires javelin-magical-init
 *           javelin-install
 *           javelin-util
 *           javelin-vector
 *           javelin-stratcom
 * @provides javelin-dom
 *
 * @javelin-installs JX.$
 * @javelin-installs JX.$N
 * @javelin-installs JX.$H
 *
 * @javelin
 */


/**
 * Select an element by its "id" attribute, like ##document.getElementById()##.
 * For example:
 *
 *   var node = JX.$('some_id');
 *
 * This will select the node with the specified "id" attribute:
 *
 *   LANG=HTML
 *   <div id="some_id">...</div>
 *
 * If the specified node does not exist, @{JX.$()} will throw an exception.
 *
 * For other ways to select nodes from the document, see @{JX.DOM.scry()} and
 * @{JX.DOM.find()}.
 *
 * @param  string  "id" attribute to select from the document.
 * @return Node    Node with the specified "id" attribute.
 *
 * @group dom
 */
JX.$ = function(id) {

  if (__DEV__) {
    if (!id) {
      JX.$E('Empty ID passed to JX.$()!');
    }
  }

  var node = document.getElementById(id);
  if (!node || (node.id != id)) {
    if (__DEV__) {
      if (node && (node.id != id)) {
        JX.$E(
          'JX.$("'+id+'"): '+
          'document.getElementById() returned an element without the '+
          'correct ID. This usually means that the element you are trying '+
          'to select is being masked by a form with the same value in its '+
          '"name" attribute.');
      }
    }
    JX.$E("JX.$('" + id + "') call matched no nodes.");
  }

  return node;
};

/**
 * Upcast a string into an HTML object so it is treated as markup instead of
 * plain text. See @{JX.$N} for discussion of Javelin's security model. Every
 * time you call this function you potentially open up a security hole. Avoid
 * its use wherever possible.
 *
 * This class intentionally supports only a subset of HTML because many browsers
 * named "Internet Explorer" have awkward restrictions around what they'll
 * accept for conversion to document fragments. Alter your datasource to emit
 * valid HTML within this subset if you run into an unsupported edge case. All
 * the edge cases are crazy and you should always be reasonably able to emit
 * a cohesive tag instead of an unappendable fragment.
 *
 * You may use @{JX.$H} as a shortcut for creating new JX.HTML instances:
 *
 *   JX.$N('div', {}, some_html_blob); // Treat as string (safe)
 *   JX.$N('div', {}, JX.$H(some_html_blob)); // Treat as HTML (unsafe!)
 *
 * @task build String into HTML
 * @task nodes HTML into Nodes
 *
 * @group dom
 */
JX.install('HTML', {

  construct : function(str) {
    if (__DEV__) {
      var tags = ['legend', 'thead', 'tbody', 'tfoot', 'column', 'colgroup',
                  'caption', 'tr', 'th', 'td', 'option'];
      var evil_stuff = new RegExp('^\\s*<(' + tags.join('|') + ')\\b', 'i');
      var match = null;
      if (match = str.match(evil_stuff)) {
        JX.$E(
          'new JX.HTML("<' + match[1] + '>..."): ' +
          'call initializes an HTML object with an invalid partial fragment ' +
          'and can not be converted into DOM nodes. The enclosing tag of an ' +
          'HTML content string must be appendable to a document fragment. ' +
          'For example, <table> is allowed but <tr> or <tfoot> are not.');
      }

      var really_evil = /<script\b/;
      if (str.match(really_evil)) {
        JX.$E(
          'new JX.HTML("...<script>..."): ' +
          'call initializes an HTML object with an embedded script tag! ' +
          'Are you crazy?! Do NOT do this!!!');
      }

      var wont_work = /<object\b/;
      if (str.match(wont_work)) {
        JX.$E(
          'new JX.HTML("...<object>..."): ' +
          'call initializes an HTML object with an embedded <object> tag. IE ' +
          'will not do the right thing with this.');
      }

      // TODO(epriestley): May need to deny <option> more broadly, see
      // http://support.microsoft.com/kb/829907 and the whole mess in the
      // heavy stack. But I seem to have gotten away without cloning into the
      // documentFragment below, so this may be a nonissue.
    }

    this._content = str;
  },

  members : {
    _content : null,
    /**
     * Convert the raw HTML string into a DOM node tree.
     *
     * @task  nodes
     * @return DocumentFragment A document fragment which contains the nodes
     *                          corresponding to the HTML string you provided.
     */
    getFragment : function() {
      var wrapper = JX.$N('div');
      wrapper.innerHTML = this._content;
      var fragment = document.createDocumentFragment();
      while (wrapper.firstChild) {
        // TODO(epriestley): Do we need to do a bunch of cloning junk here?
        // See heavy stack. I'm disconnecting the nodes instead; this seems
        // to work but maybe my test case just isn't extensive enough.
        fragment.appendChild(wrapper.removeChild(wrapper.firstChild));
      }
      return fragment;
    }
  }
});


/**
 * Build a new HTML object from a trustworthy string. JX.$H is a shortcut for
 * creating new JX.HTML instances.
 *
 * @task build
 * @param string A string which you want to be treated as HTML, because you
 *               know it is from a trusted source and any data in it has been
 *               properly escaped.
 * @return JX.HTML HTML object, suitable for use with @{JX.$N}.
 *
 * @group dom
 */
JX.$H = function(str) {
  return new JX.HTML(str);
};


/**
 * Create a new DOM node with attributes and content.
 *
 *   var link = JX.$N('a');
 *
 * This creates a new, empty anchor tag without any attributes. The equivalent
 * markup would be:
 *
 *   LANG=HTML
 *   <a />
 *
 * You can also specify attributes by passing a dictionary:
 *
 *   JX.$N('a', {name: 'anchor'});
 *
 * This is equivalent to:
 *
 *   LANG=HTML
 *   <a name="anchor" />
 *
 * Additionally, you can specify content:
 *
 *   JX.$N(
 *     'a',
 *     {href: 'http://www.javelinjs.com'},
 *     'Visit the Javelin Homepage');
 *
 * This is equivalent to:
 *
 *   LANG=HTML
 *   <a href="http://www.javelinjs.com">Visit the Javelin Homepage</a>
 *
 * If you only want to specify content, you can omit the attribute parameter.
 * That is, these calls are equivalent:
 *
 *   JX.$N('div', {}, 'Lorem ipsum...'); // No attributes.
 *   JX.$N('div', 'Lorem ipsum...')      // Same as above.
 *
 * Both are equivalent to:
 *
 *   LANG=HTML
 *   <div>Lorem ipsum...</div>
 *
 * Note that the content is treated as plain text, not HTML. This means it is
 * safe to use untrusted strings:
 *
 *   JX.$N('div', '<script src="evil.com" />');
 *
 * This is equivalent to:
 *
 *   LANG=HTML
 *   <div>&lt;script src="evil.com" /&gt;</div>
 *
 * That is, the content will be properly escaped and will not create a
 * vulnerability. If you want to set HTML content, you can use @{JX.HTML}:
 *
 *   JX.$N('div', JX.$H(some_html));
 *
 * **This is potentially unsafe**, so make sure you understand what you're
 * doing. You should usually avoid passing HTML around in string form. See
 * @{JX.HTML} for discussion.
 *
 * You can create new nodes with a Javelin sigil (and, optionally, metadata) by
 * providing "sigil" and "meta" keys in the attribute dictionary.
 *
 * @param string                  Tag name, like 'a' or 'div'.
 * @param dict|string|@{JX.HTML}? Property dictionary, or content if you don't
 *                                want to specify any properties.
 * @param string|@{JX.HTML}?      Content string (interpreted as plain text)
 *                                or @{JX.HTML} object (interpreted as HTML,
 *                                which may be dangerous).
 * @return Node                   New node with whatever attributes and
 *                                content were specified.
 *
 * @group dom
 */
JX.$N = function(tag, attr, content) {
  if (typeof content == 'undefined' &&
      (typeof attr != 'object' || attr instanceof JX.HTML)) {
    content = attr;
    attr = {};
  }

  if (__DEV__) {
    if (tag.toLowerCase() != tag) {
      JX.$E(
        '$N("'+tag+'", ...): '+
        'tag name must be in lower case; '+
        'use "'+tag.toLowerCase()+'", not "'+tag+'".');
    }
  }

  var node = document.createElement(tag);

  if (attr.style) {
    JX.copy(node.style, attr.style);
    delete attr.style;
  }

  if (attr.sigil) {
    JX.Stratcom.addSigil(node, attr.sigil);
    delete attr.sigil;
  }

  if (attr.meta) {
    JX.Stratcom.addData(node, attr.meta);
    delete attr.meta;
  }

  if (__DEV__) {
    if (('metadata' in attr) || ('data' in attr)) {
      JX.$E(
        '$N(' + tag + ', ...): ' +
        'use the key "meta" to specify metadata, not "data" or "metadata".');
    }
  }

  JX.copy(node, attr);
  if (content) {
    JX.DOM.setContent(node, content);
  }
  return node;
};


/**
 * Query and update the DOM. Everything here is static, this is essentially
 * a collection of common utility functions.
 *
 * @task stratcom Attaching Event Listeners
 * @task content Changing DOM Content
 * @task nodes Updating Nodes
 * @task serialize Serializing Forms
 * @task test Testing DOM Properties
 * @task convenience Convenience Methods
 * @task query Finding Nodes in the DOM
 * @task view Changing View State
 *
 * @group dom
 */
JX.install('DOM', {
  statics : {
    _autoid : 0,
    _metrics : {},


/* -(  Changing DOM Content  )----------------------------------------------- */


    /**
     * Set the content of some node. This uses the same content semantics as
     * other Javelin content methods, see @{function:JX.$N} for a detailed
     * explanation. Previous content will be replaced: you can also
     * @{method:prependContent} or @{method:appendContent}.
     *
     * @param Node  Node to set content of.
     * @param mixed Content to set.
     * @return void
     * @task content
     */
    setContent : function(node, content) {
      if (__DEV__) {
        if (!JX.DOM.isNode(node)) {
          JX.$E(
            'JX.DOM.setContent(<yuck>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      while (node.firstChild) {
        JX.DOM.remove(node.firstChild);
      }
      JX.DOM.appendContent(node, content);
    },


    /**
     * Prepend content to some node. This method uses the same content semantics
     * as other Javelin methods, see @{function:JX.$N} for an explanation. You
     * can also @{method:setContent} or @{method:appendContent}.
     *
     * @param Node  Node to prepend content to.
     * @param mixed Content to prepend.
     * @return void
     * @task content
     */
    prependContent : function(node, content) {
      if (__DEV__) {
        if (!JX.DOM.isNode(node)) {
          JX.$E(
            'JX.DOM.prependContent(<junk>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      this._insertContent(node, content, this._mechanismPrepend, true);
    },


    /**
     * Append content to some node. This method uses the same content semantics
     * as other Javelin methods, see @{function:JX.$N} for an explanation. You
     * can also @{method:setContent} or @{method:prependContent}.
     *
     * @param Node Node to append the content of.
     * @param mixed Content to append.
     * @return void
     * @task content
     */
    appendContent : function(node, content) {
      if (__DEV__) {
        if (!JX.DOM.isNode(node)) {
          JX.$E(
            'JX.DOM.appendContent(<bleh>, ...): '+
            'first argument must be a DOM node.');
        }
      }

      this._insertContent(node, content, this._mechanismAppend);
    },


    /**
     * Internal, add content to a node by prepending.
     *
     * @param Node  Node to prepend content to.
     * @param Node  Node to prepend.
     * @return void
     * @task content
     */
    _mechanismPrepend : function(node, content) {
      node.insertBefore(content, node.firstChild);
    },


    /**
     * Internal, add content to a node by appending.
     *
     * @param Node  Node to append content to.
     * @param Node  Node to append.
     * @task content
     */
    _mechanismAppend : function(node, content) {
      node.appendChild(content);
    },


    /**
     * Internal, add content to a node using some specified mechanism.
     *
     * @param Node      Node to add content to.
     * @param mixed     Content to add.
     * @param function  Callback for actually adding the nodes.
     * @param bool      True if array elements should be passed to the mechanism
     *                  in reverse order, i.e. the mechanism prepends nodes.
     * @return void
     * @task content
     */
    _insertContent : function(parent, content, mechanism, reverse) {
      if (JX.isArray(content)) {
        if (reverse) {
          content = [].concat(content).reverse();
        }
        for (var ii = 0; ii < content.length; ii++) {
          JX.DOM._insertContent(parent, content[ii], mechanism, reverse);
        }
      } else {
        var type = typeof content;
        if (content instanceof JX.HTML) {
          content = content.getFragment();
        } else if (type == 'string' || type == 'number') {
          content = document.createTextNode(content);
        }

        if (__DEV__) {
          if (content && !content.nodeType) {
            JX.$E(
              'JX.DOM._insertContent(<node>, ...): '+
              'second argument must be a string, a number, ' +
              'a DOM node or a JX.HTML instance');
          }
        }

        content && mechanism(parent, content);
      }
    },


/* -(  Updating Nodes  )----------------------------------------------------- */


    /**
     * Remove a node from its parent, so it is no longer a child of any other
     * node.
     *
     * @param Node Node to remove.
     * @return Node The node.
     * @task nodes
     */
    remove : function(node) {
      node.parentNode && JX.DOM.replace(node, null);
      return node;
    },


    /**
     * Replace a node with some other piece of content. This method obeys
     * Javelin content semantics, see @{function:JX.$N} for an explanation.
     * You can also @{method:setContent}, @{method:prependContent}, or
     * @{method:appendContent}.
     *
     * @param Node Node to replace.
     * @param mixed Content to replace it with.
     * @return Node the original node.
     * @task nodes
     */
    replace : function(node, replacement) {
      if (__DEV__) {
        if (!node.parentNode) {
          JX.$E(
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
      parent.removeChild(node);
      this._insertContent(parent, replacement, mechanism);

      return node;
    },


/* -(  Serializing Froms  )-------------------------------------------------- */


    /**
     * Converts a form into a list of <name, value> pairs.
     *
     * Note: This function explicity does not match for submit inputs as there
     * could be multiple in a form. It's the caller's obligation to add the
     * submit input value if desired.
     *
     * @param   Node  The form element to convert into a list of pairs.
     * @return  List  A list of <name, value> pairs.
     * @task serialize
     */
    convertFormToListOfPairs : function(form) {
      var elements = form.getElementsByTagName('*');
      var data = [];
      for (var ii = 0; ii < elements.length; ++ii) {
        if (!elements[ii].name) {
          continue;
        }
        if (elements[ii].disabled) {
          continue;
        }
        var type = elements[ii].type;
        var tag  = elements[ii].tagName;
        if ((type in {radio: 1, checkbox: 1} && elements[ii].checked) ||
             type in {text: 1, hidden: 1, password: 1, email: 1} ||
             tag in {TEXTAREA: 1, SELECT: 1}) {
          data.push([elements[ii].name, elements[ii].value]);
        }
      }
      return data;
    },


    /**
     * Converts a form into a dictionary mapping input names to values. This
     * will overwrite duplicate inputs in an undefined way.
     *
     * @param   Node  The form element to convert into a dictionary.
     * @return  Dict  A dictionary of form values.
     * @task serialize
     */
    convertFormToDictionary : function(form) {
      var data = {};
      var pairs = JX.DOM.convertFormToListOfPairs(form);
      for (var ii = 0; ii < pairs.length; ii++) {
        data[pairs[ii][0]] = pairs[ii][1];
      }
      return data;
    },


/* -(  Testing DOM Properties  )--------------------------------------------- */


    /**
     * Test if an object is a valid Node.
     *
     * @param wild Something which might be a Node.
     * @return bool True if the parameter is a DOM node.
     * @task test
     */
    isNode : function(node) {
      return !!(node && node.nodeName && (node !== window));
    },


    /**
     * Test if an object is a node of some specific (or one of several) types.
     * For example, this tests if the node is an ##<input />##, ##<select />##,
     * or ##<textarea />##.
     *
     *   JX.DOM.isType(node, ['input', 'select', 'textarea']);
     *
     * @param   wild        Something which might be a Node.
     * @param   string|list One or more tags which you want to test for.
     * @return  bool        True if the object is a node, and it's a node of one
     *                      of the provided types.
     * @task    test
     */
    isType : function(node, of_type) {
      node = ('' + (node.nodeName || '')).toUpperCase();
      of_type = JX.$AX(of_type);
      for (var ii = 0; ii < of_type.length; ++ii) {
        if (of_type[ii].toUpperCase() == node) {
          return true;
        }
      }
      return false;
    },


    /**
     * Listen for events occuring beneath a specific node in the DOM. This is
     * similar to @{JX.Stratcom.listen()}, but allows you to specify some node
     * which serves as a scope instead of the default scope (the whole document)
     * which you get if you install using @{JX.Stratcom.listen()} directly. For
     * example, to listen for clicks on nodes with the sigil 'menu-item' below
     * the root menu node:
     *
     *   var the_menu = getReferenceToTheMenuNodeSomehow();
     *   JX.DOM.listen(the_menu, 'click', 'menu-item', function(e) { ... });
     *
     * @task stratcom
     * @param Node        The node to listen for events underneath.
     * @param string|list One or more event types to listen for.
     * @param list?       A path to listen on, or a list of paths.
     * @param function    Callback to invoke when a matching event occurs.
     * @return object     A reference to the installed listener. You can later
     *                    remove the listener by calling this object's remove()
     *                    method.
     */
    listen : function(node, type, path, callback) {
      if (__DEV__) {
        var types = JX.$AX(type);
        for (var ix = 0; ix < types.length; ix++) {
          var t = types[ix];

          if (!(t in JX.__allowedEvents)) {
            JX.$E(
              'JX.DOM.listen(...): ' +
              'can only listen to events registered in init.js. "' +
               t + '" not found.');
          }
        }
      }

      var id = ['id:' + JX.DOM.uniqID(node)];
      path = JX.$AX(path || []);
      if (!path.length) {
        path = id;
      } else {
        for (var ii = 0; ii < path.length; ii++) {
          path[ii] = id.concat(JX.$AX(path[ii]));
        }
      }
      return JX.Stratcom.listen(type, path, callback);
    },

    uniqID : function(node) {
      if (!node.getAttribute('id')) {
        node.setAttribute('id', 'autoid_'+(++JX.DOM._autoid));
      }
      return node.getAttribute('id');
    },

    alterClass : function(node, className, add) {
      if (__DEV__) {
        if (add !== false && add !== true) {
          JX.$E(
            'JX.DOM.alterClass(...): ' +
            'expects the third parameter to be Boolean: ' +
            add + ' was provided');
        }
      }

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


    /**
     * Show one or more elements, by removing their "display" style. This
     * assumes you have hidden them with hide(), or explicitly set the style
     * to "display: none;".
     *
     * @task convenience
     * @param ... One or more nodes to remove "display" styles from.
     * @return void
     */
    show : function() {
      if (__DEV__) {
        for (var ii = 0; ii < arguments.length; ++ii) {
          if (!arguments[ii]) {
            JX.$E(
              'JX.DOM.show(...): ' +
              'one or more arguments were null or empty.');
          }
        }
      }

      for (var ii = 0; ii < arguments.length; ++ii) {
        arguments[ii].style.display = '';
      }
    },


    /**
     * Hide one or more elements, by setting "display: none;" on them. This is
     * a convenience method. See also show().
     *
     * @task convenience
     * @param ... One or more nodes to set "display: none" on.
     * @return void
     */
    hide : function() {
      if (__DEV__) {
        for (var ii = 0; ii < arguments.length; ++ii) {
          if (!arguments[ii]) {
            JX.$E(
              'JX.DOM.hide(...): ' +
              'one or more arguments were null or empty.');
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
          JX.$H(JX.DOM.htmlize(node.value).replace(/\n/g, '<br />')));
        var metrics = JX.Vector.getDim(proxy);
      document.body.removeChild(proxy);
      return metrics;
    },


    /**
     * Search the document for DOM nodes by providing a root node to look
     * beneath, a tag name, and (optionally) a sigil. Nodes which match all
     * specified conditions are returned.
     *
     * @task query
     *
     * @param  Node    Root node to search beneath.
     * @param  string  Tag name, like 'a' or 'textarea'.
     * @param  string  Optionally, a sigil which nodes are required to have.
     *
     * @return list    List of matching nodes, which may be empty.
     */
    scry : function(root, tagname, sigil) {
      if (__DEV__) {
        if (!JX.DOM.isNode(root)) {
          JX.$E(
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
     * Select a node uniquely identified by a root, tagname and sigil. This
     * is similar to JX.DOM.scry() but expects exactly one result.
     *
     * @task query
     *
     * @param  Node    Root node to search beneath.
     * @param  string  Tag name, like 'a' or 'textarea'.
     * @param  string  Optionally, sigil which selected node must have.
     *
     * @return Node    Node uniquely identified by the criteria.
     */
    find : function(root, tagname, sigil) {
      if (__DEV__) {
        if (!JX.DOM.isNode(root)) {
          JX.$E(
            'JX.DOM.find(<glop>, "'+tagname+'", "'+sigil+'"): '+
            'first argument must be a DOM node.');
        }
      }

      var result = JX.DOM.scry(root, tagname, sigil);

      if (__DEV__) {
        if (result.length > 1) {
          JX.$E(
            'JX.DOM.find(<node>, "'+tagname+'", "'+sigil+'"): '+
            'matched more than one node.');
        }
      }

      if (!result.length) {
        JX.$E('JX.DOM.find(<node>, "' +
          tagname + '", "' + sigil + '"): '+ 'matched no nodes.');
      }

      return result[0];
    },


    /**
     * Focus a node safely. This is just a convenience wrapper that allows you
     * to avoid IE's habit of throwing when nearly any focus operation is
     * invoked.
     *
     * @task convenience
     * @param Node Node to move cursor focus to, if possible.
     * @return void
     */
    focus : function(node) {
      try { node.focus(); } catch (lol_ie) {}
    },

    /**
     * Scroll to the position of an element in the document.
     * @task view
     * @param Node Node to move document scroll position to, if possible.
     * @return void
     */
     scrollTo : function(node) {
       window.scrollTo(0, JX.$V(node).y);
     }
  }
});



/**
 * Simple JSON serializer.
 *
 * @requires javelin-install
 * @provides javelin-json
 * @javelin
 */

/**
 * JSON serializer and parser. This class uses the native JSON parser if it is
 * available; if not, it provides an eval-based parser and a simple serializer.
 *
 * NOTE: This class uses eval() on some systems, without sanitizing input. It is
 * not safe to use with untrusted data. Javelin does not provide a library
 * suitable for parsing untrusted JSON.
 *
 * Usage is straightforward:
 *
 *    JX.JSON.stringify({"bees":"knees"}); // Returns string: '{"bees":"knees"}'
 *    JX.JSON.parse('{"bees":"knees"}');   // Returns object: {"bees":"knees"}
 *
 * @task json      JSON Manipulation
 * @task internal  Internal
 * @group util
 */
JX.install('JSON', {
  statics : {


/* -(  JSON Manipulation  )-------------------------------------------------- */


    /**
     * Parse a **trusted** JSON string into an object. Accepts a valid JSON
     * string and returns the object it encodes.
     *
     * NOTE: This method does not sanitize input and uses an eval-based parser
     * on some systems. It is **NOT SAFE** to use with untrusted inputs.
     *
     * @param   string A valid, trusted JSON string.
     * @return  object The object encoded by the JSON string.
     * @task json
     */
    parse : function(data) {
      if (typeof data != 'string') {
        return null;
      }

      if (window.JSON && JSON.parse) {
        var obj;
        try {
          obj = JSON.parse(data);
        } catch (e) {}
        return obj || null;
      }

      return eval('(' + data + ')');
    },

    /**
     * Serialize an object into a JSON string. Accepts an object comprised of
     * maps, lists and scalars and transforms it into a JSON representation.
     * This method has undefined behavior if you pass in other complicated
     * things, e.g. object graphs containing cycles, document.body, or Date
     * objects.
     *
     * @param   object  An object comprised of maps, lists and scalars.
     * @return  string  JSON representation of the object.
     * @task json
     */
    stringify : function(val) {
      if (window.JSON && JSON.stringify) {
        return JSON.stringify(val);
      }

      var out = [];
      if (
        val === null || val === true || val === false || typeof val == 'number'
      ) {
        return '' + val;
      }

      if (val.push && val.pop) {
        var v;
        for (var ii = 0; ii < val.length; ii++) {

          // For consistency with JSON.stringify(), encode undefined array
          // indices as null.
          v = (typeof val[ii] == 'undefined') ? null : val[ii];

          out.push(JX.JSON.stringify(v));
        }
        return '[' + out.join(',') + ']';
      }

      if (typeof val == 'string') {
        return JX.JSON._esc(val);
      }

      for (var k in val) {
        out.push(JX.JSON._esc(k) + ':' + JX.JSON.stringify(val[k]));
      }
      return '{' + out.join(',') + '}';
    },


/* -(  Internal  )----------------------------------------------------------- */


    // Lifted more or less directly from Crockford's JSON2.
    _escexp : /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,

    // List of control character escape codes.
    _meta : {
      '\b' : '\\b',
      '\t' : '\\t',
      '\n' : '\\n',
      '\f' : '\\f',
      '\r' : '\\r',
      '"'  : '\\"',
      '\\' : '\\\\'
    },

    /**
     * Quote and escape a string for inclusion in serialized JSON. Finds
     * characters in the string which need to be escaped and uses
     * @{method:_replace} to escape them.
     *
     * @param string Unescaped string.
     * @return string Escaped string.
     * @task internal
     */
    _esc : function(str) {
      JX.JSON._escexp.lastIndex = 0;
      return JX.JSON._escexp.test(str) ?
        '"' + str.replace(JX.JSON._escexp, JX.JSON._replace) + '"' :
        '"' + str + '"';
    },

    /**
     * Helper callback for @{method:_esc}, escapes characters which can't be
     * represented normally in serialized JSON.
     *
     * @param string Unescaped character.
     * @return string Escaped character.
     * @task internal
     */
    _replace : function(m) {
      if (m in JX.JSON._meta) {
        return JX.JSON._meta[m];
      }
      return '\\u' + (('0000' + m.charCodeAt(0).toString(16)).slice(-4));
    }
  }
});


/**
 * @provides javelin-uri
 * @requires javelin-install
 *           javelin-util
 *           javelin-stratcom
 *
 * @javelin-installs JX.$U
 *
 * @javelin
 */

/**
 * Handy convenience function that returns a @{class:JX.URI} instance. This
 * allows you to write things like:
 *
 *   JX.$U('http://zombo.com/').getDomain();
 *
 * @param string            Unparsed URI.
 * @return  @{class:JX.URI} JX.URI instance.
 *
 * @group uri
 */
JX.$U = function(uri) {
  return new JX.URI(uri);
};

/**
 * Convert a string URI into a maleable object.
 *
 *   var uri = new JX.URI('http://www.example.com/asdf.php?a=b&c=d#anchor123');
 *   uri.getProtocol();    // http
 *   uri.getDomain();      // www.example.com
 *   uri.getPath();        // /asdf.php
 *   uri.getQueryParams(); // {a: 'b', c: 'd'}
 *   uri.getFragment();    // anchor123
 *
 * ...and back into a string:
 *
 *   uri.setFragment('clowntown');
 *   uri.toString() // http://www.example.com/asdf.php?a=b&c=d#clowntown
 *
 * @group uri
 */
JX.install('URI', {
  statics : {
    _uriPattern : /(?:([^:\/?#]+):)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
    _queryPattern : /(?:^|&)([^&=]*)=?([^&]*)/g,

    /**
     *  Convert a Javascript object into an HTTP query string.
     *
     *  @param  Object  Map of query keys to values.
     *  @return String  HTTP query string, like 'cow=quack&duck=moo'.
     */
    _defaultQuerySerializer : function(obj) {
      var kv_pairs = [];
      for (var key in obj) {
        if (obj[key] != null) {
          var value = encodeURIComponent(obj[key]);
          kv_pairs.push(encodeURIComponent(key) + (value ? '=' + value : ''));
        }
      }

      return kv_pairs.join('&');
    }
  },

  /**
   * Construct a URI
   *
   * Accepts either absolute or relative URIs. Relative URIs may have protocol
   * and domain properties set to undefined
   *
   * @param string    absolute or relative URI
   */
  construct : function(uri) {
    // need to set the default value here rather than in the properties map,
    // or else we get some crazy global state breakage
    this.setQueryParams({});

    if (uri) {
      // parse the url
      var result = JX.URI._uriPattern.exec(uri);

      // fallback to undefined because IE has weird behavior otherwise
      this.setProtocol(result[1] || undefined);
      this.setDomain(result[2] || undefined);
      this.setPort(result[3] || undefined);
      var path = result[4];
      var query = result[5];
      this.setFragment(result[6] || undefined);

      // parse the path
      this.setPath(path.charAt(0) == '/' ? path : '/' + path);

      // parse the query data
      if (query) {
        var queryData = {};
        var data;
        while ((data = JX.URI._queryPattern.exec(query)) != null) {
          queryData[decodeURIComponent(data[1].replace(/\+/g, ' '))] =
            decodeURIComponent(data[2].replace(/\+/g, ' '));
        }
        this.setQueryParams(queryData);
      }
    }
  },

  properties : {
    protocol: undefined,
    port: undefined,
    path: undefined,
    queryParams: undefined,
    fragment: undefined,
    querySerializer: undefined
  },

  members : {
    _domain: undefined,

    /**
     * Append and override query data values
     * Remove a query key by setting it undefined
     *
     * @param map
     * @return @{JX.URI} self
     */
    addQueryParams : function(map) {
      JX.copy(this.getQueryParams(), map);
      return this;
    },

    /**
     * Set a specific query parameter
     * Remove a query key by setting it undefined
     *
     * @param string
     * @param wild
     * @return @{JX.URI} self
     */
    setQueryParam : function(key, value) {
      var map = {};
      map[key] = value;
      return this.addQueryParams(map);
    },

    /**
     * Set the domain
     *
     * This function checks the domain name to ensure that it is safe for
     * browser consumption.
     */
    setDomain : function(domain) {
      var re = new RegExp(
        // For the bottom 128 code points, we use a strict whitelist of
        // characters that are allowed by all browsers: -.0-9:A-Z[]_a-z
        '[\\x00-\\x2c\\x2f\\x3b-\\x40\\x5c\\x5e\\x60\\x7b-\\x7f' +
        // In IE, these chararacters cause problems when entity-encoded.
        '\\uFDD0-\\uFDEF\\uFFF0-\\uFFFF' +
        // In Safari, these characters terminate the hostname.
        '\\u2047\\u2048\\uFE56\\uFE5F\\uFF03\\uFF0F\\uFF1F]');
      if (re.test(domain)) {
        JX.$E('JX.URI.setDomain(...): invalid domain specified.');
      }
      this._domain = domain;
      return this;
    },

    getDomain : function() {
      return this._domain;
    },

    toString : function() {
      if (__DEV__) {
        if (this.getPath() && this.getPath().charAt(0) != '/') {
          JX.$E(
            'JX.URI.toString(): ' +
            'Path does not begin with a "/" which means this URI will likely' +
            'be malformed. Ensure any string passed to .setPath() leads "/"');
        }
      }
      var str = '';
      if (this.getProtocol()) {
        str += this.getProtocol() + '://';
      }
      str += this.getDomain() || '';

      // If there is a domain or a protocol, we need to provide '/' for the
      // path. If we don't have either and also don't have a path, we can omit
      // it to produce a partial URI without path information which begins
      // with "?", "#", or is empty.
      str += this.getPath() || (str ? '/' : '');

      str += this._getQueryString();
      if (this.getFragment()) {
        str += '#' + this.getFragment();
      }
      return str;
    },

    _getQueryString : function() {
      var str = (
        this.getQuerySerializer() || JX.URI._defaultQuerySerializer
      )(this.getQueryParams());
      return str ? '?' + str : '';
    },

    /**
     * Redirect the browser to another page by changing the window location. If
     * the URI is empty, reloads the current page.
     *
     * You can install a Stratcom listener for the 'go' event if you need to log
     * or prevent redirects.
     *
     * @return void
     */
    go : function() {
      var uri = this.toString();
      if (JX.Stratcom.invoke('go', null, {uri: uri}).getPrevented()) {
        return;
      }
      (uri && (window.location = uri)) || window.location.reload(true);
    }

  }
});
