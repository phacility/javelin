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

#pragma once
#include "libfbjs/node.hpp"
#include "libfbjs/walker.hpp"

class ReductionWalker : public fbjs::NodeWalker {
  public:
    using fbjs::NodeWalker::visit;
    virtual fbjs::NodeWalker* clone() const { return new ReductionWalker; }
    virtual void visit(fbjs::NodeExpression&);
    virtual void visit(fbjs::NodeOperator&);
    virtual void visit(fbjs::NodeUnary&);
    virtual void visit(fbjs::NodeConditionalExpression&);
    virtual void visit(fbjs::NodeFunctionCall&);
    virtual void visit(fbjs::NodeIf&);
    virtual void visit(fbjs::NodeObjectLiteralProperty&);
    virtual void visit(fbjs::NodeDynamicMemberExpression&);
};
