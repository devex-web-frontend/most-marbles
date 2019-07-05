import { suite } from './setup';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, now } from '@most/core';
import { taskEither } from 'fp-ts';

describe('most', () => {
	describe('sources', () => {
		suite.it('now', e => {
			return pipe(
				e.fromStream(now(123)),
				taskEither.chain(s => e.expect(s, '(^!)').toBe('(a|)', { a: 123 })),
			);
		});
	});
	describe('operators', () => {
		suite.it('map', e => {
			const schema = {
				source: '-a-b-c|',
				sink: '  ^-----!',
				result: '-a-b-c|',
			};
			return pipe(
				e.fromMarbles(schema.source, { a: 1, b: 2, c: 3 }),
				taskEither.map(map(n => n * 2)),
				taskEither.chain(s => e.expect(s, schema.sink).toBe(schema.result, { a: 2, b: 4, c: 6 })),
			);
		});
	});
});
