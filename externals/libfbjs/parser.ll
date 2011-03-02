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
%{
#include <stdio.h>
#include <string.h>

#ifdef NOT_FBMAKE
#include "parser.hpp"
#else
/**
 * This is a temporary workaround a drawback of fbconfig/fbmake.
 * Fbmake does not include the source directory in the include path
 * when compiling generated files. preprocessor_flags confuses
 * fbconfig dealing with .ll and .yy files.
 * Another workaround without the following change is:
 *   fbmake dbg CXX_FLAGS=-I./libfbjs
 */
#include "libfbjs/parser.hpp"
#endif

using namespace fbjs;

#define YY_USER_ACTION if (yyextra->terminated) return 0;

#ifdef DEBUG_FLEX
#define FBJSBEGIN(a) if(a!=YY_START) { \
  switch(a) { \
    case INITIAL: \
      fprintf(stderr, "BEGIN(INITIAL)\n"); \
      break; \
    case IDENTIFIER: \
      fprintf(stderr, "BEGIN(IDENTIFIER)\n"); \
      break; \
    case DOT: \
      fprintf(stderr, "BEGIN(DOT)\n"); \
      break; \
    case VIRTUAL_SEMICOLON: \
      fprintf(stderr, "BEGIN(VIRTUAL_SEMICOLON)\n"); \
      break; \
    case NO_LINEBREAK: \
      fprintf(stderr, "BEGIN(NO_LINEBREAK)\n"); \
      break; \
    case REGEX: \
      fprintf(stderr, "BEGIN(REGEX)\n"); \
      break; \
    case XML: \
      fprintf(stderr, "BEGIN(XML)\n"); \
      break; \
    case XML_CDATA: \
      fprintf(stderr, "BEGIN(XML_CDATA)\n"); \
      break; \
    default: \
      fprintf(stderr, "BEGIN(%d)\n", a); \
  } \
  BEGIN(a);}
#else
#define FBJSBEGIN(a) BEGIN(a)
#endif

#define parsertok(a) parsertok_(yyg, a);
#define parsertok_xml(a) parsertok_(yyg, a, true);

int parsertok_(void*, int, bool = false);
void terminate(void* yyscanner, const char* str);
%}

%option noyywrap
%option nodefault
%option reentrant
%option bison-bridge bison-locations

%s IDENTIFIER
%x DOT
%x VIRTUAL_SEMICOLON
%s NO_LINEBREAK
%x REGEX
%x XML
%x XML_CDATA
%x XML_PI
FBJSBEGIN(IDENTIFIER);

/* ECMA-262 and ECMA-357 disagree on the definition of whitespace. Note: both
   macros omit \n. You must manually scan for \n and increment yylineno. */
JS_WHITESPACE [ \t\x0b\x0c\xa0\r]*
XML_WHITESPACE [ \t\r]*

