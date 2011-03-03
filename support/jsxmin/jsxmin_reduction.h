#ifndef _JSXMIN_REDUCTION_H_
#define _JSXMIN_REDUCTION_H_

#include "abstract_compiler_pass.h"
#include <map>

typedef std::map<std::string, std::string> replacement_t;

namespace fbjs {
class NodeProgram;
class NodeExpression;
class Node;
}

class CodeReduction : public fbjs::AbstractCompilerPass {
public:
  CodeReduction() {}
  virtual ~CodeReduction() {}
  virtual void process(fbjs::NodeProgram* root);
  std::string replacements;
private:
  fbjs::Node* replace(fbjs::Node* haystack, const fbjs::Node* needle, const fbjs::Node* rep);
  const fbjs::NodeExpression* find_expression(const fbjs::Node* node);
  bool parse_patterns(const std::string& s);
  replacement_t _replacement;
};

#endif
