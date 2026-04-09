// todo.ts – Core todo functions and types
import { logger } from './logger';

// ─── Interface ───────────────────────────────────────────────
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// ─── In-memory store ─────────────────────────────────────────
export let todos: Todo[] = [];
export let nextId = 1;

/** Reset store — for testing only */
export function resetStore(): void {
  todos = [];
  nextId = 1;
}

// ─── Functions ───────────────────────────────────────────────

/** Add a new todo */
export function addTodo(title: string): Todo {
  if (!title || title.trim() === '') {
    throw new Error('Todo title cannot be empty.');
  }

  const duplicate = todos.find(
    (t) => t.title.toLowerCase() === title.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Todo "${title}" already exists.`);
  }

  const newTodo: Todo = {
    id: nextId++,
    title: title.trim(),
    completed: false,
    createdAt: new Date(),
  };

  todos.push(newTodo);
  logger.info(`✅ Added: "${newTodo.title}" (ID: ${newTodo.id})`);
  return newTodo;
}

/** Mark a todo as completed */
export function completeTodo(id: number): void {
  const todo = todos.find((t) => t.id === id);
  if (!todo) throw new Error(`Todo with ID ${id} not found.`);

  todo.completed = true;
  logger.info(`🎉 Completed: "${todo.title}"`);
}

/** Delete a todo by ID */
export function deleteTodo(id: number): void {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Todo with ID ${id} not found.`);

  const removed = todos.splice(index, 1)[0];
  logger.info(`🗑️  Deleted: "${removed.title}"`);
}

/** List all todos */
export function listTodos(): void {
  if (todos.length === 0) {
    logger.info('📭 No todos yet.');
    return;
  }

  logger.info('\n📋 Todo List:');
  todos.forEach((t) => {
    const status = t.completed ? '✔' : '○';
    logger.info(`  [${status}] (${t.id}) ${t.title}`);
  });
  logger.info('');
}

/** List only active (incomplete) todos */
export function listActiveTodos(): void {
  const active = todos.filter((t) => !t.completed);
  if (active.length === 0) {
    logger.info('📭 No active todos.');
    return;
  }

  logger.info('\n📋 Active Todos:');
  active.forEach((t) => {
    logger.info(`  [○] (${t.id}) ${t.title}`);
  });
  logger.info('');
}
