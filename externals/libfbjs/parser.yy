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
  #include <string.h>
  #ifdef NOT_FBMAKE
  #include "parser.hpp"
  #else
  // Work around fbconfig/fbmake issue. See parser.ll for explanation
  #include "libfbjs/parser.hpp"
  #endif
%}

%union {
  double number;
  char* string;
  char* string_duple[2];
  fbjs::node_assignment_t assignment;
  size_t size;
  fbjs::Node* node;
  fbjs::Node* duple[2];
}

%{
  extern int yydebug;
  using namespace fbjs;
  #define yylineno (unsigned int)(yylloc.first_line)
  #define parsererror(str) yyerror(&yylloc, yyscanner, NULL, str)
  #define require_support(flag, error) \
    if (!(yyget_extra(yyscanner)->opts & flag)) { \
      terminate(yyscanner, error); \
      break; \
    }

  void fbjs_push_xml_state(void* guts);
  void fbjs_push_xml_embedded_expression_state(void* guts);
  void fbjs_pop_xml_state(void* guts);

  void terminate(void* yyscanner, const char* str) {
    fbjs_parse_extra* extra = yyget_extra(yyscanner);
    if (!extra->terminated) {
      YYLTYPE* loc = yyget_lloc(yyscanner);
      extra->error = strdup(str);
      extra->error_line = loc->first_line;
      extra->terminated = true;
    }
  }

  void yyerror(YYLTYPE* yyloc, void* yyscanner, void* node, const char* str) {
    terminate(yyscanner, str);
  }

%}

%locations
%pure-parser
%parse-param { void* yyscanner }
%parse-param { Node* root }
%lex-param { void* yyscanner }
%error-verbose

// Basic tokens
%token t_LCURLY t_RCURLY
%token t_LPAREN t_RPAREN
%token t_LBRACKET t_RBRACKET
%token t_SEMICOLON t_VIRTUAL_SEMICOLON
%token t_BREAK t_CASE t_CATCH t_CONTINUE t_DEFAULT t_DO t_FINALLY t_FOR t_FOR_EACH
%token t_FUNCTION t_IF t_IN t_INSTANCEOF t_RETURN t_SWITCH t_THIS t_THROW t_TRY
%token t_VAR t_WHILE t_WITH t_CONST t_NULL t_FALSE t_TRUE
%token t_XML_QUOTE t_XML_APOS t_XML_LT_DIV t_XML_DEFAULT_NAMESPACE

// Special if \ else associativity
%nonassoc p_IF
%nonassoc t_ELSE

// Tokens with a value
%token<number> t_NUMBER
%token<string> t_IDENTIFIER t_STRING
%token<string_duple> t_REGEX
%token<string> t_XML_NAME_FRAGMENT t_XML_CDATA t_XML_WHITESPACE t_XML_COMMENT t_XML_PI

// Operators + associativity
%token t_COMMA
%right t_RSHIFT3_ASSIGN t_RSHIFT_ASSIGN t_LSHIFT_ASSIGN t_BIT_XOR_ASSIGN t_BIT_OR_ASSIGN t_BIT_AND_ASSIGN t_MOD_ASSIGN t_DIV_ASSIGN t_MULT_ASSIGN t_MINUS_ASSIGN t_PLUS_ASSIGN t_ASSIGN
%token t_PLING t_COLON
%left t_OR
%left t_AND
%left t_BIT_OR
%left t_BIT_XOR
%left t_BIT_AND
%left t_EQUAL t_NOT_EQUAL t_STRICT_EQUAL t_STRICT_NOT_EQUAL
%left t_LESS_THAN_EQUAL t_GREATER_THAN_EQUAL t_LESS_THAN t_GREATER_THAN t_IN t_INSTANCEOF
%left t_LSHIFT t_RSHIFT t_RSHIFT3
%left t_PLUS t_MINUS
%left t_DIV t_MULT t_MOD
%right t_NOT t_BIT_NOT t_INCR t_DECR t_DELETE t_TYPEOF t_VOID
%nonassoc p_POSTFIX
%left t_XML_ATTRIBUTE
%token t_NEW t_PERIOD t_XML_DESCENDENT t_XML_QUALIFIER

// Literals
%type<node> null_literal boolean_literal numeric_literal regex_literal string_literal array_literal element_list object_literal property_name property_name_and_value_list

// Expressions
%type<node> primary_expression_no_statement primary_expression member_expression new_expression call_expression left_hand_side_expression pre_in_expression post_in_expression conditional_expression assignment_expression expression expression_opt
%type<node> post_in_expression_no_in conditional_expression_no_in assignment_expression_no_in expression_no_in expression_no_in_opt
%type<node> member_expression_no_statement new_expression_no_statement call_expression_no_statement left_hand_side_expression_no_statement pre_in_expression_no_statement post_in_expression_no_statement conditional_expression_no_statement assignment_expression_no_statement expression_no_statement

// Shared expression primitives
%type<node> identifier arguments argument_list
%type<assignment> assignment_operator
%type<size> elison

// Statements
%type<node> statement block statement_list source_element
%type<node> variable_statement variable_declaration_list variable_declaration identifier_typehint_permitted initializer
%type<node> variable_declaration_list_no_in variable_declaration_no_in initializer_no_in
%type<node> empty_statement expression_statement if_statement iteration_statement continue_statement break_statement return_statement with_statement switch_statement
%type<node> case_block case_clauses_opt case_clauses labelled_statement
%type<duple> case_clause default_clause
%type<node> throw_statement try_statement finally
%type<duple> catch

// Functions
%type<node> function_expression function_declaration formal_parameter_list function_body

// E4X / XML
%type<node> xml_literal
%type<node> xml_element xml_element_content xml_element_content_tag
%type<node> xml_tag_content xml_name xml_tag_name
%type<node> xml_attribute_list_opt xml_attribute_list xml_attribute_value
%type<node> xml_cdata_no_quote xml_cdata_no_apos xml_cdata_xml_content
%type<string> xml_cdata_fragment xml_cdata_fragment_attr
%type<node> xml_embedded_expression
%type<node> property_identifier attribute_identifier property_selector qualified_identifier wildcard_identifier

