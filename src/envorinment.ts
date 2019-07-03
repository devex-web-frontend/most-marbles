import { Stream } from '@most/types';
import { newVirtualTimer } from './virtual-timer';
import { newScheduler, newTimeline } from '@most/scheduler';
import { either, Either, fold, map } from 'fp-ts/lib/Either';
import { newMarblesStreamSource, parseStream } from './marbles-stream';
import { pipe } from 'fp-ts/lib/pipeable';
import { newMarblesSinkSource, parseSink } from './marbles-sink';
import { sequenceT } from 'fp-ts/lib/Apply';
import { now } from '@most/core';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { identity } from 'fp-ts/lib/function';

const seqeunceTEither = sequenceT(either);

class Matchers<A, R> {
	constructor(
		private readonly stream: Stream<A>,
		private readonly sinkMarbles: string,
		private readonly equals: (a: A, b: A) => R,
	) {}

	toBeSubscribed(expectedStreamMarbles: string): Promise<void> {
		const sinkEvents = parseSink(this.sinkMarbles);
		const expectedStreamEvents = parseStream(expectedStreamMarbles, {});
		return new Promise((resolve, reject) =>
			pipe(
				seqeunceTEither(sinkEvents, expectedStreamEvents),
				fold(reject, ([sinkEvents, expectedEvents]) => {
					newMarblesSinkSource(sinkEvents);
				}),
			),
		);
	}

	toBe(expectedMarbles: string): TaskEither<Error, R> {
		return null as any;
	}
}

class Envorinment<R> {
	private readonly timer = newVirtualTimer();
	private readonly timeline = newTimeline();
	private readonly scheduler = newScheduler(this.timer, this.timeline);

	constructor(private readonly equals: (a: unknown, b: unknown) => R) {}

	stream<A>(marbles: string, values: Record<string, A>): Either<Error, Stream<A>> {
		return pipe(
			parseStream(marbles, {}),
			map(newMarblesStreamSource),
		);
	}

	expect<A>(stream: Stream<A>, sinkMarbles: string): Matchers<A, R> {
		return new Matchers(stream, sinkMarbles, this.equals);
	}

	async run(task: TaskEither<Error, R>): Promise<R> {
		return pipe(
			await task(),
			fold(rethrow, identity),
		);
	}
}

const rethrow = (e: Error) => {
	throw e;
};

const eq = <A>(a: A, b: A) => expect(a).toEqual(b);

export const newEnvironment = <R>(equals: <A>(a: A, b: A) => R) => new Envorinment(equals);

const e = newEnvironment(eq);
e.expect(now(123), '123').toBe('1');
