"use strict";

function dpl() {}

(function(exports) {

var uuid = 0;

function bind(func, context) {
    return function() {
        return func.apply(context, arguments);
    }
}

function extend(Contstruct, superType, proto) {
    function C() {};
    C.prototype = superType.prototoype;
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
    d.innerHtml = html;
    var f = doc.createDocumentFragment();
    var numNodes = d.childNodes.length;
    while (numNodes--) {
        f.appendChild(d.firstChild);
    }

    return f;
}

function htmlBefore(node, html) {
    if (node.ownerDocument.documentElement.insertAdjacentHtml) {
        htmlBefore = function(node, html) {
            var parent = node.parentElement
            var helper = parent.insertBefore(node.ownerDocument.createElement("div"), node);
            helper.insertAdjacentHtml("beforeBegin", html);
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
    this._subs = {
        // subscriptionPath: [subscribedNode0, nodeObj0, subscribedNode1, nodeObj1, ...]
    };

    var ondata = this.ondata = bind(this._ondata, this);
    store.subscribe(null, ondata);
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
            nodeObj.ondata(data, node);
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
        var subs = this._subs;
        var nodes = subs.hasOwnProperty(path) ? subs[path] : (subs[path] = []);
        if (!nodes.indexOf(node)) {
            nodes.push(node, nodeObj);
        }
    },

    unsub: function(path, node) {
        var subs = this._subs, idx;
        var nodes = subs.hasOwnProperty(path) ? subs[path] : null;
        if (nodes && (idx = nodes.indexOf(node)) !== -1) {
            nodes.splice(idx, 2)
        }
    }
}

/*
    ================================================================= BASE NODE
*/

function Node(tplNode) {
    this._uuid = uuid++;
    this._var = tplNode.getAttribute("var");

    var node = this;
    this.ondata = bind(this._ondata, this);
}
Node.prototype = {
    build: function(targetNode, /**Context*/context) {
        var placeHolder = targetNode.ownerDocument.createTextNode("");
        targetNode.parentNode.replaceChild(placeHolder, targetNode);
        targetNode.innerHtml = ""; // throw away stuff to save memory

        var resolvedPath = context.resolve(this._var);
        context.sub(resolvedPath, placeHolder, this);

        this._build && this._build(placeHolder, context, resolvedVar);

        return placeHolder;
    },

    destroy: function(placeHolder) {
        var resolvedPath = context.resolve(this._var);
        context.unsub(resolvedPath, placeHolder);
        if (this._destroy) {
            this._destroy(placeHolder);
        }
    },

    _ondata: function(data, node) {}
}

/*
    =============================================================== BLOCK NODES
*/

function BlockNode(tplNode) {
    Node.call(this, tplNode);
    this._html = tplNode && tplNode.innerHtml;
}
extend(BlockNode, Node);

function RootNode(html) {
    BlockNode.call(this);
    this._html = html;
}
extend(RootNode, BlockNode);


/*
    ============================================================== INLINE NODES
*/

function InlineNode(tplNode) {
    Node.call(this, tplNode);
}
extend(InlineNode, Node);

function TextNode(tplNode) {
    InlineNode.call(this);
    this._defaultText = tplNode["textContent" in tplNode ? "textContent" : "innerText"]
}
extend(TextNode, InlineNode, {
    _destroy: function(node) {
        node.data = "";
    },
    _ondata: function(node, data) {
        node.data = data != null ? data : this._defaultText;
    }
});

function HtmlNode(tplNode) {
    InlineNode.call(this);
    this._startNodes = [];

    this._defaultHtml = tplNode.innerHtml;
}
extend(HtmlNode, InlineNode, {
    _build: function(placeHolder) {
        var startNode = placeHolder.cloneNode(false);
        placeHolder.parentNode.insertBefore(startNode, placeHolder);
        this._startNodes.push(startNode);
    },
    _destroy: function(placeHolder) {
        var i = this._buildNodes.indexOf(placeHolder);
        if (i == -1) {
            return;
        }
        var node = this._startNodes[i];
        do {
            node = node.nextSibling;
            node.parentNode.removeChild(node.previousSibling);
        } while (node !== placeHolder);
    },
    _ondata: function(node, data) {


        node.innerHtml = data != null ? data : this._defaultHtml;
    }
})


exports.nodes = {
    root: RootNode,
    text: TextNode,
    html: HtmlNode
}

}(dpl));
