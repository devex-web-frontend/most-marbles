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

const stream = /^([- a-z0-9]|\([ a-z0-9]+\))*[|#] *$/i;
const validateStream = (marbles: string): Either<Error, string[]> => {
	if (!stream.test(marbles)) {
		return left(new Error(`Invalid stream marbles: ${marbles}`));
	}
	return right(marbles.split(''));
};

const toEvents = <A>(values: Record<string, A>) => (marbles: string[]): Event<A | string>[] => {
	let frame = 0;
	let isInGroup = false;
	let skippedLast = false;
	return marbles.reduce<Event<A | string>[]>((acc, marble, i) => {
		if (i !== 0 && !isInGroup && !skippedLast) {
			frame++;
		}
		skippedLast = false;

		switch (marble) {
			case '-': {
				return acc;
			}
			case '#': {
				return snoc(acc, failure(frame, new Error('Stream error')));
			}
			case '|': {
				return snoc(acc, end(frame));
			}
			case '(': {
				isInGroup = true;
				return acc;
			}
			case ')': {
				isInGroup = false;
				return acc;
			}
			case ' ': {
				skippedLast = true;
				return acc;
			}
		}

		return snoc(
			acc,
			next(
				frame,
				pipe(
					lookup(marble, values),
					getOrElse<A | string>(() => marble),
				),
			),
		);
	}, []);
};

export const parseStream = <A>(marbles: string, values: Record<string, A>): Either<Error, Event<A | string>[]> =>
	pipe(
		validateStream(marbles),
		map(toEvents(values)),
	);

export const fromMarbles = <A>(marbles: string, values: Record<string, A>): Either<Error, Stream<A>> =>
	pipe(
		parseStream(marbles, values),
		map(newMarblesStreamSource),
	);
