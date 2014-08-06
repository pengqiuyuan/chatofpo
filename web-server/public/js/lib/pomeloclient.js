(function() {
    // var isArray = Array.isArray;

    function isArray(a) {
        return (a.constructor.toString().match(/^function\ Array\(\)/) != null);
    }

    var root = this;

    function EventEmitter() {
    }


    if (typeof module !== 'undefined' && module.exports) {
        module.exports.EventEmitter = EventEmitter;
    }
    else {
        root = window;
        root.EventEmitter = EventEmitter;
    }

    // By default EventEmitters will print a warning if more than
    // 10 listeners are added to it. This is a useful default which
    // helps finding memory leaks.
    //
    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    var defaultMaxListeners = 10;
    EventEmitter.prototype.setMaxListeners = function(n) {
        if (!this._events) this._events = {};
        this._maxListeners = n;
    };


    EventEmitter.prototype.emit = function() {
        var type = arguments[0];
        // If there is no 'error' event listener then throw.
        if (type === 'error') {
            if (!this._events || !this._events.error ||
                (isArray(this._events.error) && !this._events.error.length))
            {
                if (this.domain) {
                    var er = arguments[1];
                    er.domain_emitter = this;
                    er.domain = this.domain;
                    er.domain_thrown = false;
                    this.domain.emit('error', er);
                    return false;
                }

                if (arguments[1] instanceof Error) {
                    throw arguments[1]; // Unhandled 'error' event
                } else {
                    throw new Error("Uncaught, unspecified 'error' event.");
                }
                return false;
            }
        }

        if (!this._events) return false;
        var handler = this._events[type];
        if (!handler) return false;

        if (typeof handler == 'function') {
            if (this.domain) {
                this.domain.enter();
            }
            switch (arguments.length) {
                // fast cases
                case 1:
                    handler.call(this);
                    break;
                case 2:
                    handler.call(this, arguments[1]);
                    break;
                case 3:
                    handler.call(this, arguments[1], arguments[2]);
                    break;
                // slower
                default:
                    var l = arguments.length;
                    var args = new Array(l - 1);
                    for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
                    handler.apply(this, args);
            }
            if (this.domain) {
                this.domain.exit();
            }
            return true;

        } else if (isArray(handler)) {
            if (this.domain) {
                this.domain.enter();
            }
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

            var listeners = handler.slice();
            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(this, args);
            }
            if (this.domain) {
                this.domain.exit();
            }
            return true;

        } else {
            return false;
        }
    };

    EventEmitter.prototype.addListener = function(type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('addListener only takes instances of Function');
        }

        if (!this._events) this._events = {};

        // To avoid recursion in the case that type == "newListeners"! Before
        // adding it to the listeners, first emit "newListeners".
        this.emit('newListener', type, typeof listener.listener === 'function' ?
            listener.listener : listener);

        if (!this._events[type]) {
            // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
        } else if (isArray(this._events[type])) {

            // If we've already got an array, just append.
            this._events[type].push(listener);

        } else {
            // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];

        }

        // Check for listener leak
        if (isArray(this._events[type]) && !this._events[type].warned) {
            var m;
            if (this._maxListeners !== undefined) {
                m = this._maxListeners;
            } else {
                m = defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
                console.trace();
            }
        }

        return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function(type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('.once only takes instances of Function');
        }

        var self = this;
        function g() {
            self.removeListener(type, g);
            listener.apply(this, arguments);
        };

        g.listener = listener;
        self.on(type, g);

        return this;
    };

    EventEmitter.prototype.removeListener = function(type, listener) {
        if ('function' !== typeof listener) {
            throw new Error('removeListener only takes instances of Function');
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (!this._events || !this._events[type]) return this;

        var list = this._events[type];

        if (isArray(list)) {
            var position = -1;
            for (var i = 0, length = list.length; i < length; i++) {
                if (list[i] === listener ||
                    (list[i].listener && list[i].listener === listener))
                {
                    position = i;
                    break;
                }
            }

            if (position < 0) return this;
            list.splice(position, 1);
        } else if (list === listener ||
            (list.listener && list.listener === listener))
        {
            delete this._events[type];
        }

        return this;
    };

    EventEmitter.prototype.removeAllListeners = function(type) {
        if (arguments.length === 0) {
            this._events = {};
            return this;
        }

        var events = this._events && this._events[type];
        if (!events) return this;

        if (isArray(events)) {
            events.splice(0);
        } else {
            this._events[type] = null;
        }

        return this;
    };

    EventEmitter.prototype.listeners = function(type) {
        if (!this._events) this._events = {};
        if (!this._events[type]) this._events[type] = [];
        if (!isArray(this._events[type])) {
            this._events[type] = [this._events[type]];
        }
        return this._events[type];
    }
})();

