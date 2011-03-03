#ifndef _ABSTRACT_COMPILER_PASS_H_
#define _ABSTRACT_COMPILER_PASS_H_

namespace fbjs {

class NodeProgram;

// A simple abstraction of compiler pass.
class AbstractCompilerPass {
public:
  AbstractCompilerPass() {}
  virtual ~AbstractCompilerPass() {}
  virtual void process(NodeProgram* root) = 0;
};

} // namespace
#endif
