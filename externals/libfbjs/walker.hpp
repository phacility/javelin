#pragma once
#include <memory>
#include <utility>
#include <boost/ptr_container/ptr_vector.hpp>
#include "node.hpp"

#define NODE_WALKER_VISIT_IMPL(TYPE, FALLBACK) \
  virtual void visit(TYPE& node) { \
    visit(static_cast<FALLBACK&>(node)); \
  }

#define NODE_WALKER_ACCEPT_IMPL(TYPE, FALLBACK) \
  void TYPE::accept(NodeWalker& walker) { \
    walker.visit(*this); \
  }

namespace fbjs {
  class NodeWalker {
    private:
      NodeWalker* _parent;
      Node* _node;
      bool _remove;
      bool _skip_delete;

    protected:
      typedef boost::ptr_vector<NodeWalker> ptr_vector;

    public:
      typedef std::auto_ptr<NodeWalker> ptr;

      NodeWalker() : _parent(NULL), _node(NULL), _remove(false),
        _skip_delete(false) {};
      virtual ~NodeWalker() {};
      virtual NodeWalker* clone() const = 0;
      virtual Node* walk(Node* root) {
        replaceAndVisit(root);
        return _node;
      }

      NodeWalker* parent() const {
        return _parent;
      }

      Node* node() const {
        return _node;
      }

    protected:
      template<class T>
      static T& cast(NodeWalker& node) {
        T* tmp = dynamic_cast<T*>(&node);
        if (tmp) {
          return *tmp;
        } else {
          throw std::runtime_error("invalid NodeWalker");
        }
      }

      template<class T>
      static std::auto_ptr<T> cast(NodeWalker::ptr node) {
        std::auto_ptr<T> casted(&cast<T>(*node));
        node.release();
        return casted;
      }

      void remove(bool skip_delete = false) {
        _remove = true;
        _skip_delete = skip_delete;
      }

      void replace(Node* new_node, bool skip_delete = false) {
        if (new_node && _node) {
          new_node->setLineno(_node->lineno());
        }
        _node = new_node;
        _remove = false;
        _skip_delete = skip_delete;
      }

      void replaceAndVisit(Node* new_node) {
        replace(new_node);
        if (new_node == NULL) {
          visit();
        } else {
          new_node->accept(*this);
        }
        if (new_node != _node && new_node) {
          delete new_node;
        }
      }

      std::auto_ptr<ptr_vector> visitChildren() {
        ptr_vector ret;
        node_list_t::iterator ii = _node->childNodes().begin();
        while (ii != _node->childNodes().end()) {
          ret.push_back(visitChild(ii++).release());
        }
        return ret.release();
      }

      ptr visitChild(node_list_t::iterator ii) {
        ptr walker(clone());
        walker->_parent = this;
        walker->_node = *ii;
        if (*ii == NULL) {
          visit();
        } else {
          (*ii)->accept(*walker);
        }
        if (_remove) {
          if (!_skip_delete) {
            delete _node->removeChild(ii);
          }
        } else if (*ii != walker->_node) {
          Node* old_node = _node->replaceChild(walker->_node, ii);
          if (!_skip_delete && old_node) {
            delete old_node;
          }
        }
        return walker;
      }

    public:
      virtual void visit() {}
      virtual void visit(Node& _node) {
        visitChildren();
      }
      NODE_WALKER_VISIT_IMPL(NodeProgram, Node);
      NODE_WALKER_VISIT_IMPL(NodeStatementList, Node);
      NODE_WALKER_VISIT_IMPL(NodeExpression, Node);
      NODE_WALKER_VISIT_IMPL(NodeNumericLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeStringLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeRegexLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeBooleanLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeNullLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeThis, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeEmptyExpression, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeOperator, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeConditionalExpression, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeParenthetical, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeAssignment, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeUnary, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodePostfix, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeIdentifier, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeFunctionCall, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeFunctionConstructor, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeObjectLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeArrayLiteral, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeStaticMemberExpression, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeDynamicMemberExpression, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeStatement, Node);
      NODE_WALKER_VISIT_IMPL(NodeStatementWithExpression, NodeStatement);
      NODE_WALKER_VISIT_IMPL(NodeVarDeclaration, NodeStatement);
      NODE_WALKER_VISIT_IMPL(NodeTypehint, Node);
      NODE_WALKER_VISIT_IMPL(NodeFunctionDeclaration, Node);
      NODE_WALKER_VISIT_IMPL(NodeFunctionExpression, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeArgList, Node);
      NODE_WALKER_VISIT_IMPL(NodeIf, Node);
      NODE_WALKER_VISIT_IMPL(NodeWith, Node);
      NODE_WALKER_VISIT_IMPL(NodeTry, Node);
      NODE_WALKER_VISIT_IMPL(NodeLabel, Node);
      NODE_WALKER_VISIT_IMPL(NodeCaseClause, Node);
      NODE_WALKER_VISIT_IMPL(NodeSwitch, Node);
      NODE_WALKER_VISIT_IMPL(NodeDefaultClause, NodeCaseClause);
      NODE_WALKER_VISIT_IMPL(NodeObjectLiteralProperty, Node);
      NODE_WALKER_VISIT_IMPL(NodeForLoop, Node);
      NODE_WALKER_VISIT_IMPL(NodeForIn, Node);
      NODE_WALKER_VISIT_IMPL(NodeForEachIn, Node);
      NODE_WALKER_VISIT_IMPL(NodeWhile, Node);
      NODE_WALKER_VISIT_IMPL(NodeDoWhile, NodeStatement);
      NODE_WALKER_VISIT_IMPL(NodeXMLDefaultNamespace, NodeStatement);
      NODE_WALKER_VISIT_IMPL(NodeXMLName, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLElement, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeXMLComment, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLPI, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLContentList, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLTextData, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLEmbeddedExpression, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLAttributeList, Node);
      NODE_WALKER_VISIT_IMPL(NodeXMLAttribute, Node);
      NODE_WALKER_VISIT_IMPL(NodeWildcardIdentifier, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeStaticAttributeIdentifier, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeDynamicAttributeIdentifier, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeStaticQualifiedIdentifier, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeDynamicQualifiedIdentifier, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeFilteringPredicate, NodeExpression);
      NODE_WALKER_VISIT_IMPL(NodeDescendantExpression, NodeExpression);
  };
}
