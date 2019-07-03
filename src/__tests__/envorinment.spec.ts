import { newEnvironment } from '../envorinment';
import { pipe } from 'fp-ts/lib/pipeable';
import { fromEither, chain } from 'fp-ts/lib/TaskEither';

describe('environment', () => {
	describe('newEnvironment', () => {
		it('should create new environment given equals assert function', async () => {
			const e = newEnvironment((a, b) => expect(a).toEqual(b));
			const source = '-a-b-c-|';
			const sink = '  ^------!';
			const result = '-a-b-c-|';
			await e.run(
				pipe(
					fromEither(e.stream(source, {})),
					chain(s => e.expect(s, sink).toBe(result)),
				),
			);
		});
	});
});
