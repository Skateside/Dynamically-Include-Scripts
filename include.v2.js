var INCLUDE = (function () {

    'use strict';

    var undef,
        toString = Object.prototype.toString,
        owns = function (o, p) {
            return Object.prototype.hasOwnProperty.call(o, p);
        },

        head = document.getElementsByTagName('head')[0] ||
            document.documentElement,

// Helper functions to identify objects.
        is = {
            array: function (o) {
                return toString.call(o) === '[object Array]';
            },
            callable: function (o) {
                return toString.call(o) === '[object Function]';
            },
            numeric: function (o) {
                return !isNaN(+o);
            },
            string: function (o) {
                return String(o) === o;
            }
        },

// Helper functions for manipulating arrays. To start with, we just have a
// function for creating arrays from other objects. More methods are added
// later on using the addToArray closure.
        array = {
            toArray: function (o) {
                var ret = [o],
                    i = 0,
                    il,
                    r = [];
                if (is.array(o)) {
                    ret = o;
                } else if (is.numeric(o.length)) {
                    try {
                        ret = Array.prototype.slice.call(o);
                    } catch (e) {
                        il = +o.length;
                        while (i < il) {
                            r[i] = ret[i];
                        }
                        ret = r;
                    }
                }
                return ret;
            }
        },

// Helper functions for manipulating strings.
        string = {
            ucFirst: function (str) {
                var letters = str.split(''),
                    newStr  = letters[0].toUpperCase() +
                        letters.slice(1).join('').toLowerCase();
                return newStr;
            },
            normalisePath: function (str) {
// In the future this will do something more useful with window.location.
// Remember that window.location is the location of the HTML page including
// this script!
                return str.toLowerCase();
            }
        },

// Meta data for the scripts and the functions to manipulate it.
        meta = {

// meta.data - the data for the scripts, the normalised path is the key.
// Currently each data object contains 3 properties:
//  data.callbacks - array of all callbacks to be executed when the script is
//      added to the DOM.
//  data.requires - array of all paths of scripts that this script requires.
//  data.status - numerical representation of the status of this script.
//      0: Not requested, no attempt has been made to add it to the DOM.
//      1: Requesting requirements, currently trying to add the required
//          scripts to the DOM.
//      2: Requesting script, set just before adding the script to the DOM.
//      3: OK, the script has been successfully added to the DOM.
            data: {},

// meta.create - creates the meta date for a given path. The path is normalised
// before trying to add it and if data already exists, no action is taken. As
// meta data is created, a callback is added for the script that sets the
// status to 3.
            create: function (path) {
                var normal = string.normalisePath(path);
                if (!owns(meta.data, normal)) {
                    meta.data[normal] = {
                        callbacks: [function () {
                            meta.add(path, 'status', 3);
                        }],
                        requires: [],
                        status: 0
                    };
                }
            },

// meta.add - adds data to the meta data. The path is normalised before the
// data is manipulated. If the property given relates to an array, the info is
// added, otherwise the info replaces the current data if the types match. If
// no data is found for the given path, it will be created first.
            add: function (path, property, info) {
                var normal = string.normalisePath(path),
                    script;
                meta.create(normal);
                script = meta.data[normal];
                if (owns(script, property)) {
                    if (is.array(script[property]) && !is.array(info)
                            && array.indexOf(script[property], info) < 0) {
                        script[property].push(info);
                    } else if (toString.call(script[property]) === toString.call(info)) {
                        script[property] = info;
                    }
                }
            },

// meta.get - retrieves the information in the meta data store for the
// specified property. The path is normalised before trying to get the data. If
// no data exists for the given path, or the property is not recognised, this
// function will return undefined.
            get: function (path, property) {
                var normal = string.normalisePath(path),
                    info;
                if (owns(meta.data, normal)
                        && owns(meta.data[normal], property)) {
                    info = meta.data[normal][property];
                }
                return info;
            }
        },

// Functions for manipulating script tags.
        script = {

// script.create - creates a SCRIPT tag and adds it to the DOM, just before the
// first element in the HEAD. As soon as the script is loaded, it is removed
// from the DOM and the specified callback is executed.
            create: function (path, callback) {
                var tag = document.createElement('script');
                tag.type = 'text\/javascript';
                tag.src = path;
                tag.onload = tag.onreadystatechange = function () {
                    if (!tag.readyState || tag.readyState === 'loaded'
                            || tag.readyState === 'complete') {
                        tag.onload = tag.onreadystatechange = null;
                        if (head && head.parentNode) {
                            head.removeChild(tag);
                        }
                        if (is.callable(callback)) {
                            callback();
                        }
                    }
                };
                head.insertBefore(tag, head.firstChild);
            },

// script.addToDOM - sends the normalised path to script.create and sends a
// function to execute all the callbacks for the script as the script.create
// callback. If the callbacks cannot be identified, no action is taken.
            addToDOM: function (path) {
                var normal = string.normalisePath(path),
                    callbacks = meta.get(normal, 'callbacks');
                if (callbacks !== undef) {
                    meta.add(normal, 'status', 2);
                    callbacks = array.filter(callbacks, is.callable);
                    script.create(normal, function () {
                        array.forEach(callbacks, function (callback) {
                            callback();
                        });
                    });
                }
            },

// script.getRequires - initialises all the required scripts for the specified
// path. If the path is not recognised, meta data is created. When all
// requirements have been added to the DOM, or if there are no requirements,
// the script is added to the DOM. If the specified path is not recognised,
// meta data is created.
            getRequires: function (path, callback) {
                var requires = meta.get(path, 'requires'),
                    list = [],
                    i = 0;
                if (requires === undef) {
                    meta.create(path);
                    requires = [];
                }
                meta.add(path, 'status', 1);
                if (is.callable(callback)) {
                    meta.add(path, 'callbacks', callback);
                }
// If there are any requirements, we create a checklist so we know when they've
// all been added. When we know they all have we can safely add our current
// script to the DOM.
                if (requires.length) {
                    list.length = i = requires.length;
                    while (i) {
                        i -= 1;
                        list[i] = false;
                    }
                    array.forEach(requires, function (req, i) {
                        script.init(req, function () {
                            list[i] = true;
                            if (array.indexOf(list, false) < 0) {
                                script.addToDOM(path);
                            }
                        });
                    });
                } else {
                    script.addToDOM(path);
                }
            },

// script.init - initialises a script by checking the status. If the status is
// not recognised, it is added to the meta data. If the status is 0, all
// requirements are added and the callback is executed when all of them have
// been. If the status is 1 or 2, the callback is added to the list of
// callbacks for the current script; it will be executed when the script is
// added to the DOM. Finally, if the status is 3 and the specified callback can
// be called, it is executed as the script has already been added to the DOM.
            init: function (path, callback) {
                var status = meta.get(path, 'status');
                if (status === undef) {
                    meta.create(path);
                    status = 0;
                }
                if (status === 0) {
                    script.getRequires(path, callback);
                } else if (status === 1 || status === 2) {
                    meta.add(path, 'callbacks', callback);
                } else if (is.callable(callback)) {
                    callback();
                }

            }
        },

// The object that is returned to the global scope.
        include = {

// include.roundUp - finds all SCRIPT tags currently on the page and adds them
// to the meta data with a status of 3.
            roundUp: function () {
                var scripts = array.toArray(
                    document.getElementsByTagName('script')
                );
                array.forEach(scripts, function (script) {
                    meta.add(script.src, 'status', 3);
                });
            },

// include.add - adds a script to the meta data with the specified requires as
// the requirements. requires may be either a string or an array.
            add: function (path, requires) {
                if (is.array(requires)) {
                    array.forEach(requires, function (req) {
                        include.add(path, req);
                    });
                } else if (is.string(requires)) {
                    meta.add(path, 'requires', requires);
                }
            },

// include.file - adds a script to the DOM with the specified path. A callback
// can be given to execute when the script has been added. Optionally,
// requirements for the script can be defined using the requires arguments.
            file: function (path, requires, callback) {
                if (callback === undef && is.callable(requires)) {
                    callback = requires;
                    requires = [];
                }
                meta.create(path);
                if (requires.length) {
                    include.add(path, requires);
                }
                script.init(path, callback);
            }
        };

// Adds Array methods to the array object. It checks to see if the the current
// browser supports the Array method and adds a workaround if it doesn't.
// Please note that the workarounds below are not complete fixes and therefore
// are simply local variables.
    (function addToArray(method, workaround) {
        var func = owns(Array.prototype, method) ?
                Array.prototype[method] : workaround;
        array[method] = function (arr) {
            return func.apply(arr, array.toArray(arguments).slice(1));
        };
        return addToArray;
    }
        ('forEach', function (func) {
            var i = 0,
                n = this.length;
            while (i < n) {
                if (this[i] !== undef) {
                    func.call(undef, this[i], i, this);
                }
                i += 1;
            }
        })
        ('filter', function (func) {
            var i = 0,
                n = this.length,
                a = [];
            while (i < n) {
                if (this[i] !== undef &&
                        func.call(undef, this[i], i, this)) {
                    a.push(this[i]);
                }
                i += 1;
            }
            return a;
        })
        ('indexOf', function (item) {
            var i = 0,
                n = this.length,
                p = -1;
            while (i < n) {
                if (this[i] !== undef && this[i] === item) {
                    p = i;
                    break;
                }
                i += 1;
            }
            return p;
        }));

// Returns the include object.
    return include;

}());