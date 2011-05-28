<?php

$uri = $_SERVER['REQUEST_URI'];
if (strstr($uri, 'overview')) {
  $tab = 'overview';
} else {
  $tab = 'home';
}

switch ($tab) {
  case 'overview':
    echo render_body(render_overview(), $tab);
    break;
  default:
    echo render_body(<<<EOXML
<div id="snipe">
  <p>Javelin is a <strong>lightweight Javascript framework</strong> developed
  at <a href="http://www.facebook.com/">Facebook</a> for Facebook Lite. It provides
  high-power functionality on a minimal footprint.
  </p>
</div>

<h2>What makes Javelin different?</h2>

<ul>
  <li>Javelin prioritizes small library size.</li>
  <li>Javelin is built around event delegation.</li>
  <li>Javelin has rigorous static analysis tools.</li>
  <li>Javelin prioritizes performance over developer happiness.</li>
</ul>

<h2>Getting Started</h2>

<p>Check out the <a href="http://www.phabricator.com/docs/javelin/">documentation</a> or
<a href="http://github.com/facebook/javelin">browse the source on GitHub</a>.</p>

<h2>How Javelin improves performance</h2>
<ul>
  <li>Strips a lot of code out in production.</li>
  <li>Deals with exceptional cases by making YOU fix them.</li>
  <li>Crushes symbols aggressively.</li>
  <li>Concise class syntax.</li>
  <li>Tiny init in the head (blocking), rest of the code in the foot
      (nonblocking).</li>
  <li>Encourages you to put logic on the server.</li>
  <li>Features work without JS by default.</li>
</ul>

<h2>New Concepts in Javelin</h2>

<ul>
  <li>Sigils (naming DOM nodes) and metadata (attaching data to nodes).</li>
  <li>Event delegation as the default approach.</li>
  <li>Universal event routing with JX.Stratcom.</li>
  <li>Behaviors for glue code.</li>
  <li>Workflow for graceful degradation.</li>
</ul>

<h2>Contributors</h2>

<ul>
  <li><a href="http://www.facebook.com/epriestley">Evan Priestley</a> <em>Lead</em></li>
  <li><a href="http://www.facebook.com/ashwin">Ashwin Bharambe</a> <em>Lead</em></li>
  <li><a href="http://www.facebook.com/tomo">Tom Occhino</a> <em>Lead</em></li>
</ul>

EOXML
, $tab);
    break;
}

function render_body($body, $tab) {
  $sel_home = null;
  $sel_overview = null;

  switch ($tab) {
    case 'overview':
      $sel_overview = 'class="selected"';
      break;
    default:
      $sel_home = 'class="selected"';
      break;
  }

  return <<<EOXML
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <title>Javelin (JS)</title>
    <style type="text/css">

      body, html {
        padding:      0;
        margin:       0;
        font-family:  georgia;
        font-size:    1.1em;
        line-height:  1.4em;
        background:   #ffffff;
      }

      h1 {
        background:   #DD0099;
        padding:      1em 20%;
        margin:       0.5em 0em 0em;
        color:        #FFF;
        font-family:  "Verdana";
        font-weight:  normal;
      }

      #menu {
        padding: .5em 20% 0;
        background: #cc0088;
        margin-bottom: 1em;
        border-bottom: 1px solid #660022;
      }

      #menu a {
        display: block;
        float: left;
        padding: 0 .5em;
        text-decoration: none;
        font-family: "Verdana";
        margin: 0 .5em 0 0;
        background: #eeeeee;
        color: #666666;
        border: 1px solid #660022;
        margin-bottom: -1px;
      }

      #menu a.selected {
        border-bottom: 1px solid #ffffff;
        background: #ffffff;
        color: #000000;
      }

      h2 {
        font-size:      1.2em;
        border-bottom:  1px solid #cccccc;
        color:          #333333;
        font-family:    "Verdana";
        font-weight:    normal;
        padding:        .1em 0 .25em;
        margin:         0.25em 0;
      }

      #core {
        padding:      0 20%;
      }

      #snipe {
        color:        #333333;
      }

      #snipe p {
        font-size:  1.0em;
      }

      p {
        padding:      .2em 1em;
        font-size:    0.84em;
      }

      pre {
        margin-left:   1.5em;
        padding-left:  0;
        border-left:   3px solid #ccc;
        color:         #363;
      }
    </style>
  </head>
  <body>
    <h1><strong>Javelin</strong> (JS)</h1>
    <div id="menu">
      <a href="?" {$sel_home}>Home</a>
      <a href="?overview" {$sel_overview}>Overview</a>
      <a href="http://www.phabricator.com/docs/javelin/">Documentation</a>
      <a href="http://github.com/facebook/javelin">Download</a>
      <div style="clear: both;"></div>
    </div>
    <div id="core">

      {$body}

    </div>

  </body>
</html>
EOXML;
}

