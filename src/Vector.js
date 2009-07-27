/**
 *  @requires javelin-install
 *  @provides javelin-vector
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
