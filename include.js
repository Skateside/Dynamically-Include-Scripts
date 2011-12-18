var INCLUDE = (function () {

    'use strict';

    var undef,
        scripts = {},

        statusNot = 'unrequested',
        statusReq = 'requesting',
        statusOK  = 'ok',
        statusOut = 'timeout',

        allScripts = document.getElementsByTagName('script'),
        lastScript = allScripts[allScripts.length - 1],

        toString = Object.prototype.toString,

// Below are three workarounds for useful Array methods. These work arounds do
// not do everything that a native implimentation should, so we declare them as
// local variables rather than globally adding incomplete fixes.
        forEach = Array.prototype.forEach || function (func) {
            var i  = 0,
                il = this.length;
            while (i < il) {
                if (this[i] !== undef) {
                    func.call(undef, this[i], i, this);
                }
                i += 1;
            }
        },
        filter = Array.prototype.filter || function (func) {
            var filtered = [];
            forEach.call(this, function (ent) {
                if (func.apply(undef, arguments)) {
                    filtered.push(ent);
                }
            });
            return filtered;
        },
        indexOf = Array.prototype.indexOf || function (search) {
            var i  = 0,
                il = this.length,
                ii = -1;
            while (i < il) {
                if (this[i] === search) {
                    ii = i;
                    break;
                }
                i += 1;
            }
            return ii;
        };

    function isArray(obj) {
        return toString.call(obj) === '[object Array]';
    }

    function isFunction(obj) {
        return toString.call(obj) === '[object Function]';
    }
    
    function isString(obj) {
        return toString.call(obj) === '[object String]';
    }

// The addScript function adds the script to the meta data, including all
// requirements. It filters out requirements that aren't strings so that we
// stand a fighting chance of adding those paths to the DOM. It will also go
// through each of the filtered requirements and set up meta data for those
// scripts, if they haven't already been created. Internally it returns the
// meta data for the script it has just created.
// This function may be accessed through INCLUDE.add() with the same arguments
// but it does not return the meta data.
// Arguments:
//      path (string) The path of the script to be added.
//      requires (string | array) [optional] The path(s) for the script's
//          requirements. Arrays are filtered so they can only include strings.
    function addScript(path, requires) {

        var i      = 0,
            il     = 0,
            reqs   = [],
            script = {
                status: statusNot,
                callbacks: []
            };

// Before we go any further, we should check that the script in question hasn't
// already been added to the meta data.
        if (!scripts.hasOwnProperty(path)) {

// A script may not have any requirements so the argument may be undefined.
// However, this script may be getting called by Array.forEach, so check that
// requires isn't a number.
            if (requires !== undef && isNaN(requires)) {

// Filter out all requirements that aren't strings. For the sake of code
// consistency, we should ensure that requires is an array first. When we're
// done, we add the filtered requirements to the meta data.
                if (!isArray(requires)) {
                    requires = [requires];
                }

                requires = filter.call(requires, function (req) {
                    return isString(req);
                });
                
                script.requires = requires;

// Go through each of the requirements to see if they need adding to our meta
// data.
                forEach.call(requires, addScript);

            }

// Add the meta data to the list.
            scripts[path] = script;

        }

        return scripts[path];

    }


// The Script constructor is the main powerhouse of this script. It sets up the
// script inclusion and fires the callback when all the scripts have been
// loaded.
// This function may be accessed using INCLUDE().
// Arguments:
//      path (string) The absolute path of the script to include.
//      callback (function) The callback to execute when this script and all of
//          it's requirements have been included.
    function Script(path, callback) {
//console.log('new Script for "' + path + '"');
        var that = this;

// All we need to do is cache the arguments and get any meta data.    
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

// Simply set the an entry of included to true at the index given. If there are
// no more entries of false, fire the addScript property to include our script.
                allIn = function (k) {
                    included[k] = true;
                    
                    if (indexOf.call(included, false) < 0) {
                        that.addScript();
                    }
                },

// This simply creates a closure for the index we get through a loop so we can
// call allIn using the correct index.
                getAll = function (k) {
                    return new Script(meta.requires[k], function () {
                    //console.log('allIn with k of "' + k + '"');
                        allIn(k);
                    });
                };


// If we try to include a script that hasn't been properly added, add it now.
            if (meta === undef) {
                that.meta = addScript(that.path);
                meta = that.meta;
            }

// Add the current callback to any list of callbacks for this script. This
// allows us to jump on-board the callbacks of a script that's currently being
// included.
            that.meta.callbacks.push(that.callback);

// If the script has already been included, fire the allClear method.
            if (meta.status === statusOK) {
                that.allClear();

// Don't do anything else if this script is currently being included. We've
// already added the instance of allIn to the list of callbacks, that will be
// fired when this script has loaded.
            } else if (meta.status !== statusReq) {

// If we have any requirements, we need to go and get them all before we can
// include our script. Since there may be many, we create an array the same
// size as our requirements and fill it with false. We set each each index of
// that array to true as we can confirm that the requirement has been added.
// When we have removed all the false entries, we know it's safe to add our 
// own script.
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

// No requirements? No problem! We can add our script with impunity.
                } else {
                    that.addScript();
                }
            }

        },

// TODO: build in a timeout so that we can detect scripts that can't be included.
// -> throw an error on timeout?
// -> send some kind of status to the callback so we can check for success?
        addScript: function () {
/*console.log('adding script for "' + this.path + '"');
            var that = this,
                scriptElem = document.createElement('script');

            scripts[that.path].status = statusReq;

            scriptElem.type = 'text\/javascript';
            scriptElem.src = that.path;

            if (scriptElem.onreadystatechange) {
                scriptElem.onreadystatechange = function () {
                    if (this.readyState === 'complete'
                            || this.readyState === 'loaded') {
                        this.onreadystatechange = null;
                        that.allClear();
                    }
                };
            } else {
console.log('default to onload event');
                scriptElem.onload = function () {
console.log('firing onload for "' + that.path + '"');
                    this.onload = null;
                    that.allClear();
                };
            }

            var head = document.getElementsByTagName('head')[0] || document.documentElement;
            head.insertBefore(scriptElem, head.firstChild);
            //lastScript.parentNode.insertBefore(scriptElem, lastScript);*/

            var that = this,
                head = document.getElementsByTagName('head')[0]
                    || document.documentElement,
                script = document.createElement('script'),
                done = false;
            scripts[that.path].status = statusReq;
            script.type = 'text\/javascript';
            script.src = that.path;
            script.onload = script.onreadystatechange = function () {
                if (!done && (!this.readyState || this.readyState === 'loaded'
                        || this.readystate === 'complete')) {
                    done = true;
                    script.onload = script.onreadystatechange = null;
                    if (head && script.parentNode) {
                        head.removeChild(script);
                    }
                    that.allClear();
                }
            };
            head.insertBefore(script, head.firstChild);
        },

// The allClear method sets the status of the script to acknowledge that it's
// fine and fires all the callbacks that we have logged.
        allClear: function () {
//console.log('allClear for "' + this.path + '" (' + scripts[this.path].callbacks.length + ' callbacks)');
            scripts[this.path].status = statusOK;
            forEach.call(scripts[this.path].callbacks, function (func) {
//console.log(func.toString());
                func();
            });
        }
    };


// Expose the script inclusion and registry.
    function include(path, requires, callback) {

// Allow the function to add requirements if needed or simply add the script.
        if (callback === undef && isFunction(requires)) {
            callback = requires;
        } else {
            addScript(path, required);
        }
    
        return new Script(path, callback);
    }


    include.add = function (path, requires) {
        return addScript(path, requires);
    };


    return include;


 }());