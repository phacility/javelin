#include "libfbjs/node.hpp"
#include "libfbjs/parser.hpp"

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

string get_static_member_symbol(Node *node);

void find_symbols(Node *node, symbol_t &installs, symbol_t &behaviors,
                  symbol_t &uses) {
  if (node == NULL) {
    return;
  }

  if (typeid(*node) == typeid(NodeStaticMemberExpression)) {
    string symbol = get_static_member_symbol(node);
    if (symbol[0] == 'J' && symbol[1] == 'X' && symbol[2] == '.') {
      uses[symbol] = node->lineno();
    }
  }

  if (typeid(*node) == typeid(NodeFunctionCall)) {
    Node *call = *node->childNodes().begin();
    if (static_cast<NodeStaticMemberExpression *>(call)) {
      string symbol = get_static_member_symbol(call);
      if (symbol == "JX.install" || symbol == "JX.behavior") {
        NodeArgList *args =
          static_cast<NodeArgList*>(*(++node->childNodes().begin()));
        NodeStringLiteral* lit =
          static_cast<NodeStringLiteral*>(*args->childNodes().begin());
        if (symbol == "JX.install") {
          installs[lit->unquoted_value()] = node->lineno();
        } else {
          behaviors[lit->unquoted_value()] = node->lineno();
        }
      }
    }
  }

  for_nodes(node, ii) {
    find_symbols(*ii, installs, behaviors, uses);
  }
}

string get_static_member_symbol(Node *node) {
  string symbol = "";
  if (node == NULL) {
    return symbol;
  }

  for_nodes(node, ii) {
    if (!(*ii)) {
      break;
    }
    if (typeid(**ii) == typeid(NodeIdentifier)) {
      NodeIdentifier *n = static_cast<NodeIdentifier *>(*ii);
      if (symbol.length()) {
        symbol += ".";
      }
      symbol += n->name();
    } else if (typeid(**ii) == typeid(NodeStaticMemberExpression)) {
      symbol += get_static_member_symbol(*ii);
    }
  }

  return symbol;
}

int main(int argc, char* argv[]) {
  try {
    NodeProgram root(stdin); // parses

    symbol_t installs;
    symbol_t behaviors;
    symbol_t uses;

    find_symbols(&root, installs, behaviors, uses);

    for (symbol_t::iterator ii = installs.begin(); ii != installs.end(); ++ii) {
      cout << "+" << ii->first << ":" << ii->second << endl;
    }
    for (symbol_t::iterator ii = behaviors.begin(); ii != behaviors.end(); ++ii) {
      cout << "*" << ii->first << ":" << ii->second << endl;
    }
    for (symbol_t::iterator ii = uses.begin(); ii != uses.end(); ++ii) {
      cout << "?" << ii->first << ":" << ii->second << endl;
    }

  } catch (ParseException ex) {
    printf("Parse Error: %s\n", ex.what());
    return 1;
  }
}
