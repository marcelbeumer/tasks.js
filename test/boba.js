/*jshint undef:true, forin:false, noempty:false, browser:true */
/*global console:true, $:true */
(function() {

var root = this,
    ns = {},

    __f = function(){}; // for beget


// Expose (browser only for now)
root.boba = ns;


// Wrapping jQuery utils.
ns.extend = $.extend;
ns.forEach = ns.each = $.each;
ns.isArray = $.isArray;
ns.inArray = $.inArray;
ns.trim = $.trim;


// beget - get proto of object.
ns.beget = function(o) {
    __f.prototype=o;
    return new __f();
};


// inherits - CoffeeScript-style inheritance.
ns.inherits = function(child, parent) {
    var key, hasOwn = ns.hasOwn;
    for (key in parent) {
        if (hasOwn(parent, key)) child[key] = parent[key];
    }
    function ctor() {
        this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.__super__ = parent.prototype;
    return child;
};


// hasOwn - safe hasOwnProperty.
ns.hasOwn = function(o, n) {
    return Object.prototype.hasOwnProperty.call(o,n);
};


// bind - bind function to scope. Supports binding args as well.
ns.bind = function(fn, obj) {
    var slice = Array.prototype.slice,
        args = slice.call(arguments, 2);
    return function() {
        return fn.apply(obj, args.concat(slice.call(arguments)));
    };
};


// bindAll - bind all functions of object to object itself.
ns.bindAll = function(obj) {
    var bind = ns.bind,
        name;
    for (name in obj) {
        if (typeof(obj[name]) === "function" &&
                name !== 'constructor') {
            obj[name] = bind(obj[name], obj);
        }
    }
    return obj;
};


// filter - filters object or array based on filter fn.
//      param o : object or array
//      param fn: function(value, nameOrIndex, objectOrArray)
ns.filter = function(o, fn) {
    var r = null,
        x = 0,
        l = 0,
        name = null,
        hasOwn = ns.hasOwn;

    if (!ns.isArray(o)) {
        r = {};
        for (name in o) {
            if (hasOwn(o, name) && fn(o[name], name, o) !== false) {
                r[name] = o[name];
            }
        }
    } else {
        r = [];
        l = o.length;
        for (; x < l; x++) {
            if (fn(o[x], x, o) !== false) {
                r.push(o[x]);
            }
        }
    }
    return r;
};


// insertScript - insert script tag into head of document.
//      param src : string (url of source)
//      param id (optional): string
//      param onload (optional) : onload handler
ns.insertScript = function(src, id, onload) {
    var js,
        doc = document,
        head = doc.getElementsByTagName('head')[0];
    if (!id || !doc.getElementById(id)) {
        js = doc.createElement('script');
        if (id) js.id = id;
        if (onload) js.onload = onload;
        js.src = src;
        head.appendChild(js);
    }
};


// str - elegant string compositition, at the price of speed.
//      param str : string containing '%s' placeholders
//      rest...   : arguments to fill up the string
//
// example:
//      str('this is %s nice, but %s', 'very', 'slower');
//      > "this is very nice, but slower"
ns.str = function(str) {
    var l = arguments.length,
        x = 1;
    for (; x < l; x++) {
        str = str.replace('%s', arguments[x]);
    }
    return str;
};


// tpl - elegant string compositition based on keywords.
//      param str : string containing '{{name}}' placeholders
//      param obj : object containing keys
//
// example:
//      tpl('this is {{how}} nice, but {{what}}', {how : 'very', what: 'slower'});
//      > "this is very nice, but slower"
ns.tpl = function(str, obj) {
    var name,
        hasOwn = ns.hasOwn,
        re;
    for (name in obj) {
        if (hasOwn(obj, name)) {
            re = new RegExp('{{' + name + '}}', 'g');
            str = str.replace(re, obj[name]);
        }
    }
    return str;
};


// expand - expands object according expr
// examples:
//      expand({}, 'foo.bar.har') returns {foo:{bar:{har:undefined}}}
//      expand({foo : {}}, 'foo.bar.har {}') returns {foo:{bar:{har:{}}}}
//      expand({}, 'foo.bar.har []') returns {foo:{bar:{har:[]}}}
//      expand({foo:[]}, 'foo {}') returns {foo:[]} // because it does not overwrite
ns.expand = function(obj, expr) {
    var parts = expr.split(' '),
        path = parts[0],
        assign = parts[1],
        steps = path.split('.'),
        step,
        lastObj,
        x, l, c;

    if (assign) {
        if (assign === '[]') {
            lastObj = [];
        } else if (assign === '{}') {
            lastObj = {};
        }
    }

    c = obj;
    l = steps.length;
    for (x = 0; x < l; x++) {
        step = steps[x];
        c = c[step] = (c[step] !== undefined ? c[step] :
                (x == (l - 1) ? lastObj : {}));
    }

    return c;
};


// iter -- simple nested for name in iteration
// this util is mainly for easy prototyping, and not
// so much for high performance :)
// example:
//      iter({
//          a : {
//                 test : {
//                     foo : {
//                         x : []
//                     }
//                 }
//          b : {
//                 that : {
//                     foo : {
//                         x : []
//                         y : []
//                         z : []
//                     }
//                 }
//          }
//      }, '%.*.foo.%', function(first, second, obj) {
//          // .. will happen four times
//          // first could be a or b
//          // second could be x, y or z
//          // obj is one of the arrays
//      });
ns.iter = function(obj, expr, fn, _parts, _names) {
    var parts,
        name,
        names,
        iter,
        p;

    if (!obj) return;

    _parts = _parts || expr.split('.');
    _names = _names || [];

    if (_parts.length === 0) {
        fn.apply(fn, _names.concat([obj]));
        return;
    }

    name = _parts.splice(0, 1)[0];
    iter = name === '%' ? 1 : name === '*' ? 2 : 0;

    if (iter) {
        for (p in obj) {
            parts = [].concat(_parts);
            names = [].concat(_names);
            if (iter === 1) names.push(p);
            ns.iter(obj[p], expr, fn, parts, names);
        }
    } else {
        parts = [].concat(_parts);
        names = [].concat(_names);
        ns.iter(obj[name], expr, fn, parts, names);
    }
};


//
ns.iter.__test__ = function() {
    var o = {};
    ns.expand(o, 'a.foo.A.bar.x []');
    ns.expand(o, 'b.foo.B.bar.x []');
    ns.expand(o, 'b.foo.C.bar.y []');
    ns.expand(o, 'b.foo.D.bar.z []');
    ns.iter(o, '%.foo.*.bar.%', function(first, second, obj) {
        ns.log(first + ',' + second + ',' + typeof(obj));
    });
};


// log - simple, safe, console wrapper.
ns.log = function(msg) {
    if (window.console) {
        console.log(msg);
    }
};


// dir - simple, safe, console wrapper.
ns.dir = function(o) {
    if (window.console) {
        console.dir(o);
    }
};


// missing - return index value of argument that is null or undefined.
// Returns false if all arguments are fine.
//
// examples:
//      if (missing(a, b, c) !== false) throw..
//      if ((miss = util.missing(a, b,c )) !== false) throw miss..
ns.missing = function() {
    var l = arguments.length,
        x = 0;
    for (x; x < l; x++) {
        if (arguments[x] === undefined || arguments[x] === null) {
            return x;
        }
    }
    return false;
};


// round - rounds number on a number of decimals.
ns.round = function(num, dec) {
    dec = dec || 0;
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
};


//
ns.convertToFloatLikeStr = function(any) {
    var str = (any + '').replace(/,/g, '.'), // always have . instead of ,
        stripped = (str.match(/[\-0-9\.]/g) || []).join(''),
        dots,
        last,
        result;

    // only keep last .
    dots = stripped.split('.');
    last = dots.length > 1 ? '.' + dots.pop() : '';
    result = dots.join(',') + last;

    return result;
};


//
ns.convertToFloat = function(str, dec) {
    var alike = ns.convertToFloatLikeStr(str),
        clean = alike.replace(/,/g, ''),
        f = parseFloat(clean, 10);
    return dec !== undefined ? ns.round(f, dec) : f;
};


//
ns.convertToIntLikeStr = function(any) {
    return ((any + '').match(/[\-0-9]/g) || []).join('');
};


//
ns.convertToInt = function(str) {
    var alike = ns.convertToIntLikeStr(str),
        f = parseInt(alike, 10);
    return f;
};

//
ns.minMax = function(any, min, max) {
    var f = ns.convertToFloat(any);

    if (min !== undefined && f < min) f = min;
    if (max !== undefined && f > max) f = max;
    return f;
};


})();


