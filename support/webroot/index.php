<?php

function render_body($body) {
  return <<<EOXML
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <title>Javelin (JS)</title>
    <link rel="stylesheet" href="style.css" type="text/css">
  </head>
  <body>
    <h1><strong>Javelin</strong> (JS)</h1>
    <div id="menu">
      <a href="specs/">Run Javelin Tests</a>
      <a href="http://www.phabricator.com/docs/javelin/">Documentation</a>
      <a href="https://github.com/facebook/javelin/">GitHub</a>
      <div style="clear: both;"></div>
    </div>
    <div id="core">

      {$body}

    </div>

  </body>
</html>
EOXML;
}

echo render_body(<<<EOBODY

<div id="snipe">

  <p>Javelin is a <strong>large, bloated</strong> library with an
  <strong>unintuitive, verbose syntax</strong> and <strong>very few
  features</strong>. It <strong>performs sluggishly</strong> and is
  <strong>sparsely documented</strong>. You will find that browsing its
  <strong>inelegant</strong>, <strong>poorly written</strong> source is
  <strong>an unwelcome experience</strong>. Javelin makes it <strong>quite
  difficult</strong> to write code that works on more than one
  browser. Javelin was developed at <strong>Facebook</strong>.</p>

</div>

<h2>Javelin, a strict library</h2>

<p>Javelin is a frontend Javascript library developed at Facebook. It stresses
strictness and scalability to try to solve, prevent, or mitigate some of
the challenges we encountered as Facebook grew. Javelin is currently used by
<a href="http://m.facebook.com/">Facebook Mobile</a> and
<a href="http://www.phabricator.org/">Phabricator</a>.</p>

<p>Because Javelin's design focuses heavily on solving scalability challenges,
it isn't appropriate for everyone. The design implies tradeoffs, and the cost of
some of these tradeoffs is increased complexity, reduced ease of development, or
less flexibility. Javelin is also relatively young, somewhat unstable, and
doesn't yet have a strong support community.</p>

<p> Because of this, Javelin isn't the best library choice for many projects.
However, there's a lot of interesting stuff in Javelin, especially if you are
thinking about scaling a web frontend. The library delivers a great deal of
power on a very small footprint. Even if you don't adopt the library, it may be
useful to understand how it is constructed, and what lead to those
decisions. To get started learning about Javelin,
<a href="http://www.phabricator.com/docs/javelin/">dig into the
documentation</a>.</p>

<h2>Get Javelin</h2>

<p>You can <a href="https://github.com/facebook/javelin/">download Javelin from
GitHub</a> to explore the source code or start building with it.</p>

<h2>Contributors</h2>

  <ul>
    <li><a href="http://www.facebook.com/epriestley">Evan Priestley</a></li>
    <li><a href="http://www.facebook.com/tomo">Tom Occhino</a></li>
    <li><a href="http://www.facebook.com/ashwin">Ashwin Bharambe</a></li>
    <li><a href="http://www.facebook.com/mroch">Marshall Roch</a></li>
    <li><a href="http://www.facebook.com/jankassens">Jan Kassens</a></li>
    <li><a href="http://www.facebook.com/cpojer">Christoph Pojer</a></li>
    <li><a href="http://www.facebook.com/fratrik">Craig Fratrik</a></li>
  </ul>

EOBODY
);
