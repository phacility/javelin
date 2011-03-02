/**
* Copyright (c) 2008-2009 Facebook
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* See accompanying file LICENSE.txt.
*
* @author Marcel Laverdet 
*/

#pragma once
#include <stdio.h>
#include <string.h>
#include <stack>

//#define DEBUG_FLEX
//#define DEBUG_BISON

#define YY_EXTRA_TYPE fbjs_parse_extra*
#define YY_USER_INIT yylloc->first_line = 1

#include "node.hpp"

#ifdef NOT_FBMAKE
#include "parser.yacc.hpp"
#else
// Work around fbmake issue, see parser.ll for explanation.
#include "libfbjs/parser.yy.h"
#endif
struct fbjs_parse_extra {
  char* error;
  int error_line;
  bool terminated;
  std::stack<int> paren_stack;
  std::stack<int> curly_stack;
  std::stack<int> pre_xml_stack;
  int virtual_semicolon_last_state;
  int last_tok;
  bool last_tok_xml;
  int last_paren_tok;
  int last_curly_tok;
  int lineno;
  fbjs::node_parse_enum opts;
};

// Why the hell doesn't flex provide a header file?
// edit: actually I think it does I just can't find it on this damn system.
int yylex(YYSTYPE* param, YYLTYPE* yylloc, void* scanner);
int yylex_init_extra(YY_EXTRA_TYPE user_defined, void** scanner);
int yylex_destroy(void* scanner);
YY_EXTRA_TYPE yyget_extra(void* scanner);
YYLTYPE* yyget_lloc(void* yyscanner);
void yyset_extra(YY_EXTRA_TYPE arbitrary_data, void* scanner);
void yyset_debug(int bdebug, void* yyscanner);
void yyrestart(FILE* input_file, void* yyscanner);
int yyparse(void* yyscanner, fbjs::Node* root);
const char* yytokname(int tok);
#ifndef FLEX_SCANNER
void* yy_scan_string(const char *yy_str, void* yyscanner);
#endif
