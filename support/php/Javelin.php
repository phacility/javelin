<?php

/**
 * Simple PHP library for Javelin server-side support. Allows you to annotate
 * tags with Javelin metadata, and produce Ajax responses in the format Javelin
 * understands.
 */
class Javelin {

  protected static $instance = null;

  protected $metadata = array();
  protected $onload   = array();
  protected $behavior = array();
  protected $dirty    = true;
  protected $block    = 0;

  public static function renderTag($tag, $content, $attributes = array()) {
    $javelin = self::getInstance();

    $classes = array();
    foreach ($attributes as $k => $v) {
      switch ($k) {
        case 'sigil':
          $classes[] = 'FN_'.$v;
          unset($attributes[$k]);
          break;
        case 'meta':
          $id = count($javelin->metadata);
          $javelin->metadata[$id] = $v;
          $classes[] = 'FD_'.$javelin->block.'_'.$id;
          unset($attributes[$k]);
          break;
        case 'mustcapture':
          $classes[] = 'FI_CAPTURE';
          unset($attributes[$k]);
          break;
        default:
          break;
      }
    }

    if (isset($attributes['class'])) {
      $classes[] = $attributes['class'];
    }
    $classes = implode(' ', $classes);
    $attributes['class'] = $classes;

    foreach ($attributes as $k => $v) {
      $v = htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
      $attributes[$k] = ' '.$k.'="'.$v.'"';
    }

    $attributes = implode('', $attributes);

    if ($content === null) {
      return '<'.$tag.$attributes.' />';
    } else {
      return '<'.$tag.$attributes.'>'.$content.'</'.$tag.'>';
    }
  }

  public static function onload($call) {
    $javelin = self::getInstance();
    $javelin->onload[] = 'function(){'.$call.'}';
  }

  public static function initBehavior($behavior, $data = null) {
    $javelin = self::getInstance();
    $javelin->behavior[$behavior][] = $data;
  }

  public static function renderHTMLFooter() {
    $javelin = self::getInstance();

    $data = array();
    if ($javelin->metadata) {
      $json_metadata = json_encode($javelin->metadata);
      $javelin->metadata = array();
    } else {
      $json_metadata = '{}';
    }
    // Even if there is no metadata on the page, Javelin uses the mergeData()
    // call to start dispatching the event queue.
    $data[] = 'JX.Stratcom.mergeData('.$javelin->block.', '.$json_metadata.');';

    if ($javelin->behavior) {
      $behavior = json_encode($javelin->behavior);
      Javelin::onload('JX.initBehaviors('.$behavior.')');
      $javelin->behavior = array();
    }

    if ($javelin->onload) {
      foreach ($javelin->onload as $func) {
        $data[] = 'JX.onload('.$func.');';
      }
    }

    $javelin->dirty = false;

    if ($data) {
      $data = implode("\n", $data);
      return '<script type="text/javascript">//<![CDATA['."\n".
             $data.'//]]></script>';
    } else {
      return '';
    }
  }

  public static function renderAjaxResponse($payload, $error = null) {
    $response = array(
      'error'   => $error,
      'payload' => $payload,
    );

    $javelin = self::getInstance();
    if ($javelin->metadata) {
      $response['javelin_metadata'] = $javelin->metadata;
      $javelin->metadata = array();
    }

    if ($javelin->behavior) {
      $response['javelin_behaviors'] = $javelin->behavior;
      $javelin->behavior = array();
    }

    if ($javelin->onload) {
      throw new Exception(
        "Javelin onload functions have been registered, but the response is ".
        "being rendered as an Ajax response. This is invalid; use behaviors ".
        "instead.");
    }

    $javelin->dirty = false;

    $response = 'for (;;);'.json_encode($response);
    return $response;
  }

  protected function __construct() {
    if (isset($_REQUEST['__metablock__'])) {
      $this->block = $_REQUEST['__metablock__'];
    }
  }

  public function __destruct() {
    if ($this->dirty) {
      throw new Exception(
        "Javelin has behaviors, metadata or onload functions to include in ".
        "the response but you did not call renderHTMLFooter() or ".
        "renderAjaxResponse() after registering them.");
    }
  }

  protected static function getInstance() {
    if (empty(self::$instance)) {
      self::$instance = new Javelin();
    }
    return self::$instance;
  }
}

