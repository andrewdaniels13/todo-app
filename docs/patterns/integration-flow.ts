/**
 * PATTERN: Integration Flow Test
 *
 * Location: tests/integration/*.test.ts
 * When: Testing multi-step workflows across function boundaries
 * Rules:
 *   1. Uses shared mocks from tests/mocks/ — no inline spies
 *   2. Tests state transitions across multiple function calls
 *   3. Verifies observable output (console, return values, store state)
 */
import { addTodo, completeTodo, deleteTodo, resetStore, todos } from '../../todo';
import { mockConsole, restoreConsole } from '../mocks/console';

beforeEach(() => { resetStore(); mockConsole(); });
afterEach(() => restoreConsole());

describe('Todo lifecycle integration', () => {
  it('add → complete → delete leaves consistent state', () => {
    const t = addTodo('Deploy app');
    completeTodo(t.id);
    deleteTodo(t.id);
    expect(todos).toHaveLength(0);
  });
});
