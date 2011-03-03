#ifndef _JSXMIN_RENAMING_H_
#define _JSXMIN_RENAMING_H_

#include "abstract_compiler_pass.h"
#include "libfbjs/node.hpp"
#include "reduce.hpp"

#include <string>
#include <map>
#include <set>

using namespace std;

// A helper class to regenerate variable names.
class NameFactory {
public:
  NameFactory() : _current("a"), _prefix("") {}
  NameFactory(const string& prefix) : _current("a"), _prefix(prefix) {}

  // Allows prefix to be reset.
  void set_prefix(const string& prefix) {
    _prefix = prefix;
  }

  string next();

private:
  string _current;
  string _prefix;
};

// A class represent a JavaScript variable naming scope.
typedef map<string, string> rename_t;
typedef set<string> names_t;

class Scope {
public:
  explicit Scope(Scope* parent) : _parent(parent) {}
  virtual ~Scope() {}

  virtual bool is_global() { return false; }

  // Declares a variable name in the current scope.
  // Called when seeing a variable/function declaration.
  void declare(string name);

  // Checks whether a variable name is declared in the scope chain.
  bool declared(string name);

  // Prevents a variable name from being renamed.
  void reserve(const string& name) {
    rename_internal(name, name);
  }

  // Rename variables declared in this scope using information
  // in the scope chain.
  virtual void rename_vars() = 0;

  // Checks whether a name is taken in the renaming process.
  bool in_use(string name);

  // Returns new name of an original variable name after renaming.
  // Note that renaming process is performed in rename_vars function.
  // This function returns the renaming result.
  string new_name(string orig_name);

  void dump();

protected:
  // A helper function assigns a new name to an existing variable name.
  void rename_internal(const string& var_name, const string& new_name) {
    _replacement[var_name] = new_name;
    _new_names.insert(new_name);
  }

  // Local variables and rename mapping.
  rename_t _replacement;

  // A cache of new names
  names_t _new_names;

  // Note that, _parent is not ref counted, it assumes that a scope is
  // associated with a stack, so the parent scope always outlives child
  // scopes.
  Scope* _parent;
};

// A class representing a local variable naming scope.
class LocalScope : public Scope {
public:
  explicit LocalScope(Scope* parent) : Scope(parent) {}
  virtual void rename_vars();
private:
  bool need_rename(const string& var_name);
};


// A class representing a global variable naming scope.
class GlobalScope : public Scope {
public:
  GlobalScope(bool rename_private);
  virtual void rename_vars();

  virtual bool is_global() { return true; }

  // Checks whether a variable name should be renamed.
  bool need_rename(const string& var_name);

  void rename_var(const string& var_name);

private:
  bool _rename_private;
  NameFactory _name_factory;
};

class VariableRenaming : public fbjs::AbstractCompilerPass {
public:
  VariableRenaming();
  virtual ~VariableRenaming();

  // Overrides Compiler::Pass::process
  virtual void process(fbjs::NodeProgram* root);

private:
  // Minifies variable names in a subtree rooted from node using the current
  // local scope and file scope info. The last parameter decides which
  // scope should be used.
  void minify(fbjs::Node* node, Scope* scope);

  // Build a local scope from a root node (typically a function node)
  void build_scope(fbjs::Node* node, Scope* scope);

  // Checks if a function contains 'with' or 'eval' statements.
  bool function_has_with_or_eval(fbjs::Node* node);

  // Generates a new (shorter) id based on the current scope.
  string generate_id(const char t, const Scope* scope, const string& orig_name);

  GlobalScope* _global_scope;
};


// Rename properties, unsafe.
class PropertyRenaming : public fbjs::AbstractCompilerPass {
public:
  PropertyRenaming();
  virtual ~PropertyRenaming();

  virtual void process(fbjs::NodeProgram* root);

private:
  void minify(fbjs::Node* node);
  GlobalScope* _property_scope;
};

#endif
