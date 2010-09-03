/**
 * @requires javelin-install javelin-util javelin-vector javelin-stratcom
 * @provides javelin-dom
 *
 * @javelin-installs JX.$
 * @javelin-installs JX.$N
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
 * If the specified node does not exist, @{JX.$()} will throw ##JX.$.NotFound##.
 * For other ways to select nodes from the document, see @{JX.DOM.scry()} and
 * @{JX.DOM.find()}.
 *
 * @param  string  "id" attribute to select from the document.
 * @return Node    Node with the specified "id" attribute.
 */
JX.$ = function(id) {

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
};

JX.$.NotFound = {};
if (__DEV__) {
  //  If we're in dev, upgrade this object into an Error so that it will
  //  print something useful if it escapes the stack after being thrown.
  JX.$.NotFound = new Error(
    'JX.$() or JX.DOM.find() call matched no nodes.');
}


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
 *   JX.$N('div', JX.HTML(some_html));
 *
 * **This is potentially unsafe**, so make sure you understand what you're
 * doing. You should usually avoid passing HTML around in string form. See
 * @{JX.HTML} for discussion.
 *
 * You can create new nodes with a Javelin sigil (and, optionally, metadata) by
 * providing "sigil" and "metadata" keys in the attribute dictionary.
 *
 * @param string                  Tag name, like 'a' or 'div'.
 * @param dict|string|@{JX.HTML}? Property dictionary, or content if you don't
 *                                want to specify any properties.
 * @param string|@{JX.HTML}?      Content string (interpreted as plain text)
 *                                or @{JX.HTML} object (interpreted as HTML,
 *                                which may be dangerous).
 * @return Node                   New node with whatever attributes and
 *                                content were specified.
 */
JX.$N = function(tag, attr, content) {
  if (typeof content == 'undefined' &&
      (typeof attr != 'object' || attr instanceof JX.HTML)) {
    content = attr;
    attr = {};
  }

  if (__DEV__) {
    if (tag.toLowerCase() != tag) {
      throw new Error(
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

  // prevent sigil from being wiped by blind copying the className
  if (attr.className) {
    JX.DOM.alterClass(node, attr.className, true);
    delete attr.className;
  }

  JX.copy(node, attr);
  if (content) {
    JX.DOM.setContent(node, content);
  }
  return node;
};


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

    /**
     * Retrieve the nearest parent node matching the desired sigil.
     * @param  Node The child element to search from
     * @return  The matching parent or null if no parent could be found
     * @author jgabbard
     */
    nearest : function(node, sigil) {
      while (node && !JX.Stratcom.hasSigil(node, sigil)) {
        node = node.parentNode;
      }
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
      node = ('' + (node.nodeName || '')).toUpperCase();
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

