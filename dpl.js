"use strict";

function dpl(html) {
    return new dpl.nodes.root(dpl._preprocess(html));
}

dpl._preprocessors = [function assignIds(html) {
    var id = 0;
    return html.replace(/<tpl\b/g, function() {
        return '<tpl tpl-id="' + (id++) + '" ';
    });
}];

dpl._preprocess = function(html) {
    var preprocessors = dpl._preprocessors;
    for (var i = 0, p; (p = preprocessors[i++]); ) {
        html = p(html);
    }
    return html;
};
(function(exports) {

var uuid = 0;

function bind(func, context) {
    return function() {
        return func.apply(context, arguments);
    }
}

function extend(Construct, superType, proto) {
    function C() {};
    C.prototype = superType.prototype;
    var p = Construct.prototype = new C();
    for (var name in proto) {
        if (proto.hasOwnProperty(name)) {
            p[name] = proto[name];
        }
    }

    return Construct;
}

function htmlToFragment(html, doc) {
    var d = doc.createElement("div");
    d.innerHTML = html;
    var f = doc.createDocumentFragment();
    var numNodes = d.childNodes.length;
    while (numNodes--) {
        f.appendChild(d.firstChild);
    }

    return f;
}

function htmlBefore(node, html) {
    if (node.ownerDocument.documentElement.insertAdjacentHTML) {
        htmlBefore = function(node, html) {
            var parent = node.parentElement
            var helper = parent.insertBefore(node.ownerDocument.createElement("div"), node);
            helper.insertAdjacentHTML("beforeBegin", html);
            parent.removeChild(helper);
        }
    }
    else {
        htmlBefore = function(node, html) {
            var fragment = htmlToFragment(html, node.ownerDocument);
            node.parentNode.insertBefore(fragment, node);
        }
    }
    htmlBefore(node, html);

    // don't create a closure over outer parameters
    node = html = null;
}

/*
    =================================================================== CONTEXT
*/
function Context(store) {
    this._uuid = uuid++;
    this._store = store;
    this._aliases = {};

    this._subPaths = [/*  path0                                  , path1 */];
    this._subNodes = [/* [domNode0, nodeObj0, domNode1, nodeObj1], [...] */]

    this.ondata = bind(this._ondata, this);
}

Context.prototype = {
    addAlias: function(alias, mapsTo) {
        var aliases = this._aliases;
        (aliases[alias] || (aliases[alias] = [])).unshift(mapsTo);
    },

    _ondata: function(event) {
        var path = event.path, subs = this._subs;
        var nodes = subs.hasOwnProperty(path) && subs[path];
        for (var i = 0, len = nodes && nodes.length; i < len; i += 2) {
            var node = nodes[i], nodeObj = nodes[i + 1];
            nodeObj.ondata(data.data, node);
        }
    },

    remAlias: function(alias) {
        var aliases = this._aliases;
        if (aliases.hasOwnProperty(alias)) {
            var mappings = aliases[alias];
            mappings.shift()
            if (!mappings.length) {
                delete aliases[alias];
            }
        }
    },

    resolve: function(path) {
        var bits = path.split(".");
        var first = bits[0];
        var mappings = this._aliases[first];
        if (mappings) {
            (bits[0] = mappings[0]);
        }

        return bits.join(".");
    },

    sub: function(path, node, nodeObj) {
        var subPaths = this._subPaths, subNodes = this._subNodes;
        var idx = subPaths.indexOf(path), nodes = subNodes[idx];
        if (idx == -1) {
            subPaths.push(path);
            subNodes.push(nodes = []);
        }

        if (nodes.indexOf(node) == -1) {
            nodes.push(node, nodeObj);
        }
    },

    unsub: function(path, node) {
        var subPaths = this._subPaths, subNodes = this._subNodes;
        var idx = subPaths.indexOf(path), nodes = subNodes[idx], i;
        if (idx != -1) {
            if ((i = nodes.indexOf(node)) !== -1) {
                nodes.splice(idx, 2);
                if (!nodes.length) {
                    subPaths.splice(idx, 1);
                    subNodes.splice(idx, 1);
                }
            }
        }
    }
}

/*
    ================================================================= BASE NODE
*/

function Node(tplNode) {
    this._uuid = uuid++;
    this._var = tplNode && tplNode.getAttribute("var");

    var node = this;
    this.ondata = bind(this._ondata, this);
}
Node.prototype = {
    build: function(targetNode, /**Context*/context, /**Array*/nodeObjs) {
        var placeholder = targetNode.ownerDocument.createTextNode("");
        targetNode.parentNode.replaceChild(placeholder, targetNode);
        targetNode.innerHTML = ""; // throw away stuff to save memory

        var path = this._var;
        if (path != null) {
            var resolvedPath = context.resolve(this._var);
            context.sub(resolvedPath, placeholder, this);
        }

        this._build && this._build(placeholder, context, nodeObjs);

        return placeholder;
    },

    destroy: function(placeholder) {
        var resolvedPath = context.resolve(this._var);
        context.unsub(resolvedPath, placeholder);
        if (this._destroy) {
            this._destroy(placeholder);
        }
    },

    _ondata: function(data, node) {}
}

/*
    =============================================================== BLOCK NODES
*/

function BlockNode(tplNode) {
    Node.call(this, tplNode);
    this._html = tplNode && tplNode.innerHTML;
}
extend(BlockNode, Node, {
    _build: function(placeholder, context, /**Array*/nodeObjs) {
        var dom = this._dom, doc = placeholder.ownerDocument;
        if (!dom) {
            dom = this._dom = doc.createElement("div");
            dom.innerHTML = this._html;
        }

        var tree = doc.importNode(dom, true);
        var tplNodes = tree.getElementsByTagName("tpl"), tplNode;
        while ((tplNode = tplNodes[0])) {
            var tplId = tplNode.getAttribute("tpl-id");
            var nodeObj = nodeObjs[tplId] || (nodeObjs[tplId] = new dpl.nodes[tplNode.getAttribute("type")](tplNode));
            nodeObj.build(tplNode, context, nodeObjs);
        }

        var numNodes = tree.childNodes.length, p = placeholder.parentNode;
        while (numNodes--) {
            p.insertBefore(tree.firstChild, placeholder);
        }

    }
});

function RootNode(html) {
    BlockNode.call(this);
    this._html = html;
    this._nodeObjs = [];
}
extend(RootNode, BlockNode, {
    render: function(store, doc) {
        doc = doc || document;
        var f = doc.createDocumentFragment();
        var t = f.appendChild(doc.createTextNode(""));
        this.build(t, new Context(store), this._nodeObjs);

        return f;
    }
});


/*
    ============================================================== INLINE NODES
*/

function InlineNode(tplNode) {
    Node.call(this, tplNode);
}
extend(InlineNode, Node);

function TextNode(tplNode) {
    InlineNode.call(this, tplNode);
    this._defaultText = tplNode.textContent || tplNode.innerText || "";
}
extend(TextNode, InlineNode, {
    _destroy: function(node) {
        node.data = "";
    },
    _ondata: function(data, node) {
        node.data = data != null ? data : this._defaultText;
    }
});

function HtmlNode(tplNode) {
    InlineNode.call(this, tplNode);
    this._defaultHtml = tplNode.innerHTML;
    this._builtNodes = [];
    this._numNodes = [];
}
extend(HtmlNode, InlineNode, {
    _build: function(placeholder) {
        this._builtNodes.push(placeholder);
        this._numNodes.push(0);
    },

    _destroy: function(placeholder) {
        var i = this._buildNodes.indexOf(placeholder);
        if (i == -1) { return; }
        this._ondata("", node);
        this._builtNodes.splice(i, 1);
        this._numNodes.splice(i, 1);
    },

    _ondata: function(html, node) {
        var i = this._builtNodes.indexOf(node);
        if (i == -1) { return; }

        var numNodes = this._numNodes, p = node.parentNode;

        // clean previous nodes
        var num = numNodes[i];
        while (num--) {
            p.removeChild(node.previousSibling);
        }

        if (html == null) {
            html = this._defaultHtml;
        }
        var cn = node.parentNode.childNodes;
        var numChildrenBefore = cn.length;
        htmlBefore(node, html);
        numNodes[i] = cn.length - numChildrenBefore;
    }
})


exports.nodes = {
    root: RootNode,
    text: TextNode,
    html: HtmlNode
}

}(dpl));
