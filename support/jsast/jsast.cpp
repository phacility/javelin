#include "libfbjs/node.hpp"

#include <iostream>
#include <string.h>
#include <map>

using namespace fbjs;
using namespace std;

typedef map<string, int> symbol_t;

#define for_nodes(p, i) \
  for (node_list_t::iterator i  = (p)->childNodes().begin(); \
                             i != (p)->childNodes().end(); \
                           ++i)

char *get_node_name(Node *node) {
  if (typeid(*node) == typeid(NodeProgram)) {
    return "Program";
  } else if (typeid(*node) == typeid(NodeStatementList)) {
    return "StatementList";
  } else if (typeid(*node) == typeid(NodeExpression)) {
    return "Expression";
  } else if (typeid(*node) == typeid(NodeNumericLiteral)) {
    return "NumericLiteral";
  } else if (typeid(*node) == typeid(NodeStringLiteral)) {
    return "StringLiteral";
  } else if (typeid(*node) == typeid(NodeRegexLiteral)) {
    return "RegexLiteral";
  } else if (typeid(*node) == typeid(NodeBooleanLiteral)) {
    return "BooleanLiteral";
  } else if (typeid(*node) == typeid(NodeNullLiteral)) {
    return "NullLiteral";
  } else if (typeid(*node) == typeid(NodeThis)) {
    return "This";
  } else if (typeid(*node) == typeid(NodeEmptyExpression)) {
    return "EmptyExpression";
  } else if (typeid(*node) == typeid(NodeOperator)) {
    return "Operator";
  } else if (typeid(*node) == typeid(NodeConditionalExpression)) {
    return "ConditionalExpression";
  } else if (typeid(*node) == typeid(NodeParenthetical)) {
    return "Parenthetical";
  } else if (typeid(*node) == typeid(NodeAssignment)) {
    return "Assignment";
  } else if (typeid(*node) == typeid(NodeUnary)) {
    return "Unary";
  } else if (typeid(*node) == typeid(NodePostfix)) {
    return "Postfix";
  } else if (typeid(*node) == typeid(NodeIdentifier)) {
    return "Identifier";
  } else if (typeid(*node) == typeid(NodeFunctionCall)) {
    return "FunctionCall";
  } else if (typeid(*node) == typeid(NodeFunctionConstructor)) {
    return "FunctionConstructor";
  } else if (typeid(*node) == typeid(NodeObjectLiteral)) {
    return "ObjectLiteral";
  } else if (typeid(*node) == typeid(NodeArrayLiteral)) {
    return "ArrayLiteral";
  } else if (typeid(*node) == typeid(NodeStaticMemberExpression)) {
    return "StaticMemberExpression";
  } else if (typeid(*node) == typeid(NodeDynamicMemberExpression)) {
    return "DynamicMemberExpression";
  } else if (typeid(*node) == typeid(NodeStatement)) {
    return "Statement";
  } else if (typeid(*node) == typeid(NodeStatementWithExpression)) {
    return "StatementWithExpression";
  } else if (typeid(*node) == typeid(NodeVarDeclaration)) {
    return "VarDeclaration";
  } else if (typeid(*node) == typeid(NodeFunctionDeclaration)) {
    return "FunctionDeclaration";
  } else if (typeid(*node) == typeid(NodeFunctionExpression)) {
    return "FunctionExpression";
  } else if (typeid(*node) == typeid(NodeArgList)) {
    return "ArgList";
  } else if (typeid(*node) == typeid(NodeIf)) {
    return "If";
  } else if (typeid(*node) == typeid(NodeWith)) {
    return "With";
  } else if (typeid(*node) == typeid(NodeTry)) {
    return "Try";
  } else if (typeid(*node) == typeid(NodeLabel)) {
    return "Label";
  } else if (typeid(*node) == typeid(NodeCaseClause)) {
    return "CaseClause";
  } else if (typeid(*node) == typeid(NodeSwitch)) {
    return "Switch";
  } else if (typeid(*node) == typeid(NodeDefaultClause)) {
    return "DefaultClause";
  } else if (typeid(*node) == typeid(NodeObjectLiteralProperty)) {
    return "ObjectLiteralProperty";
  } else if (typeid(*node) == typeid(NodeForLoop)) {
    return "ForLoop";
  } else if (typeid(*node) == typeid(NodeForIn)) {
    return "ForIn";
  } else if (typeid(*node) == typeid(NodeWhile)) {
    return "While";
  } else if (typeid(*node) == typeid(NodeDoWhile)) {
    return "DoWhile";
  }
  return "Unknown";
}

string get_node_value(Node *node) {
  if (typeid(*node) == typeid(NodeStringLiteral)) {
    NodeStringLiteral *nsl = static_cast<NodeStringLiteral *>(node);
    return nsl->unquoted_value();
  } else if (typeid(*node) == typeid(NodeIdentifier)) {
    NodeIdentifier *ni = static_cast<NodeIdentifier *>(node);
    return ni->name();
  }  
  return "";
}

void print_tree(Node *node) {
  printf("[\"%s\", [", get_node_name(node));

  bool skip_body = (typeid(*node) == typeid(NodeFunctionExpression));
  bool is_first = true;
  for_nodes(node, ii) {
    if (*ii) {
      if (skip_body && typeid(**ii) == typeid(NodeStatementList)) {
        break;
      }
      if (is_first) {
        is_first = false;
      } else {
        printf(", ");
      }
      print_tree(*ii);
    }
  }
  printf("]");
  
  string s = get_node_value(node);
  if (s.length()) {
    printf(", \"%s\", \"%d\"", s.c_str(), node->lineno());
  }

  printf("]");
}


int main(int argc, char* argv[]) {
  try {
    NodeProgram root(stdin); // parses

    print_tree(&root);
//    printf("\n");

  } catch (ParseException ex) {
    printf("Parse Error: %s\n", ex.what());
    return 1;
  }
}
