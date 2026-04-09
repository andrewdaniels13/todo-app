import {
  addTodo,
  completeTodo,
  deleteTodo,
  listTodos,
  listActiveTodos,
  resetStore,
  todos,
} from '../../todo';

beforeEach(() => {
  resetStore();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── addTodo ────────────────────────────────────────────────

describe('addTodo', () => {
  it('adds a todo and returns it', () => {
    const todo = addTodo('Write tests');
    expect(todo.title).toBe('Write tests');
    expect(todo.completed).toBe(false);
    expect(todo.id).toBe(1);
    expect(todos).toHaveLength(1);
  });

  it('increments IDs sequentially', () => {
    const a = addTodo('First');
    const b = addTodo('Second');
    expect(b.id).toBe(a.id + 1);
  });

  it('trims whitespace from title', () => {
    const todo = addTodo('  Trimmed  ');
    expect(todo.title).toBe('Trimmed');
  });

  it('throws on empty title', () => {
    expect(() => addTodo('')).toThrow('Todo title cannot be empty.');
  });

  it('throws on whitespace-only title', () => {
    expect(() => addTodo('   ')).toThrow('Todo title cannot be empty.');
  });

  it('throws on duplicate title (case-insensitive)', () => {
    addTodo('Buy milk');
    expect(() => addTodo('buy milk')).toThrow('already exists');
  });

  it('sets createdAt to a Date', () => {
    const todo = addTodo('Check date');
    expect(todo.createdAt).toBeInstanceOf(Date);
  });
});

// ─── completeTodo ────────────────────────────────────────────

describe('completeTodo', () => {
  it('marks a todo as completed', () => {
    const todo = addTodo('Do thing');
    completeTodo(todo.id);
    expect(todos[0].completed).toBe(true);
  });

  it('throws when ID not found', () => {
    expect(() => completeTodo(999)).toThrow('not found');
  });
});

// ─── deleteTodo ──────────────────────────────────────────────

describe('deleteTodo', () => {
  it('removes a todo from the list', () => {
    const todo = addTodo('Delete me');
    deleteTodo(todo.id);
    expect(todos).toHaveLength(0);
  });

  it('only removes the targeted todo', () => {
    addTodo('Keep me');
    const target = addTodo('Delete me');
    deleteTodo(target.id);
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Keep me');
  });

  it('throws when ID not found', () => {
    expect(() => deleteTodo(999)).toThrow('not found');
  });

  it('next ID keeps incrementing after deletion', () => {
    const a = addTodo('First');
    deleteTodo(a.id);
    const b = addTodo('Second');
    expect(b.id).toBe(2);
  });
});

// ─── listTodos ───────────────────────────────────────────────

describe('listTodos', () => {
  it('logs empty message when no todos', () => {
    listTodos();
    expect(console.log).toHaveBeenCalledWith('📭 No todos yet.');
  });

  it('logs all todos including completed', () => {
    addTodo('Active');
    const done = addTodo('Done');
    completeTodo(done.id);
    listTodos();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Active'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Done'));
  });
});

// ─── listActiveTodos ─────────────────────────────────────────

describe('listActiveTodos', () => {
  it('logs empty message when all completed', () => {
    const todo = addTodo('Done');
    completeTodo(todo.id);
    listActiveTodos();
    expect(console.log).toHaveBeenCalledWith('📭 No active todos.');
  });

  it('filters out completed todos', () => {
    addTodo('Active');
    const done = addTodo('Done');
    completeTodo(done.id);
    (console.log as jest.Mock).mockClear();
    listActiveTodos();
    const calls = (console.log as jest.Mock).mock.calls.flat().join(' ');
    expect(calls).toContain('Active');
    expect(calls).not.toContain('Done');
  });
});
