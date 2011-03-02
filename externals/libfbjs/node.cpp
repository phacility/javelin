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

extern "C" char* g_fmt(char*, double);
using namespace std;
using namespace fbjs;

//
// Node: All other nodes inherit from this.
Node::Node(const unsigned int lineno /* = 0 */) : _lineno(lineno) {}

Node::~Node() {

  // Delete all children of this node recursively
  for (node_list_t::iterator node = this->_childNodes.begin(); node != this->_childNodes.end(); ++node) {
    delete *node;
  }
}

Node* Node::clone(Node* node) const {
  if (node == NULL) {
    node = new Node();
  }
  for (node_list_t::const_iterator i = const_cast<Node*>(this)->childNodes().begin(); i != const_cast<Node*>(this)->childNodes().end(); ++i) {
    node->appendChild((*i) == NULL ? NULL : (*i)->clone());
  }
  return node;
}

Node* Node::appendChild(Node* node) {
  this->_childNodes.push_back(node);
  return this;
}

Node* Node::prependChild(Node* node) {
  this->_childNodes.push_front(node);
  return this;
}

Node* Node::removeChild(node_list_t::iterator node_pos) {
  Node* node = (*node_pos);
  this->_childNodes.erase(node_pos);
  return node;
}

Node* Node::replaceChild(Node* node, node_list_t::iterator node_pos) {
  this->insertBefore(node, node_pos);
  return this->removeChild(node_pos);
}

Node* Node::insertBefore(Node* node, node_list_t::iterator node_pos) {
  this->_childNodes.insert(node_pos, node);
  return node;
}

node_list_t& Node::childNodes() const {
  return const_cast<Node*>(this)->_childNodes;
}

bool Node::empty() const {
  return this->_childNodes.empty();
}

rope_t Node::render(node_render_enum opts /* = RENDER_NONE */) const {
  return this->render((int)opts);
}

rope_t Node::render(int opts) const {
  render_guts_t guts;
  guts.pretty = opts & RENDER_PRETTY;
  guts.sanelineno = opts & RENDER_MAINTAIN_LINENO;
  guts.lineno = 1;
  return this->render(&guts, 0);
}

rope_t Node::render(render_guts_t* guts, int indentation) const {
  return this->_childNodes.front()->render(guts, indentation);
}

rope_t Node::renderBlock(bool must, render_guts_t* guts, int indentation) const {
  if (!must && !guts->pretty) {
    rope_t ret;
    if (guts->sanelineno) {
      this->renderLinenoCatchup(guts, ret);
    }
    ret += this->renderStatement(guts, indentation);
    return ret;
  } else {
    rope_t ret(guts->pretty ? " {" : "{");
    ret += this->renderIndentedStatement(guts, indentation + 1);
    if (guts->pretty || guts->sanelineno) {
      bool newline;
      if (guts->sanelineno) {
        newline = this->renderLinenoCatchup(guts, ret);
      } else {
        ret += "\n";
        newline = true;
      }
      if (guts->pretty && newline) {
        for (int i = 0; i < indentation; ++i) {
          ret += "  ";
        }
      }
    }
    ret += "}";
    return ret;
  }
}

rope_t Node::renderIndentedStatement(render_guts_t* guts, int indentation) const {
  if (guts->pretty || guts->sanelineno) {
    rope_t ret;
    bool newline = false;
    if (guts->sanelineno) {
      newline = this->renderLinenoCatchup(guts, ret);
    } else {
      if (guts->lineno == 2) {
        ret += "\n";
        newline = true;
      } else {
        // Use lineno property to keep track of whether or not we're on the first line,
        // to avoid an extra line break at the beginning of the render.
        guts->lineno = 2;
      }
    }
    if (guts->pretty && newline) {
      for (int i = 0; i < indentation; ++i) {
        ret += "  ";
      }
    }
    return ret + this->renderStatement(guts, indentation);
  } else {
    return this->renderStatement(guts, indentation);
  }
}

rope_t Node::renderStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation);
}

rope_t Node::renderImplodeChildren(render_guts_t* guts, int indentation, const char* glue) const {
  rope_t ret;
  node_list_t::const_iterator i = this->_childNodes.begin();
  while (i != this->_childNodes.end()) {
    if (*i != NULL) {
      ret += (*i)->render(guts, indentation);
    }
    i++;
    if (i != this->_childNodes.end()) {
      ret += glue;
    }
  }
  return ret;
}

bool Node::renderLinenoCatchup(render_guts_t* guts, rope_t &rope) const {
  if (!this->lineno() || guts->lineno >= this->lineno()) {
    return false;
  }
  rope += rope_t(this->lineno() - guts->lineno, '\n');
  guts->lineno = this->lineno();
  return true;
}

unsigned int Node::lineno() const {
  return this->_lineno;
}

bool Node::operator== (const Node &that) const {
  if (typeid(*this) != typeid(that)) {
    return false;
  }
  node_list_t::iterator jj = that.childNodes().begin();
  for (node_list_t::iterator ii = this->childNodes().begin(); ii != this->childNodes().end(); ++ii) {
    if (**jj != **ii) {
      return false;
    }
    if (++jj == that.childNodes().end()) {
      if (++ii != this->childNodes().end()) {
        return false;
      }
      break;
    }
  }
  return true;
}

bool Node::operator!= (const Node &that) const {
  return !(*this == that);
}

//
// NodeProgram: a javascript program
NodeProgram::NodeProgram() : Node(1) {}
Node* NodeProgram::clone(Node* node) const {
  return Node::clone(new NodeProgram());
}

//
// NodeStatementList: a list of statements
NodeStatementList::NodeStatementList(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeStatementList::clone(Node* node) const {
  return Node::clone(new NodeStatementList());
}

rope_t NodeStatementList::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  for (node_list_t::const_iterator i = this->_childNodes.begin(); i != this->_childNodes.end(); ++i) {
    if (*i != NULL) {
      ret += (*i)->renderIndentedStatement(guts, indentation);
    }
  }
  return ret;
}

