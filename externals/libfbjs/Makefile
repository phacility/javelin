# Copyright (c) 2008-2009 Facebook
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
#     
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# 
# See accompanying file LICENSE.txt.
# 
# @author Marcel Laverdet

CPPFLAGS=-fPIC -Wall -DNOT_FBMAKE=1

ifdef OPT
  CPPFLAGS += -O2
else
  CPPFLAGS += -ggdb -g -O0 -DDEBUG
endif

all: libfbjs.so

install:
	cp libfbjs.so /usr/lib64/libfbjs.so

parser.lex.cpp: parser.ll
	flex -o $@ -d $<

parser.lex.hpp: parser.lex.cpp

parser.yacc.cpp: parser.yy
	bison --debug --verbose -d -o $@ $<

parser.yacc.hpp: parser.yacc.cpp

dmg_fp_dtoa.c:
	curl 'http://www.netlib.org/fp/dtoa.c' -o $@

dmg_fp_g_fmt.c:
	curl 'http://www.netlib.org/fp/g_fmt.c' -o $@

dmg_fp_dtoa.o: dmg_fp_dtoa.c
	$(CC) -fPIC -c $< -o $@ -DIEEE_8087=1 -DNO_HEX_FP=1 -DLong=int32_t -DULong=uint32_t -include stdint.h

dmg_fp_g_fmt.o: dmg_fp_g_fmt.c
	$(CC) -fPIC -c $< -o $@ -DIEEE_8087=1 -DNO_HEX_FP=1 -DLong=int32_t -DULong=uint32_t -include stdint.h

parser.yacc.o: parser.lex.hpp
parser.lex.o: parser.yacc.hpp
parser.o: parser.yacc.hpp
node.o: parser.yacc.hpp
walker.o: node.hpp walker.hpp

libfbjs.a: parser.yacc.o parser.lex.o parser.o node.o walker.o dmg_fp_dtoa.o dmg_fp_g_fmt.o
	$(AR) rc $@ $^
	$(AR) -s $@

libfbjs.so: libfbjs.a
	$(CC) -fPIC -shared $^ -o $@


clean:
	$(RM) -f \
    parser.lex.cpp parser.yacc.cpp parser.yacc.hpp parser.yacc.output \
    libfbjs.so libfbjs.a \
    dmg_fp_dtoa.o dmg_fp_g_fmt.o \
    parser.lex.o parser.yacc.o parser.o node.o walker.o