%%
<NO_LINEBREAK>{
  \n {
    ++yylloc->first_line;
    BEGIN(IDENTIFIER);
    return t_VIRTUAL_SEMICOLON;
  }
  . {
    BEGIN(IDENTIFIER);
    yyless(0);
  }
}
<INITIAL,IDENTIFIER,DOT,VIRTUAL_SEMICOLON,NO_LINEBREAK>{
  /* start conditon is all, minus REGEX and XML */
  "<!--".*  /* om nom nom */
  "//".*    |
  {JS_WHITESPACE}+ /* om nom nom */
  "/*" {
    char c;
    bool newline = false;
    for (;;) {
      while ((c = yyinput(yyscanner)) != '*' && c != EOF) {
        if (c == '\n') {
          ++yylloc->first_line;
          newline = true;
        }
      }
      if (c == '*') {
        while ((c = yyinput(yyscanner)) == '*');
        if (c == '/') {
          break;
        } else if (c == '\n') {
          ++yylloc->first_line;
          newline = true;
        }
      }
      if (c == EOF) {
        return 0;
        break;
      }
    }
    // This is to properly interpret virtual semicolons, see section 7.4 of E262-3. Essentially, this should parse:
    //   foo = 5/*
    // */bar = 6;
    if (newline) {
      --yylloc->first_line;
      unput('\n');
    }
  }
}
<VIRTUAL_SEMICOLON,INITIAL,IDENTIFIER>{
  "catch"  return parsertok(t_CATCH);
  "finally"  return parsertok(t_FINALLY);
  "in"  return parsertok(t_IN);
  "instanceof"  return parsertok(t_INSTANCEOF);
}
<VIRTUAL_SEMICOLON>{
  "else" {
    if ((yyextra->last_tok == t_RPAREN && (yyextra->last_paren_tok == t_IF || yyextra->last_paren_tok == t_FOR || yyextra->last_paren_tok == t_WHILE)) ||
        yyextra->last_tok == t_SEMICOLON || yyextra->last_tok == t_RCURLY) {
      return parsertok(t_ELSE);
    } else {
      yyless(0);
      FBJSBEGIN(INITIAL);
      return t_VIRTUAL_SEMICOLON;
    }
  }
  "while" {
    if ((yyextra->last_tok == t_RPAREN && (yyextra->last_paren_tok == t_IF || yyextra->last_paren_tok == t_FOR || yyextra->last_paren_tok == t_WHILE)) ||
        (yyextra->last_tok == t_RCURLY && yyextra->last_curly_tok == t_DO) ||
        yyextra->last_tok == t_SEMICOLON || yyextra->last_tok == t_RCURLY) {
      return parsertok(t_WHILE);
    } else {
      yyless(0);
      FBJSBEGIN(INITIAL);
      return t_VIRTUAL_SEMICOLON;
    }
  }
  [a-zA-Z$_0-9]+ {
    yyless(0);
    if (yyextra->last_tok == t_RPAREN &&
        (yyextra->last_paren_tok == t_IF || yyextra->last_paren_tok == t_DO || yyextra->last_paren_tok == t_FOR ||
         (yyextra->last_paren_tok == t_WHILE && yyextra->last_curly_tok != t_DO))) {
      FBJSBEGIN(INITIAL);
    } else {
      FBJSBEGIN(INITIAL);
      return t_VIRTUAL_SEMICOLON;
    }
  }
  \n {
    ++yylloc->first_line;
  }
  . {
    FBJSBEGIN(yyextra->virtual_semicolon_last_state);
    yyless(0);
  }
}
<INITIAL,IDENTIFIER>{
  "break"  return parsertok(t_BREAK);
  "case"  return parsertok(t_CASE);
  "continue"  return parsertok(t_CONTINUE);
  "default"  return parsertok(t_DEFAULT);
  "default"({JS_WHITESPACE}|\n)+"xml"({JS_WHITESPACE}|\n)+"namespace" {
    while (*++yytext) {
      if (*yytext == '\n') {
        ++yylloc->first_line;
      }
    }
    return parsertok(t_XML_DEFAULT_NAMESPACE);
  }
  "delete"  return parsertok(t_DELETE);
  "do"  return parsertok(t_DO);
  "else"  return parsertok(t_ELSE);
  "for"  return parsertok(t_FOR);
  "for"({JS_WHITESPACE}|\n)+"each" {
    while (*++yytext) {
      if (*yytext == '\n') {
        ++yylloc->first_line;
      }
    }
    return parsertok(t_FOR_EACH);
  }
  "function" return parsertok(t_FUNCTION);
  "if"  return parsertok(t_IF);
  "new"  return parsertok(t_NEW);
  "return"  return parsertok(t_RETURN);
  "switch"  return parsertok(t_SWITCH);
  "this"  return parsertok(t_THIS);
  "throw"  return parsertok(t_THROW);
  "try"  return parsertok(t_TRY);
  "typeof"  return parsertok(t_TYPEOF);
  "var"  return parsertok(t_VAR);
  "void"  return parsertok(t_VOID);
  "while"  return parsertok(t_WHILE);
  "with"  return parsertok(t_WITH);
  "const" return parsertok(t_CONST);
  "null"  return parsertok(t_NULL);
  "false"  return parsertok(t_FALSE);
  "true"  return parsertok(t_TRUE);
}
0x[a-fA-F0-9]+ {
  unsigned int val;
  sscanf(yytext, "%x", &val);
  yylval->number = (double)val;
  return parsertok(t_NUMBER);
}
0[0-7]+ {
  unsigned int val;
  sscanf(yytext, "%o", &val);
  yylval->number = (double)val;
  return parsertok(t_NUMBER);
}
[0-9]*\.?[0-9]+[eE][\-+]?[0-9]{1,3}  {
  double val;
  char *se;
  val = strtod(yytext, &se);
  yylval->number = val;
  return parsertok(t_NUMBER);
}
[0-9]+\.? |
[0-9]*\.[0-9]+ {
  yylval->number = atof(yytext);
  return parsertok(t_NUMBER);
}
<INITIAL,IDENTIFIER,DOT>[a-zA-Z$_][a-zA-Z$_0-9]* {
  yylval->string = strdup(yytext);
  return parsertok(t_IDENTIFIER);
}
<DOT>{
  \n ++yylloc->first_line;
  . {
    FBJSBEGIN(INITIAL);
    yyless(0);
  }
}
'|\" {
  std::string str = yytext;
  char c;
  while ((c = yyinput(yyscanner)) != EOF) {
    str += c;
    if (c == yytext[0]) {
      break;
    } else if (c == '\\') {
      c = yyinput(yyscanner);
      if (c == EOF) {
        yyless(0);
        break;
      } else if (c == '\r') {
        str.erase(--str.end());
        c = yyinput(yyscanner);
        if (c != '\n') {
          str += c;
          if (c == yytext[0]) {
            break;
          }
        }
      } else if (c == '\n') {
        str.erase(--str.end());
      } else if (c == EOF) {
        yyless(0);
        break;
      } else {
        str += c;
      }
    } else if (c == '\n' || c == '\r') {
      yyless(0);
      break;
    }
  }
  yylval->string = strdup(str.c_str());
  return parsertok(t_STRING);
}
<IDENTIFIER>"/" FBJSBEGIN(REGEX);
<REGEX>{
  (\[([^\]\\\n]+|\\.)+\]|\\.|[^\/\\\n])*"/"[A-Za-z]* {
    size_t len = strlen(yytext);
    size_t flag_pos = len - 1;
    while (yytext[flag_pos] != '/') {
      --flag_pos;
    }
    // regex
    yylval->string_duple[0] = (char*)malloc(flag_pos + 1);
    memcpy(yylval->string_duple[0], yytext, flag_pos);
    yylval->string_duple[0][flag_pos] = 0;

    // flags
    yylval->string_duple[1] = (char*)malloc(len - flag_pos);
    memcpy(yylval->string_duple[1], yytext + flag_pos + 1, len - flag_pos);

    return parsertok(t_REGEX);
  }
  .|\n {
    return parsertok(t_UNTERMINATED_REGEX_LITERAL);
  }
}
"{" {
  yyextra->curly_stack.push(yyextra->last_tok);
  return parsertok(t_LCURLY);
}
"}" {
  if (yyextra->last_tok != t_LCURLY && yyextra->last_tok != t_SEMICOLON && yyextra->last_tok != t_VIRTUAL_SEMICOLON) {
    yyless(0);
    return parsertok(t_VIRTUAL_SEMICOLON);
  }
  if (yyextra->curly_stack.empty()) {
    // This will ultimately yield a parse error...
    yyextra->last_curly_tok = 0;
  } else {
    yyextra->last_curly_tok = yyextra->curly_stack.top();
    yyextra->curly_stack.pop();
  }
  return parsertok(t_RCURLY);
}
"(" {
  yyextra->paren_stack.push(yyextra->last_tok);
  return parsertok(t_LPAREN);
}
")" {
  if (!yyextra->paren_stack.empty()) { // otherwise, whatever, it's a syntax error anyway...
    yyextra->last_paren_tok = yyextra->paren_stack.top();
    yyextra->paren_stack.pop();
  }
  return parsertok(t_RPAREN);
}
"["    return parsertok(t_LBRACKET);
"]"    return parsertok(t_RBRACKET);
"."    return parsertok(t_PERIOD);
";"    return parsertok(t_SEMICOLON);
","    return parsertok(t_COMMA);
":"    return parsertok(t_COLON);
"?"    return parsertok(t_PLING);
"&&"   return parsertok(t_AND);
"||"   return parsertok(t_OR);
"==="  return parsertok(t_STRICT_EQUAL);
"!=="  return parsertok(t_STRICT_NOT_EQUAL);
"<="   return parsertok(t_LESS_THAN_EQUAL);
">="   return parsertok(t_GREATER_THAN_EQUAL);
"=="   return parsertok(t_EQUAL);
"!="   return parsertok(t_NOT_EQUAL);
"++"   return parsertok(t_INCR);
"--"   return parsertok(t_DECR);
"<<="  return parsertok(t_LSHIFT_ASSIGN);
"<<"   return parsertok(t_LSHIFT);
">>="  return parsertok(t_RSHIFT_ASSIGN);
">>>=" return parsertok(t_RSHIFT3_ASSIGN);
">>>"  return parsertok(t_RSHIFT3);
">>"   return parsertok(t_RSHIFT);
"+="   return parsertok(t_PLUS_ASSIGN);
"-="   return parsertok(t_MINUS_ASSIGN);
<INITIAL,VIRTUAL_SEMICOLON>"/=" return parsertok(t_DIV_ASSIGN);
"*="   return parsertok(t_MULT_ASSIGN);
"%="   return parsertok(t_MOD_ASSIGN);
"&="   return parsertok(t_BIT_AND_ASSIGN);
"|="   return parsertok(t_BIT_OR_ASSIGN);
"^="   return parsertok(t_BIT_XOR_ASSIGN);
"<"    return parsertok(t_LESS_THAN);
">"    return parsertok(t_GREATER_THAN);
"+"    return parsertok(t_PLUS);
"-"    return parsertok(t_MINUS);
"*"    return parsertok(t_MULT);
"/"    return parsertok(t_DIV);
"%"    return parsertok(t_MOD);
"|"    return parsertok(t_BIT_OR);
"&"    return parsertok(t_BIT_AND);
"^"    return parsertok(t_BIT_XOR);
"!"    return parsertok(t_NOT);
"~"    return parsertok(t_BIT_NOT);
"="    return parsertok(t_ASSIGN);
"@"    return parsertok(t_XML_ATTRIBUTE);
".."   return parsertok(t_XML_DESCENDENT);
"::"   return parsertok(t_XML_QUALIFIER);
<XML>{
  [a-zA-Z_][a-zA-Z0-9.\-_]* {
    yylval->string = strdup(yytext);
    return parsertok(t_XML_NAME_FRAGMENT);
  }
  {XML_WHITESPACE}+ {
    yylval->string = strdup(yytext);
    return parsertok(t_XML_WHITESPACE);
  }
  \n {
    ++yylloc->first_line;
    yylval->string = strdup(yytext);
    return parsertok(t_XML_WHITESPACE);
  }
  "<![CDATA[" {
    FBJSBEGIN(XML_CDATA);
  }
  "<!--"([^\-\n]+|-[^\-\n])+"-->" {
    yytext[yyleng - 3] = 0;
    yylval->string = strdup(yytext + 4);
    return t_XML_COMMENT;
  }
  "<?" {
    FBJSBEGIN(XML_PI);
  }
  [^:={}<>"'/& \t\r\n]+ {
    yylval->string = strdup(yytext);
    return parsertok(t_XML_CDATA);
  }
  "&amp;" {
    yylval->string = strdup("&");
    return parsertok(t_XML_CDATA);
  }
  "&lt;" {
    yylval->string = strdup("<");
    return parsertok(t_XML_CDATA);
  }
  "&gt;" {
    yylval->string = strdup(">");
    return parsertok(t_XML_CDATA);
  }
  "&apos;" {
    yylval->string = strdup("'");
    return parsertok(t_XML_CDATA);
  }
  "&quot;" {
    yylval->string = strdup("\"");
    return parsertok(t_XML_CDATA);
  }
  "&" {
    terminate(yyscanner, "invalid entity");
    return 0;
  }
  ":" return parsertok(t_COLON);
  "=" return parsertok(t_ASSIGN);
  "{" return parsertok(t_LCURLY);
  "}" return parsertok(t_RCURLY);
  "<" return parsertok(t_LESS_THAN);
  ">" return parsertok_xml(t_GREATER_THAN);
  \" return parsertok(t_XML_QUOTE);
  \' return parsertok(t_XML_APOS);
  "/" return parsertok(t_DIV);
  "</" return parsertok(t_XML_LT_DIV);
}
<XML_CDATA>{
  [^\]\n]+ {
    yymore();
  }
  \n {
    ++yylloc->first_line;
    yymore();
  }
  "]" {
    yymore();
  }
  "]]>" {
    /* 3 is length of "]]>" */
    yytext[yyleng - 3] = 0;
    yylval->string = strdup(yytext);
    FBJSBEGIN(XML);
    return t_XML_CDATA;
  }
}
<XML_PI>{
  [^?\n]+ {
    yymore();
  }
  \n {
    ++yylloc->first_line;
    yymore();
  }
  "?" {
    yymore();
  }
  "?>" {
    /* 2 is length of "]]>" */
    yytext[yyleng - 2] = 0;
    yylval->string = strdup(yytext);
    FBJSBEGIN(XML);
    return t_XML_PI;
  }
}
\n {
  ++yylloc->first_line;
  if (yyextra->last_tok == t_IDENTIFIER || yyextra->last_tok == t_NUMBER || yyextra->last_tok == t_STRING ||
    yyextra->last_tok == t_REGEX || yyextra->last_tok == t_TRUE || yyextra->last_tok == t_FALSE ||
    yyextra->last_tok == t_RPAREN || yyextra->last_tok == t_RCURLY || yyextra->last_tok == t_RBRACKET ||
    yyextra->last_tok == t_NULL || yyextra->last_tok == t_THIS ||
	(yyextra->last_tok_xml && yyextra->last_tok == t_GREATER_THAN)
	) {
    yyextra->virtual_semicolon_last_state = YY_START;
    FBJSBEGIN(VIRTUAL_SEMICOLON);
    // Not to spec... sec 7.9.1
  }
}
<<EOF>> {
  if (yyextra->last_tok != t_VIRTUAL_SEMICOLON && yyextra->last_tok != t_SEMICOLON) {
    return parsertok(t_VIRTUAL_SEMICOLON);
  } else {
    return 0;
  }
}
.|\n {
  // Syntax error!
  return yytext[0];
}
%%

