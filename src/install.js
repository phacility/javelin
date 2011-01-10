/**
 * @requires javelin-util
 * @provides javelin-install
 * @javelin-installs JX.install
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
 *   - ##instance.__super__## Reference to the parent class constructor, if one
 *      exists. Allows use of ##this.__super__.apply(this, ...)## to call the
 *      superclass's constructor.
 *   - ##instance.__parent__## Reference to the parent class prototype, if one
 *      exists. Allows use of ##this.__parent__.someMethod.apply(this, ...)##
 *      to call the superclass's methods.
 *   - ##prototype.__class__## Reference to the class constructor.
 *   - ##constructor.__path__## List of path tokens used emit events. It is
 *       probably never useful to access this directly.
 *   - ##constructor.__readable__## //DEV ONLY!// Readable class name. You could
 *       plausibly use this when constructing error messages.
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
 * @author epriestley
 */
JX.install = function(new_name, new_junk) {

  if (typeof JX.install._nextObjectID == 'undefined') {
    JX.install._nextObjectID = 0;
  }

  // If we've already installed this, something is up.
  if (new_name in JX) {
    if (__DEV__) {
      throw new Error(
        'JX.install("' + new_name + '", ...): ' +
        'trying to reinstall something that has already been installed.');
    }
    return;
  }

  // Since we may end up loading things out of order (e.g., Dog extends Animal
  // but we load Dog first) we need to keep a list of things that we've been
  // asked to install but haven't yet been able to install around.
  if (!JX.install._queue) {
    JX.install._queue = [];
  }
  JX.install._queue.push([new_name, new_junk]);
  do {
    var junk;
    var name = null;
    for (var ii = 0; ii < JX.install._queue.length; ++ii) {
      junk = JX.install._queue[ii][1];
      if (junk.extend && !JX[junk.extend]) {
        // We need to extend something that we haven't been able to install
        // yet, so just keep this in queue.
        continue;
      }

      // Install time! First, get this out of the queue.
      name = JX.install._queue[ii][0];
      JX.install._queue.splice(ii, 1);
      --ii;

      if (__DEV__) {
        var valid = {
          construct : 1,
          statics : 1,
          members : 1,
          extend : 1,
          initialize: 1,
          properties : 1,
          events : 1,
          canCallAsFunction : 1
        };
        for (var k in junk) {
          if (!(k in valid)) {
            throw new Error(
              'JX.install("' + name + '", {"' + k + '": ...}): ' +
              'trying to install unknown property `' + k + '`.');
          }
        }
        if (junk.constructor !== {}.constructor) {
          throw new Error(
            'JX.install("' + name + '", {"constructor": ...}): ' +
            'property `constructor` should be called `construct`.');
        }
      }

      // First, build the constructor. If construct is just a function, this
      // won't change its behavior (unless you have provided a really awesome
      // function, in which case it will correctly punish you for your attempt
      // at creativity).
      JX[name] = (function(name, junk) {
        var result = function() {
          this.__id__ = '__obj__' + (++JX.install._nextObjectID);
          this.__super__ = JX[junk.extend] || JX.bag;
          this.__parent__ = JX[name].prototype;
          return (junk.construct || JX.bag).apply(this, arguments);
          // TODO: Allow mixins to initialize here?
          // TODO: Also, build mixins?
        };

        if (__DEV__) {
          if (!junk.canCallAsFunction) {
            var inner = result;
            result = function() {
              if (this === window || this === JX) {
                throw new Error("<" + JX[name].__readable__ + ">: " +
                                "Tried to construct an instance " +
                                "without the 'new' operator. Either use " +
                                "'new' or set 'canCallAsFunction' where you " +
                                "install the class.");
              }
              return inner.apply(this, arguments);
            };
          }
        }
        return result;
      })(name, junk);

      // Copy in all the static methods and properties.
      JX.copy(JX[name], junk.statics);

      if (__DEV__) {
        JX[name].__readable__ = 'JX.' + name;
      }

      var proto;
      if (junk.extend) {
        // TODO: Flag this junk so it knows it's prototyping?
        proto = JX[name].prototype = new JX[junk.extend]();
      } else {
        proto = JX[name].prototype = {};
      }

      proto.__class__ = JX[name];

      // Build getters and setters from the `prop' map.
      for (var k in (junk.properties || {})) {
        var base = k.charAt(0).toUpperCase()+k.substr(1);
        var prop = '__auto__' + k;
        proto[prop] = junk.properties[k];
        proto['set' + base] = (function(prop) {
          return function(v) {
            this[prop] = v;
            return this;
          }
        })(prop);

        proto['get' + base] = (function(prop) {
          return function() {
            return this[prop];
          }
        })(prop);
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
            throw new Error(
              'JX.install("' + name + '", ...): ' +
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
            throw new Error(
              'JX.install("' + name + '", ...): ' +
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
      JX.copy(proto, junk.members);


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
      if (junk.events && junk.events.length) {

        var parent = JX[junk.extend] || {};

        // If we're in dev, we build up a list of valid events (for this
        // class or some parent class) and then check them whenever we try
        // to listen or invoke.
        if (__DEV__) {
          var valid_events = parent.__events__ || {};
          for (var ii = 0; ii < junk.events.length; ++ii) {
            valid_events[junk.events[ii]] = true;
          }
          JX[name].__events__ = valid_events;
        }

        // Build the class name chain.
        JX[name].__name__ = 'class:' + name;
        var ancestry = parent.__path__ || [];
        JX[name].__path__ = ancestry.concat([JX[name].__name__]);

        proto.invoke = function(type) {
          if (__DEV__) {
            if (!(type in this.__class__.__events__)) {
              throw new Error(
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
              throw new Error(
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

        JX[name].listen = function(type, callback) {
          if (__DEV__) {
            if (!(type in this.__events__)) {
              throw new Error(
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
          'JX.install() to define events.';
        JX[name].listen = JX[name].listen || function() {
          throw new Error(
            this.__readable__ + '.listen(...): ' +
            error_message);
        };
        JX[name].invoke = JX[name].invoke || function() {
          throw new Error(
            this.__readable__ + '.invoke(...): ' +
            error_message);
        };
        proto.listen = proto.listen || function() {
          throw new Error(
            this.__class__.__readable__ + '.listen(...): ' +
            error_message);
        };
        proto.invoke = proto.invoke || function() {
          throw new Error(
            this.__class__.__readable__ + '.invoke(...): ' +
            error_message);
        };
      }

      // Finally, run the init function if it was provided.
      (junk.initialize || JX.bag)();
    }

    // In effect, this exits the loop as soon as we didn't make any progress
    // installing things, which means we've installed everything we have the
    // dependencies for.
  } while (name);
}
