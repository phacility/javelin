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

#include "reduce.hpp"
#include <set>
#include <string>
using namespace fbjs;
using namespace std;

// Returns true if a given id is reserved JS keywords, see ECMA-262 sect 7.5.1
static bool is_reserved_keyword(string id) {
  static set<string> keyword_set;
  static bool initialized = false;
  if (!initialized) {
    initialized = true;
    static const char* keywords[] = {
      // Keywords
      "break", "case", "catch", "continue", "default", "delete", "do", "else",
      "finally", "for", "function", "if", "in", "instanceof", "new", "return",
      "switch", "this", "throw", "try", "typeof", "var", "void", "while",
      "with",
      // Future reserved words
      //   Our code does not respect future reserved keywords.
      // Safari is picky about this. Don't consider them as identifiers
      // for optimizations.
      "abstract", "boolean", "byte", "char", "class", "const", "debugger",
      "double", "enum", "export", "extends", "final", "float", "goto",
      "implements", "import", "int", "interface", "long", "native",
      "package", "private", "protected", "public", "short", "static",
      "super", "synchronized", "throws", "transient", "volatile",
      //
      // NullLiteral and BooleanLiteral
      "true", "false", "null",
      NULL
    };
    for (const char** ptr = keywords; *ptr != NULL; ptr++) {
      keyword_set.insert(*ptr);
    }
  }
  return keyword_set.find(id) != keyword_set.end();
}

// Returns true if a given string is a JS identifier.
// NOTE: the function does not recognize escaped unicode as identifiers
static bool is_identifier(string id) {
  // "[a-zA-Z$_][a-zA-Z$_0-9]*]"
  if (id.size() == 0) return false;

  if (is_reserved_keyword(id)) return false;

  char first = id[0];
  if (!isalpha(first) &&
      first != '$' &&
      first != '_') {
    return false;
  }

  for (size_t i = 1; i < id.size(); i++) {
    char c = id[i];
    if (!isalpha(c) &&
        !isdigit(c) &&
        c != '$' &&
        c != '_') {
      return false;
    }
  }
  return true;
}

void ReductionWalker::visit(NodeExpression& node) {
  visitChildren();
  if (dynamic_cast<NodeStatementList*>(parent()->node())) {
    if (node.compare(true) || node.compare(false)) {
      // If I'm the direct child of a statement list and have no side-effects; I
      // can be removed.
      remove();
      return;
    }
  }
}

void ReductionWalker::visit(NodeOperator& node) {
  visitChildren();

  NodeExpression* left = dynamic_cast<NodeExpression*>(node.childNodes().front());
  NodeExpression* right = dynamic_cast<NodeExpression*>(node.childNodes().back());
  switch (node.operatorType()) {
    case OR:
      if (left->compare(true)) {
        Node* tmp = node.removeChild(node.childNodes().begin());
        replaceAndVisit(tmp);
      } else if (left->compare(false)) {
        if (right->compare(true)) {
          Node* tmp = node.removeChild(++node.childNodes().begin());
          replaceAndVisit(tmp);
        } else if (right->compare(false)) {
          replaceAndVisit(new NodeBooleanLiteral(false));
        }
      }
      break;

    case AND:
      if (left->compare(false)) {
        replaceAndVisit(new NodeBooleanLiteral(false));
      } else if (left->compare(true)) {
        if (right->compare(false)) {
          replaceAndVisit(new NodeBooleanLiteral(false));
        } else {
          replaceAndVisit(node.removeChild(++node.childNodes().begin()));
        }
      }
      break;

    case COMMA:
      if (left->compare(false) || left->compare(true)) {
        replaceAndVisit(node.removeChild(++node.childNodes().begin()));
      }
      break;

    default: break;
  }
}

void ReductionWalker::visit(NodeUnary& node) {
  visitChildren();
  if (node.operatorType() == NOT_UNARY) {
    NodeExpression* expr = static_cast<NodeExpression*>(node.childNodes().front());
    if (expr->compare(true)) {
      replaceAndVisit(new NodeBooleanLiteral(false));
    } else if (expr->compare(false)) {
      replaceAndVisit(new NodeBooleanLiteral(true));
    }
  }
}

void ReductionWalker::visit(NodeConditionalExpression& node) {
  visitChildren();
  NodeExpression* expr = static_cast<NodeExpression*>(node.childNodes().front());
  bool result = expr->compare(true);
  if (!result) {
    result = expr->compare(false);
    if (!result) {
      return;
    }
    result = false;
  }
  node_list_t::iterator block = ++node.childNodes().begin();
  if (!result) {
    ++block;
  }
  Node* tmp = node.removeChild(block);
  // note: will walk this sub-tree twice. otherwise won't catch:
  // true ? true : true;
  // in the NodeExpression block.
  replaceAndVisit(tmp);
}

