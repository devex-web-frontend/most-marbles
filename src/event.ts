import { Time } from '@most/types';

export interface Next<A> {
	readonly _tag: 'Next';
	readonly time: Time;
	readonly value: A;
}

export const next = <E = never, A = never>(time: Time, value: A): Event<A> => ({
	_tag: 'Next',
	value,
	time,
});

export interface End {
	readonly _tag: 'End';
	readonly time: Time;
}

export const end = <E = never, A = never>(time: Time): Event<A> => ({
	_tag: 'End',
	time,
});

export interface Failure {
	readonly _tag: 'Failure';
	readonly time: Time;
	readonly error: Error;
}

export const failure = <A = never>(time: Time, error: Error): Event<A> => ({
	_tag: 'Failure',
	time,
	error,
});

export type Event<A> = Next<A> | End | Failure;
