import { newEnvironment } from '../envorinment';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TE from 'fp-ts/lib/TaskEither';
import { unsafeRun } from '../utils';
import { fromMarbles } from '../marbles-stream';

describe('environment', () => {
	describe('newEnvironment', () => {
		it('should create new environment given equals assert function', async () => {
			const e = newEnvironment((a, b) => expect(a).toEqual(b));
			const source = '-a-b-c-|';
			const sink = '  ^------!';
			const result = '-a-b-c-|';
			await unsafeRun(
				pipe(
					TE.fromEither(fromMarbles(source, {})),
					TE.chain(s => e.expect(s, sink).toBe(result, {})),
				),
			);
		});
	});
});
