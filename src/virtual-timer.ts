import { Delay, Time, Timer } from '@most/types';

const handle = Symbol('VirtualTimer Handle');
type Handle = typeof handle;
type Thunk = () => Handle;

export interface TickTimer extends Timer {
	tick(dt: Time): void;
}

class VirtualTimer implements TickTimer {
	private _now = 0;
	private _targetNow = 0;
	private time = Infinity;
	private thunk?: Thunk;
	private timeout?: number;
	private isActive = false;
	private isRunning = false;

	clearTimer(timerHandle: Handle): void {
		if (timerHandle === handle) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
			this.time = Infinity;
			this.thunk = undefined;
		}
	}

	now(): number {
		return this._now;
	}

	setTimer(thunk: Thunk, delayTime: Delay): Handle {
		if (typeof this.thunk === 'undefined') {
			this.thunk = thunk;
			this.time = this._now + Math.max(0, delayTime);
			if (this.isActive) {
				this.run();
			}
		}
		return handle;
	}

	tick(dt: Time): void {
		if (dt > 0) {
			this._targetNow += dt;
			this.run();
		}
	}

	private run() {
		if (!this.isRunning) {
			this.isActive = true;
			this.isRunning = true;
			this.step();
		}
	}

	private step() {
		this.timeout = setTimeout(this.stepTimer, 0);
	}

	private stepTimer = () => {
		if (this._now >= this._targetNow) {
			this._now = this._targetNow;
			this.time = Infinity;
			this.isRunning = false;
			return;
		}

		const thunk = this.thunk;
		this.thunk = undefined;
		this._now = this.time;
		this.time = Infinity;

		if (typeof thunk === 'function') {
			thunk();
		}

		this.step();
	};
}

export const newVirtualTimer = (): TickTimer => new VirtualTimer();
