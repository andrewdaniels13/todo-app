/**
 * PATTERN: Pure Core Unit Test
 *
 * Location: tests/unit/*.test.ts
 * When: Code has NO I/O, NO external deps, NO side effects
 * Rule: If Mock Tax > 2.0x (test LOC > 2x source LOC), write integration test instead
 */
import { addTodo, resetStore } from '../../todo';

describe('addTodo (pure logic)', () => {
  beforeEach(() => resetStore());

  it('returns correct result for valid input', () => {
    const todo = addTodo('Write tests');
    expect(todo.title).toBe('Write tests');
    expect(todo.completed).toBe(false);
  });

  it('throws on empty input', () => {
    expect(() => addTodo('')).toThrow('cannot be empty');
  });
});
