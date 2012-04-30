<?php

class JavelinDivinerEngine extends DivinerEngine {

  private $trees;

  public function buildFileContentHashes() {
    $files = array();
    $root = $this->getConfiguration()->getProjectRoot();

    $finder = new FileFinder($root.'/src');
    $finder
      ->excludePath('*/.*')
      ->withSuffix('js')
      ->withType('f')
      ->setGenerateChecksums(true);

    foreach ($finder->find() as $path => $hash) {
      $path = Filesystem::readablePath($path, $root);
      $files[$path] = $hash;
    }

    return $files;
  }

  public function willParseFiles(array $file_map) {

    $root = dirname(phutil_get_library_root('javelin-diviner'));
    $bin = $root.'/jsast/jsast';

    if (!Filesystem::pathExists($bin)) {
      throw new Exception(
        "You must build the 'jsast' binary before you can generate ".
        "Javelin documentation.");
    }

    $futures = array();
    foreach ($file_map as $file => $data) {
      $future = new ExecFuture($bin);
      $future->write($data);
      $futures[$file] = $future;
    }

    foreach (Futures($futures)->limit(8) as $file => $future) {
      $this->trees[$file] = $future->resolveJSON();
    }
  }

  public function parseFile($file, $data) {

    $ast = $this->trees[$file];
    $this->expectNode($ast, 'Program');
    $atoms = $this->parseAST($ast);


    $file_atom = new DivinerFileAtom();
    foreach ($atoms as $atom) {
      $file_atom->addChild($atom);
    }
    $file_atom->setName($file);
    $file_atom->setFile($file);

    $dparser = new PhutilDocblockParser();
    $blocks = $dparser->extractDocblocks($data);

    // Reject the first docblock as a header block.
    array_shift($blocks);

    $map = array();
    foreach ($blocks as $data) {
      list($block, $line) = $data;
      $map[$line] = $block;
    }

    $atoms = $file_atom->getAllChildren();

    $atoms = mpull($atoms, null, 'getLine');
    ksort($atoms);
    end($atoms);
    $last = key($atoms);

    $block_map = array();
    $pointer = null;
    for ($ii = 1; $ii <= $last; $ii++) {
      if (isset($map[$ii])) {
        $pointer = $ii;
      }
      $block_map[$ii] = $pointer;
    }

    foreach ($atoms as $atom) {
      $block_id = $block_map[$atom->getLine()];
      if (isset($map[$block_id])) {
        $atom->setRawDocblock($map[$block_id]);
        unset($map[$block_id]);
      }

      if (($atom instanceof DivinerMethodAtom) ||
          ($atom instanceof DivinerFunctionAtom)) {

        $metadata = $atom->getDocblockMetadata();
        $return = idx($metadata, 'return');
        if ($return) {
          $split = preg_split('/\s+/', trim($return), $limit = 2);
          if (!empty($split[0])) {
            $type = $split[0];
          } else {
            $type = 'wild';
          }

          $docs = null;
          if (!empty($split[1])) {
            $docs = $split[1];
          }

          $dict = array(
            'doctype' => $type,
            'docs'    => $docs,
          );

          $atom->setReturnTypeAttributes($dict);
        }

        $docs = idx($metadata, 'param', '');
        if ($docs) {
          $docs = explode("\n", $docs);
          foreach ($atom->getParameters() as $param => $dict) {
            $doc = array_shift($docs);
            if ($doc) {
              $dict += $this->parseParamDoc($doc);
            }
            $atom->addParameter($param, $dict);
          }

          // Add extra parameters retrieved by arguments variable.
          foreach ($docs as $doc) {
            if ($doc) {
              $atom->addParameter('', $this->parseParamDoc($doc));
            }
          }
        }

      }
    }

    foreach ($atoms as $atom) {
      $atom->setLanguage('js');
      $atom->setFile($file);
    }
    $file_atom->setLanguage('js');

    return array($file_atom);
  }

