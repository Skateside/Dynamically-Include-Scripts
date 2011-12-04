var INCLUDE = (function () {

    'use strict';

    var undef,
        scripts = {},

        statusNot = 'unrequested',
        //statusReq = 'requesting', // NOTE TO SELF: will I ever need this?
        statusOK  = 'ok',
        statusOut = 'timeout',

        allScripts = document.getElementsByTagName('script'),
        lastScript = allScripts[allScripts.length - 1],

        toString = Object.prototype.toString;

    function addScript(path, requires) {

        var i      = 0,
            il     = 0,
            reqs   = [],
            script = {
                status: statusNot
            };

// Before we go any further, we should check that the script in question hasn't
// already been added to the meta data.
        if (!scripts.hasOwnProperty(path)) {

// A script may not have any requirements so the argument may be undefined.    
            if (requires !== undef) {

// Force requires to be an array.
                if (toString.call(requires) !== '[object Array]') {
                    requires = [requires];
                }

// Filter out all requirements that aren't strings.
// If we can use the faster Array.filter then we should.
                if (requires.filter) {
                    requires = requires.filter(function (req) {
                        return toString.call(req) === '[object String]';
                    });

// If Array.filter isn't available, do it manually.
                } else {
                    il = requires.length;
                    while (i < il) {
                        if (toString.call(requires[i]) === '[object String]') {
                            reqs.push(requires[i]);
                        }
                        i += 1;
                    }
                    requires = reqs;
                }

                script.requires = requires;
            }

// Add the meta data to the list.
            scripts[path] = script;

        }

        return scripts[path];

    }


    function Script(path, callback) {

        var that = this;

// All we need to do is cache the arguments and get the meta data.    
        that.path     = path;
        that.meta     = scripts[path];
        that.callback = callback;

// With the data cached, initialise the inclusion.
        that.init();

    }

    Script.prototype = {

// Check the meta data is fine and start the including process.
        init: function () {

            var that = this,
                meta = that.meta,
                i = 0,
                il = 0,
                included = [],
                allIn = function (k) {
                    included[k] = true;
                    if (included.indexOf(false) < 0) {
                        that.addScript();
                    }
                },
                getAll = function (k) {
                    return new Script(meta.requires[k], function () {
                        allIn(k);
                    });
                };

// Using Array.indexOf is faster and neater, but not every browser understands
// it. If this is one of those browsers, the allIn function needs to take that
// into account.
            if (!Array.prototype.indexOf) {
                allIn = function (k) {
                    var j  = 0,
                        jl = included.length,
                        ii = -1;
                        included[k] = true;
                    while (j < jl) {
                        if (included[j] === false) {
                            ii = j;
                            break;
                        }
                        j += 1;
                    }
                    if (ii < 0) {
                        that.addScript();
                    }
                };
            }

// If we try to include a script that hasn't been properly added, add it now.
            if (meta === undef) {
                that.meta = addScript(that.path, that.callback);
                meta = that.meta;
            }

// If the script has already been included, fire the allClear method.
            if (meta.status === statusOK) {
                that.allClear();
            }

            if (meta.requires) {

                il = meta.requires.length;
                while (i < il) {
                    included[i] = false;
                    i += 1;
                }

                i = 0;
                while (i < il) {
                    getAll(i);
                    i += 1;
                }

            } else {
                that.addScript();
            }

        },

// TODO: build in a timeout so that we can detect scripts that can't be included.
// -> throw an error on timeout?
// -> send some kind of status to the callback so we can check for success?
        addScript: function () {

            var that = this,
                scriptElem = document.createElement('script');

            scriptElem.type = 'text\/javascript';

            if (scriptElem.onreadystate) {
                scriptElem.onreadystate = function () {
                    if (scriptElem.readyState === 'complete'
                            || scriptElem.readyState === 'loaded') {
                        scriptElem.onreadystate = null;
                        that.allClear();
                    }
                };
            } else {
                scriptElem.onload = function () {
                    scriptElem.onload = null;
                    that.allClear();
                };
            }

            scriptElem.src = that.path;
            lastScript.parentNode.insertBefore(scriptElem, lastScript);
        },

        allClear: function () {
            scripts[this.path].status = statusOK;
            this.callback();
        }
    };


// Expose the script inclusion and registry.
    function include(path, callback) {
        return new Script(path, callback);
    }


    include.add = function (path, requires) {
        return addScript(path, requires);
    };


    return include;


 }());