rope_t NodeStatementList::renderBlock(bool must, render_guts_t* guts, int indentation) const {
  if (!must && this->empty()) {
    return rope_t(";");
  } else if (!must && !guts->pretty && this->_childNodes.front() == this->_childNodes.back()) {
    rope_t ret;
    if (guts->sanelineno) {
      this->renderLinenoCatchup(guts, ret);
    }
    ret += this->_childNodes.front()->renderBlock(must, guts, indentation);
    return ret;
  } else {
    rope_t ret(guts->pretty ? " {" : "{");
    ret += this->renderIndentedStatement(guts, indentation + 1);
    if (guts->pretty || guts->sanelineno) {
      bool newline;
      if (guts->sanelineno) {
        newline = this->renderLinenoCatchup(guts, ret);
      } else {
        ret += "\n";
        newline = true;
      }
      if (guts->pretty && newline) {
        for (int i = 0; i < indentation; ++i) {
          ret += "  ";
        }
      }
    }
    ret += "}";
    return ret;
  }
}

rope_t NodeStatementList::renderIndentedStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation);
}

rope_t NodeStatementList::renderStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation);
}

//
// NodeExpression
NodeExpression::NodeExpression(const unsigned int lineno /* = 0 */) : Node(lineno) {}

bool NodeExpression::isValidlVal() const {
  return false;
}

rope_t NodeExpression::renderStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation) + ";";
}

bool NodeExpression::compare(bool val) const {
  return false;
}

//
// NodeNumericLiteral: it's a number. like 5. or 3.
NodeNumericLiteral::NodeNumericLiteral(double value, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), value(value) {}

Node* NodeNumericLiteral::clone(Node* node) const {
  return new NodeNumericLiteral(this->value);
}

rope_t NodeNumericLiteral::render(render_guts_t* guts, int indentation) const {
  char buf[32];
  g_fmt(buf, this->value);
  return rope_t(buf);
}

bool NodeNumericLiteral::compare(bool val) const {
  return val ? this->value != 0 : this->value == 0;
}

bool NodeNumericLiteral::operator== (const Node &that) const {
  const NodeNumericLiteral* thatLiteral = dynamic_cast<const NodeNumericLiteral*>(&that);
  return thatLiteral == NULL ? false : this->value == thatLiteral->value;
}

//
// NodeStringLiteral: "Hello."
NodeStringLiteral::NodeStringLiteral(const string &value, bool quoted, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), value(value), quoted(quoted) {}

Node* NodeStringLiteral::clone(Node* node) const {
  return new NodeStringLiteral(this->value, this->quoted);
}

rope_t NodeStringLiteral::render(render_guts_t* guts, int indentation) const {
  if (this->quoted) {
    return rope_t(this->value.c_str());
  } else {
    const char *val = this->value.c_str();
    size_t len = 0;
    for (const char* ii = val; *ii; ++ii) {
      if (*ii < 32) {
        switch (*ii) {
          case '\'': case '\\': case '\b': case '\f': case '\n': case '\r': case '\t':
            len += 2;
            break;
          default:
            len += 4;
        }
      } else {
        ++len;
      }
    }
    if (len == this->value.size()) {
    return rope_t("\"") + this->value.c_str() + "\"";
    } else {
      char *new_str = new char[len + 1];
      char *ii = new_str;
      new_str[len] = 0;
      for (; *val; ++val) {
        if (*val == '\'') {
          sprintf(ii, "\\'");
          ii += 2;
        } else if (*val == '\\') {
          sprintf(ii, "\\'");
          ii += 2;
        } else if (*val == '\b') {
          sprintf(ii, "\\b");
          ii += 2;
        } else if (*val == '\f') {
          sprintf(ii, "\\f");
          ii += 2;
        } else if (*val == '\n') {
          sprintf(ii, "\\n");
          ii += 2;
        } else if (*val == '\r') {
          sprintf(ii, "\\r");
          ii += 2;
        } else if (*val == '\t') {
          sprintf(ii, "\\t");
          ii += 2;
        } else if (*val < 32) {
          sprintf(ii, "\\x%02x", *val);
          ii += 4;
        } else {
          *ii = *val;
          ++ii;
        }
      }
      rope_t ret("\"");
      ret += new_str;
      ret += "\"";
      delete[] new_str;
      return ret;
    }
  }
}

bool NodeStringLiteral::operator== (const Node &that) const {
  const NodeStringLiteral* thatLiteral = dynamic_cast<const NodeStringLiteral*>(&that);
  return thatLiteral == NULL ? false : this->value == thatLiteral->value;
}

//
// NodeRegexLiteral: /foo|bar/
NodeRegexLiteral::NodeRegexLiteral(const string &value, const string &flags, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), value(value), flags(flags) {}

Node* NodeRegexLiteral::clone(Node* node) const {
  return new NodeRegexLiteral(this->value, this->flags);
}

rope_t NodeRegexLiteral::render(render_guts_t* guts, int indentation) const {
  return rope_t("/") + this->value.c_str() + "/" + this->flags.c_str();
}

bool NodeRegexLiteral::operator== (const Node &that) const {
  const NodeRegexLiteral* thatLiteral = dynamic_cast<const NodeRegexLiteral*>(&that);
  return thatLiteral == NULL ? false : this->value == thatLiteral->value && this->flags == thatLiteral->flags;
}

//
// NodeBooleanLiteral: true or false
NodeBooleanLiteral::NodeBooleanLiteral(bool value, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), value(value) {}

rope_t NodeBooleanLiteral::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->value ? "true" : "false");
}

Node* NodeBooleanLiteral::clone(Node* node) const {
  return new NodeBooleanLiteral(this->value);
}

