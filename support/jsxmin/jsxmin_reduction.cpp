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

#include "libfbjs/node.hpp"

#include "jsxmin_reduction.h"
#include "reduce.hpp"

#include <iostream>
#include <string.h>

using namespace fbjs;
using namespace std;

void CodeReduction::process(NodeProgram* root) {
  // If there is no well-formed replacement pattern in command line option,
  // skip the process. A well-formed pattern string has the format of
  // "pattern1:replacement1,pattern2:replacement2".
  // For example, --replace "__DEV__:0,Util.isDevelopmentEnvironment():false"
  // specifies that replaces __DEV__ by 0
  // and replaces Util.isDevelopmentEnvironment() by false.
  if (parse_patterns(replacements)) {
    for (replacement_t::iterator it = _replacement.begin();
                                 it != _replacement.end();
                                 ++it) {
      NodeProgram left(it->first.c_str());
      NodeProgram right(it->second.c_str());
      replace(root, find_expression(&left), find_expression(&right));
    }
  }

  ReductionWalker walker;
  walker.walk(root);
}

// Format: orig1 : new1, orig2: new2, parsed as
//   orig1 => new1
//   orig2 => new2
bool CodeReduction::parse_patterns(const string& input) {
  if (input.size() == 0) {
    return false;
  }

  size_t cur_pos = 0;
  while (true) {
    size_t pos = input.find(',', cur_pos);
    size_t end_pos = (pos == string::npos) ? input.size() : pos;
    string pattern = input.substr(cur_pos, end_pos-cur_pos);

    size_t p = pattern.find(':');
    if (p != string::npos) {
      string needle = pattern.substr(0, p);
      string rep = pattern.substr(p+1);
      _replacement[needle] = rep;
    }

    if (pos == string::npos) {
      break;
    }
    cur_pos = end_pos + 1;
  }

  return _replacement.size() != 0;
}

// Replaces instances of `needle` in `haystack` with `rep`.
Node* CodeReduction::replace(Node* haystack, const Node* needle,
                             const Node* rep) {
  if (haystack == NULL) {
    return NULL;
  } else if (*haystack == *needle) {
    delete haystack;
    return rep->clone();
  }

  Node* tmp;
  node_list_t::iterator ii = haystack->childNodes().begin();
  while (ii != haystack->childNodes().end()) {
    tmp = replace(*ii, needle, rep);
    if (tmp != (*ii)) {
      haystack->replaceChild(tmp, ii++);
    } else {
      ++ii;
    }
  }
  return haystack;
}

// Finds the first NodeExpression in a Node tree
const NodeExpression* CodeReduction::find_expression(const Node* node) {
  if (dynamic_cast<const NodeExpression*>(node) != NULL) {
    return static_cast<const NodeExpression*>(node);
  }
  const NodeExpression* tmp;
  for (node_list_t::iterator ii = node->childNodes().begin(); ii != node->childNodes().end(); ++ii) {
    tmp = find_expression(*ii);
    if (tmp != NULL) {
      return tmp;
    }
  }
  return NULL;
}
