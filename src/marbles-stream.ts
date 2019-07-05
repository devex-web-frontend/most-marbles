import { Disposable, Scheduler, Sink, Stream, Time } from '@most/types';
import { delay } from '@most/scheduler';
import { propagateTask } from '@most/core';
import { disposeAll } from '@most/disposable';
import { Either, left, map, right } from 'fp-ts/lib/Either';
import { snoc } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/pipeable';
import { end, failure, next, Event } from './event';
import { lookup } from 'fp-ts/lib/Record';
import { getOrElse } from 'fp-ts/lib/Option';

class MarblesStreamSource<A> implements Stream<A> {
	constructor(private readonly events: Event<A>[]) {}

	run(sink: Sink<A>, scheduler: Scheduler): Disposable {
		return disposeAll(this.events.map(event => delay(event.time, propagateTask(runEvent, event, sink), scheduler)));
	}
}

const runEvent = <A>(time: Time, event: Event<A>, sink: Sink<A>): void => {
	switch (event._tag) {
		case 'End': {
			return sink.end(time);
		}
		case 'Failure': {
			return sink.error(time, new Error('Stream error'));
		}
		case 'Next': {
			return sink.event(time, event.value);
		}
	}
};

export const newMarblesStreamSource = <A>(events: Event<A>[]): MarblesStreamSource<A> =>
	new MarblesStreamSource(events);

export const parseStream = <A>(marbles: string, values: Record<string, A>): Either<Error, Event<A | string>[]> => {
	let frame = 0;
	let isInGroup = false;
	const result: Event<A | string>[] = [];
	for (const marble of marbles) {
		switch (marble) {
			case ' ': {
				break;
			}
			case '(': {
				isInGroup = true;
				break;
			}
			case ')': {
				isInGroup = false;
				frame++;
				break;
			}
			case '#': {
				result.push(failure(frame, new Error('Stream error')));
				return right(result);
			}
			case '|': {
				result.push(end(frame));
				return right(result);
			}
			case '-': {
				if (isInGroup) {
					return left(new Error('Time frames are not supported in a group'));
				}
				frame++;
				break;
			}
			default: {
				result.push(
					next(
						frame,
						pipe(
							lookup(marble, values),
							getOrElse<A | string>(() => marble),
						),
					),
				);
				if (!isInGroup) {
					frame++;
				}
				break;
			}
		}
	}
	if (!result.some(event => event._tag === 'End')) {
		return left(new Error('Infinite streams are not supported'));
	}
	return right(result);
};

export const fromMarbles = <A>(marbles: string, values: Record<string, A>): Either<Error, Stream<A>> =>
	pipe(
		parseStream(marbles, values),
		map(newMarblesStreamSource),
	);
