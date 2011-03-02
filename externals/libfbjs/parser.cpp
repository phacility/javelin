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

#include "node.hpp"
#include "parser.hpp"
#ifdef DEBUG_BISON
extern int yydebug;
#endif
using namespace std;
using namespace fbjs;

void* fbjs_init_parser(fbjs_parse_extra* extra) {

  // Initialize the scanner.
  void* scanner;
  yylex_init_extra(extra, &scanner);
  extra->error = NULL;
  extra->error_line = 0;
  extra->terminated = false;
  extra->lineno = 1;
  extra->last_tok = 0;
  extra->last_paren_tok = 0;

  // Debug stuff
#ifdef DEBUG_BISON
  yydebug = 1;
#endif
#ifdef DEBUG_FLEX
  yyset_debug(1, scanner);
#endif

  return scanner;
}

void fbjs_cleanup_parser(fbjs_parse_extra* extra, void* scanner) {
  yylex_destroy(scanner);
  if (extra->error != NULL) {
    string error(extra->error);
    free(extra->error);
    throw ParseException(error, extra->error_line);
  }
}

//
// Parse from a file
NodeProgram::NodeProgram(FILE* file, node_parse_enum opts /* = PARSE_NONE */) : Node(1) {
  fbjs_parse_extra extra;
  void* scanner = fbjs_init_parser(&extra);
  extra.opts = opts;
  yyrestart(file, scanner); // read from file
  yyparse(scanner, this);
  fbjs_cleanup_parser(&extra, scanner);
}

//
// Parser from a string
NodeProgram::NodeProgram(const char* str, node_parse_enum opts /* = PARSE_NONE */) : Node(1) {
  fbjs_parse_extra extra;
  void* scanner = fbjs_init_parser(&extra);
  extra.opts = opts;
  yy_scan_string(str, scanner); // read from string
  yyparse(scanner, this);
  fbjs_cleanup_parser(&extra, scanner);
}
