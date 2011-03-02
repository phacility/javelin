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
#include <stdlib.h>
#include <stdexcept>
#include <sstream>
#include <list>
#include <memory>
#include <ext/rope>

#define NODE_WALKER_ACCEPT_DECL virtual void accept(class NodeWalker& walker)
typedef __gnu_cxx::rope<char> rope_t;

namespace fbjs {
  class Node;
  typedef std::list<Node*> node_list_t;
  enum node_render_enum {
    RENDER_NONE = 0,
    RENDER_PRETTY = 1,
    RENDER_MAINTAIN_LINENO = 2,
  };
  enum node_parse_enum {
    PARSE_NONE = 0,
    PARSE_TYPEHINT = 1,
    PARSE_OBJECT_LITERAL_ELISON = 2,
    PARSE_E4X = 4,
  };
  struct render_guts_t {
    unsigned int lineno;
    bool pretty;
    bool sanelineno;
  };

  //
  // Node
  class Node {
    protected:
      node_list_t _childNodes;
      rope_t renderImplodeChildren(render_guts_t* guts, int indentation, const char* glue) const;
      unsigned int _lineno;

    public:
      NODE_WALKER_ACCEPT_DECL;
      Node(const unsigned int lineno = 0);
      virtual ~Node();
      virtual Node* clone(Node* node = NULL) const;

      bool empty() const;
      unsigned int lineno() const;
      void setLineno(const unsigned int lineno) { _lineno = lineno; }
      virtual bool operator== (const Node&) const;
      virtual bool operator!= (const Node&) const;

      node_list_t& childNodes() const;
      Node* appendChild(Node* node);
      Node* prependChild(Node* node);
      Node* removeChild(node_list_t::iterator node_pos);
      Node* replaceChild(Node* node, node_list_t::iterator node_pos);
      Node* insertBefore(Node* node, node_list_t::iterator node_pos);

      rope_t render(node_render_enum opts = RENDER_NONE) const;
      rope_t render(int opts) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual rope_t renderBlock(bool must, render_guts_t* guts, int indentation) const;
      virtual rope_t renderStatement(render_guts_t* guts, int indentation) const;
      virtual rope_t renderIndentedStatement(render_guts_t* guts, int indentation) const;
      bool renderLinenoCatchup(render_guts_t* guts, rope_t &rope) const;
  };