void ReductionWalker::visit(NodeFunctionCall& node) {
  visitChildren();
  NodeIdentifier* name = dynamic_cast<NodeIdentifier*>(node.childNodes().front());
  if (name != NULL && name->name() == "bagofholding") {
    replaceAndVisit(new NodeBooleanLiteral(false));
  }
}
#include <iostream>
void ReductionWalker::visit(NodeIf& node) {
  visitChildren();

  // if (true / false) { ... } else { ... } -> ...
  {
    node_list_t::iterator it = node.childNodes().begin();
    NodeExpression* expression = static_cast<NodeExpression*>(*it);
    ++it;
    if (expression->compare(true)) {
      // take the ifBlock
      replace(node.removeChild(it));
      return;
    } else if (expression->compare(false)) {
      // take the else branch
      ++it;
      Node* elseBlock = *it;
      if (elseBlock == NULL) {
        remove();
      } else {
        replace(node.removeChild(it));
      }
      return;
    }
  }

  // remove empty blocks
  {
    // Remove empty blocks. Empty blocks are most likely result of other
    // code optimizations, e.g. 'bagofholding()'.
    node_list_t::iterator it = node.childNodes().begin();
    NodeExpression* expression = static_cast<NodeExpression*>(*it);
    Node* ifBlock = *++it;
    Node* elseBlock = *++it;

    // If the else part is empty, it's safe to remove the else part.
    //   if (cond) { ... } else { }  -> if (cond) { ... }
    if (elseBlock != NULL && elseBlock->childNodes().empty()) {
      node.replaceChild(NULL, it);  // *it == elseblock
      delete elseBlock;
      elseBlock = NULL;
    }

    // If both pathes are empty, replace it by the cond expression;
    //   if (cond) { } else { } -> cond;
    if (ifBlock->childNodes().empty() &&
        elseBlock == NULL) {
      Node* cond = node.removeChild(node.childNodes().begin());
      replace(cond);
      return;
    }

    // If the ifBlock is empty, negate the condition, then reduce it.
    //   if (cond) {} else { ... } -> if (!(cond)) { ... }
    if (ifBlock->childNodes().empty() && elseBlock != NULL) {
      // replace condition expression by !cond
      int lineno = expression->lineno();
      Node* new_cond = (new NodeUnary(NOT_UNARY, lineno))
                       ->appendChild((new NodeParenthetical(lineno))
                                     ->appendChild(expression));
      node_list_t::iterator it_2 = node.childNodes().begin();
      node.replaceChild(new_cond, it_2++);
      // repalce empty ifBlock by elseBlock and remove elseBlock
      node.replaceChild(elseBlock, it_2++);
      node.replaceChild(NULL, it_2);

      delete ifBlock;
      visitChildren();
    }
  }
}

void ReductionWalker::visit(NodeObjectLiteralProperty& node) {
  visitChildren();
  if (node.childNodes().empty()) {
    return;
  }

  Node* prop_name = node.childNodes().front();
  if (typeid(*prop_name) != typeid(NodeStringLiteral)) {
    return;
  }

  NodeStringLiteral* lit = static_cast<NodeStringLiteral*>(prop_name);
  // We can only rewrite the expression when unquoted_value() can be an
  // identifier.
  string maybe_id = lit->unquoted_value();
  if (!is_identifier(maybe_id)) {
    return;
  }

  NodeIdentifier* id = new NodeIdentifier(maybe_id, lit->lineno());
  NodeObjectLiteralProperty* result = new NodeObjectLiteralProperty(node.lineno());
  // Caller's responsibility to delete this.
  replace(result
    ->appendChild(id)
    ->appendChild(node.removeChild(++node.childNodes().begin())));
}

void ReductionWalker::visit(NodeDynamicMemberExpression& node) {
  visitChildren();
  Node* subscription = node.childNodes().back();
  if (typeid(*subscription) != typeid(NodeStringLiteral)) {
    return;
  }

  NodeStringLiteral* lit = static_cast<NodeStringLiteral*>(subscription);
  // We can only rewrite the expression when unquoted_value() can be an
  // identifier. Quick hack, if the identifier contains
  string maybe_id = lit->unquoted_value();
  if (!is_identifier(maybe_id)) {
    return;
  }

  NodeIdentifier* id = new NodeIdentifier(maybe_id, lit->lineno());
  Node* result = new NodeStaticMemberExpression(node.lineno());
  // Caller's responsibility to delete this.
  replace(result
    ->appendChild(node.removeChild(node.childNodes().begin()))
    ->appendChild(id));
}
