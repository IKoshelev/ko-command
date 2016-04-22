/// <reference path="../typings/tsd.d.ts" />

describe("ko.command ",()=>{
		
	it('should exist',()=>{
		expect(ko.command).toBeDefined();
	});
	
	it('should accept a function',()=> {
		
		var counter = 0;
		
		var com = ko.command((d,e) => {
			counter += 1;
			return true;
		});
		
		com();
		
		expect(counter).toBe(1);
		
		com.execute();	
	});
	
		it('should accept options',()=> {
		
		var counter = 0;
		
		var com = ko.command({
			execute:(d,e) => {
				counter += 1;
				return true;
		}}); 
		
		com();
		
		expect(counter).toBe(1);
		
		com.execute();	
	});
	
	it('should pass parameters to original function',()=> {
				
		var com = ko.command((d,e) => {
			expect(d).toBe(1);
			expect(e).toBe(2);
			return true;
		});
		
		com(1,2);
		
		com.execute(1,2);	
	});
	
	it('when canExecute is not passed, default is always true',()=> {
				
		var com = ko.command((d,e) => {
			return true;
		});

		expect(com.canExecute()).toBe(true);
	});
	
		it('when canExecute function is passed, it is used',()=> {
				
		var com = ko.command({
			execute:(d,e) => {
				return true;
			},
			canExecute:() => false
		});
		
		expect(com.canExecute()).toBe(false);
	});
	
	it('when canExecute observable<boolean> is passed, it is used',()=> {
			
		var canExecute = ko.observable(true);
				
		var com = ko.command({
			execute:(d,e) => {
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
	
	it('canExecute function can return a Promise<boolean>',(done)=> {
		
		var resolver: any;		
		var prom = Q.Promise<boolean>((resolve) => {resolver = resolve;});
		var counter = 0;
				
		var com = ko.command({
			execute:(d,e) => {
				return true;
			},
			canExecute:() => {counter++; return prom;}
		});
		
		expect(com.canExecute()).toBe(false);
		
		resolver(true);
		
		Q({})	.delay(100)
				.then(() => {
					expect(com.canExecute()).toBe(true);
					expect(counter).toBe(1);
				})
				.done(done);
	});
	
	it('when canExecute observable<Promise<boolean>> is passed, it is used',(done)=> {
		
		var canExecute = ko.observable(Q(false));
				
		var com = ko.command({
			execute:(d,e) => {
				return true;
			},
			canExecute: canExecute
		});
		
		expect(com.canExecute()).toBe(false);
		
		Q({})	.delay(100)
				.then(() => {
					expect(com.canExecute()).toBe(false);
				})
				.then(() => {
					canExecute(Q(true));
					expect(com.canExecute()).toBe(false);
				})
				.delay(100)
				.then(() => {
					expect(com.canExecute()).toBe(true);
				})
				.done(done);
	});
	
	it('when canExecute observable<Promise<boolean>> is rejected, canExecute stays false',(done)=> {
		
		var canExecute = ko.observable(Q(false));
				
		var com = ko.command({
			execute:(d,e) => {
				return true;
			},
			canExecute: canExecute
		});
		
		expect(com.canExecute()).toBe(false);
		
		Q({})	.delay(100)
				.then(() => {
					expect(com.canExecute()).toBe(false);
				})
				.then(() => {
					canExecute(Q.reject<boolean>());
					expect(com.canExecute()).toBe(false);
				})
				.delay(100)
				.then(() => {
					expect(com.canExecute()).toBe(false);
					canExecute(Q(true));
				})
				.delay(100)
				.then(() => {
					expect(com.canExecute()).toBe(true);
				})
				.done(done);
	});
	
	it('command function can return a promise, which will be used to set isExecuting',(done)=> {
		
		var resolver: any;		
		var prom = Q.Promise<any>((resolve) => {resolver = resolve;});
				
		var com = ko.command({
			execute:(d,e) => {
				return prom;
			}
		});
		
		expect(com.isExectuting()).toBe(false);
		
		com.execute();

		expect(com.isExectuting()).toBe(true);
		
		Q({})	.delay(100)
				.then(() => {
					expect(com.isExectuting()).toBe(true);
					resolver({});
				})
				.delay(100)
				.then(() => {
					expect(com.isExectuting()).toBe(false);
				})
				.done(done);
	});
});

describe("ko.bindingHandlers.command ",()=>{
	
	function getFreshElem(elemTagName = "button"){
		var newElem = document.createElement(elemTagName);
		document.body.appendChild(newElem);
		return newElem;
	}
	
	function createBinding(command: command<any,any,any>, bindingText = "command: com"){
		var elem = getFreshElem();
		elem.setAttribute("data-bind", bindingText);
		ko.applyBindings({
			com: command,
		},elem)
		return elem;
	}
	
	it("shpuld exist", () => {
		expect(ko.bindingHandlers.command).toBeDefined();
	})
	
	it("can bind to a command",()=>{
		
		var counter = 0;
		var com = ko.command(() => {counter++;});

 		var $elem = $(createBinding(com));
		 
		 expect($elem.prop('disabled')).toBe(false);
		 
		 $elem.click();
		 
		 expect(counter).toBe(1);
		
	});
	
	it("should throw if bind not to a command",()=>{
		
		var notACommand = {};
		
		expect(() => createBinding(<any>notACommand)).toThrow();
			
	});
	
	it("element is disabled via canExecute by default",()=>{
		
		var canExecute = ko.observable(false);
		var counter = 0;
		var com = ko.command({
			execute: () => {counter++;},
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
	
	it("commands returning promises will disable element while promise is pending",(done)=>{
		
		var resolver: any;		
		var prom = Q.Promise<any>((resolve) => {resolver = resolve;});
				
		var com = ko.command({
			execute:(d,e) => {
				return prom;
			}
		});

 		var $elem = $(createBinding(com));
		 
		 expect($elem.prop('disabled')).toBe(false);
		 
		 $elem.click();
		 
		 expect($elem.prop('disabled')).toBe(true);
		 
		 resolver({});
		 
		 expect($elem.prop('disabled')).toBe(true);
		 
		 Q({})	.delay(100)
		 		.then(() => {
					 expect($elem.prop('disabled')).toBe(false);
				 })
				 .done(done);
	});
	
	it("commands allow to specify triggers for execute in binding",()=>{
						
		var counter = 0;
		var com = ko.command({
			execute: () => {counter++;}
		});

 		var $elem = $(createBinding(com, "command: com, commandExecuteOnEvents: ['mouseenter']"));
		 		 
		$elem.click();
		 
		expect(counter).toBe(0);

		var evt = document.createEvent('MouseEvents');
		evt.initEvent("mouseenter", true, true);
		$elem[0].dispatchEvent(evt);
		  		 
		expect(counter).toBe(1);
	});
	
	it("commands allow to specify triggers for execute in binding, but will throw if list is empty",()=>{
						
		var counter = 0;
		var com = ko.command({
			execute: () => {counter++;}
		});

 		expect(() => createBinding(com, "command: com, commandExecuteOnEvents: []")).toThrow();	 		 
	});
	
	it("binding can be instructed to trigger on 'enter' key",()=>{
						
		var elem = document.createElement("input");
		elem.type = "text";
		document.body.appendChild(elem);
		elem.setAttribute("data-bind", "command: com, commandExecuteOnEnter: true ");
		
		var counter = 0;
		ko.applyBindings({
			com: ko.command({
			execute: () => {counter++;}
		}),
		},elem);
				
		(<any>window).simulant.fire( elem, 'keydown', {
			which: 13,
			ctrlKey: true
		});
				
		expect(counter).toBe(1);	 		 
	});
	
});