// Errors
%token t_UNTERMINATED_REGEX_LITERAL

%start program
%%

//
// Big fancy reductions
program:
    statement_list {
      root->appendChild($1);
    }
;

semicolon:
    t_SEMICOLON
|   t_VIRTUAL_SEMICOLON
;

statement_list:
    source_element {
      // Silly hack since my awesome lexer sticks `t_VIRTUAL_SEMICOLON's all
      // over the place which ends up creating tons of `NodeEmptyExpression's
      if (dynamic_cast<NodeEmptyExpression*>($1) == NULL) {
        $$ = (new NodeStatementList(yylineno))->appendChild($1);
      } else {
        delete $1;
        $$ = new NodeStatementList(yylineno);
      }
    }
|   statement_list source_element {
      $$ = $1;
      if (dynamic_cast<NodeEmptyExpression*>($2) == NULL) {
        $$->appendChild($2);
      } else {
        delete $2;
      }
    }
;

source_element:
    statement
|   function_declaration
;

//
// Literal reductions
null_literal:
    t_NULL {
      $$ = new NodeNullLiteral(yylineno);
    }
;

boolean_literal:
    t_TRUE {
      $$ = new NodeBooleanLiteral(true, yylineno);
    }
|   t_FALSE {
      $$ = new NodeBooleanLiteral(false, yylineno);
    }
;

numeric_literal:
    t_NUMBER {
      $$ = new NodeNumericLiteral($1, yylineno);
    }
;

regex_literal:
    t_REGEX {
      $$ = new NodeRegexLiteral($1[0], $1[1], yylineno);
      free($1[0]);
      free($1[1]);
    }
;

string_literal:
    t_STRING {
      $$ = new NodeStringLiteral($1, true, yylineno);
      free($1);
    }
;

array_literal:
    t_LBRACKET elison t_RBRACKET {
      $$ = (new NodeArrayLiteral(yylineno));
      for (size_t i = 0; i < $2 + 1; i++) {
        $$->appendChild(new NodeEmptyExpression(yylineno));
      }
    }
|   t_LBRACKET t_RBRACKET {
      $$ = new NodeArrayLiteral(yylineno);
    }
|   t_LBRACKET element_list t_RBRACKET {
      $$ = $2;
    }
|   t_LBRACKET element_list elison t_RBRACKET {
       $$ = $2;
       for (size_t i = 0; i < $3; i++) {
         $$->appendChild(new NodeEmptyExpression(yylineno));
       }
    }
;

element_list:
    elison assignment_expression {
      $$ = (new NodeArrayLiteral(yylineno));
      for (size_t i = 0; i < $1; i++) {
        $$->appendChild(new NodeEmptyExpression(yylineno));
      }
      $$->appendChild($2);
    }
|   assignment_expression {
      $$ = (new NodeArrayLiteral(yylineno))->appendChild($1);
    }
|   element_list elison assignment_expression {
      $$ = $1;
      for (size_t i = 1; i < $2; i++) {
        $$->appendChild(new NodeEmptyExpression(yylineno));
      }
      $$->appendChild($3);
    }
;

elison:
    t_COMMA {
      $$ = 1;
    }
|   elison t_COMMA {
      $$++;
    }
;

object_literal:
    t_LCURLY t_RCURLY {
      $$ = new NodeObjectLiteral(yylineno);
    }
|   t_LCURLY property_name_and_value_list t_VIRTUAL_SEMICOLON t_RCURLY { /* note the t_VIRTUAL_SEMICOLON hack */
      $$ = $2;
    }
|   t_LCURLY property_name_and_value_list t_COMMA t_VIRTUAL_SEMICOLON t_RCURLY {
      require_support(PARSE_OBJECT_LITERAL_ELISON, "object literal elisons not supported");
      $$ = $2;
    }

;

property_name:
    identifier
|   string_literal
|   numeric_literal
;

property_name_and_value_list:
    property_name t_COLON assignment_expression {
      $$ = (new NodeObjectLiteral(yylineno))->appendChild((new NodeObjectLiteralProperty(yylineno))->appendChild($1)->appendChild($3));
    }
|   property_name_and_value_list t_COMMA property_name t_COLON assignment_expression {
      $$ = $1->appendChild((new NodeObjectLiteralProperty(yylineno))->appendChild($3)->appendChild($5));
    }
;

//
// Shared expression primitives
identifier:
    t_IDENTIFIER {
      $$ = new NodeIdentifier($1, yylineno);
      free($1);
    }
;

arguments:
    t_LPAREN t_RPAREN {
      $$ = new NodeArgList(yylineno);
    }
|   t_LPAREN argument_list t_RPAREN {
      $$ = $2;
    }
;

argument_list:
    assignment_expression {
      $$ = (new NodeArgList(yylineno))->appendChild($1);
    }
|   argument_list t_COMMA assignment_expression {
      $$ = $1->appendChild($3);
    }
;

assignment_operator:
    t_ASSIGN {
      $$ = ASSIGN;
    }
|   t_MULT_ASSIGN {
      $$ = MULT_ASSIGN;
    }
|   t_DIV_ASSIGN {
      $$ = DIV_ASSIGN;
    }
|   t_MOD_ASSIGN {
      $$ = MOD_ASSIGN;
    }
|   t_PLUS_ASSIGN {
      $$ = PLUS_ASSIGN;
    }
|   t_MINUS_ASSIGN {
      $$ = MINUS_ASSIGN;
    }
|   t_LSHIFT_ASSIGN {
      $$ = LSHIFT_ASSIGN;
    }
|   t_RSHIFT_ASSIGN {
      $$ = RSHIFT_ASSIGN;
    }
|   t_RSHIFT3_ASSIGN {
      $$ = RSHIFT3_ASSIGN;
    }
|   t_BIT_AND_ASSIGN {
      $$ = BIT_AND_ASSIGN;
    }
|   t_BIT_XOR_ASSIGN {
      $$ = BIT_XOR_ASSIGN;
    }
|   t_BIT_OR_ASSIGN {
      $$ = BIT_OR_ASSIGN;
    }
;

