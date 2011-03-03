#include "libfbjs/node.hpp"

#include "jsxmin_renaming.h"
#include "jsxmin_reduction.h"

#include <iostream>

using namespace std;
using namespace fbjs;

static void jsxminify(NodeProgram* root, string &replacements) {
  // Code reduction should happen at the first.
  CodeReduction code_reduction;
  code_reduction.replacements = replacements;
  code_reduction.process(root);

  // Starts in the global scope.
  VariableRenaming variable_renaming;
  variable_renaming.process(root);

  PropertyRenaming property_renaming;
  property_renaming.process(root);
}

int main(int argc, char* argv[]) {
  try {
    
    string replacements(argc > 1 ? argv[1] : "");
    
    // Create a node.
    NodeProgram root(stdin);
    jsxminify(&root, replacements);

    cout << root.render(RENDER_NONE).c_str();

  } catch (ParseException ex) {
    fprintf(stderr, "parsing error: %s\n", ex.what());
    return 1;
  }
  return 0;
}