  protected function parseAST(array $ast) {
    $atoms = array();
    foreach ($this->getNodeChildren($ast) as $child) {
      $more_atoms = array();
      switch ($this->getNodeType($child)) {
        case 'FunctionCall':
          $first = $this->getNodeChild($child, 0);
          if ($this->isNode($first, 'StaticMemberExpression')) {
            $call = $this->getStaticMemberExpressionExpansion($first);
            if ($call == 'JX.install') {
              $arglist = $this->getNodeChild($child, 1);
              $install_what = $this->getNodeChild($arglist, 0);
              $install_name = $this->getNodeValue($install_what);

              $definition = $this->getNodeChild($arglist, 1);
              $class = $this->parseClassDefinition($definition);
              $class->setLine($this->getNodeLine($child));
              $class->setName('JX.'.$install_name);

              if (!$class->getParentClasses() &&
                  ($class->getName() != 'JX.Base')) {
                $class->addParentClass('JX.Base');
              }

              $more_atoms = array($class);
            }
          }
          break;
        case 'Assignment':
          $first = $this->getNodeChild($child, 0);
          if ($this->isNode($first, 'StaticMemberExpression')) {
            $symbol = $this->getStaticMemberExpressionExpansion($first);
            if (!strncmp($symbol, 'JX.', 3)) {
              $func = $this->getNodeChild($child, 1);
              if ($this->isNode($func, 'Operator')) {
                // Assume this must be '||' because the AST we get out of
                // 'jsast' isn't rich enough for us to tell. But we're
                // definitely not getting anywhere otherwise.

                // By associativity rules, this selects the rightmost
                // expression in an '||' chain ("x || y || function ..").
                $func = $this->getNodeChild($func, 1);
              }
              if ($this->isNode($func, 'FunctionExpression')) {
                $method = $this->parseMethod($func, true);
                $method->setName($symbol);
                $method->setLine($this->getNodeLine($child));
                $more_atoms = array($method);
              }
            }
          }
          break;
        default:
          $more_atoms = $this->parseAST($child);
          break;
      }
      foreach ($more_atoms as $atom) {
        $atoms[] = $atom;
      }
    }
    return $atoms;
  }

  protected function parseClassDefinition(array $ast) {
    $class = new DivinerClassAtom();
    foreach ($this->getDictionaryFromObjectLiteral($ast) as $name => $value) {
      switch ($name) {
        case 'members':
        case 'statics':
          $this->expectNode($value, 'ObjectLiteral');
          $atoms = $this->parseInstallationEntries($value);
          foreach ($atoms as $atom) {
            if ($name == 'statics') {
              $atom->setAttribute('static');
            }
            $class->addMethod($atom);
          }
          break;
        case 'construct':
        case 'initialize':
          $method = $this->parseMethod($value);
          $method->setLine($this->getObjectLiteralPropertyLine($ast, $name));
          $method->setName($name);
          if ($name == 'initialize') {
            $method->setAttribute('static');
          }
          $class->addMethod($method);
          break;
        case 'properties':
/*
          $properties = array();
          $pdef = $this->getDictionaryFromObjectLiteral($value);
          foreach ($pdef as $pname => $pval) {
            $prop = new DivinerProperty();
            $prop->setLine($this->getObjectLiteralPropertyLine($value, $pname));
            $pname[0] = strtoupper($pname[0]);
            $prop->setName($pname);
            $class->addProperty($prop);
          }
*/
          break;
        case 'extend':
          $this->expectNode($value, 'StringLiteral');
          $class->addParentClass('JX.'.$this->getNodeValue($value));
          break;
        case 'events':
        case 'canCallAsFunction':
          // echo "{$name}: NOT IMPLEMENTED!\n";
          break;
        default:
          throw new Exception(
            "Unexpected property '{$name}' in Javelin class definition.");
          break;
      }
    }
    return $class;
  }

