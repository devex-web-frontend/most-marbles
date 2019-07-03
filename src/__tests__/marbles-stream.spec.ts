import { isLeft, right } from 'fp-ts/lib/Either';
import { parseStream } from '../marbles-stream';
import { end, failure, next } from '../event';

describe('marbles', () => {
	describe('parseStream', () => {
		it('should detect infinite streams', () => {
			expect(isLeft(parseStream('', {}))).toBeTruthy();
		});
		it('should support different types of events', () => {
			expect(parseStream('|', {})).toEqual(right([end(0)]));
			expect(parseStream('#', {})).toEqual(right([failure(0, new Error('Stream error'))]));
			expect(parseStream('a|', { a: 123 })).toEqual(right([next(0, 123), end(1)]));
			expect(parseStream('a#', { a: 123 })).toEqual(right([next(0, 123), failure(1, new Error('Stream error'))]));
		});
		it('should be able to skip frames', () => {
			expect(parseStream('1  2 3   |', {})).toEqual(right([next(0, '1'), next(1, '2'), next(2, '3'), end(3)]));
		});
		it("should be able to align with the skip ' ' operator", () => {
			expect(parseStream('1(23)|', {})).toEqual(right([next(0, '1'), next(1, '2'), next(1, '3'), end(2)]));
			expect(parseStream('12   |', {})).toEqual(right([next(0, '1'), next(1, '2'), end(2)]));
		});
		it('should support time', () => {
			expect(parseStream('-1-2-|', {})).toEqual(right([next(1, '1'), next(3, '2'), end(5)]));
		});
	});
});
