/// <reference path="../typings/tsd.d.ts" />
describe("ko.command ", function () {
    it('should exist', function () {
        expect(ko.command).toBeDefined();
    });
    it('should accept a function', function () {
        var counter = 0;
        var com = ko.command(function (d, e) {
            counter += 1;
            return true;
        });
        com();
        expect(counter).toBe(1);
        com.execute();
    });
    it('should accept options', function () {
        var counter = 0;
        var com = ko.command({
            execute: function (d, e) {
                counter += 1;
                return true;
            }
        });
        com();
        expect(counter).toBe(1);
        com.execute();
    });
    it('should pass parameters to original function', function () {
        var com = ko.command(function (d, e) {
            expect(d).toBe(1);
            expect(e).toBe(2);
            return true;
        });
        com(1, 2);
        com.execute(1, 2);
    });
    it('when canExecute is not passed, default is always true', function () {
        var com = ko.command(function (d, e) {
            return true;
        });
        expect(com.canExecute()).toBe(true);
    });
    it('when canExecute function is passed, it is used', function () {
        var com = ko.command({
            execute: function (d, e) {
                return true;
            },
            canExecute: function () { return false; }
        });
        expect(com.canExecute()).toBe(false);
    });
    it('when canExecute observable<boolean> is passed, it is used', function () {
        var canExecute = ko.observable(true);
        var com = ko.command({
            execute: function (d, e) {
                return true;
            },
            canExecute: canExecute
        });
        expect(com.canExecute()).toBe(true);
        canExecute(false);
        expect(com.canExecute()).toBe(false);
        canExecute(true);
        expect(com.canExecute()).toBe(true);
    });
    it('canExecute function can return a Promise<boolean>', function (done) {
        var resolver;
        var prom = Q.Promise(function (resolve) { resolver = resolve; });
        var counter = 0;
        var com = ko.command({
            execute: function (d, e) {
                return true;
            },
            canExecute: function () { counter++; return prom; }
        });
        expect(com.canExecute()).toBe(false);
        resolver(true);
        Q({}).delay(100)
            .then(function () {
            expect(com.canExecute()).toBe(true);
            expect(counter).toBe(1);
        })
            .done(done);
    });
    it('when canExecute observable<Promise<boolean>> is passed, it is used', function (done) {
        var canExecute = ko.observable(Q(false));
        var com = ko.command({
            execute: function (d, e) {
                return true;
            },
            canExecute: canExecute
        });
        expect(com.canExecute()).toBe(false);
        Q({}).delay(100)
            .then(function () {
            expect(com.canExecute()).toBe(false);
        })
            .then(function () {
            canExecute(Q(true));
            expect(com.canExecute()).toBe(false);
        })
            .delay(100)
            .then(function () {
            expect(com.canExecute()).toBe(true);
        })
            .done(done);
    });
    it('when canExecute observable<Promise<boolean>> is rejected, canExecute stays false', function (done) {
        var canExecute = ko.observable(Q(false));
        var com = ko.command({
            execute: function (d, e) {
                return true;
            },
            canExecute: canExecute
        });
        expect(com.canExecute()).toBe(false);
        Q({}).delay(100)
            .then(function () {
            expect(com.canExecute()).toBe(false);
        })
            .then(function () {
            canExecute(Q.reject());
            expect(com.canExecute()).toBe(false);
        })
            .delay(100)
            .then(function () {
            expect(com.canExecute()).toBe(false);
            canExecute(Q(true));
        })
            .delay(100)
            .then(function () {
            expect(com.canExecute()).toBe(true);
        })
            .done(done);
    });
    it('command function can return a promise, which will be used to set isExecuting', function (done) {
        var resolver;
        var prom = Q.Promise(function (resolve) { resolver = resolve; });
        var com = ko.command({
            execute: function (d, e) {
                return prom;
            }
        });
        expect(com.isExecuting()).toBe(false);
        com.execute();
        expect(com.isExecuting()).toBe(true);
        Q({}).delay(100)
            .then(function () {
            expect(com.isExecuting()).toBe(true);
            resolver({});
        })
            .delay(100)
            .then(function () {
            expect(com.isExecuting()).toBe(false);
        })
            .done(done);
    });
});
describe("ko.bindingHandlers.command ", function () {
    function getFreshElem(elemTagName) {
        if (elemTagName === void 0) { elemTagName = "button"; }
        var newElem = document.createElement(elemTagName);
        document.body.appendChild(newElem);
        return newElem;
    }
    function createBinding(command, bindingText) {
        if (bindingText === void 0) { bindingText = "command: com"; }
        var elem = getFreshElem();
        elem.setAttribute("data-bind", bindingText);
        ko.applyBindings({
            com: command
        }, elem);
        return elem;
    }
    it("shpuld exist", function () {
        expect(ko.bindingHandlers.command).toBeDefined();
    });
    it("can bind to a command", function () {
        var counter = 0;
        var com = ko.command(function () { counter++; });
        var $elem = $(createBinding(com));
        expect($elem.prop('disabled')).toBe(false);
        $elem.click();
        expect(counter).toBe(1);
    });
    it("should throw if bind not to a command", function () {
        var notACommand = {};
        expect(function () { return createBinding(notACommand); }).toThrow();
    });
    it("element is disabled via canExecute by default", function () {
        var canExecute = ko.observable(false);
        var counter = 0;
        var com = ko.command({
            execute: function () { counter++; },
            canExecute: canExecute
        });
        var $elem = $(createBinding(com));
        expect($elem.prop('disabled')).toBe(true);
        $elem.click();
        expect(counter).toBe(0);
        canExecute(true);
        expect($elem.prop('disabled')).toBe(false);
        $elem.click();
        expect(counter).toBe(1);
    });
    it("commands returning promises will disable element while promise is pending", function (done) {
        var resolver;
        var prom = Q.Promise(function (resolve) { resolver = resolve; });
        var com = ko.command({
            execute: function (d, e) {
                return prom;
            }
        });
        var $elem = $(createBinding(com));
        expect($elem.prop('disabled')).toBe(false);
        $elem.click();
        expect($elem.prop('disabled')).toBe(true);
        resolver({});
        expect($elem.prop('disabled')).toBe(true);
        Q({}).delay(100)
            .then(function () {
            expect($elem.prop('disabled')).toBe(false);
        })
            .done(done);
    });
    it("when command returns object with 'done' method (usually promise) - 'done' will be called after execution", function () {
        var doneWasCalled = false;
        var promiseLikeObject = {
            done: function () { return doneWasCalled = true; }
        };
        var com = ko.command({
            execute: function (d, e) {
                return promiseLikeObject;
            }
        });
        var $elem = $(createBinding(com));
        expect($elem.prop('disabled')).toBe(false);
        $elem.click();
        expect(doneWasCalled).toBe(true);
    });
    it("commands allow to specify triggers for execute in binding", function () {
        var counter = 0;
        var com = ko.command({
            execute: function () { counter++; }
        });
        var $elem = $(createBinding(com, "command: com, commandExecuteOnEvents: ['mouseenter']"));
        $elem.click();
        expect(counter).toBe(0);
        var evt = document.createEvent('MouseEvents');
        evt.initEvent("mouseenter", true, true);
        $elem[0].dispatchEvent(evt);
        expect(counter).toBe(1);
    });
    it("commands allow to specify triggers for execute in binding, but will throw if list is empty", function () {
        var counter = 0;
        var com = ko.command({
            execute: function () { counter++; }
        });
        expect(function () { return createBinding(com, "command: com, commandExecuteOnEvents: []"); }).toThrow();
    });
    it("binding can be instructed to trigger on 'enter' key", function () {
        var elem = document.createElement("input");
        elem.type = "text";
        document.body.appendChild(elem);
        elem.setAttribute("data-bind", "command: com, commandExecuteOnEnter: true ");
        var counter = 0;
        ko.applyBindings({
            com: ko.command({
                execute: function () { counter++; }
            })
        }, elem);
        window.simulant.fire(elem, 'keydown', {
            which: 13,
            ctrlKey: true
        });
        expect(counter).toBe(1);
    });
});
//# sourceMappingURL=ko-command.spec.js.map