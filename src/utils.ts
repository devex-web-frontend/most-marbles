import { Sink } from '@most/types';
import { end, failure, Event, next } from './event';

class CollectSink<A> implements Sink<A> {
	constructor(private readonly out: Event<A>[]) {}

	end(time: number): void {
		this.out.push(end(time));
	}

	error(time: number, err: Error): void {
		this.out.push(failure(time, err));
	}

	event(time: number, value: A): void {
		this.out.push(next(time, value));
	}
}

export const newCollectSink = <A = never>(out: Event<A>[]): CollectSink<A> => new CollectSink<A>(out);