function render_overview() {
  return <<<EOT
<div id="snipe">
<p>
Javelin introduces several new concepts which advance other goals, provide new
tools to solve problems, or both. The most alien of these are "sigils" and
"metadata".
<p>
</div>

<h2>Sigils</h2>
<p>
Sigils allow you attach a (non-unique) name to each node -- a "sigil". This is
extremely similar to using CSS class names with scry() or find() to locate
nodes, but it separates CSS semantics from JS semantics. Javelin's
JX.DOM.scry() and JX.DOM.find() accept sigils, not CSS classes, which means
that, under Javelin, CSS classes ONLY impact CSS rendering and sigils ONLY
impact JS. This is basically just providing a clean technical separation
between CSS and JS. It also allows event delegation to be implemented
performantly (see below). In XHP, you attach a sigil to a node with the
"sigil" attribute:
</p>

<pre>
  &lt;button sigil="quack">Quack&lt;/button&gt;
</pre>

<h2>Metadata</h2>
<p>
Metadata allows you attach some arbitrary data to a node, and access it later.
In XHP, you do this by providing the "meta" attribute. Usually this is because
you have multiple copies of the same type of element on a page and need a way
to distinguish them, e.g. if we added a quack button to feed stories:
</p>

<pre>
  &lt;div sigil="story" meta={array('story_id' =&gt; 2392)}&gt;
    Your friend did something awesome.
    &lt;button sigil="quack"&gt;Quack&lt;/button&gt;
  &lt;/div&gt;
  &lt;div sigil="story" meta={array('story_id' =&gt; 2393)}&gt;
    Your other friend did something less awesome but more quackworthy.
    &lt;button sigil="quack"&gt;Quack&lt;/button&gt;
  &lt;/div&gt;
</pre>

<p>
This data can later be accessed from Javascript. Most commonly, this saves you
from having to pass giant blobs of data full of node IDs to object
constructors.
</p>

<h2>Event Delegation</h2>

<p>
Javelin is built around a strong event delegation core. Event delegation means
that the library captures all events and then routes them appropriately,
instead of having clients install specific listeners. In practice, familiar
APIs are available (JX.DOM.listen()) and work as expected, but Javelin
provides far more powerful listener installation capabilities through
JX.Stratcom. For instance, you can listen for any click anywhere in the
document:
</p>

<pre>
  JX.Stratcom.listen('click', null, function(e) { /* callback */ });
</pre>

<p>
More useful is listening to clicks which occur on or under nodes with a
specific sigil. For instance, if we are implementing the Quack button above,
we can listen for only clicks on Quack buttons (or child nodes):
</p>

<pre>
  JX.Stratcom.listen('click', 'quack', function(e) { /* callback */ });
</pre>

<p>
If specifying the "quack" sigil is insufficiently specific (because we have
also added quack buttons to search or somesuch) we can specify a "path" of
sigils. We will receive only those events which have every sigil we specify on
some node between the event target and the document root:
</p>

<pre>
  JX.Stratcom.listen('click', ['story', 'quack'], function(e) { /* ... */ });
</pre>

<p>
This allows us to be specific about which events we want to respond to.
</p>

<p>
Javelin's implementation of event delegation has very low overhead. It is
smaller and scales better than selector-based implementations (specifically,
it scales better than every alternative implementation I'm aware of).
</p>
<p>
All event management in Javelin flows through JX.Stratcom ("strategic
command"), which represents all events -- i.e., native browser events (like a
click) and client-triggered events (like Arbiter) -- with a unified interface
(JX.Event) and mechanics. Stratcom is also baked into class definitions, and
objects can emit events with builtins provided by JX.install().
</p>

<h2>Behaviors</h2>
<p>
Javelin provides "behaviors", which are small pieces of code which are
slightly more formal than functions but less formal than classes. Behaviors
allow you to more concisely specify features which only need a little bit of
glue code and mostly work with defaults -- e.g., you need to do an Ajax
replace but also need to focus a textarea or disable a button. Or you have a
typeahead, but have to hook it up or configure it a little bit specially.
These sorts of nearly-but-not-quite-default features are fairly common and
behaviors provide a middle ground between building a full Controller-type
class (heavyweight) or putting a bunch of logic in an onloadRegister (ugly,
with negative performance implications).
</p>
<p>
The combination of behaviors, metadata and delegation means that Javelin
features tend to do very little on page initialization -- generally, you will
install a listener or two (which is very lightweight) and not need to touch
the DOM at all. This contrasts sharply with most Javascript frameworks, where
constructors often need to do a bunch of heavyweight DOM operations to install
listeners.  Although these initialization costs are generally overshadowed by
library size costs, the natural tendency for them to be lightweight doesn't
hurt.
</p>

EOT;
}

/*
      <div id="snipe">

        <p>Javelin is a <strong>large, bloated</strong> framework with an
        <strong>unintuitive, verbose syntax</strong> and <strong>very few
        features</strong>. It <strong>performs sluggishly</strong> and is
        <strong>sparsely documented</strong>. You will find that browsing its
        <strong>inelegant</strong>, <strong>poorly written</strong> source is
        <strong>an unwelcome experience</strong>. Javelin makes it <strong>quite
        difficult</strong> to write code that works on more than one
        browser.</p>

      </div>

      <h2>Status</h2>
        <p>Javelin is under development, but you can <a
          href="http://github.com/facebook/javelin/tree/master">preview it
          on GitHub</a>. However, you probably shouldn't, since it's not very
          good and chances are you won't like it.</p>

      <h2>About</h2>
        <p>Javelin was developed by
          <a href="http://www.facebook.com/epriestley"
            title="gosh, he's so dreamy">Evan Priestley</a> at
          <a href="http://www.facebook.com/">Facebook</a>.</p>

*/
