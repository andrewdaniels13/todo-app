/**
 * Integration tests — full todo workflow
 *
 * Tests the module as an integrated whole: add → complete → delete → list.
 * Verifies state transitions and output across function boundaries.
 */
import { addTodo, completeTodo, deleteTodo, listTodos, listActiveTodos, resetStore, todos } from '../../todo';
import { mockConsole, restoreConsole, ConsoleCaptured } from '../mocks/console';

let captured: ConsoleCaptured;

beforeEach(() => {
  resetStore();
  captured = mockConsole();
});

afterEach(() => {
  restoreConsole();
});

describe('Full workflow: add → complete → delete', () => {
  it('executes a complete todo lifecycle', () => {
    const t1 = addTodo('Plan sprint');
    const t2 = addTodo('Write code');
    const t3 = addTodo('Review PR');

    expect(todos).toHaveLength(3);

    completeTodo(t1.id);
    completeTodo(t2.id);

    expect(todos.filter((t) => t.completed)).toHaveLength(2);
    expect(todos.filter((t) => !t.completed)).toHaveLength(1);

    deleteTodo(t3.id);

    expect(todos).toHaveLength(2);
    expect(todos.every((t) => t.completed)).toBe(true);
  });

  it('listTodos reflects all state changes across calls', () => {
    addTodo('Alpha');
    addTodo('Beta');
    completeTodo(1);

    listTodos();

    const output = captured.log.join('\n');
    expect(output).toContain('Alpha');
    expect(output).toContain('Beta');
    expect(output).toContain('✔');
    expect(output).toContain('○');
  });

  it('listActiveTodos excludes completed items after bulk completions', () => {
    addTodo('Task A');
    addTodo('Task B');
    addTodo('Task C');
    completeTodo(1);
    completeTodo(2);

    captured.log.length = 0; // clear setup noise
    listActiveTodos();

    const output = captured.log.join('\n');
    expect(output).toContain('Task C');
    expect(output).not.toContain('Task A');
    expect(output).not.toContain('Task B');
  });

  it('IDs remain stable after interleaved adds and deletes', () => {
    const a = addTodo('First');
    const b = addTodo('Second');
    deleteTodo(a.id);
    const c = addTodo('Third');

    expect(b.id).toBe(2);
    expect(c.id).toBe(3);
    expect(todos.map((t) => t.id)).toEqual([2, 3]);
  });

  it('rejects duplicate adds even after partial deletes', () => {
    addTodo('Unique');
    const t2 = addTodo('Other');
    deleteTodo(t2.id);
    expect(() => addTodo('Unique')).toThrow('already exists');
  });
});
