import { Either, left, map, right } from 'fp-ts/lib/Either';
import { Disposable, Scheduler, Sink, Stream, Time } from '@most/types';
import { pipe } from 'fp-ts/lib/pipeable';
import { snoc } from 'fp-ts/lib/Array';
import { disposeAll } from '@most/disposable';
import { delay } from '@most/scheduler';
import { propagateTask } from '@most/core';
import { end, Event, next } from './event';

class MarblesSinkSource implements Stream<void> {
	constructor(private readonly events: Event<void>[]) {}

	run(sink: Sink<void>, scheduler: Scheduler): Disposable {
		return disposeAll(this.events.map(event => delay(event.time, propagateTask(runEvent, event, sink), scheduler)));
	}
}

export const newMarblesSinkSource = (events: Event<void>[]) => new MarblesSinkSource(events);

const runEvent = (time: Time, event: Event<void>, sink: Sink<void>): void => {
	switch (event._tag) {
		case 'Next': {
			return sink.event(time);
		}
		case 'End': {
			return sink.end(time);
		}
	}
};

const sink = /^[- ]*\^?[- ]*!?[- ]*$/i;
const validateSink = (marbles: string): Either<Error, string[]> => {
	if (sink.test(marbles)) {
		return left(new Error(`Invalid sink marbles: ${marbles}`));
	}
	return right(marbles.split(''));
};

const toEvents = (marbles: string[]): Event<void>[] => {
	let frame = 0;
	let skippedLast = false;
	return marbles.reduce<Event<void>[]>((acc, marble, i) => {
		if (i !== 0 && !skippedLast) {
			frame++;
		}
		skippedLast = false;

		switch (marble) {
			case '-': {
				return acc;
			}
			case '^': {
				return snoc(acc, next(frame, void 0));
			}
			case '!': {
				return snoc(acc, end(frame));
			}
		}

		return acc;
	}, []);
};

export const parseSink = (marbles: string): Either<Error, Event<void>[]> =>
	pipe(
		validateSink(marbles),
		map(toEvents),
	);
