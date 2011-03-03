#include "jsxmin_renaming.h"

#include <assert.h>
#include <stdio.h>
#include <iostream>

// Varaible renaming of JS files.
// This file includes three renaming strategies:
//   1. local variable renaming;
//   2. global variable renaming in the current file scope;
//   3. property renaming in the current file scope;
//
// Local variable renaming:
//   This is done in function level. The first pass collects all varabiles and
//   functions declared in the current scope (non-recursive), and choose a new
//   (shorter) name for local variables and functions. New names cannot be names
//   used in parent scopes (the global scope is root of all local scopes).
//   The second pass renames identifiers in the current function using
//   the mapping constructed in the local scope. Here is one example:
//
//   // Starts from global scope
//   var a = 10;
//   function func(foo, bar) {
//     var gee = a;
//   }
//   First, it builds a gloabl scope with mappings
//     global_scope => {'a' -> 'a', 'func' -> 'func'}
//   When entering function 'func', a local scope is built:
//     func_scope => {'foo' -> 'foo', 'bar' -> 'bar', 'gee' -> 'gee'}
//        |__ parent -> {'a' -> 'a', 'func' -> 'func'} ( *global_scope* )
//
//   When renaming variables in func_scope, it starts with shortest name 'a',
//   but it first has to loopup the scope chain to see if 'a' is used as
//   new name in the current scope and parent scopes. In this case, 'a' is
//   not available, so 'b' is choosed as new name of 'foo'. The result
//   local scope looks like following:
//     func_scope => {'foo' -> 'b', 'bar' -> 'c', 'gee' => 'd'}
//         |__ parent -> {'a' -> 'a', 'func' -> 'func'} ( *global_scope* )
//
//   The next pass is to rename identifers in the code using scope info.
//   In this example, 'foo', 'bar', 'gee' are renamed to 'b', 'c', and 'd',
//   but the identifier 'a' in func is kept the same because the global scope
//   preserves its original name.
//
//   When entering a function, a new scope is created with the current scope
//   as its parent scope.
//
// Global variable renaming and property renaming:
//   We use naming convention that name starting with exact one '_' is private
//   to the file or the class (function). Also this naming convention is
//   voilated in our code, but these are not common and are fixable.
//
//   A tricky part of global variable and property renaming is that we don't
//   collect all property names and variables, so when chooseing new names,
//   the new name might be used already, but we don't know.
//   To solve this problem, we use naming convention here again. New names for
//   global variables and properties names always start with one exact '_'.
//   It works because we collect all names starting with exact one '_'.
//
// TODO : Property renaming in file scope is UNSAFE:
//   A construtor function can set a private property named _foo, it may call
//   another constructor function (as its parent class) that adds a property
//   named _bar. Because the child and parent constructor functions are in
//   different files, both can get renamed to the same name.

using namespace std;
using namespace fbjs;

#define for_nodes(p, i) \
  for (node_list_t::iterator i  = (p)->childNodes().begin(); \
                             i != (p)->childNodes().end(); \
                           ++i)

#define WARN(format, args...)

// ---- NameFactory -----
string NameFactory::next() {
  string result = _prefix + _current;
  bool found = false;
  // move to the next
  for (size_t i = 0; i < _current.size(); i++) {
    char c = _current[i] + 1;
    if (c <= 'z') {
      _current[i] = c;
      found = true;
      break;
    }
  }
  if (!found) {
    _current.push_back('a');
  }
  return result;
}

// ---- Scope ----
void Scope::declare(string name) {
  _replacement[name] = name;
}

string Scope::new_name(string orig_name) {
  rename_t::iterator it = _replacement.find(orig_name);
  if (it != _replacement.end()) {
    return it->second;
  }
  if (!_parent) {
    return orig_name;
  }

  return _parent->new_name(orig_name);
}

bool Scope::declared(string name) {
  if (_replacement.find(name) != _replacement.end()) {
    return true;
  }

  if (!_parent) {
    return false;
  }

  return _parent->declared(name);
}

bool Scope::in_use(string name) {
  if (_new_names.find(name) != _new_names.end()) {
    return true;
  }
  if (!_parent) {
    return false;
  }
  return _parent->in_use(name);
}


void Scope::dump() {
  int indention = 0;
  Scope* parent = _parent;
  while (parent != NULL) {
    indention += 2;
    parent = parent->_parent;
  }

  for (rename_t::iterator it = _replacement.begin();
       it != _replacement.end();
       it++) {
    cout<<"//";
    for (int i = 0; i < indention; i++) {
      cout << " ";
    }
    cout << it->first.c_str() << " -> " << it->second.c_str() << "\n";
  }
}

bool LocalScope::need_rename(const string& name) {
  return name != "event";
}

