/**
 *  @requires javelin-util
 *  @provides javelin-install
 *   @javelin
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
          return JX.Stratcom.invoke(
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
          return JX.Stratcom.listen(
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
          return JX.Stratcom.listen(
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
