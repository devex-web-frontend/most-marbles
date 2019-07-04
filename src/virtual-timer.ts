/**
 * based on https://github.com/mostjs/core/blob/master/packages/core/test/helper/VirtualTimer.js
 */
import { Timer } from '@most/types';

class VirtualTimer implements Timer {
	private _now: number = 0;
	private _targetNow: number = 0;
	private _time = Infinity;
	private _task?: Function;
	private _timer?: number;
	private _active = false;
	private _running = false;
	private _key = {};

	now() {
		return this._now;
	}

	setTimer(f: Function, dt: number) {
		if (this._task !== void 0) {
			throw new Error('VirtualTimer: Only supports one in-flight timer');
		}

		this._task = f;
		this._time = this._now + Math.max(0, dt);
		if (this._active) {
			this._run();
		}
		return this._key;
	}

	clearTimer(t: {}) {
		if (t !== this._key) {
			return;
		}

		this._cancel();
		this._time = Infinity;
		this._task = void 0;
	}

	tick(dt: number) {
		if (dt <= 0) {
			return;
		}

		this._targetNow = this._targetNow + dt;
		this._run();
	}

	private _run() {
		if (this._running) {
			return;
		}

		this._active = true;
		this._running = true;
		this._step();
	}

	private _step() {
		this._timer = setTimeout(this.stepTimer, 0, this);
	}

	private _cancel() {
		clearTimeout(this._timer);
	}

	private stepTimer = function stepTimer(vt: VirtualTimer) {
		if (vt._now >= vt._targetNow) {
			vt._now = vt._targetNow;
			vt._time = Infinity;
			vt._running = false;
			return;
		}

		const task = vt._task;
		vt._task = void 0;
		vt._now = vt._time;
		vt._time = Infinity;

		if (typeof task === 'function') {
			task();
		}

		vt._step();
	};
}

export const newVirtualTimer = () => new VirtualTimer();
