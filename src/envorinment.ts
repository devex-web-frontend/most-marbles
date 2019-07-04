import { Scheduler, Stream } from '@most/types';
import { newVirtualTimer } from './virtual-timer';
import { newScheduler, newTimeline } from '@most/scheduler';
import { fromMarbles } from './marbles-stream';
import { pipe } from 'fp-ts/lib/pipeable';
import { sequenceT } from 'fp-ts/lib/Apply';
import { rightTask, TaskEither } from 'fp-ts/lib/TaskEither';
import * as TE from 'fp-ts/lib/TaskEither';
import { collect } from './utils';
import { Event } from './event';

const sequenceTTaskEither = sequenceT(TE.taskEither);

class Matchers<A, R> {
	constructor(
		private readonly stream: Stream<A>,
		private readonly sinkMarbles: string,
		private readonly equals: (a: Event<A>[], b: Event<A>[]) => R,
		private readonly scheduler: Scheduler,
	) {}

	toBe(expectedMarbles: string, expectedValues: Record<string, A>): TaskEither<Error, R> {
		const expected = pipe(
			TE.fromEither(fromMarbles(expectedMarbles, expectedValues)),
			TE.chain(s => rightTask(collect(s, this.scheduler))),
		);
		const result = rightTask(collect(this.stream, this.scheduler));
		return pipe(
			sequenceTTaskEither(expected, result),
			TE.map(([a, b]) => this.equals(a, b)),
		);
	}
}

class Environment<R> {
	private readonly timer = newVirtualTimer();
	private readonly timeline = newTimeline();
	public readonly scheduler = newScheduler(this.timer, this.timeline);

	constructor(private readonly equals: (a: unknown, b: unknown) => R) {}

	expect<A>(stream: Stream<A>, sinkMarbles: string): Matchers<A, R> {
		return new Matchers(stream, sinkMarbles, this.equals, this.scheduler);
	}
}

export const newEnvironment = <R>(equals: <A>(a: A, b: A) => R) => new Environment(equals);