(function (exports, global) {

    var Protocol = exports;

    var HEADER = 5;

    var Message = function(id,route,body){
        this.id = id;
        this.route = route;
        this.body = body;
    };

    /**
     *
     *pomele client encode
     * id message id;
     * route message route
     * msg message body
     * socketio current support string
     *
     */
    Protocol.encode = function(id,route,msg){

        var isIE = !-[1,];
        var msgStr = JSON2.stringify(msg);
        if (route.length>255) { throw new Error('route maxlength is overflow'); }

        if (!document.addEventListener ){
            return bt2StrIE(isIE,id,route,msgStr);
        }else{
            var byteArray = new Array(HEADER + route.length + msgStr.length);
            //var byteArray = new Uint16Array(HEADER + route.length + msgStr.length);
            var index = 0;
            byteArray[index++] = (id>>24) & 0xFF;
            byteArray[index++] = (id>>16) & 0xFF;
            byteArray[index++] = (id>>8) & 0xFF;
            byteArray[index++] = id & 0xFF;
            byteArray[index++] = route.length & 0xFF;
            for(var i = 0;i<route.length;i++){
                byteArray[index++] = route.charCodeAt(i);
            }
            for (var i = 0; i < msgStr.length; i++) {
                byteArray[index++] = msgStr.charCodeAt(i);
            }
            return bt2Str(byteArray,0,byteArray.length);
        }

    };




    /**
     *
     *client decode
     *msg String data
     *return Message Object
     */

    var bt2Str = function(byteArray,start,end) {
        var result = "";
        for(var i = start; i < byteArray.length && i<end; i++) {
            result = result + String.fromCharCode(byteArray[i]);
        };
        return result;
    }

    var bt2StrIE = function(isIE,id,route,msg) {
        result = isIE+"%"+id+"^"+route+msg;
        return result;
    }

})('object' === typeof module ? module.exports : (this.Protocol = {}), this);

(function() {
    if (typeof Object.create !== 'function') {
        Object.create = function (o) {
            function F() {}
            F.prototype = o;
            return new F();
        };
    }

    var root = window;
    var pomelo = Object.create(EventEmitter.prototype); // object extend from object
    root.pomelo = pomelo;
    var socket = null;
    var id = 1;
    var callbacks = {};

    pomelo.init = function(params, cb){
        pomelo.params = params;
        params.debug = true;
        var host = params.host;
        var port = params.port;

        var url = 'ws://' + host;
        if(port) {
            url +=  ':' + port;
        }

        socket = io.connect(url, {'force new connection': true, reconnect: false});

        socket.on('connect', function(){
            //console.log('[pomeloclient.init] websocket connected!');
            if(window.console){ //在firefox中是true，在ie打开开发者模式下是true
                console.log('[pomeloclient.init] websocket connected!');
            }else{ //在ie中未打开开发者模式下是false
                //consoleLog('[pomeloclient.init] websocket connected!');
            }
            if (cb) {
                cb(socket);
            }
        });

        socket.on('reconnect', function() {
            console.log('reconnect');
        });

        socket.on('message', function(data){
            if(typeof data === 'string') {
                data = JSON2.parse(data);
            }
            if(data instanceof Array) {
                processMessageBatch(pomelo, data);
            } else {
                processMessage(pomelo, data);
            }
        });

        socket.on('error', function(err) {
            console.log(err);
        });

        socket.on('disconnect', function(reason) {
            pomelo.emit('disconnect', reason);
        });
    };

    pomelo.disconnect = function() {
        if(socket) {
            socket.disconnect();
            socket = null;
        }
    };

    pomelo.request = function(route) {
        if(!route) {
            return;
        }
        var msg = {};
        var cb;
        arguments = Array.prototype.slice.apply(arguments);
        if(arguments.length === 2){
            if(typeof arguments[1] === 'function'){
                cb = arguments[1];
            }else if(typeof arguments[1] === 'object'){
                msg = arguments[1];
            }
        }else if(arguments.length === 3){
            msg = arguments[1];
            cb = arguments[2];
        }
        msg = filter(msg,route);
        id++;
        callbacks[id] = cb;
        var sg = Protocol.encode(id,route,msg);
        socket.send(sg);
    };

    pomelo.notify = function(route,msg) {
        this.request(route, msg);
    };

    var processMessage = function(pomelo, msg) {
        var route;
        if(msg.id) {
            //if have a id then find the callback function with the request
            var cb = callbacks[msg.id];

            delete callbacks[msg.id];
            if(typeof cb !== 'function') {
                console.log('[pomeloclient.processMessage] cb is not a function for request ' + msg.id);
                return;
            }

            cb(msg.body);
            return;
        }

        // server push message or old format message
        processCall(msg);

        //if no id then it should be a server push message
        function processCall(msg) {
            var route = msg.route;
            if(!!route) {
                if (!!msg.body) {
                    var body = msg.body.body;
                    if (!body) {body = msg.body;}
                    pomelo.emit(route, body);
                } else {
                    pomelo.emit(route,msg);
                }
            } else {
                pomelo.emit(msg.body.route,msg.body);
            }
        }
    };

    var processMessageBatch = function(pomelo, msgs) {
        for(var i=0, l=msgs.length; i<l; i++) {
            processMessage(pomelo, msgs[i]);
        }
    };

    function filter(msg,route){
        if(route.indexOf('area.') === 0){
            msg.areaId = pomelo.areaId;
        }

        msg.timestamp = Date().valueOf();
        return msg;
    }


})();