//
// Expression reductions
primary_expression_no_statement:
    t_THIS {
      $$ = new NodeThis(yylineno);
    }
|   identifier
|   null_literal
|   boolean_literal
|   numeric_literal
|   string_literal
|   regex_literal /* this isn't an expansion of literal in ECMA-262... mistake? */
|   array_literal
|   t_LPAREN expression t_RPAREN {
      $$ = (new NodeParenthetical(yylineno))->appendChild($2);
    }
;

primary_expression:
    primary_expression_no_statement
|   object_literal
|   function_expression {
      $$ = $1;
    }
;

member_expression:
    primary_expression
|   member_expression t_LBRACKET expression t_RBRACKET {
      $$ = (new NodeDynamicMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   member_expression t_PERIOD identifier {
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   t_NEW member_expression arguments {
      $$ = (new NodeFunctionConstructor(yylineno))->appendChild($2)->appendChild($3);
    }
;

new_expression:
    member_expression
|   t_NEW new_expression {
      $$ = (new NodeFunctionConstructor(yylineno))->appendChild($2)->appendChild(new NodeArgList(yylineno));
    }
;

call_expression:
    member_expression arguments {
      $$ = (new NodeFunctionCall(yylineno))->appendChild($1)->appendChild($2);
    }
|   call_expression arguments {
      $$ = (new NodeFunctionCall(yylineno))->appendChild($1)->appendChild($2);
    }
|   call_expression t_LBRACKET expression t_RBRACKET {
      $$ = (new NodeDynamicMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   call_expression t_PERIOD identifier {
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
;

left_hand_side_expression:
    new_expression
|   call_expression
;

pre_in_expression:
    left_hand_side_expression
|   pre_in_expression t_INCR %prec p_POSTFIX {
      $$ = (new NodePostfix(INCR_POSTFIX, yylineno))->appendChild($1);
    }
|   pre_in_expression t_DECR %prec p_POSTFIX {
      $$ = (new NodePostfix(DECR_POSTFIX, yylineno))->appendChild($1);
    }
|   t_DELETE pre_in_expression {
      $$ = (new NodeUnary(DELETE, yylineno))->appendChild($2);
    }
|   t_VOID pre_in_expression {
      $$ = (new NodeUnary(VOID, yylineno))->appendChild($2);
    }
|   t_TYPEOF pre_in_expression {
      $$ = (new NodeUnary(TYPEOF, yylineno))->appendChild($2);
    }
|   t_INCR pre_in_expression {
      $$ = (new NodeUnary(INCR_UNARY, yylineno))->appendChild($2);
      if (!static_cast<NodeExpression*>($2)->isValidlVal()) {
        parsererror("invalid increment operand");
        $$ = NULL;
      }
    }
|   t_DECR pre_in_expression {
      $$ = (new NodeUnary(DECR_UNARY, yylineno))->appendChild($2);
      if (!static_cast<NodeExpression*>($2)->isValidlVal()) {
        parsererror("invalid decrement operand");
        $$ = NULL;
      }
    }
|   t_PLUS pre_in_expression {
      $$ = (new NodeUnary(PLUS_UNARY, yylineno))->appendChild($2);
    }
|   t_MINUS pre_in_expression {
      $$ = (new NodeUnary(MINUS_UNARY, yylineno))->appendChild($2);
    }
|   t_BIT_NOT pre_in_expression {
      $$ = (new NodeUnary(BIT_NOT_UNARY, yylineno))->appendChild($2);
    }
|   t_NOT pre_in_expression {
      $$ = (new NodeUnary(NOT_UNARY, yylineno))->appendChild($2);
    }
|   pre_in_expression t_MULT pre_in_expression {
      $$ = (new NodeOperator(MULT, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_DIV pre_in_expression {
      $$ = (new NodeOperator(DIV, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_MOD pre_in_expression {
      $$ = (new NodeOperator(MOD, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_PLUS pre_in_expression {
      $$ = (new NodeOperator(PLUS, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_MINUS pre_in_expression {
      $$ = (new NodeOperator(MINUS, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_LSHIFT pre_in_expression {
      $$ = (new NodeOperator(LSHIFT, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_RSHIFT pre_in_expression {
      $$ = (new NodeOperator(RSHIFT, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression t_RSHIFT3 pre_in_expression {
      $$ = (new NodeOperator(RSHIFT3, yylineno))->appendChild($1)->appendChild($3);
    }
;

post_in_expression:
    pre_in_expression
|   post_in_expression t_LESS_THAN post_in_expression {
      $$ = (new NodeOperator(LESS_THAN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_GREATER_THAN post_in_expression {
      $$ = (new NodeOperator(GREATER_THAN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_LESS_THAN_EQUAL post_in_expression {
      $$ = (new NodeOperator(LESS_THAN_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_GREATER_THAN_EQUAL post_in_expression {
      $$ = (new NodeOperator(GREATER_THAN_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_INSTANCEOF post_in_expression {
      $$ = (new NodeOperator(INSTANCEOF, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_IN post_in_expression {
      $$ = (new NodeOperator(IN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_EQUAL post_in_expression {
      $$ = (new NodeOperator(EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_NOT_EQUAL post_in_expression {
      $$ = (new NodeOperator(NOT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_STRICT_EQUAL post_in_expression {
      $$ = (new NodeOperator(STRICT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_STRICT_NOT_EQUAL post_in_expression {
      $$ = (new NodeOperator(STRICT_NOT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_BIT_AND post_in_expression {
      $$ = (new NodeOperator(BIT_AND, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_BIT_XOR post_in_expression {
      $$ = (new NodeOperator(BIT_XOR, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_BIT_OR post_in_expression {
      $$ = (new NodeOperator(BIT_OR, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_AND post_in_expression {
      $$ = (new NodeOperator(AND, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression t_OR post_in_expression {
      $$ = (new NodeOperator(OR, yylineno))->appendChild($1)->appendChild($3);
    }
;

conditional_expression:
    post_in_expression
|   post_in_expression t_PLING assignment_expression t_COLON assignment_expression {
      $$ = (new NodeConditionalExpression(yylineno))->appendChild($1)->appendChild($3)->appendChild($5);
    }
;

assignment_expression:
    conditional_expression
|   left_hand_side_expression assignment_operator assignment_expression {
      if (!static_cast<NodeExpression*>($1)->isValidlVal()) {
        parsererror("invalid assignment left-hand side");
        $$ = NULL;
      } else {
        $$ = (new NodeAssignment($2, yylineno))->appendChild($1)->appendChild($3);
      }
    }
;

expression:
    assignment_expression
|   expression t_COMMA assignment_expression {
      $$ = (new NodeOperator(COMMA, yylineno))->appendChild($1)->appendChild($3);
    }
;

expression_opt:
    /* empty */ {
      $$ = new NodeEmptyExpression(yylineno);
    }
|   expression
;

//
// Expression reductions (no in)
post_in_expression_no_in:
    pre_in_expression
|   post_in_expression_no_in t_LESS_THAN post_in_expression {
      $$ = (new NodeOperator(LESS_THAN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_GREATER_THAN post_in_expression {
      $$ = (new NodeOperator(GREATER_THAN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_LESS_THAN_EQUAL post_in_expression {
      $$ = (new NodeOperator(LESS_THAN_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_GREATER_THAN_EQUAL post_in_expression {
      $$ = (new NodeOperator(GREATER_THAN_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_INSTANCEOF post_in_expression {
      $$ = (new NodeOperator(INSTANCEOF, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_EQUAL post_in_expression {
      $$ = (new NodeOperator(EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_NOT_EQUAL post_in_expression {
      $$ = (new NodeOperator(NOT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_STRICT_EQUAL post_in_expression {
      $$ = (new NodeOperator(STRICT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_STRICT_NOT_EQUAL post_in_expression {
      $$ = (new NodeOperator(STRICT_NOT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_BIT_AND post_in_expression {
      $$ = (new NodeOperator(BIT_AND, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_BIT_XOR post_in_expression {
      $$ = (new NodeOperator(BIT_XOR, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_BIT_OR post_in_expression {
      $$ = (new NodeOperator(BIT_OR, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_AND post_in_expression {
      $$ = (new NodeOperator(AND, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_in t_OR post_in_expression {
      $$ = (new NodeOperator(OR, yylineno))->appendChild($1)->appendChild($3);
    }
;

conditional_expression_no_in:
    post_in_expression_no_in
|   post_in_expression_no_in t_PLING assignment_expression_no_in t_COLON assignment_expression_no_in {
      $$ = (new NodeConditionalExpression(yylineno))->appendChild($1)->appendChild($3)->appendChild($5);
    }
;

assignment_expression_no_in:
    conditional_expression_no_in
|   left_hand_side_expression assignment_operator assignment_expression_no_in {
      if (!static_cast<NodeExpression*>($1)->isValidlVal()) {
        parsererror("invalid assignment left-hand side");
        $$ = NULL;
      } else {
        $$ = (new NodeAssignment($2, yylineno))->appendChild($1)->appendChild($3);
      }
    }
;

expression_no_in:
    assignment_expression_no_in
|   expression_no_in t_COMMA assignment_expression_no_in {
      $$ = (new NodeOperator(COMMA, yylineno))->appendChild($1)->appendChild($3);
    }
;

expression_no_in_opt:
    /* empty */ {
      $$ = new NodeEmptyExpression(yylineno);
    }
|   expression_no_in
;

//
// Expression reductions (no statement)
member_expression_no_statement:
    primary_expression_no_statement
|   member_expression_no_statement t_LBRACKET expression t_RBRACKET {
      $$ = (new NodeDynamicMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   member_expression_no_statement t_PERIOD identifier {
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   t_NEW member_expression arguments {
      $$ = (new NodeFunctionConstructor(yylineno))->appendChild($2)->appendChild($3);
    }
;

new_expression_no_statement:
    member_expression_no_statement
|   t_NEW new_expression {
      $$ = (new NodeFunctionConstructor(yylineno))->appendChild($2)->appendChild(new NodeArgList(yylineno));
    }
;

call_expression_no_statement:
    member_expression_no_statement arguments {
      $$ = (new NodeFunctionCall(yylineno))->appendChild($1)->appendChild($2);
    }
|   call_expression_no_statement arguments {
      $$ = (new NodeFunctionCall(yylineno))->appendChild($1)->appendChild($2);
    }
|   call_expression_no_statement t_LBRACKET expression t_RBRACKET {
      $$ = (new NodeDynamicMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   call_expression_no_statement t_PERIOD identifier {
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
;

left_hand_side_expression_no_statement:
    new_expression_no_statement
|   call_expression_no_statement
;

pre_in_expression_no_statement:
    left_hand_side_expression_no_statement
|   pre_in_expression_no_statement t_INCR {
      $$ = (new NodePostfix(INCR_POSTFIX, yylineno))->appendChild($1);
    }
|   pre_in_expression_no_statement t_DECR {
      $$ = (new NodePostfix(DECR_POSTFIX, yylineno))->appendChild($1);
    }
|   t_DELETE pre_in_expression {
      $$ = (new NodeUnary(DELETE, yylineno))->appendChild($2);
    }
|   t_VOID pre_in_expression {
      $$ = (new NodeUnary(VOID, yylineno))->appendChild($2);
    }
|   t_TYPEOF pre_in_expression {
      $$ = (new NodeUnary(TYPEOF, yylineno))->appendChild($2);
    }
|   t_INCR pre_in_expression {
      $$ = (new NodeUnary(INCR_UNARY, yylineno))->appendChild($2);
      if (!static_cast<NodeExpression*>($2)->isValidlVal()) {
        parsererror("invalid increment operand");
        $$ = NULL;
      }
    }
|   t_DECR pre_in_expression {
      $$ = (new NodeUnary(DECR_UNARY, yylineno))->appendChild($2);
      if (!static_cast<NodeExpression*>($2)->isValidlVal()) {
        parsererror("invalid decrement operand");
        $$ = NULL;
      }
    }
|   t_PLUS pre_in_expression {
      $$ = (new NodeUnary(PLUS_UNARY, yylineno))->appendChild($2);
    }
|   t_MINUS pre_in_expression {
      $$ = (new NodeUnary(MINUS_UNARY, yylineno))->appendChild($2);
    }
|   t_BIT_NOT pre_in_expression {
      $$ = (new NodeUnary(BIT_NOT_UNARY, yylineno))->appendChild($2);
    }
|   t_NOT pre_in_expression {
      $$ = (new NodeUnary(NOT_UNARY, yylineno))->appendChild($2);
    }
|   pre_in_expression_no_statement t_MULT pre_in_expression {
      $$ = (new NodeOperator(MULT, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_DIV pre_in_expression {
      $$ = (new NodeOperator(DIV, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_MOD pre_in_expression {
      $$ = (new NodeOperator(MOD, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_PLUS pre_in_expression {
      $$ = (new NodeOperator(PLUS, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_MINUS pre_in_expression {
      $$ = (new NodeOperator(MINUS, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_LSHIFT pre_in_expression {
      $$ = (new NodeOperator(LSHIFT, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_RSHIFT pre_in_expression {
      $$ = (new NodeOperator(RSHIFT, yylineno))->appendChild($1)->appendChild($3);
    }
|   pre_in_expression_no_statement t_RSHIFT3 pre_in_expression {
      $$ = (new NodeOperator(RSHIFT3, yylineno))->appendChild($1)->appendChild($3);
    }
;

post_in_expression_no_statement:
    pre_in_expression_no_statement
|   post_in_expression_no_statement t_LESS_THAN post_in_expression {
      $$ = (new NodeOperator(LESS_THAN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_GREATER_THAN post_in_expression {
      $$ = (new NodeOperator(GREATER_THAN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_LESS_THAN_EQUAL post_in_expression {
      $$ = (new NodeOperator(LESS_THAN_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_GREATER_THAN_EQUAL post_in_expression {
      $$ = (new NodeOperator(GREATER_THAN_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_INSTANCEOF post_in_expression {
      $$ = (new NodeOperator(INSTANCEOF, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_IN post_in_expression {
      $$ = (new NodeOperator(IN, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_EQUAL post_in_expression {
      $$ = (new NodeOperator(EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_NOT_EQUAL post_in_expression {
      $$ = (new NodeOperator(NOT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_STRICT_EQUAL post_in_expression {
      $$ = (new NodeOperator(STRICT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_STRICT_NOT_EQUAL post_in_expression {
      $$ = (new NodeOperator(STRICT_NOT_EQUAL, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_BIT_AND post_in_expression {
      $$ = (new NodeOperator(BIT_AND, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_BIT_XOR post_in_expression {
      $$ = (new NodeOperator(BIT_XOR, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_BIT_OR post_in_expression {
      $$ = (new NodeOperator(BIT_OR, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_AND post_in_expression {
      $$ = (new NodeOperator(AND, yylineno))->appendChild($1)->appendChild($3);
    }
|   post_in_expression_no_statement t_OR post_in_expression {
      $$ = (new NodeOperator(OR, yylineno))->appendChild($1)->appendChild($3);
    }
;

conditional_expression_no_statement:
    post_in_expression_no_statement
|   post_in_expression_no_statement t_PLING assignment_expression t_COLON assignment_expression {
      $$ = (new NodeConditionalExpression(yylineno))->appendChild($1)->appendChild($3)->appendChild($5);
    }
;

assignment_expression_no_statement:
    conditional_expression_no_statement
|   left_hand_side_expression_no_statement assignment_operator assignment_expression {
      if (!static_cast<NodeExpression*>($1)->isValidlVal()) {
        parsererror("invalid assignment left-hand side");
        $$ = NULL;
      } else {
        $$ = (new NodeAssignment($2, yylineno))->appendChild($1)->appendChild($3);
      }
    }
;

expression_no_statement:
    assignment_expression_no_statement
|   expression_no_statement t_COMMA assignment_expression {
      $$ = (new NodeOperator(COMMA, yylineno))->appendChild($1)->appendChild($3);
    }
;

//
// Statements
statement:
    block
|   variable_statement
|   empty_statement
|   expression_statement
|   if_statement
|   iteration_statement
|   continue_statement
|   break_statement
|   return_statement
|   with_statement
|   labelled_statement
|   switch_statement
|   throw_statement
|   try_statement
;

block:
    t_LCURLY statement_list t_RCURLY {
      $$ = $2;
    }
|   t_LCURLY t_RCURLY {
      $$ = new NodeStatementList(yylineno);
    }
;

variable_statement:
    t_VAR variable_declaration_list semicolon {
      $$ = $2;
    }
;

variable_declaration_list:
    variable_declaration {
      $$ = (new NodeVarDeclaration(false, yylineno))->appendChild($1);
    }
|   variable_declaration_list t_COMMA variable_declaration {
      $$->appendChild($3);
    }
;

variable_declaration:
    identifier_typehint_permitted initializer {
      $$ = (new NodeAssignment(ASSIGN, yylineno))->appendChild($1)->appendChild($2);
    }
|   identifier_typehint_permitted
;

identifier_typehint_permitted:
    identifier
|   identifier t_COLON identifier {
      require_support(PARSE_TYPEHINT, "typehints not supported");
      $$ = (new NodeTypehint(yylineno))->appendChild($1)->appendChild($3);
    }
;

initializer:
    t_ASSIGN assignment_expression {
      $$ = $2;
    }
;

variable_declaration_list_no_in:
    variable_declaration_no_in {
      $$ = (new NodeVarDeclaration(false, yylineno))->appendChild($1);
    }
|   variable_declaration_list_no_in t_COMMA variable_declaration_no_in {
      $$->appendChild($3);
    }
;

variable_declaration_no_in:
    identifier initializer_no_in {
      $$ = (new NodeAssignment(ASSIGN, yylineno))->appendChild($1)->appendChild($2);
    }
|   identifier
;

initializer_no_in:
    t_ASSIGN assignment_expression_no_in {
      $$ = $2;
    }
;

empty_statement:
    semicolon {
      $$ = new NodeEmptyExpression(yylineno);
    }
;

expression_statement:
    expression_no_statement semicolon {
      $$ = $1;
    }
;

if_statement:
    t_IF t_LPAREN expression t_RPAREN statement t_ELSE statement {
      $$ = (new NodeIf($3->lineno()))->appendChild($3)->appendChild($5)->appendChild($7);
    }
|   t_IF t_LPAREN expression t_RPAREN statement %prec p_IF {
      $$ = (new NodeIf($3->lineno()))->appendChild($3)->appendChild($5)->appendChild(NULL);
    }
;

iteration_statement:
    t_DO statement t_WHILE t_LPAREN expression t_RPAREN semicolon {
      $$ = (new NodeDoWhile($2->lineno()))->appendChild($2)->appendChild($5);
    }
|   t_WHILE t_LPAREN expression t_RPAREN statement {
      $$ = (new NodeWhile($3->lineno()))->appendChild($3)->appendChild($5);
    }
|   t_FOR t_LPAREN expression_no_in_opt t_SEMICOLON expression_opt t_SEMICOLON expression_opt t_RPAREN statement {
      $$ = (new NodeForLoop($3->lineno()))->appendChild($3)->appendChild($5)->appendChild($7)->appendChild($9);
    }
|   t_FOR t_LPAREN t_VAR variable_declaration_list_no_in t_SEMICOLON expression_opt t_SEMICOLON expression_opt t_RPAREN statement {
      $$ = (new NodeForLoop($4->lineno()))->appendChild($4)->appendChild($6)->appendChild($8)->appendChild($10);
    }
|   t_FOR t_LPAREN left_hand_side_expression t_IN expression t_RPAREN statement {
      $$ = (new NodeForIn($3->lineno()))->appendChild($3)->appendChild($5)->appendChild($7);
    }
|   t_FOR t_LPAREN t_VAR variable_declaration_list_no_in t_IN expression t_RPAREN statement {
      $$ = (new NodeForIn($4->lineno()))->appendChild(static_cast<NodeVarDeclaration*>($4)->setIterator(true))->appendChild($6)->appendChild($8);
    }
|   t_FOR_EACH t_LPAREN left_hand_side_expression t_IN expression t_RPAREN statement {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeForEachIn($3->lineno()))->appendChild($3)->appendChild($5)->appendChild($7);
    }
|   t_FOR_EACH t_LPAREN t_VAR variable_declaration_list_no_in t_IN expression t_RPAREN statement {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeForEachIn($4->lineno()))->appendChild(static_cast<NodeVarDeclaration*>($4)->setIterator(true))->appendChild($6)->appendChild($8);
    }
;

continue_statement:
    t_CONTINUE identifier semicolon {
      $$ = (new NodeStatementWithExpression(CONTINUE, yylineno))->appendChild($2);
    }
|   t_CONTINUE semicolon {
      $$ = (new NodeStatementWithExpression(CONTINUE, yylineno))->appendChild(NULL);
    }
;

break_statement:
    t_BREAK identifier semicolon {
      $$ = (new NodeStatementWithExpression(BREAK, yylineno))->appendChild($2);
    }
|   t_BREAK semicolon {
      $$ = (new NodeStatementWithExpression(BREAK, yylineno))->appendChild(NULL);
    }
;

return_statement:
    t_RETURN expression semicolon {
      $$ = (new NodeStatementWithExpression(RETURN, yylineno))->appendChild($2);
    }
|   t_RETURN semicolon {
      $$ = (new NodeStatementWithExpression(RETURN, yylineno))->appendChild(NULL);
    }
;

with_statement:
    t_WITH t_LPAREN expression t_RPAREN statement {
      $$ = (new NodeWith($3->lineno()))->appendChild($3)->appendChild($5);
    }
;

switch_statement:
    t_SWITCH t_LPAREN expression t_RPAREN case_block {
      $$ = (new NodeSwitch($3->lineno()))->appendChild($3)->appendChild($5);
    }
;

case_block:
    t_LCURLY case_clauses_opt t_RCURLY {
      $$ = $2;
    }
|   t_LCURLY case_clauses_opt default_clause case_clauses_opt t_RCURLY {
      $$ = (new NodeStatementList(yylineno))->appendChild($2);
      $$->appendChild($3[0]);
      if ($3[1] != NULL) {
        $$->appendChild($3[1]);
      }
      $$->appendChild($4);
    }
;


case_clauses_opt:
    /* nothing */ {
      $$ = new NodeStatementList(yylineno);
    }
|   case_clauses
;

case_clauses:
    case_clause {
      $$ = (new NodeStatementList(yylineno))->appendChild($1[0]);
      if ($1[1] != NULL) {
        $$->appendChild($1[1]);
      }
    }
|   case_clauses case_clause {
      $$ = $1->appendChild($2[0]);
      if ($2[1] != NULL) {
        $$->appendChild($2[1]);
      }
    }
;


case_clause:
    t_CASE expression t_COLON statement_list {
      $$[0] = (new NodeCaseClause($2->lineno()))->appendChild($2);
      $$[1] = $4;
    }
|   t_CASE expression t_COLON {
      $$[0] = (new NodeCaseClause($2->lineno()))->appendChild($2);
      $$[1] = NULL;
    }
;

default_clause:
    t_DEFAULT t_COLON {
      $$[0] = new NodeDefaultClause(yylineno);
      $$[1] = NULL;
    }
|   t_DEFAULT t_COLON statement_list {
      $$[0] = new NodeDefaultClause(yylineno);
      $$[1] = $3;
};

labelled_statement:
    identifier t_COLON statement {
      $$ = (new NodeLabel(yylineno))->appendChild($1)->appendChild($3);
    }
;

throw_statement:
    t_THROW expression semicolon {
      $$ = (new NodeStatementWithExpression(THROW, yylineno))->appendChild($2);
    }
;

try_statement:
    t_TRY block catch {
      $$ = (new NodeTry($2->lineno()))->appendChild($2)->appendChild($3[0])->appendChild($3[1])->appendChild(NULL);
    }
|   t_TRY block finally {
      $$ = (new NodeTry($2->lineno()))->appendChild($2)->appendChild(NULL)->appendChild(NULL)->appendChild($3);
    }
|   t_TRY block catch finally {
      $$ = (new NodeTry($2->lineno()))->appendChild($2)->appendChild($3[0])->appendChild($3[1])->appendChild($4);
    }
;

catch:
    t_CATCH t_LPAREN identifier t_RPAREN block {
      $$[0] = $3;
      $$[1] = $5;
    }
;

finally:
    t_FINALLY block {
      $$ = $2;
    }
;

//
// Functions
function_declaration:
    t_FUNCTION identifier t_LPAREN formal_parameter_list t_RPAREN t_LCURLY function_body t_RCURLY {
      $$ = (new NodeFunctionDeclaration($2->lineno()))->appendChild($2)->appendChild($4)->appendChild($7);
    }
|   t_FUNCTION identifier t_LPAREN t_RPAREN t_LCURLY function_body t_RCURLY {
      $$ = (new NodeFunctionDeclaration($2->lineno()))->appendChild($2)->appendChild(new NodeArgList(yylineno))->appendChild($6);
    }
;

function_expression:
    t_FUNCTION identifier t_LPAREN formal_parameter_list t_RPAREN t_LCURLY function_body t_RCURLY {
      $$ = (new NodeFunctionExpression($2->lineno()))->appendChild($2)->appendChild($4)->appendChild($7);
    }
|   t_FUNCTION identifier t_LPAREN t_RPAREN t_LCURLY function_body t_RCURLY {
      $$ = (new NodeFunctionExpression($2->lineno()))->appendChild($2)->appendChild(new NodeArgList(yylineno))->appendChild($6);
    }
|   t_FUNCTION t_LPAREN formal_parameter_list t_RPAREN t_LCURLY function_body t_RCURLY {
      $$ = (new NodeFunctionExpression($3->lineno()))->appendChild(NULL)->appendChild($3)->appendChild($6);
    }
|   t_FUNCTION t_LPAREN t_RPAREN t_LCURLY function_body t_RCURLY {
      $$ = (new NodeFunctionExpression($5->lineno()))->appendChild(NULL)->appendChild(new NodeArgList(yylineno))->appendChild($5);
    }
;

formal_parameter_list:
    identifier_typehint_permitted {
      $$ = (new NodeArgList(yylineno))->appendChild($1);
    }
|   formal_parameter_list t_COMMA identifier_typehint_permitted {
      $$ = $1->appendChild($3);
    }
;

function_body:
    /* empty */ {
      $$ = new NodeStatementList(yylineno);
    }
|   statement_list;
;

//
// E4X XML literals
primary_expression_no_statement:
    xml_literal {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = $1;
    }
;

xml_literal:
    xml_element
|   xml_lt t_GREATER_THAN xml_element_content t_XML_LT_DIV t_GREATER_THAN {
        fbjs_pop_xml_state(yyscanner);
        $$ = (new NodeXMLElement(yylineno))
          ->appendChild(NULL)->appendChild(NULL)->appendChild($3)->appendChild(NULL);
    }
;

xml_element:
    xml_tag_content t_DIV t_GREATER_THAN {
      fbjs_pop_xml_state(yyscanner);
      $$ = $1->appendChild(new NodeXMLContentList(yylineno))->appendChild(NULL);
    }
|   xml_tag_content t_GREATER_THAN xml_element_content t_XML_LT_DIV xml_tag_name xml_ws_opt t_GREATER_THAN {
      fbjs_pop_xml_state(yyscanner);
      $$ = $1->appendChild($3)->appendChild($5);
    }
;

xml_tag_content:
    xml_lt xml_tag_name xml_attribute_list_opt {
      $$ = (new NodeXMLElement(yylineno))->appendChild($2)->appendChild($3);
    }
;

xml_lt:
    t_LESS_THAN {
        fbjs_push_xml_state(yyscanner);
    }
;

xml_name:
    t_XML_NAME_FRAGMENT {
      $$ = new NodeXMLName("", $1, yylineno);
    }
|   t_XML_NAME_FRAGMENT t_COLON t_XML_NAME_FRAGMENT {
      $$ = new NodeXMLName($1, $3, yylineno);
    }
;

xml_tag_name:
    xml_name
|   xml_embedded_expression
;

xml_element_content:
    /* empty */ {
      $$ = new NodeXMLContentList(yylineno);
    }
|   xml_cdata_xml_content {
      $$ = (new NodeXMLContentList(yylineno))->appendChild($1);
    }
|   xml_element_content xml_element_content_tag xml_cdata_xml_content {
      $$ = $1->appendChild($2)->appendChild($3);
    }
|   xml_element_content xml_element_content_tag {
      $$ = $1->appendChild($2);
    }
;

xml_element_content_tag:
    xml_element
|   xml_embedded_expression
|   t_XML_COMMENT {
      $$ = new NodeXMLComment($1, yylineno);
      free($1);
    }
|   t_XML_PI {
      $$ = new NodeXMLPI($1, yylineno);
      free($1);
    }
;

xml_attribute_list_opt:
    /* empty */ {
      $$ = new NodeXMLAttributeList(yylineno);
    }
|   xml_attribute_list
;

xml_attribute_list:
    t_XML_WHITESPACE {
      $$ = new NodeXMLAttributeList(yylineno);
    }
|   xml_attribute_list t_XML_WHITESPACE
|   xml_attribute_list xml_name t_ASSIGN xml_attribute_value {
      $$ = $1->appendChild((new NodeXMLAttribute(yylineno))->appendChild($2)->appendChild($4));
    }
;

xml_attribute_value:
    t_XML_APOS xml_cdata_no_apos t_XML_APOS {
      $$ = $2;
    }
|   t_XML_QUOTE xml_cdata_no_quote t_XML_QUOTE {
      $$ = $2;
    }
|   xml_embedded_expression {
      $$ = $1;
    }
;

xml_cdata_no_quote:
    /* empty */ {
      $$ = new NodeXMLTextData();
    }
|   xml_cdata_no_quote xml_cdata_fragment_attr {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData($2);
      free($2);
    }
|   xml_cdata_no_quote t_XML_APOS {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData("'");
    }
;

xml_cdata_no_apos:
    /* empty */ {
      $$ = new NodeXMLTextData();
    }
|   xml_cdata_no_apos xml_cdata_fragment_attr {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData($2);
      free($2);
    }
|   xml_cdata_no_apos t_XML_QUOTE {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData("\"");
    }
;

xml_cdata_xml_content:
    xml_cdata_fragment {
      $$ = new NodeXMLTextData(yylineno);
      static_cast<NodeXMLTextData*>($$)->appendData($1);
      free($1);
    }
|   t_XML_APOS {
      $$ = new NodeXMLTextData(yylineno);
      static_cast<NodeXMLTextData*>($$)->appendData("'");
    }
|   t_XML_QUOTE {
      $$ = new NodeXMLTextData(yylineno);
      static_cast<NodeXMLTextData*>($$)->appendData("\"");
    }
|   t_XML_WHITESPACE {
      $$ = new NodeXMLTextData(yylineno);
      static_cast<NodeXMLTextData*>($$)->appendData($1, true);
      free($1);
    }
|   xml_cdata_xml_content xml_cdata_fragment {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData($2);
      free($2);
    }
|   xml_cdata_xml_content t_XML_APOS {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData("'");
    }
|   xml_cdata_xml_content t_XML_QUOTE {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData("\"");
    }
|   xml_cdata_xml_content t_XML_WHITESPACE {
      $$ = $1;
      static_cast<NodeXMLTextData*>($$)->appendData($2, true);
      free($2);
    }
;

xml_cdata_fragment:
/*  Does not include: t_LESS_THAN, t_XML_APOS, t_XML_QUOTE, t_LCURLY, t_XML_WHITESPACE */
    t_XML_CDATA
|   t_XML_NAME_FRAGMENT
|   t_COLON {
      $$ = strdup(":");
    }
|   t_ASSIGN {
      $$ = strdup("=");
    }
|   t_RCURLY {
      $$ = strdup("}");
    }
|   t_GREATER_THAN {
      $$ = strdup(">");
    }
|   t_DIV {
      $$ = strdup("/");
    }
;

xml_cdata_fragment_attr:
/*  Does not include: t_XML_APOS, t_XML_QUOTE */
    xml_cdata_fragment
|   t_LESS_THAN {
      $$ = strdup("<");
    }
|   t_LCURLY {
      $$ = strdup("{");
    }
|   t_XML_WHITESPACE
;

xml_embedded_expression:
    t_LCURLY { fbjs_push_xml_embedded_expression_state(yyscanner); } expression t_VIRTUAL_SEMICOLON t_RCURLY {
      fbjs_pop_xml_state(yyscanner);
      $$ = (new NodeXMLEmbeddedExpression($3->lineno()))->appendChild($3);
    }
;

xml_ws_opt:
    /* empty */
|   t_XML_WHITESPACE
;

//
// E4X expressions
statement:
    t_XML_DEFAULT_NAMESPACE t_ASSIGN expression semicolon {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeXMLDefaultNamespace(yylineno))->appendChild($3);
    }
;
primary_expression_no_statement:
    property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = $1;
    }
;

property_identifier:
    attribute_identifier
|   qualified_identifier
|   wildcard_identifier
;

attribute_identifier:
    t_XML_ATTRIBUTE property_selector {
      $$ = (new NodeStaticAttributeIdentifier(yylineno))->appendChild($2);
    }
|   t_XML_ATTRIBUTE qualified_identifier {
      $$ = (new NodeStaticAttributeIdentifier(yylineno))->appendChild($2);
    }
|   t_XML_ATTRIBUTE t_LBRACKET expression t_RBRACKET {
      $$ = (new NodeDynamicAttributeIdentifier(yylineno))->appendChild($3);
    }
;

property_selector:
    identifier
|   wildcard_identifier
;

qualified_identifier:
    property_selector t_XML_QUALIFIER property_selector {
      $$ = (new NodeStaticQualifiedIdentifier($1->lineno()))->appendChild($1)->appendChild($3);
    }
|   property_selector t_XML_QUALIFIER t_LBRACKET expression t_RBRACKET {
      $$ = (new NodeDynamicQualifiedIdentifier($1->lineno()))->appendChild($1)->appendChild($4);
    }
;

wildcard_identifier:
    t_MULT {
      $$ = new NodeWildcardIdentifier(yylineno);
    }
;

member_expression:
    member_expression t_PERIOD property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   member_expression t_PERIOD t_LPAREN expression t_RPAREN {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeFilteringPredicate(yylineno))->appendChild($1)->appendChild($4);
    }
|   member_expression t_XML_DESCENDENT identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   member_expression t_XML_DESCENDENT property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
;

member_expression_no_statement:
    member_expression_no_statement t_PERIOD property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   member_expression_no_statement t_PERIOD t_LPAREN expression t_RPAREN {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeFilteringPredicate(yylineno))->appendChild($1)->appendChild($4);
    }
|   member_expression_no_statement t_XML_DESCENDENT identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   member_expression_no_statement t_XML_DESCENDENT property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
;

call_expression:
    call_expression t_PERIOD property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   call_expression t_PERIOD t_LPAREN expression t_RPAREN {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeFilteringPredicate(yylineno))->appendChild($1)->appendChild($4);
    }
|   call_expression t_XML_DESCENDENT identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   call_expression t_XML_DESCENDENT property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
;

call_expression_no_statement:
    call_expression_no_statement t_PERIOD property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeStaticMemberExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   call_expression_no_statement t_PERIOD t_LPAREN expression t_RPAREN {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeFilteringPredicate(yylineno))->appendChild($1)->appendChild($4);
    }
|   call_expression_no_statement t_XML_DESCENDENT identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
|   call_expression_no_statement t_XML_DESCENDENT property_identifier {
      require_support(PARSE_E4X, "E4X not supported");
      $$ = (new NodeDescendantExpression(yylineno))->appendChild($1)->appendChild($3);
    }
;

%%

const char* yytokname(int tok) {
  if (tok < 255) {
    return "?";
  }
  return yytname[tok - 255];
}
