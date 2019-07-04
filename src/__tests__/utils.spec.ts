import { collect, unsafeRun } from '../utils';
import { rightTask } from 'fp-ts/lib/TaskEither';
import { now } from '@most/core';
import { newEnvironment } from '../envorinment';

describe('utils', () => {
	describe('collect', () => {
		it('should collect events', async () => {
			const e = newEnvironment((a, b) => expect(a).toEqual(b));
			await unsafeRun(rightTask(collect(now(123), e.scheduler)));
		});
	});
});
