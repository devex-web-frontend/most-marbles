import { Disposable, Scheduler, Sink, Stream, Time } from '@most/types';
import { delay } from '@most/scheduler';
import { propagateTask } from '@most/core';
import { disposeAll } from '@most/disposable';
import { Either, left, map, right } from 'fp-ts/lib/Either';
import { snoc } from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/pipeable';
import { end, failure, next, Event } from './event';

class MarblesStreamSource implements Stream<string> {
	constructor(private readonly events: Event<string>[]) {}

	run(sink: Sink<string>, scheduler: Scheduler): Disposable {
		return disposeAll(this.events.map(event => delay(event.time, propagateTask(runEvent, event, sink), scheduler)));
	}
}

const runEvent = (time: Time, event: Event<string>, sink: Sink<string>): void => {
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

export const newMarblesStreamSource = (events: Event<string>[]): MarblesStreamSource => new MarblesStreamSource(events);

const stream = /^([- a-z0-9]|\([ a-z0-9]+\))*[|#] *$/i;
const validateStream = (marbles: string): Either<Error, string[]> => {
	if (!stream.test(marbles)) {
		return left(new Error(`Invalid stream marbles: ${marbles}`));
	}
	return right(marbles.split(''));
};

const toEvents = (marbles: string[]): Event<string>[] => {
	let frame = 0;
	let isInGroup = false;
	let skippedLast = false;
	return marbles.reduce<Event<string>[]>((acc, marble, i) => {
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

		return snoc(acc, next(frame, marble));
	}, []);
};

export const parseStream = (marbles: string): Either<Error, Event<string>[]> =>
	pipe(
		validateStream(marbles),
		map(toEvents),
	);