bool NodeBooleanLiteral::compare(bool val) const {
  return val == this->value;
}

bool NodeBooleanLiteral::operator== (const Node &that) const {
  const NodeBooleanLiteral* thatLiteral = dynamic_cast<const NodeBooleanLiteral*>(&that);
  return thatLiteral == NULL ? false : this->value == thatLiteral->value;
}

//
// NodeNullLiteral: null
NodeNullLiteral::NodeNullLiteral(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeNullLiteral::clone(Node* node) const {
  return Node::clone(new NodeNullLiteral());
}

rope_t NodeNullLiteral::render(render_guts_t* guts, int indentation) const {
  return rope_t("null");
}

//
// NodeThis: this
NodeThis::NodeThis(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeThis::clone(Node* node) const {
  return Node::clone(new NodeThis());
}

rope_t NodeThis::render(render_guts_t* guts, int indentation) const {
  return rope_t("this");
}

//
// NodeEmptyExpression
NodeEmptyExpression::NodeEmptyExpression(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeEmptyExpression::clone(Node* node) const {
  return Node::clone(new NodeEmptyExpression());
}

rope_t NodeEmptyExpression::render(render_guts_t* guts, int indentation) const {
  return rope_t();
}

rope_t NodeEmptyExpression::renderBlock(bool must, render_guts_t* guts, int indentation) const {
  return rope_t(";");
}

//
// NodeOperator: expression <op> expression
NodeOperator::NodeOperator(node_operator_t op, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), op(op) {}

Node* NodeOperator::clone(Node* node) const {
  return Node::clone(new NodeOperator(this->op));
}

rope_t NodeOperator::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  bool padding = true;
  ret += this->_childNodes.front()->render(guts, indentation);
  if (guts->pretty) {
    padding = false;
    if (this->op != COMMA) {
    ret += " ";
  }
  }
  switch (this->op) {
    case COMMA:
      ret += ",";
      break;

    case RSHIFT3:
      ret += ">>>";
      break;

    case RSHIFT:
      ret += ">>";
      break;

    case LSHIFT:
      ret += "<<";
      break;

    case OR:
      ret += "||";
      break;

    case AND:
      ret += "&&";
      break;

    case BIT_XOR:
      ret += "^";
      break;

    case BIT_AND:
      ret += "&";
      break;

    case BIT_OR:
      ret += "|";
      break;

    case EQUAL:
      ret += "==";
      break;

    case NOT_EQUAL:
      ret += "!=";
      break;

    case STRICT_EQUAL:
      ret += "===";
      break;

    case STRICT_NOT_EQUAL:
      ret += "!==";
      break;

    case LESS_THAN_EQUAL:
      ret += "<=";
      break;

    case GREATER_THAN_EQUAL:
      ret += ">=";
      break;

    case LESS_THAN:
      ret += "<";
      break;

    case GREATER_THAN:
      ret += ">";
      break;

    case PLUS:
      ret += "+";
      break;

    case MINUS:
      ret += "-";
      break;

    case DIV:
      ret += "/";
      break;

    case MULT:
      ret += "*";
      break;

    case MOD:
      ret += "%";
      break;

    case IN:
      ret += padding ? " in " : "in";
      break;

    case INSTANCEOF:
      ret += padding ? " instanceof " : "instanceof";
      break;
  }
  if (!padding) {
    ret += " ";
  }
  ret += this->_childNodes.back()->render(guts, indentation);
  return ret;
}

bool NodeOperator::operator== (const Node &that) const {
  return Node::operator==(that) && this->op == static_cast<const NodeOperator*>(&that)->op;
}

//
// NodeConditionalExpression: true ? yes() : no()
NodeConditionalExpression::NodeConditionalExpression(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeConditionalExpression::clone(Node* node) const {
  return Node::clone(new NodeConditionalExpression());
}

rope_t NodeConditionalExpression::render(render_guts_t* guts, int indentation) const {
  node_list_t::const_iterator node = this->_childNodes.begin();
  rope_t ret((*node)->render(guts, indentation));
  ret += rope_t(guts->pretty ? " ? " : "?") +
    (*++node)->render(guts, indentation) +
    (guts->pretty ? " : " : ":");
  ret += (*++node)->render(guts, indentation);
  return ret;
}

//
// NodeParenthetical: an expression in ()'s. This is actually implicit in the AST, but we also make it an explicit
// node. Otherwise, the renderer would have to be aware of operator precedence which would be cumbersome.
NodeParenthetical::NodeParenthetical(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeParenthetical::clone(Node* node) const {
  return Node::clone(new NodeParenthetical());
}

rope_t NodeParenthetical::render(render_guts_t* guts, int indentation) const {
  return rope_t("(") + this->_childNodes.front()->render(guts, indentation) + ")";
}

bool NodeParenthetical::isValidlVal() const {
  return static_cast<NodeExpression*>(this->_childNodes.front())->isValidlVal();
}

bool NodeParenthetical::compare(bool val) const {
  return static_cast<NodeExpression*>(this->_childNodes.front())->compare(val);
}

//
// NodeAssignment: identifier = expression
NodeAssignment::NodeAssignment(node_assignment_t op, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), op(op) {}

Node* NodeAssignment::clone(Node* node) const {
  return Node::clone(new NodeAssignment(this->op));
}

rope_t NodeAssignment::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  ret += this->_childNodes.front()->render(guts, indentation);
  if (guts->pretty) {
    ret += " ";
  }
  switch (this->op) {
    case ASSIGN:
      ret += "=";
      break;

    case MULT_ASSIGN:
      ret += "*=";
      break;

    case DIV_ASSIGN:
      ret += "/=";
      break;

    case MOD_ASSIGN:
      ret += "%=";
      break;

    case PLUS_ASSIGN:
      ret += "+=";
      break;

    case MINUS_ASSIGN:
      ret += "-=";
      break;

    case LSHIFT_ASSIGN:
      ret += "<<=";
      break;

    case RSHIFT_ASSIGN:
      ret += ">>=";
      break;

    case RSHIFT3_ASSIGN:
      ret += ">>>=";
      break;

    case BIT_AND_ASSIGN:
      ret += "&=";
      break;

    case BIT_XOR_ASSIGN:
      ret += "^=";
      break;

    case BIT_OR_ASSIGN:
      ret += "|=";
      break;
  }
  if (guts->pretty) {
    ret += " ";
  }
  ret += this->_childNodes.back()->render(guts, indentation);
  return ret;
}

bool NodeAssignment::operator== (const Node &that) const {
  return Node::operator==(that) && this->op == static_cast<const NodeAssignment*>(&that)->op;
}

//
// NodeUnary
NodeUnary::NodeUnary(node_unary_t op, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), op(op) {}

Node* NodeUnary::clone(Node* node) const {
  return Node::clone(new NodeUnary(this->op));
}

rope_t NodeUnary::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  bool need_space = false;
  switch(this->op) {
    case DELETE:
      ret += "delete";
      need_space = true;
      break;
    case VOID:
      ret += "void";
      need_space = true;
      break;
    case TYPEOF:
      ret += "typeof";
      need_space = true;
      break;
    case INCR_UNARY:
      ret += "++";
      break;
    case DECR_UNARY:
      ret += "--";
      break;
    case PLUS_UNARY:
      ret += "+";
      break;
    case MINUS_UNARY:
      ret += "-";
      break;
    case BIT_NOT_UNARY:
      ret += "~";
      break;
    case NOT_UNARY:
      ret += "!";
      break;
  }
  if (need_space && dynamic_cast<NodeParenthetical*>(this->_childNodes.front()) == NULL) {
    ret += " ";
  }
  ret += this->_childNodes.front()->render(guts, indentation);
  return ret;
}

bool NodeUnary::operator== (const Node &that) const {
  return Node::operator==(that) && this->op == static_cast<const NodeUnary*>(&that)->op;
}

//
// NodePostfix
NodePostfix::NodePostfix(node_postfix_t op, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), op(op) {}

Node* NodePostfix::clone(Node* node) const {
  return Node::clone(new NodePostfix(this->op));
}

rope_t NodePostfix::render(render_guts_t* guts, int indentation) const {
  rope_t ret(this->_childNodes.front()->render(guts, indentation));
  switch (this->op) {
    case INCR_POSTFIX:
      ret += "++";
      break;
    case DECR_POSTFIX:
      ret += "--";
      break;
  }
  return ret;
}

bool NodePostfix::operator== (const Node &that) const {
  return Node::operator==(that) && this->op == static_cast<const NodePostfix*>(&that)->op;
}

//
// NodeIdentifier
NodeIdentifier::NodeIdentifier(const string &name, const unsigned int lineno /* = 0 */) : NodeExpression(lineno), _name(name) {}

Node* NodeIdentifier::clone(Node* node) const {
  return Node::clone(new NodeIdentifier(this->_name));
}

rope_t NodeIdentifier::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_name.c_str());
}

