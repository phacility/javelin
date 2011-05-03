#!/bin/sh
set -x
set -e

ROOT=`dirname $0`"/../"
(cd ${ROOT}externals/libfbjs && make)
(cd ${ROOT}support/javelinsymbols && make)
(cd ${ROOT}support/jsast && make)
(cd ${ROOT}support/jsxmin && make)


