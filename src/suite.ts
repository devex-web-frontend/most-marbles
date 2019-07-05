import { Scheduler, Sink, Stream } from '@most/types';
import { TaskEither, rightTask } from 'fp-ts/lib/TaskEither';
import { Task } from 'fp-ts/lib/Task';
import { end, Event, failure, next } from './event';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { newVirtualTimer } from './virtual-timer';
import { newScheduler, newTimeline } from '@most/scheduler';
import { sequenceT } from 'fp-ts/lib/Apply';
import { fromMarbles } from './marbles-stream';
import { taskEither } from 'fp-ts';

interface It {
	(name: string, cb: () => Promise<unknown>): void;
}

interface Equals {
	(a: unknown, b: unknown): void;
}

class Suite {
	constructor(private readonly equals: Equals, private readonly _it: It) {}

	it(name: string, cb: (e: Environment) => TaskEither<Error, void>): void {
		this._it(name, () => {
			const timer = newVirtualTimer();
			const timeline = newTimeline();
			const scheduler = newScheduler(timer, timeline);
			timer.tick(Infinity);
			return unsafeRun(cb(new Environment(this.equals, scheduler)));
		});
	}
}

export const newSuite = (equals: Equals, it: It): Suite => new Suite(equals, it);

const sequenceTTaskEither = sequenceT(taskEither.taskEither);

class Matchers<A> {
	constructor(
		private readonly stream: Stream<A>,
		private readonly sinkMarbles: string,
		private readonly equals: Equals,
		private readonly scheduler: Scheduler,
	) {}

	toBe(expectedMarbles: string, expectedValues: Record<string, A>): TaskEither<Error, void> {
		const expected = pipe(
			taskEither.fromEither(fromMarbles(expectedMarbles, expectedValues)),
			taskEither.chain(s => rightTask(collect(s, this.scheduler))),
		);
		const result = rightTask(collect(this.stream, this.scheduler));
		return pipe(
			sequenceTTaskEither(expected, result),
			taskEither.map(([a, b]) => {
				this.equals(a, b);
			}),
		);
	}
}

class CollectSink<A> implements Sink<A> {
	private readonly out: Event<A>[] = [];
	constructor(private readonly done: (out: Event<A>[]) => void) {}

	end(time: number): void {
		this.out.push(end(time));
		this.done(this.out);
	}

	error(time: number, err: Error): void {
		this.out.push(failure(time, err));
		this.done(this.out);
	}

	event(time: number, value: A): void {
		this.out.push(next(time, value));
	}
}

class Environment {
	constructor(readonly equals: Equals, private readonly scheduler: Scheduler) {}

	expect<A>(stream: Stream<A>, sinkMarbles: string): Matchers<A> {
		return new Matchers(stream, sinkMarbles, this.equals, this.scheduler);
	}

	collect<A>(stream: Stream<A>): TaskEither<Error, Event<A>[]> {
		return rightTask(collect(stream, this.scheduler));
	}

	fromMarbles<A>(marbles: string, values: Record<string, A>): TaskEither<Error, Stream<A>> {
		return taskEither.fromEither(fromMarbles(marbles, values));
	}

	fromStream<A>(stream: Stream<A>): TaskEither<Error, Stream<A>> {
		return taskEither.taskEither.of(stream);
	}
}

const collect = <A>(stream: Stream<A>, scheduler: Scheduler): Task<Event<A>[]> => () =>
	new Promise(resolve => stream.run(new CollectSink(resolve), scheduler));

const unsafeRun = async <E, A>(fa: TaskEither<E, A>): Promise<A> =>
	pipe(
		await fa(),
		fold(rethrow, identity),
	);

const rethrow = <E>(e: E) => {
	throw e;
};
