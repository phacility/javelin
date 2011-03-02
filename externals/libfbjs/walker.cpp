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

#include "walker.hpp"
using namespace fbjs;

void Node::accept(NodeWalker& walker) {
  walker.visit(*this);
}
NODE_WALKER_ACCEPT_IMPL(NodeProgram, Node);
NODE_WALKER_ACCEPT_IMPL(NodeStatementList, Node);
NODE_WALKER_ACCEPT_IMPL(NodeExpression, Node);
NODE_WALKER_ACCEPT_IMPL(NodeNumericLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeStringLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeRegexLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeBooleanLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeNullLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeThis, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeEmptyExpression, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeOperator, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeConditionalExpression, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeParenthetical, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeAssignment, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeUnary, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodePostfix, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeIdentifier, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeFunctionCall, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeFunctionConstructor, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeObjectLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeArrayLiteral, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeStaticMemberExpression, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeDynamicMemberExpression, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeStatement, Node);
NODE_WALKER_ACCEPT_IMPL(NodeStatementWithExpression, NodeStatement);
NODE_WALKER_ACCEPT_IMPL(NodeVarDeclaration, NodeStatement);
NODE_WALKER_ACCEPT_IMPL(NodeTypehint, Node);
NODE_WALKER_ACCEPT_IMPL(NodeFunctionDeclaration, Node);
NODE_WALKER_ACCEPT_IMPL(NodeFunctionExpression, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeArgList, Node);
NODE_WALKER_ACCEPT_IMPL(NodeIf, Node);
NODE_WALKER_ACCEPT_IMPL(NodeWith, Node);
NODE_WALKER_ACCEPT_IMPL(NodeTry, Node);
NODE_WALKER_ACCEPT_IMPL(NodeLabel, Node);
NODE_WALKER_ACCEPT_IMPL(NodeCaseClause, Node);
NODE_WALKER_ACCEPT_IMPL(NodeSwitch, Node);
NODE_WALKER_ACCEPT_IMPL(NodeDefaultClause, NodeCaseClause);
NODE_WALKER_ACCEPT_IMPL(NodeObjectLiteralProperty, Node);
NODE_WALKER_ACCEPT_IMPL(NodeForLoop, Node);
NODE_WALKER_ACCEPT_IMPL(NodeForIn, Node);
NODE_WALKER_ACCEPT_IMPL(NodeForEachIn, Node);
NODE_WALKER_ACCEPT_IMPL(NodeWhile, Node);
NODE_WALKER_ACCEPT_IMPL(NodeDoWhile, NodeStatement);
NODE_WALKER_ACCEPT_IMPL(NodeXMLDefaultNamespace, NodeStatement);
NODE_WALKER_ACCEPT_IMPL(NodeXMLName, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLElement, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeXMLComment, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLPI, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLContentList, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLTextData, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLEmbeddedExpression, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLAttributeList, Node);
NODE_WALKER_ACCEPT_IMPL(NodeXMLAttribute, Node);
NODE_WALKER_ACCEPT_IMPL(NodeWildcardIdentifier, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeStaticAttributeIdentifier, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeDynamicAttributeIdentifier, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeStaticQualifiedIdentifier, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeDynamicQualifiedIdentifier, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeFilteringPredicate, NodeExpression);
NODE_WALKER_ACCEPT_IMPL(NodeDescendantExpression, NodeExpression);