const string& NodeIdentifier::name() const {
  return this->_name;
}

bool NodeIdentifier::isValidlVal() const {
  return true;
}

void NodeIdentifier::rename(const string &str) {
  this->_name = str;
}

bool NodeIdentifier::operator== (const Node &that) const {
  const NodeIdentifier* thatIdentifier = dynamic_cast<const NodeIdentifier*>(&that);
  return thatIdentifier == NULL ? false : this->_name == thatIdentifier->_name;
}

//
// NodeArgList: list of expressions for a function call or definition
NodeArgList::NodeArgList(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeArgList::clone(Node* node) const {
  return Node::clone(new NodeArgList());
}

rope_t NodeArgList::render(render_guts_t* guts, int indentation) const {
  return rope_t("(") + this->renderImplodeChildren(guts, indentation, guts->pretty ? ", " : ",") + ")";
}

//
// NodeFunctionDeclaration: brings a function into scope
NodeFunctionDeclaration::NodeFunctionDeclaration(const unsigned int lineno /* = 0 */) : Node(lineno) {}

Node* NodeFunctionDeclaration::clone(Node* node) const {
  return Node::clone(new NodeFunctionDeclaration());
}

rope_t NodeFunctionDeclaration::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  node_list_t::const_iterator node = this->_childNodes.begin();

  ret += rope_t("function ") + (*node)->render(guts, indentation);
  ret += (*++node)->render(guts, indentation);
  ret += (*++node)->renderBlock(true, guts, indentation);
  return ret;
}

//
// NodeFunctionExpression: returns a function
NodeFunctionExpression::NodeFunctionExpression(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeFunctionExpression::clone(Node* node) const {
  return Node::clone(new NodeFunctionExpression());
}

rope_t NodeFunctionExpression::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  node_list_t::const_iterator node = this->_childNodes.begin();

  ret += "function";
  if (*node != NULL) {
    ret += rope_t(" ") + (*node)->render(guts, indentation);
  }
  ret += (*++node)->render(guts, indentation);
  ret += (*++node)->renderBlock(true, guts, indentation);
  return ret;
}

//
// NodeFunctionCall: foo(1). note: this does not cover new foo(1);
NodeFunctionCall::NodeFunctionCall(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeFunctionCall::clone(Node* node) const {
  return Node::clone(new NodeFunctionCall());
}

rope_t NodeFunctionCall::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_childNodes.front()->render(guts, indentation)) + this->_childNodes.back()->render(guts, indentation);
}