  //
  // NodeProgram
  class NodeProgram: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeProgram();
      NodeProgram(const char* code, node_parse_enum opts = PARSE_NONE);
      NodeProgram(FILE* file, node_parse_enum opts = PARSE_NONE);
      virtual Node* clone(Node* node = NULL) const;
  };

  //
  // NodeStatementList
  class NodeStatementList: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStatementList(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual rope_t renderBlock(bool must, render_guts_t* guts, int indentation) const;
      virtual rope_t renderStatement(render_guts_t* guts, int indentation) const;
      virtual rope_t renderIndentedStatement(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeExpression (abstract)
  class NodeExpression: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeExpression(const unsigned int lineno = 0);
      virtual bool isValidlVal() const;
      virtual rope_t render(render_guts_t* guts, int indentation) const = 0;
      virtual rope_t renderStatement(render_guts_t* guts, int indentation) const;
      virtual bool compare(bool val) const;
  };

  //
  // NodeNumericLiteral
  class NodeNumericLiteral: public NodeExpression {
    protected:
      double value;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeNumericLiteral(double value, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool compare(bool val) const;
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeStringLiteral
  class NodeStringLiteral: public NodeExpression {
    protected:
      const std::string value;
      bool quoted;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStringLiteral(const std::string& value, bool quoted, const unsigned int lineno = 0);
      std::string unquoted_value() const {
        if (!quoted) return value;
        return value.substr(1, value.size() - 2);
      }

      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeRegexLiteral
  class NodeRegexLiteral: public NodeExpression {
    protected:
      const std::string value;
      const std::string flags;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeRegexLiteral(const std::string& value, const std::string& flags, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeBooleanLiteral
  class NodeBooleanLiteral: public NodeExpression {
    protected:
      bool value;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeBooleanLiteral(bool value, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool compare(bool val) const;
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeNullLiteral
  class NodeNullLiteral: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeNullLiteral(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeThis
  class NodeThis: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeThis(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeEmptyExpression
  class NodeEmptyExpression: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeEmptyExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual rope_t renderBlock(bool must, render_guts_t* guts, int indentation) const;
  };

  //
  // NodeOperator
  enum node_operator_t {
    // Mathematical operators
    COMMA, RSHIFT3, RSHIFT, LSHIFT, BIT_OR, BIT_XOR, BIT_AND, PLUS, MINUS, DIV, MULT, MOD,
    // Logical operators
    OR, AND,
    // Comparison operators
    EQUAL, NOT_EQUAL, STRICT_EQUAL, STRICT_NOT_EQUAL, LESS_THAN_EQUAL, GREATER_THAN_EQUAL, LESS_THAN, GREATER_THAN,
    // Other.
    IN, INSTANCEOF
  };
  class NodeOperator: public NodeExpression {
    protected:
      node_operator_t op;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeOperator(node_operator_t op, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      const node_operator_t operatorType() const { return op; };
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeConditionalExpression
  class NodeConditionalExpression: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeConditionalExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeParenthetical
  class NodeParenthetical: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeParenthetical(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
      virtual bool compare(bool val) const;
  };

  //
  // NodeAssignment
  enum node_assignment_t {
    ASSIGN,
    MULT_ASSIGN, DIV_ASSIGN, MOD_ASSIGN, PLUS_ASSIGN, MINUS_ASSIGN,
    LSHIFT_ASSIGN, RSHIFT_ASSIGN, RSHIFT3_ASSIGN,
    BIT_AND_ASSIGN, BIT_XOR_ASSIGN, BIT_OR_ASSIGN
  };
  class NodeAssignment: public NodeExpression {
    protected:
      node_assignment_t op;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeAssignment(node_assignment_t op, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      const node_assignment_t operatorType() const { return op; };
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeUnary
  enum node_unary_t {
    DELETE, VOID, TYPEOF,
    INCR_UNARY, DECR_UNARY, PLUS_UNARY, MINUS_UNARY,
    BIT_NOT_UNARY,
    NOT_UNARY
  };
  class NodeUnary: public NodeExpression {
    protected:
      node_unary_t op;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeUnary(node_unary_t op, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      const node_unary_t operatorType() const { return op; };
      virtual bool operator== (const Node&) const;
  };

  //
  // NodePostfix
  enum node_postfix_t {
    INCR_POSTFIX, DECR_POSTFIX
  };
  class NodePostfix: public NodeExpression {
    protected:
      node_postfix_t op;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodePostfix(node_postfix_t op, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeIdentifier
  class NodeIdentifier: public NodeExpression {
    protected:
      std::string _name;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeIdentifier(const std::string& name, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      const std::string& name() const;
      virtual bool isValidlVal() const;
      void rename(const std::string &str);
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeFunctionCall
  class NodeFunctionCall: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeFunctionCall(const unsigned int lineno = 0);
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual Node* clone(Node* node = NULL) const;
  };

  //
  // NodeFunctionConstructor
  class NodeFunctionConstructor: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeFunctionConstructor(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeObjectLiteral
  class NodeObjectLiteral: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeObjectLiteral(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeArrayLiteral
  class NodeArrayLiteral: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeArrayLiteral(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeStaticMemberExpression
  class NodeStaticMemberExpression: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStaticMemberExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeDynamicMemberExpression
  class NodeDynamicMemberExpression: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeDynamicMemberExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeStatement (abstract)
  class NodeStatement: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStatement(const unsigned int lineno = 0);
      virtual rope_t render(render_guts_t* guts, int indentation) const = 0;
      virtual rope_t renderStatement(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeStatementWithExpression
  enum node_statement_with_expression_t {
    RETURN, CONTINUE, BREAK, THROW
  };
  class NodeStatementWithExpression: public NodeStatement {
    protected:
      node_statement_with_expression_t statement;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStatementWithExpression(node_statement_with_expression_t statement, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool operator== (const Node&) const;
  };

  //
  // NodeVarDeclaration
  class NodeVarDeclaration: public NodeStatement {
    protected:
      bool _iterator;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeVarDeclaration(bool iterator = false, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      bool iterator() const; // TODO: kill this
      Node* setIterator(bool iterator);
  };

  //
  // NodeTypehint
  class NodeTypehint: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeTypehint(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeFunctionDeclaration
  class NodeFunctionDeclaration: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeFunctionDeclaration(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeFunctionExpression
  class NodeFunctionExpression: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeFunctionExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeArgList
  class NodeArgList: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeArgList(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeIf
  class NodeIf: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeIf(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeWith
  class NodeWith: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeWith(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeTry
  class NodeTry: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeTry(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeLabel
  class NodeLabel: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeLabel(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual rope_t renderStatement(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeCaseClause
  class NodeCaseClause: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeCaseClause(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual rope_t renderStatement(render_guts_t* guts, int indentation) const;
      virtual rope_t renderIndentedStatement(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeSwitch
  class NodeSwitch: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeSwitch(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeDefaultClause
  class NodeDefaultClause: public NodeCaseClause {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeDefaultClause(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeObjectLiteralProperty
  class NodeObjectLiteralProperty: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeObjectLiteralProperty(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeForLoop
  class NodeForLoop: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeForLoop(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeForIn
  class NodeForIn: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeForIn(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeForEachIn
  class NodeForEachIn: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeForEachIn(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeWhile
  class NodeWhile: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeWhile(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeDoWhile
  class NodeDoWhile: public NodeStatement {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeDoWhile(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeXMLDefaultNamespace
  // children: NodeExpression
  class NodeXMLDefaultNamespace: public NodeStatement {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLDefaultNamespace(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeXMLName
  // children: none
  class NodeXMLName: public Node {
    protected:
      const std::string _ns;
      const std::string _name;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLName(const std::string &ns, const std::string &name, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual const std::string ns() const;
      virtual const std::string name() const;
  };

  //
  // NodeXMLElement
  // children:
  //   NodeXMLName | NodeXMLEmbeddedExpression | NULL,
  //   NodeXMLAttributeList,
  //   NodeXMLContentList,
  //   NodeXMLName | NodeXMLEmbeddedExpression | NULL
  class NodeXMLElement: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLElement(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeXMLComment
  // children: none
  class NodeXMLComment: public Node {
    protected:
      const std::string _comment;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLComment(const std::string &comment, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual const std::string comment() const;
  };

  //
  // NodeXMLPI
  // children: none
  class NodeXMLPI: public Node {
    protected:
      const std::string _data;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLPI(const std::string &data, const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual const std::string data() const;
  };

  //
  // NodeXMLContentList
  // children: NodeXMLElement*
  class NodeXMLContentList: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLContentList(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeXMLTextData
  // children: none
  class NodeXMLTextData: public Node {
    protected:
      rope_t _data;
      bool whitespace;
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLTextData(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual void appendData(rope_t str, bool isWhitespace = false);
      virtual bool isWhitespace() const;
      const char* data() const;
  };

  //
  // NodeXMLEmbeddedExpression
  // children: NodeExpression
  class NodeXMLEmbeddedExpression: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLEmbeddedExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeXMLAttributeList
  // children: NodeXMLAttribute*
  class NodeXMLAttributeList: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLAttributeList(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeXMLAttribute
  // children: NodeXMLName, NodeXMLTextData | NodeExpression
  class NodeXMLAttribute: public Node {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeXMLAttribute(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // NodeWildcardIdentifier
  // children: none
  class NodeWildcardIdentifier: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeWildcardIdentifier(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeStaticAttributeIdentifier
  // children: NodeIdentifier | NodeWildcardIdentifier | NodeStaticQualifiedIdentifier
  class NodeStaticAttributeIdentifier: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStaticAttributeIdentifier(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeDynamicAttributeIdentifier
  // children: NodeExpression
  class NodeDynamicAttributeIdentifier: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeDynamicAttributeIdentifier(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeStaticQualifiedIdentifier
  // children: NodeIdentifier | NodeWildcardIdentifier, NodeIdentifier | NodeWildcardIdentifier
  class NodeStaticQualifiedIdentifier: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeStaticQualifiedIdentifier(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeDynamicQualifiedIdentifier
  // children: NodeIdentifier | NodeWildcardIdentifier, NodeExpression
  class NodeDynamicQualifiedIdentifier: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeDynamicQualifiedIdentifier(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeFilteringPredicate
  // children: NodeExpression, NodeExpression
  class NodeFilteringPredicate: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeFilteringPredicate(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
      virtual bool isValidlVal() const;
  };

  //
  // NodeDescendantExpression
  class NodeDescendantExpression: public NodeExpression {
    public:
      NODE_WALKER_ACCEPT_DECL;
      NodeDescendantExpression(const unsigned int lineno = 0);
      virtual Node* clone(Node* node = NULL) const;
      virtual rope_t render(render_guts_t* guts, int indentation) const;
  };

  //
  // Parser exception
  class ParseException: public std::runtime_error {
    private:
      mutable std::string wut;
      int lineno;
    public:
      ParseException(const std::string& what_arg, const int lineno) : std::runtime_error(what_arg), lineno(lineno) {}
      ~ParseException() throw() {}
      const char* what() const throw() {
        if (wut.empty()) {
          wut =
            "SyntaxError on line " +
            static_cast<std::stringstream&>(std::stringstream() << lineno << ": ").str() +
            std::runtime_error::what();
        }
        return wut.c_str();
      }
  };
}