void LocalScope::rename_vars() {
  NameFactory factory;

  for (rename_t::iterator it = _replacement.begin();
       it != _replacement.end();
       it++) {
    string var_name = it->first;
    string new_name = it->second;
    if (need_rename(var_name)) {
      new_name = factory.next();
      while (_parent->in_use(new_name)) {
        new_name = factory.next();
      }
    }
    rename_internal(var_name, new_name);
  }
}

// ---- GlobalScope ----
GlobalScope::GlobalScope(bool rename_private) : Scope(NULL) {
  this->_rename_private = rename_private;
  this->_name_factory.set_prefix("_");
}

bool GlobalScope::need_rename(const string& name) {
  return this->_rename_private &&
         name.length() > 1 &&
         name[0] == '_' &&
         name[1] != '_';
}

void GlobalScope::rename_vars() {
  for (rename_t::iterator it = _replacement.begin();
       it != _replacement.end();
       it++) {
    string var_name = it->first;
    string new_name = it->second;
    if (need_rename(var_name)) {
      new_name = _name_factory.next();
      while (this->in_use(new_name)) {
        new_name = _name_factory.next();
      }
    }
    rename_internal(var_name, new_name);
  }
}

void GlobalScope::rename_var(const string& var_name) {
  string new_name = _name_factory.next();
  while (this->in_use(new_name)) {
    new_name = _name_factory.next();
  }
  rename_internal(var_name, new_name);
}

// ----- VariableRenaming ----
VariableRenaming::VariableRenaming() {
  this->_global_scope = new GlobalScope(/* rename_globals */ false);
}

VariableRenaming::~VariableRenaming() {
  delete this->_global_scope;
}

void VariableRenaming::process(NodeProgram* root) {

  // Collect all symbols in the file scope
  build_scope(root, this->_global_scope);
  this->_global_scope->rename_vars();

  // Starts in the global scope.
  minify(root, this->_global_scope);
}

void VariableRenaming::minify(Node* node, Scope* scope) {
  if (node == NULL) {
    return;
  }

  if (typeid(*node) == typeid(NodeObjectLiteralProperty)) {
    //  For {prop: value}, we can't rename the property with local scope rules.
    minify(node->childNodes().back(), scope);

  } else if (typeid(*node) == typeid(NodeStaticMemberExpression)) {
    // a.b case, cannot rename _b
    minify(node->childNodes().front(), scope);

  } else if (typeid(*node) == typeid(NodeIdentifier)) {
    NodeIdentifier* n = static_cast<NodeIdentifier*>(node);
    string name = n->name();
    if (scope->declared(name)) {
      n->rename(scope->new_name(name));
    }

  } else if ( (typeid(*node) == typeid(NodeFunctionDeclaration) ||
               typeid(*node) == typeid(NodeFunctionExpression))) {
    if (!function_has_with_or_eval(node)){
      node_list_t::iterator func = node->childNodes().begin();

      // Skip function name.
      ++func;

      // Create a new local scope for the function using current scope
      // as parent. Then add arguments to the local scope and build
      // scope for variables declared in the function.
      LocalScope child_scope(scope);

      // First, add all the arguments to scope.
      for_nodes(*func, arg) {
        NodeIdentifier *arg_node = static_cast<NodeIdentifier*>(*arg);
        child_scope.declare(arg_node->name());
      }

      // Now, look ahead and find all the local variable declarations.
      build_scope(*(++func), &child_scope);

      // Build renaming map in local scope
      child_scope.rename_vars();

      //  Finally, recurse with the new scope.
      //  Function name can only be renamed in the parent scope.
      for_nodes(node, ii) {
        if (ii == node->childNodes().begin()) {
          minify(*ii, scope);
        } else {
          minify(*ii, &child_scope);
        }
      }
    }
    // If the function has with and eval, don't attempt to rename code further.
  } else {
    for_nodes(node, ii) {
      minify(*ii, scope);
    }
  }
}


// Iterate through all child nodes and find if it contains with or eval
// statement, it also recursively check sub functions.
bool VariableRenaming::function_has_with_or_eval(Node* node) {
  if (node == NULL) {
    return false;
  }

  for_nodes(node, ii) {
    Node* child = *ii;
    if (child == NULL) {
      continue;
    }

    if (typeid(*child) == typeid(NodeWith)) {
      WARN("function has 'with' statement at line %d\n", child->lineno());
      return true;
    }

    NodeFunctionCall* call = dynamic_cast<NodeFunctionCall*>(child);
    if (call != NULL) {
      NodeIdentifier* iden = dynamic_cast<NodeIdentifier*>(call->childNodes().front());
      if (iden != NULL && iden->name() == "eval") {
        WARN("function uses 'eval' at line %d\n", call->lineno());
        return true;
      }
    }

    if ( (typeid(*child) == typeid(NodeFunctionDeclaration) ||
          typeid(*child) == typeid(NodeFunctionExpression)) &&
         function_has_with_or_eval(child) ) {
      return true;
      // Don't check the current child node again if it is a function
      // declaration or expression.

    } else if (function_has_with_or_eval(child)) {
      return true;
    }
  }
  return false;
}