//
// NodeFunctionConstructor: new foo(1)
NodeFunctionConstructor::NodeFunctionConstructor(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeFunctionConstructor::clone(Node* node) const {
  return Node::clone(new NodeFunctionConstructor());
}

rope_t NodeFunctionConstructor::render(render_guts_t* guts, int indentation) const {
  return rope_t("new ") + this->_childNodes.front()->render(guts, indentation) + this->_childNodes.back()->render(guts, indentation);
}

//
// NodeIf: if (true) { honk(dazzle); };
NodeIf::NodeIf(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeIf::clone(Node* node) const {
  return Node::clone(new NodeIf());
}

rope_t NodeIf::render(render_guts_t* guts, int indentation) const {
  rope_t ret;

  // Render the conditional expression
  node_list_t::const_iterator node = this->_childNodes.begin();
  ret += guts->pretty ? "if (" : "if(";
  ret += (*node)->render(guts, indentation);
  ret += ")";

  // Currently we need braces if it has else statement
  // TODO: braces are not needed if no nested-if statement.
  Node* ifBlock = *++node;
  Node* elseBlock = *++node;

  bool needBraces = guts->pretty || ifBlock->childNodes().empty()
                    || elseBlock != NULL;
  ret += ifBlock->renderBlock(needBraces, guts, indentation);

  // Render else
  if (elseBlock != NULL) {
    ret += guts->pretty ? " else" : "else";

    // Special-case for rendering else if's
    if (typeid(*elseBlock) == typeid(NodeIf)) {
      if (guts->sanelineno) {
        elseBlock->renderLinenoCatchup(guts, ret);
      }
      ret += " ";
      ret += elseBlock->render(guts, indentation);
    } else {
      rope_t block = elseBlock->renderBlock(false, guts, indentation);
      if (block[0] != '{' && block[0] != ' ') {
        ret += " ";
      }
      ret += block;
    }
  }
  return ret;
}

//
// NodeWith: with (foo) { bar(); };
NodeWith::NodeWith(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeWith::clone(Node* node) const {
  return Node::clone(new NodeWith());
}

rope_t NodeWith::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  node_list_t::const_iterator node = this->_childNodes.begin();
  ret += guts->pretty ? "with (" : "with(";
  ret += (*node)->render(guts, indentation);
  ret += ")";
  ret += (*++node)->renderBlock(false, guts, indentation);
  return ret;
}

//
// NodeTry
NodeTry::NodeTry(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeTry::clone(Node* node) const {
  return Node::clone(new NodeTry());
}

rope_t NodeTry::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  node_list_t::const_iterator node = this->_childNodes.begin();
  ret += "try";
  ret += (*node)->renderBlock(true, guts, indentation);
  if (*++node != NULL) {
    ret += (guts->pretty ? " catch (" : "catch(");
    ret += (*node)->render(guts, indentation) + ")";
    ret += (*++node)->renderBlock(true, guts, indentation);
  } else {
    node++;
  }
  if (*++node != NULL) {
    ret += (guts->pretty ? " finally" : "finally");
    ret += (*node)->renderBlock(true, guts, indentation);
  }
  return ret;
}

//
// NodeStatement
NodeStatement::NodeStatement(const unsigned int lineno /* = 0 */) : Node(lineno) {}
rope_t NodeStatement::renderStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation) + ";";
}

//
// NodeStatementWithExpression: generalized node for return, throw, continue, and break. makes rendering easier and
// the rewriter doesn't really need anything from the nodes
NodeStatementWithExpression::NodeStatementWithExpression(node_statement_with_expression_t statement, const unsigned int lineno /* = 0 */) : NodeStatement(lineno), statement(statement) {}

Node* NodeStatementWithExpression::clone(Node* node) const {
  return Node::clone(new NodeStatementWithExpression(this->statement));
}

rope_t NodeStatementWithExpression::render(render_guts_t* guts, int indentation) const {
  rope_t ret;
  switch (this->statement) {
    case THROW:
      ret += "throw";
      break;

    case RETURN:
      ret += "return";
      break;

    case CONTINUE:
      ret += "continue";
      break;

    case BREAK:
      ret += "break";
      break;
  }
  if (this->_childNodes.back() != NULL) {
    ret += " ";
    ret += this->_childNodes.front()->render(guts, indentation);
  }
  return ret;
}

bool NodeStatementWithExpression::operator== (const Node &that) const {
  return Node::operator==(that) && this->statement == static_cast<const NodeStatementWithExpression*>(&that)->statement;
}

//
// NodeLabel
NodeLabel::NodeLabel(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeLabel::clone(Node* node) const {
  return Node::clone(new NodeLabel());
}

rope_t NodeLabel::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_childNodes.front()->render(guts, indentation)) + (guts->pretty ? ": " : ":") + this->_childNodes.back()->render(guts, indentation);
}

rope_t NodeLabel::renderStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation) + ";";
}

