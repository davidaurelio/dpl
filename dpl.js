function dpl(html, doc) {
    doc = doc || document;
    var root = doc.createElement('div');
    root.innerHTML = html;
    var rootNode = new dpl.Node(root);
}

dpl.Node = function(node) {
    this._node = node;
    this._children = [];
    this.init();
    this.parse();
};

dpl.Node.extend = function(construct, mixin) {
    function C(){};
    C.prototype = this.prototype;
    var proto = construct.proto = new C();

    for (var key in mixin) {
        if (mixin.hasOwnProperty(key)) {
            proto[key] = mixin[key];
        }
    }

    return construct;
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
    iter: dpl.Node.extend(function IterNode(dom) {dpl.Node.call(this)}, {

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
