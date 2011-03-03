EXTERNALS=../../externals/
LIBFBJS=$(EXTERNALS)libfbjs/

CPPFLAGS=-fPIC -Wall -DNOT_FBMAKE=1

ifdef OPT
  CPPFLAGS += -O2
else
  CPPFLAGS += -ggdb -g -O0 -DDEBUG
endif

jsast: jsast.cpp
	$(CXX) $(CPPFLAGS) -o $@ -Wall -I$(EXTERNALS) $^ $(LIBFBJS)libfbjs.a

clean:
	rm -rf jsast