var username;
var users;
var rid;
var base = 1000;
var increase = 25;
var reg = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
var LOGIN_ERROR = "There is no server to log in, please wait.";
var LENGTH_ERROR = "Name/Channel is too long or too short. 20 character max.";
var NAME_ERROR = "Bad character in Name/Channel. Can only have letters, numbers, Chinese characters, and '_'";
var DUPLICATE_ERROR = "Please change your name to login.";

util = {
    urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
    //  html sanitizer
    toStaticHTML: function(inputHtml) {
        inputHtml = inputHtml.toString();
        return inputHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    //pads n with zeros on the left,
    //digits is minimum length of output
    //zeroPad(3, 5); returns "005"
    //zeroPad(2, 500); returns "500"
    zeroPad: function(digits, n) {
        n = n.toString();
        while(n.length < digits)
            n = '0' + n;
        return n;
    },
    //it is almost 8 o'clock PM here
    //timeString(new Date); returns "19:49"
    timeString: function(date) {
        var minutes = date.getMinutes().toString();
        var hours = date.getHours().toString();
        return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
    },

    //does the argument only contain whitespace?
    isBlank: function(text) {
        var blank = /^\s*$/;
        return(text.match(blank) !== null);
    }
};

//always view the most recent message when it is added
function scrollDown(base) {
    window.scrollTo(0, base);
    $("#entry").focus();
};

// add message on board
function addMessage(from, target, text, time) {
    var name = (target == '*' ? 'all' : target);
    if(text === null) return;
    if(time == null) {
        // if the time is null or undefined, use the current time.
        time = new Date();
    } else if((time instanceof Date) === false) {
        // if it's a timestamp, interpret it
        time = new Date(time);
    }
    //every message you see is actually a table with 3 cols:
    //  the time,
    //  the person who caused the event,
    //  and the content
    var messageElement = $(document.createElement("table"));
    messageElement.addClass("message");
    // sanitize
    text = util.toStaticHTML(text);
    var content = '<tr>' + '  <td class="date">' + util.timeString(time) + '</td>' + '  <td class="nick">' + util.toStaticHTML(from) + ' says to ' + name + ': ' + '</td>' + '  <td class="msg-text">' + text + '</td>' + '</tr>';
    messageElement.html(content);
    //the log is the stream that we view
    $("#chatHistory").append(messageElement);
    base += increase;
    scrollDown(base);
};

// show tip
function tip(type, name) {
    var tip,title;
    switch(type){
        case 'online':
            tip = name + ' is online now.';
            title = 'Online Notify';
            break;
        case 'offline':
            tip = name + ' is offline now.';
            title = 'Offline Notify';
            break;
        case 'message':
            tip = name + ' is saying now.'
            title = 'Message Notify';
            break;
    }
    var pop=new Pop(title, tip);
};

// init user list
function initUserList(data) {
    users = data.users;
    for(var i = 0; i < users.length; i++) {
        var slElement = $(document.createElement("option"));
        slElement.attr("value", users[i]);
        slElement.text(users[i]);
        $("#usersList").append(slElement);
    }
};

// add user in user list
function addUser(user) {
    var slElement = $(document.createElement("option"));
    slElement.attr("value", user);
    slElement.text(user);
    $("#usersList").append(slElement);
};

// remove user from user list
function removeUser(user) {
    $("#usersList option").each(
        function() {
            if($(this).val() === user) $(this).remove();
        });
};

// set your name
function setName() {
    $("#name").text(username);
};

// set your room
function setRoom() {
    $("#room").text(rid);
};

// show error
function showError(content) {
    $("#loginError").text(content);
    $("#loginError").show();
};

// show login panel
function showLogin() {
    $("#loginView").show();
    $("#chatHistory").hide();
    $("#toolbar").hide();
    $("#loginError").hide();
    $("#loginUser").focus();
};

// show chat panel
function showChat() {
    $("#loginView").hide();
    $("#loginError").hide();
    $("#toolbar").show();
    $("entry").focus();
    scrollDown(base);
};

// query connector
function queryEntry(uid, callback) {
    var route = 'gate.gateHandler.queryEntry';
    pomelo.init({
        host: window.location.hostname,
        port: 3014,
        log: true
    }, function() {
        pomelo.request(route, {
            uid: uid
        }, function(data) {
            pomelo.disconnect();
            if(data.code === 500) {
                showError(LOGIN_ERROR);
                return;
            }
            callback(data.host, data.port);
        });
    });
};

$(document).ready(function() {
    //when first time into chat room.
    showLogin();

    //wait message from the server.
    pomelo.on('onChat', function(data) {
        addMessage(data.from, data.target, data.msg);
        $("#chatHistory").show();
        if(data.from !== username)
            tip('message', data.from);
    });

    //update user list
    pomelo.on('onAdd', function(data) {
        var user = data.user;
        tip('online', user);
        addUser(user);
    });

    //update user list
    pomelo.on('onLeave', function(data) {
        var user = data.user;
        tip('offline', user);
        removeUser(user);
    });


    //handle disconect message, occours when the client is disconnect with servers
    pomelo.on('disconnect', function(reason) {
        alert("ttttttttttttttttt");
        showLogin();
    });

    //deal with login button click.
    $("#login").click(function() {
        username = $("#loginUser").attr("value");
        rid = $('#channelList').val();

        if(username.length > 20 || username.length == 0 || rid.length > 20 || rid.length == 0) {
            showError(LENGTH_ERROR);
            return false;
        }

        if(!reg.test(username) || !reg.test(rid)) {
            showError(NAME_ERROR);
            return false;
        }

        //query entry of connection
        queryEntry(username, function(host, port) {
            pomelo.init({
                host: host,
                port: port,
                log: true
            }, function() {
                var route = "connector.entryHandler.enter";
                pomelo.request(route, {
                    username: username,
                    rid: rid
                }, function(data) {
                    if(data.error) {
                        showError(DUPLICATE_ERROR);
                        return;
                    }
                    setName();
                    setRoom();
                    showChat();
                    initUserList(data);
                });
            });
        });
    });

    //deal with chat mode.
    $("#entry").keypress(function(e) {
        var route = "chat.chatHandler.send";
        var target = $("#usersList").val();

        var fromId = null;
        var targetId = null;
        if(target =="*"){
            targetId = "*";
        }else{
            targetId = null;
        }

        if(e.keyCode != 13 /* Return */ ) return;
        var msg = $("#entry").attr("value").replace("\n", "");
        if(!util.isBlank(msg)) {
            pomelo.request(route, {
                rid: rid,
                content: msg,
                from: username,
                target: target,
                fromId:fromId,
                targetId:targetId
            }, function(data) {
                $("#entry").attr("value", ""); // clear the entry field.
                if(target != '*' && target != username) {
                    addMessage(username, data.route.target, msg);
                    $("#chatHistory").show();
                }
            });
        }
    });
});