import { newSuite } from '../suite';

export const suite = newSuite((a, b) => expect(a).toEqual(b), it);
