function dpl(html, doc) {
    html = dpl._pre(html);
    var root = new dpl.nodes.Root(html, doc || document);
}

dpl._preprocessors = [function assignIds(html) {
    var id = 0;
    return html.replace(/<tpl\b/g, function() {
        return '<tpl tpl-id="' + (id++) + '" ';
    });
}];

dpl._pre = function(html) {
    var i = 0, preprocessors = dpl._preprocessors;
    while ((p = preprocessors[i])) {
        html = p(html);
    }
    return html;
};

dpl._extend = function(base, contstruct, mixin) {
    if (base) {
        function C() {};
        C.prototype = base.prototype;
        var proto = construct.proto = new C();

        for (var key in mixin) {
            if (mixin.hasOwnProperty(key)) {
                proto[key] = mixin[key];
            }
        }
    }

    return construct;
};

dpl._createNode = function(tplNode) {
};



dpl.nodes = (function(dpl) {
    var extend = dpl._extend;
    var createNode = dpl._createNode;

    function Block(html, doc) {
        var root = this._tplRoot = document.createElement('div');
        root.innerHtml = html;
    }
    var bpt = Block.prototype = {
        build: function(outNode, nodeObjs) {
            var node, tplNodes = this._tplRoot.getElementsByTagName("tpl");
            while ((node = tplNodes[0])) {
                var id = node.getAttribute("tpl-id");
                var nodeObj = nodeObjs[id] || (nodeObjs[id] = createNode(node));
            }
        }
    }

    function Inline(node) {

    }

    extend(Block, Root);
    function Root(html, doc){
        Block.call(this, html, doc);
        this._nodes = [];
    }

    return {
        Root: Root
    }
}(dpl));

dpl.Node = function(node) {
    this._node = node;
    this._children = [];
    this.init();
    this.parse();
};


dpl.Node.prototype = {
    init: function() {
        var node = this._node;
        var renderNode = this._renderNode = node.ownerDocument.createTextNode('');
        node.parentNode.replaceChild(renderNode, node);
    },
    parse: function() {
        var node = this._node, children = this._children;
        var tplNodes = node.getElementsByTagName("tpl"), tplNode;

        while ((tplNode = tplNodes[0])) {
            var type = tplNode.getAttribute(type);
            children.push(new dpl.nodes[type](tplNode));
        }
    }
};

dpl.nodes = {
    iter: dpl.Node.extend(function IterNode(node) {dpl.Node.call(this, node)}, {

    }),

    text: dpl.Node.extend(function TextNode(node) {dpl.Node.call(this, node)}, {
        parse: function() {
            this._emptyText = this._node.innerText || this._node.textContent;
        }
    }),
};

dpl.RootNode = dpl.Node.extend({
    render: function(){
        var childNodes = this._node.childNodes;
        var f = node.ownerDocument.createDocumentFragment();
        var i = childNodes.length;
        while (i--) {
            f.appendChild(childNodes[0]);
        }

        return f;
    }
});
