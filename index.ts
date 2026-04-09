// index.ts – Todo App (TypeScript Demo Project)
import { addTodo, completeTodo, deleteTodo, listTodos } from './todo';

// ─── Demo Run ────────────────────────────────────────────────
addTodo('Set up TypeScript project');
addTodo('Build addTodo function');
addTodo('Build completeTodo function');
addTodo('Write unit tests');

listTodos();

completeTodo(1);
completeTodo(2);

listTodos();

deleteTodo(3);

listTodos();
