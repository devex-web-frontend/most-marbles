import { Scheduler, Sink, Stream } from '@most/types';
import { end, failure, Event, next } from './event';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { Task } from 'fp-ts/lib/Task';

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

export const collect = <A>(stream: Stream<A>, scheduler: Scheduler): Task<Event<A>[]> => () =>
	new Promise(resolve => stream.run(new CollectSink(resolve), scheduler));

export const unsafeRun = async <E, A>(fa: TaskEither<E, A>): Promise<A> =>
	pipe(
		await fa(),
		fold(rethrow, identity),
	);

const rethrow = <E>(e: E) => {
	throw e;
};
