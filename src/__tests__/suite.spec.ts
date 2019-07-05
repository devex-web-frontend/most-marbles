import { pipe } from 'fp-ts/lib/pipeable';
import { suite } from './setup';
import { now } from '@most/core';
import { taskEither } from 'fp-ts';
import { end, next } from '../event';

describe('environment', () => {
	describe('collect', () => {
		suite.it('should collect events', e =>
			pipe(
				e.collect(now(123)),
				taskEither.map(events => e.equals(events, [next(0, 123), end(0)])),
			),
		);
		suite.it('should check equality with identity marbles', e => {
			const schema = {
				source: '-a-b-c-|',
				sink: '  ^------!',
				result: '-a-b-c-|',
			};

			return pipe(
				e.fromMarbles(schema.source, {}),
				taskEither.chain(s => e.expect(s, schema.sink).toBe(schema.result, {})),
			);
		});
	});
});