//
// NodeSwitch
NodeSwitch::NodeSwitch(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeSwitch::clone(Node* node) const {
  return Node::clone(new NodeSwitch());
}

rope_t NodeSwitch::render(render_guts_t* guts, int indentation) const {
  return rope_t("switch(") + this->_childNodes.front()->render(guts, indentation) + ")" +
    // Render this with extra indentation, and then in NodeCaseClause we drop lower by 1.
    this->_childNodes.back()->renderBlock(true, guts, indentation + 1);
}

//
// NodeCaseClause: case: bar();
NodeCaseClause::NodeCaseClause(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeCaseClause::clone(Node* node) const {
  return Node::clone(new NodeCaseClause());
}

rope_t NodeCaseClause::render(render_guts_t* guts, int indentation) const {
  return rope_t("case ") + this->_childNodes.front()->render(guts, indentation) + ":";
}

rope_t NodeCaseClause::renderStatement(render_guts_t* guts, int indentation) const {
  return this->render(guts, indentation);
}

rope_t NodeCaseClause::renderIndentedStatement(render_guts_t* guts, int indentation) const {
  return Node::renderIndentedStatement(guts, indentation - 1);
}

//
// NodeDefaultClause: default: foo();
NodeDefaultClause::NodeDefaultClause(const unsigned int lineno /* = 0 */) : NodeCaseClause(lineno) {}
Node* NodeDefaultClause::clone(Node* node) const {
  return Node::clone(new NodeDefaultClause());
}

rope_t NodeDefaultClause::render(render_guts_t* guts, int indentation) const {
  return rope_t("default:");
}

//
// NodeVarDeclaration: a list of identifiers with optional assignments
NodeVarDeclaration::NodeVarDeclaration(bool iterator /* = false */, const unsigned int lineno /* = 0 */) : NodeStatement(lineno), _iterator(iterator) {}
Node* NodeVarDeclaration::clone(Node* node) const {
  return Node::clone(new NodeVarDeclaration());
}

rope_t NodeVarDeclaration::render(render_guts_t* guts, int indentation) const {
  return rope_t("var ") + this->renderImplodeChildren(guts, indentation, guts->pretty ? ", " : ",");
}

bool NodeVarDeclaration::iterator() const {
  return this->_iterator;
}

Node* NodeVarDeclaration::setIterator(bool iterator) {
  this->_iterator = iterator;
  return this;
}

//
// NodeTypehint: a variable declaration with a typehint
NodeTypehint::NodeTypehint(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeTypehint::clone(Node* node) const {
  return Node::clone(new NodeTypehint());
}

rope_t NodeTypehint::render(render_guts_t* guts, int indentation) const {
  rope_t ret =
    this->_childNodes.front()->render(guts, indentation) + ":" +
    this->_childNodes.back()->render(guts, indentation);
  return ret;
}

//
// NodeObjectLiteral
NodeObjectLiteral::NodeObjectLiteral(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeObjectLiteral::clone(Node* node) const {
  return Node::clone(new NodeObjectLiteral());
}

rope_t NodeObjectLiteral::render(render_guts_t* guts, int indentation) const {
  return rope_t("{") + this->renderImplodeChildren(guts, indentation, guts->pretty ? ", " : ",") + "}";
}

//
// NodeObjectLiteralProperty
NodeObjectLiteralProperty::NodeObjectLiteralProperty(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeObjectLiteralProperty::clone(Node* node) const {
  return Node::clone(new NodeObjectLiteralProperty());
}

rope_t NodeObjectLiteralProperty::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_childNodes.front()->render(guts, indentation)) + (guts->pretty ? ": " : ":") +
    this->_childNodes.back()->render(guts, indentation);
}

//
// NodeArrayLiteral
NodeArrayLiteral::NodeArrayLiteral(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
Node* NodeArrayLiteral::clone(Node* node) const {
  return Node::clone(new NodeArrayLiteral());
}

rope_t NodeArrayLiteral::render(render_guts_t* guts, int indentation) const {
  return rope_t("[") + this->renderImplodeChildren(guts, indentation, guts->pretty ? ", " : ",") + "]";
}

//
// NodeStaticMemberExpression: object access via foo.bar
NodeStaticMemberExpression::NodeStaticMemberExpression(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}
rope_t NodeStaticMemberExpression::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_childNodes.front()->render(guts, indentation)) + "." + this->_childNodes.back()->render(guts, indentation);
}

Node* NodeStaticMemberExpression::clone(Node* node) const {
  return Node::clone(new NodeStaticMemberExpression());
}

bool NodeStaticMemberExpression::isValidlVal() const {
  return true;
}

//
// NodeDynamicMemberExpression: object access via foo['bar']
NodeDynamicMemberExpression::NodeDynamicMemberExpression(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeDynamicMemberExpression::clone(Node* node) const {
  return Node::clone(new NodeDynamicMemberExpression());
}

rope_t NodeDynamicMemberExpression::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_childNodes.front()->render(guts, indentation)) +
    "[" + this->_childNodes.back()->render(guts, indentation) + "]";
}

bool NodeDynamicMemberExpression::isValidlVal() const {
  return true;
}

//
// NodeForLoop: only for(;;); loops, not for in
NodeForLoop::NodeForLoop(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeForLoop::clone(Node* node) const {
  return Node::clone(new NodeForLoop());
}

rope_t NodeForLoop::render(render_guts_t* guts, int indentation) const {
  node_list_t::const_iterator node = this->_childNodes.begin();
  rope_t ret(guts->pretty ? "for (" : "for(");
  ret += (*node)->render(guts, indentation) + (guts->pretty ? "; " : ";");
  ret += (*++node)->render(guts, indentation) + (guts->pretty ? "; " : ";");
  ret += (*++node)->render(guts, indentation) + ")";
  ret += (*++node)->renderBlock(false, guts, indentation);
  return ret;
}

//
// NodeForIn
NodeForIn::NodeForIn(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeForIn::clone(Node* node) const {
  return Node::clone(new NodeForIn());
}

rope_t NodeForIn::render(render_guts_t* guts, int indentation) const {
  node_list_t::const_iterator node = this->_childNodes.begin();
  rope_t ret(guts->pretty ? "for (" : "for(");
  ret += (*node)->render(guts, indentation) + " in ";
  ret += (*++node)->render(guts, indentation) + ")";
  ret += (*++node)->renderBlock(false, guts, indentation);
  return ret;
}

//
// NodeForEachIn
NodeForEachIn::NodeForEachIn(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeForEachIn::clone(Node* node) const {
  return Node::clone(new NodeForEachIn());
}

rope_t NodeForEachIn::render(render_guts_t* guts, int indentation) const {
  node_list_t::const_iterator node = this->_childNodes.begin();
  rope_t ret(guts->pretty ? "for each (" : "for each(");
  ret += (*node)->render(guts, indentation) + " in ";
  ret += (*++node)->render(guts, indentation) + ")";
  ret += (*++node)->renderBlock(false, guts, indentation);
  return ret;
}

//
// NodeWhile
NodeWhile::NodeWhile(const unsigned int lineno /* = 0 */) : Node(lineno) {}
Node* NodeWhile::clone(Node* node) const {
  return Node::clone(new NodeWhile());
}

rope_t NodeWhile::render(render_guts_t* guts, int indentation) const {
  return rope_t(guts->pretty ? "while (" : "while(") +
    this->_childNodes.front()->render(guts, indentation) + ")" +
    this->_childNodes.back()->renderBlock(false, guts, indentation);
}

//
// NodeDoWhile
NodeDoWhile::NodeDoWhile(const unsigned int lineno /* = 0 */) : NodeStatement(lineno) {}
Node* NodeDoWhile::clone(Node* node) const {
  return Node::clone(new NodeDoWhile());
}

rope_t NodeDoWhile::render(render_guts_t* guts, int indentation) const {
  rope_t ret("do");
  // Technically this shouldn't be renderBlock(true, ...) but requiring braces makes it easier to render it all...
  ret += this->_childNodes.front()->renderBlock(true, guts, indentation);
  if (guts->sanelineno) {
    this->_childNodes.back()->renderLinenoCatchup(guts, ret);
  }
  ret += (guts->pretty ? " while (" : "while(") ;
  ret += this->_childNodes.back()->render(guts, indentation) + ")";
  return ret;
}

//
// NodeXMLDefaultNamespace
NodeXMLDefaultNamespace::NodeXMLDefaultNamespace(const unsigned int lineno /* = 0 */) : NodeStatement(lineno) {}

Node* NodeXMLDefaultNamespace::clone(Node* node) const {
  return Node::clone(new NodeXMLDefaultNamespace());
}

rope_t NodeXMLDefaultNamespace::render(render_guts_t* guts, int indentation) const {
  return rope_t("default xml namespace = ") + this->_childNodes.front()->render(guts, indentation);
}

//
// NodeXMLName
NodeXMLName::NodeXMLName(const string &ns, const string &name, const unsigned int lineno /* = 0 */) : Node(lineno), _ns(ns), _name(name) {}

Node* NodeXMLName::clone(Node* node) const {
  return Node::clone(new NodeXMLName(this->_ns, this->_name));
}

rope_t NodeXMLName::render(render_guts_t* guts, int indentation) const {
  if (this->_ns.empty()) {
    return rope_t(this->_name.c_str());
  } else {
    return rope_t(this->_ns.c_str()) + rope_t(":") + rope_t(this->_name.c_str());
  }
}

const string NodeXMLName::ns() const {
  return this->_ns;
}

const string NodeXMLName::name() const {
  return this->_name;
}

//
// NodeXMLElement
NodeXMLElement::NodeXMLElement(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeXMLElement::clone(Node* node) const {
  return Node::clone(new NodeXMLElement());
}

rope_t NodeXMLElement::render(render_guts_t* guts, int indentation) const {
  rope_t ret("<");
  node_list_t::const_iterator ii = this->_childNodes.begin();
  if (*ii != NULL) {
    ret += (*ii)->render(guts, indentation);
  } else {
    // xml list
    ii++;
    ret += ">";
    ret += (*++ii)->render(guts, indentation);
    ret += "</>";
    return ret;
  }
  ++ii;
  if (!(*ii)->empty()) {
    ret += " ";
    ret += (*ii)->render(guts, indentation);
  }
  ++ii;
  if (!(*ii)->empty()) {
    ret += ">";
    ret += (*ii)->render(guts, indentation);
    ret += "</";
    ret += (*++ii)->render(guts, indentation);
    ret += ">";
  } else {
    if ((*++ii) == NULL) {
      ret += "/>";
    } else {
      ret += "</";
      ret += (*ii)->render(guts, indentation);
      ret += ">";
    }
  }
  return ret;
}

//
// NodeXMLComment
NodeXMLComment::NodeXMLComment(const string &comment, const unsigned int lineno /* = 0 */) : Node(lineno), _comment(comment) {}

Node* NodeXMLComment::clone(Node* node) const {
  return Node::clone(new NodeXMLComment(this->_comment));
}

rope_t NodeXMLComment::render(render_guts_t* guts, int indentation) const {
  rope_t ret("<!--");
  ret += rope_t(this->_comment.c_str());
  ret += "-->";
  return ret;
}

const string NodeXMLComment::comment() const {
  return this->_comment;
}

//
// NodeXMLPI
NodeXMLPI::NodeXMLPI(const string &data, const unsigned int lineno /* = 0 */) : Node(lineno), _data(data) {}

Node* NodeXMLPI::clone(Node* node) const {
  return Node::clone(new NodeXMLPI(this->_data));
}

rope_t NodeXMLPI::render(render_guts_t* guts, int indentation) const {
  rope_t ret("<?");
  ret += rope_t(this->_data.c_str());
  ret += "?>";
  return ret;
}

const string NodeXMLPI::data() const {
  return this->_data;
}

//
// NodeXMLContentList
NodeXMLContentList::NodeXMLContentList(const unsigned int lineno /* = 0 */) : Node(lineno) {}

Node* NodeXMLContentList::clone(Node* node) const {
  return Node::clone(new NodeXMLContentList());
}

rope_t NodeXMLContentList::render(render_guts_t* guts, int indentation) const {
  return this->renderImplodeChildren(guts, indentation, "");
}

//
// NodeXMLTextData
NodeXMLTextData::NodeXMLTextData(const unsigned int lineno /* = 0 */) : Node(lineno), whitespace(true) {}

Node* NodeXMLTextData::clone(Node* node) const {
  NodeXMLTextData* new_node = new NodeXMLTextData();
  new_node->appendData(this->_data, this->whitespace);
  return Node::clone(new_node);
}

rope_t NodeXMLTextData::render(render_guts_t* guts, int indentation) const {
  return this->_data;
}

void NodeXMLTextData::appendData(rope_t str, bool isWhitespace /* = false */) {
  this->_data += str;
  if (!isWhitespace) {
    this->whitespace = false;
  }
}

bool NodeXMLTextData::isWhitespace() const {
  return this->whitespace;
}

const char* NodeXMLTextData::data() const {
  return this->_data.c_str();
}

//
// NodeXMLEmbeddedExpression
NodeXMLEmbeddedExpression::NodeXMLEmbeddedExpression(const unsigned int lineno /* = 0 */) : Node(lineno) {}

Node* NodeXMLEmbeddedExpression::clone(Node* node) const {
  return Node::clone(new NodeXMLEmbeddedExpression());
}

rope_t NodeXMLEmbeddedExpression::render(render_guts_t* guts, int indentation) const {
  return rope_t("{") + this->_childNodes.front()->render(guts, indentation) + "}";
}

//
// NodeXMLAttributeList
NodeXMLAttributeList::NodeXMLAttributeList(const unsigned int lineno /* = 0 */) : Node(lineno) {}

Node* NodeXMLAttributeList::clone(Node* node) const {
  return Node::clone(new NodeXMLAttributeList());
}

rope_t NodeXMLAttributeList::render(render_guts_t* guts, int indentation) const {
  return this->renderImplodeChildren(guts, indentation, " ");
}

//
// NodeXMLAttribute
NodeXMLAttribute::NodeXMLAttribute(const unsigned int lineno /* = 0 */) : Node(lineno) {}

Node* NodeXMLAttribute::clone(Node* node) const {
  return Node::clone(new NodeXMLAttribute());
}

rope_t NodeXMLAttribute::render(render_guts_t* guts, int indentation) const {
  rope_t ret = this->_childNodes.front()->render(guts, indentation);
  ret += "=";
  Node* val = this->_childNodes.back();
  if (typeid(*val) == typeid(NodeXMLTextData)) {
    // TODO: Escape value, <foo bar="&amp;" /> will render to <foo bar="&" />
    ret += "\"";
    ret += val->render(guts, indentation);
    ret += "\"";
  } else {
    ret += val->render(guts, indentation);
  }
  return ret;
}

//
// NodeWildcardIdentifier
NodeWildcardIdentifier::NodeWildcardIdentifier(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeWildcardIdentifier::clone(Node* node) const {
  return Node::clone(new NodeWildcardIdentifier());
}

rope_t NodeWildcardIdentifier::render(render_guts_t* guts, int indentation) const {
  return rope_t("*");
}

bool NodeWildcardIdentifier::isValidlVal() const {
  return true;
}

//
// NodeStaticAttributeIdentifier
NodeStaticAttributeIdentifier::NodeStaticAttributeIdentifier(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeStaticAttributeIdentifier::clone(Node* node) const {
  return Node::clone(new NodeStaticAttributeIdentifier());
}

rope_t NodeStaticAttributeIdentifier::render(render_guts_t* guts, int indentation) const {
  return rope_t("@") + this->_childNodes.front()->render(guts, indentation);
}

bool NodeStaticAttributeIdentifier::isValidlVal() const {
  return true;
}

//
// NodeDynamicAttributeIdentifier
NodeDynamicAttributeIdentifier::NodeDynamicAttributeIdentifier(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeDynamicAttributeIdentifier::clone(Node* node) const {
  return Node::clone(new NodeDynamicAttributeIdentifier());
}

rope_t NodeDynamicAttributeIdentifier::render(render_guts_t* guts, int indentation) const {
  return rope_t("@[") + this->_childNodes.front()->render(guts, indentation) + "]";
}

bool NodeDynamicAttributeIdentifier::isValidlVal() const {
  return true;
}

//
// NodeStaticQualifiedIdentifier
NodeStaticQualifiedIdentifier::NodeStaticQualifiedIdentifier(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeStaticQualifiedIdentifier::clone(Node* node) const {
  return Node::clone(new NodeStaticQualifiedIdentifier());
}

rope_t NodeStaticQualifiedIdentifier::render(render_guts_t* guts, int indentation) const {
  return
    this->_childNodes.front()->render(guts, indentation) + "::" +
    this->_childNodes.back()->render(guts, indentation);
}

bool NodeStaticQualifiedIdentifier::isValidlVal() const {
  return true;
}

//
// NodeDynamicQualifiedIdentifier
NodeDynamicQualifiedIdentifier::NodeDynamicQualifiedIdentifier(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeDynamicQualifiedIdentifier::clone(Node* node) const {
  return Node::clone(new NodeDynamicQualifiedIdentifier());
}

rope_t NodeDynamicQualifiedIdentifier::render(render_guts_t* guts, int indentation) const {
  return
    this->_childNodes.front()->render(guts, indentation) + "::[" +
    this->_childNodes.back()->render(guts, indentation) + "]";
}

bool NodeDynamicQualifiedIdentifier::isValidlVal() const {
  return true;
}

//
// NodeFilteringPredicate
NodeFilteringPredicate::NodeFilteringPredicate(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

Node* NodeFilteringPredicate::clone(Node* node) const {
  return Node::clone(new NodeFilteringPredicate());
}

rope_t NodeFilteringPredicate::render(render_guts_t* guts, int indentation) const {
  return
    this->_childNodes.front()->render(guts, indentation) + ".(" +
    this->_childNodes.back()->render(guts, indentation) + ")";
}

bool NodeFilteringPredicate::isValidlVal() const {
  return true;
}

//
// NodeDescendantExpression
NodeDescendantExpression::NodeDescendantExpression(const unsigned int lineno /* = 0 */) : NodeExpression(lineno) {}

rope_t NodeDescendantExpression::render(render_guts_t* guts, int indentation) const {
  return rope_t(this->_childNodes.front()->render(guts, indentation)) + ".." + this->_childNodes.back()->render(guts, indentation);
}

Node* NodeDescendantExpression::clone(Node* node) const {
  return Node::clone(new NodeDescendantExpression());
}