void VariableRenaming::build_scope(Node *node, Scope* scope) {

  if (node == NULL) {
    return;
  }

  if (typeid(*node) == typeid(NodeFunctionExpression)) {
    return;
  }

  if (typeid(*node) == typeid(NodeFunctionDeclaration)) {
    NodeIdentifier* decl_name =
        dynamic_cast<NodeIdentifier*>(node->childNodes().front());
    if (decl_name) {
      scope->declare(decl_name->name());
    }
    return;
  }

  if (typeid(*node) == typeid(NodeVarDeclaration)) {
    for_nodes(node, ii) {
      NodeIdentifier *n = dynamic_cast<NodeIdentifier*>(*ii);
      if (!n) {
        n = dynamic_cast<NodeIdentifier*>((*ii)->childNodes().front());
      }
      scope->declare(n->name());
    }
    return;
  }

  // Special case for try ... catch(e) ...
  // Treat e as a local variable.
  if (typeid(*node) == typeid(NodeTry)) {
    // second child is the catch variable, either null of a node identifier.
    node_list_t::iterator it = node->childNodes().begin();
    ++it;
    NodeIdentifier* var = dynamic_cast<NodeIdentifier*>(*it);
    if (var) {
      scope->declare(var->name());
    }
    return;
  }

  // Special case for 'for (i in o)' and 'i = ...'.
  // In these cases, if 'i' is not declared before, we treat it as a global
  // variable. It is most likely the developer forgot to put a 'var' before
  // the variable name, and we give out a warning.
  if (typeid(*node) == typeid(NodeAssignment) ||
      typeid(*node) == typeid(NodeForIn)) {
    NodeIdentifier* var =
        dynamic_cast<NodeIdentifier*>(node->childNodes().front());
    if (var && !scope->declared(var->name())) {
      // 1. assignment to an undeclared variable is made in a local scope, or
      // 2. for-in loop variable is not declared.
      if (!scope->is_global() || typeid(*node) == typeid(NodeForIn)) {
        WARN("'%s' at line %d is not declared, 'var %s'?\n",
             var->name().c_str(), var->lineno(), var->name().c_str());
        this->_global_scope->reserve(var->name());
      }
    }
    // Fall through to process the rest part of statement.
  }

  for_nodes(node, ii) {
    build_scope(*ii, scope);
  }
}


// ----- PropertyRenaming -----
// Unsafe
PropertyRenaming::PropertyRenaming() {
  this->_property_scope = new GlobalScope(true);
}

PropertyRenaming::~PropertyRenaming() {
  delete this->_property_scope;
}

void PropertyRenaming::process(NodeProgram* root) {

  // Rewrite nodes, this is necessary to make property renaming work correctly.
  // e.g., a['foo'] -> a.foo, and { 'foo' : 1 } -> { foo : 1 }.
  ReductionWalker walker;
  walker.walk(root);
  minify(root);
}

void PropertyRenaming::minify(Node* node) {
  if (node == NULL) {
    return;
  }

  if (typeid(*node) == typeid(NodeObjectLiteralProperty)) {
    //  For {prop: value}, we can't rename the property with local scope rules.
    NodeIdentifier* n =
      dynamic_cast<NodeIdentifier*>(node->childNodes().front());
    if (n && _property_scope->need_rename(n->name())) {
      string name = n->name();
      if (!_property_scope->declared(name)) {
         _property_scope->declare(name);
        _property_scope->rename_var(name);
      }
      n->rename(_property_scope->new_name(name));
    }

    minify(node->childNodes().back());

  } else if (typeid(*node) == typeid(NodeStaticMemberExpression)) {
    // a._b. case, rename _b part
    minify(node->childNodes().front());

    // Must be NodeIdentifier.
    NodeIdentifier* n =
        dynamic_cast<NodeIdentifier*>(node->childNodes().back());
    assert(n != NULL);

    if (_property_scope->need_rename(n->name())) {
      string name = n->name();
      if (!_property_scope->declared(name)) {
        _property_scope->declare(name);
        _property_scope->rename_var(name);
      }
      n->rename(_property_scope->new_name(name));
    }

  } else {
    for_nodes(node, ii) {
      minify(*ii);
    }
  }
}
