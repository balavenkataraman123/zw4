console.log("teh keyframer lib has loaded xD");

var kf = {};


(function() { // IIFEs are a w e s o m e
	console.log("iife invoked");
	kf.CLASSIC = function(completion) {return completion;}
	kf.SINE = function(completion) {
		return Math.sin(completion*Math.PI + Math.PI/2) + 1;
	}
	var noop = () => {};
	kf.KeyframerScalar = class {
		constructor(thing, start, end, duration, ease = kf.CLASSIC, selfUpdate = true, onUpdate = noop, onEnd = noop) {
			this.thing = thing;
			this.start = start;
			this.end = end;
			this.ease = ease;
			this.completion = 0; // 0 to 1
			this.increment = (1/duration) * 10;
			this.endFunc = onEnd;
			this.onUpdate = onUpdate;
			if (selfUpdate) {
				var tis = this;
				this.handle = setInterval(()=>{this.update(tis)}, 10);
			}
		}
		mix(a, b, amount) {
			var aAmount = 1 - amount;
			return a * aAmount + amount * b;
		}
		update(tis) { // intended to be called every 10ms
			tis.completion += tis.increment;
			if (tis.completion >= 1) {
				clearInterval(tis.handle);
				tis.endFunc();
			} else {
				tis.thing = tis.mix(tis.start, tis.end, tis.ease(tis.completion));
			}
			tis.onUpdate(tis.thing);
		}
	};
	kf.KeyframerVec3 = class extends kf.KeyframerScalar /*this actually works?*/ {
		constructor(thing, start, end, duration, ease = kf.CLASSIC, selfUpdate = true, onUpdate = noop, onEnd = noop) {
			super(thing, start, end, duration, ease, false, onUpdate, onEnd);
		}
	};
}())
