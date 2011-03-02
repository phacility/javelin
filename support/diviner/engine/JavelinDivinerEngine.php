<?php

class JavelinDivinerEngine extends DivinerEngine {

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
/*
    $futures = array();
    foreach ($file_map as $file => $data) {
      $futures[$file] = xhpast_get_parser_future($data);
    }

    foreach (Futures($futures)->limit(8) as $file => $future) {
      $this->trees[$file] = XHPASTTree::newFromDataAndResolvedExecFuture(
        $file_map[$file],
        $future->resolve());
    }
*/
  }

  public function parseFile($file, $data) {
    return array();
  }


}