  protected function parseInstallationEntries(array $ast) {
    $atoms = array();
    foreach ($this->getDictionaryFromObjectLiteral($ast) as $name => $value) {
      if ($this->isNode($value, 'FunctionExpression')) {
        $method = $this->parseMethod($value);
        $method->setName($name);
        if ($name[0] == '_') {
          $method->setAttribute('private');
        }
        $method->setLine($this->getObjectLiteralPropertyLine($ast, $name));
        $atoms[] = $method;
      } else if ($name[0] != '_') {
        // This is maybe-bad but we use it in Stratcom.
      }
    }
    return $atoms;
  }

  protected function parseMethod(array $ast, $as_function = false) {
    $this->expectNode($ast, 'FunctionExpression');
    $arg_list = $this->getNodeChild($ast, 0);
    $this->expectNode($arg_list, 'ArgList');

    if ($as_function) {
      $method = new DivinerFunctionAtom();
    } else {
      $method = new DivinerMethodAtom();
    }

    foreach ($this->getNodeChildren($arg_list) as $child) {
      $this->expectNode($child, 'Identifier');
      $method->addParameter($this->getNodeValue($child));
    }

    return $method;
  }


  protected function failParse(array $ast, $reason) {
    throw new Exception(
      "Parsing failed at line ".$this->getNodeLine($ast).": ".$reason);
  }

  protected function getObjectLiteralPropertyLine(array $ast, $property) {
    $this->expectNode($ast, 'ObjectLiteral');
    foreach ($this->getNodeChildren($ast) as $child) {
      $this->expectNode($child, 'ObjectLiteralProperty');
      $name = $this->getNodeValue($this->getNodeChild($child, 0));
      if ($name == $property) {
        return $this->getNodeLine($child);
      }
    }
    return null;
  }

  protected function getDictionaryFromObjectLiteral(array $ast) {
    $result = array();

    $this->expectNode($ast, 'ObjectLiteral');
    foreach ($this->getNodeChildren($ast) as $child) {
      $this->expectNode($child, 'ObjectLiteralProperty');
      $name = $this->getNodeValue($this->getNodeChild($child, 0));
      $value = $this->getNodeChild($child, 1);

      $result[$name] = $value;
    }

    return $result;
  }

  protected function isNode(array $ast, $of_type) {
    return ($this->getNodeType($ast) == $of_type);
  }

  protected function getNodeType(array $ast) {
    return $ast[0];
  }

  protected function getNodeChildren(array $ast) {
    return $ast[1];
  }

  protected function getNodeChild(array $ast, $n) {
    return $ast[1][$n];
  }

  protected function getNodeLine(array $ast) {
    if (isset($ast[3])) {
      return (int)$ast[3];
    }
    foreach ($this->getNodeChildren($ast) as $child) {
      $line = $this->getNodeLine($child);
      if ($line !== null) {
        return $line;
      }
    }
    return null;
  }

  protected function getNodeValue(array $ast) {
    return $ast[2];
  }

  protected function getStaticMemberExpressionExpansion(array $ast) {
    $this->expectNode($ast, 'StaticMemberExpression');
    $name = array();
    foreach ($this->getNodeChildren($ast) as $child) {
      if ($this->isNode($child, 'StaticMemberExpression')) {
        $name[] = $this->getStaticMemberExpressionExpansion($child);
      } else {
        $this->expectNode($child, 'Identifier');
        $name[] = $this->getNodeValue($child);
      }
    }
    return implode('.', $name);
  }

  protected function expectNode(array $ast, $of_type) {
    if (!$this->isNode($ast, $of_type)) {
      $type = $this->getNodeType($ast);
      $line = $this->getNodeLine($ast);
      if ($line === null) {
        $line = '?';
      }
      throw new Exception(
        "Expected '{$of_type}' node but found '{$type}' (on line {$line}).");
    }
  }

}
