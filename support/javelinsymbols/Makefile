EXTERNALS=../../externals/
LIBFBJS=$(EXTERNALS)libfbjs/

javelinsymbols: javelinsymbols.cpp
	$(CXX) -o $@ -Wall -I$(EXTERNALS) $^ $(LIBFBJS)libfbjs.a

clean:
  rm -rf javelinsymbols.o
