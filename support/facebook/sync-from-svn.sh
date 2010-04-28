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

for f in $COREFILES; do
  cat $1/html/js/javelin/core/$f | $STRIP > src/$f;
  chmod -x src/$f;
done;

for f in $LIBFILES; do
  cat $1/html/js/javelin/lib/$f | $STRIP > src/$f;
  chmod -x src/$f;
done;

INITFILES="src/init.js"
LIBFILES="src/util.js src/install.js src/Event.js src/Stratcom.js src/behavior.js src/Request.js src/Vector.js src/DOM.js src/JSON.js"

cat $INITFILES | $PROCESS > pkg/init.min.js
cat $LIBFILES | $PROCESS > pkg/javelin.min.js
cat $INITFILES > pkg/init.dev.js
cat $LIBFILES > pkg/javelin.dev.js
