#!/bin/sh
if [ "$1" = "" ]; then
  echo 'usage: sync-from-svn.sh <PHP_ROOT>';
  exit 1;
fi

set -x

PROCESS="$1/scripts/javelin/process.php"
STRIP="$1/scripts/javelin/strip.php"


COREFILES="init.js Event.js install.js util.js Stratcom.js"
LIBFILES="behavior.js Request.js Vector.js DOM.js JSON.js"
CONTROLFILES="typeahead/Typeahead.js typeahead/source/TypeaheadSource.js typeahead/source/TypeaheadPreloadedSource.js typeahead/source/TypeaheadOnDemandSource.js typeahead/normalizer/TypeaheadNormalizer.js tokenizer/Tokenizer.js"
WORKFLOWFILES="Mask.js Workflow.js"

for f in $COREFILES; do
  cat $1/html/js/javelin/core/$f | $STRIP > src/$f;
  chmod -x src/$f;
done;

for f in $LIBFILES; do
  cat $1/html/js/javelin/lib/$f | $STRIP > src/$f;
  chmod -x src/$f;
done;

for f in $CONTROLFILES; do
  cat $1/html/js/javelin/lib/control/$f | $STRIP > src/control/$f;
  chmod -x src/control/$f;
done;

for f in $WORKFLOWFILES; do
  cat $1/html/js/javelin/lib/$f | $STRIP > src/$f;
  chmod -x src/$f;
done;

INITFILES="src/init.js"
LIBFILES="src/util.js src/install.js src/Event.js src/Stratcom.js src/behavior.js src/Request.js src/Vector.js src/DOM.js src/JSON.js"
TYPEAHEADFILES="src/control/typeahead/Typeahead.js src/control/typeahead/normalizer/TypeaheadNormalizer.js src/control/typeahead/source/TypeaheadSource.js src/control/typeahead/source/TypeaheadPreloadedSource.js src/control/typeahead/source/TypeaheadOnDemandSource.js src/control/tokenizer/Tokenizer.js"
WORKFLOWFILES="src/Mask.js src/Workflow.js"

cat $INITFILES | $PROCESS > pkg/init.min.js
cat $LIBFILES | $PROCESS > pkg/javelin.min.js
cat $TYPEAHEADFILES | $PROCESS > pkg/typeahead.min.js
cat $WORKFLOWFILES | $PROCESS > pkg/workflow.min.js
cat $INITFILES > pkg/init.dev.js
cat $LIBFILES > pkg/javelin.dev.js
cat $TYPEAHEADFILES > pkg/typeahead.dev.js
cat $WORKFLOWFILES > pkg/workflow.dev.js