int parsertok_(void* guts, int tok, bool was_xml) {
  yyguts_t *yyg = (struct yyguts_t*)guts;
  if (YY_START != XML) {
  switch (tok) {
    case t_IDENTIFIER:
    case t_NUMBER:
    case t_STRING:
    case t_REGEX:
    case t_INCR:
    case t_DECR:
    case t_RBRACKET:
    case t_RPAREN:
    case t_FALSE:
    case t_NULL:
    case t_THIS:
    case t_TRUE:
      FBJSBEGIN(INITIAL);
      break;
    case t_CONTINUE:
    case t_BREAK:
    case t_RETURN:
    case t_THROW:
      FBJSBEGIN(NO_LINEBREAK);
      break;
    case t_PERIOD:
      FBJSBEGIN(DOT);
      break;
      case '>':
		FBJSBEGIN(was_xml ? INITIAL : IDENTIFIER);
		break;
    default:
      FBJSBEGIN(IDENTIFIER);
      break;
  }
  }
  yyextra->last_tok = tok;
  yyextra->last_tok_xml = was_xml;
#ifdef DEBUG_FLEX
  fprintf(stderr, "--> %s\n", yytokname(tok));
#endif
  return tok;
}

void fbjs_push_xml_state(void* guts) {
  yyguts_t *yyg = static_cast<yyguts_t*>(guts);
  yyextra->pre_xml_stack.push(YY_START);
  FBJSBEGIN(XML);
}

void fbjs_push_xml_embedded_expression_state(void* guts) {
  yyguts_t *yyg = static_cast<yyguts_t*>(guts);
  yyextra->pre_xml_stack.push(YY_START);
  FBJSBEGIN(IDENTIFIER);
}

void fbjs_pop_xml_state(void* guts) {
  yyguts_t *yyg = static_cast<yyguts_t*>(guts);
  FBJSBEGIN(yyextra->pre_xml_stack.top());
  yyextra->pre_xml_stack.pop();
}
