// index.ts – Todo App (TypeScript Demo Project)

// ─── Interface ───────────────────────────────────────────────
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// ─── In-memory store ─────────────────────────────────────────
let todos: Todo[] = [];
let nextId = 1;

// ─── Functions ───────────────────────────────────────────────

/** Add a new todo */
function addTodo(title: string): Todo {
  if (!title || title.trim() === "") {
    throw new Error("Todo title cannot be empty.");
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
  console.log(`✅ Added: "${newTodo.title}" (ID: ${newTodo.id})`);
  return newTodo;
}

/** Mark a todo as completed */
function completeTodo(id: number): void {
  const todo = todos.find((t) => t.id === id);
  if (!todo) throw new Error(`Todo with ID ${id} not found.`);

  todo.completed = true;
  console.log(`🎉 Completed: "${todo.title}"`);
}

/** Delete a todo by ID */
function deleteTodo(id: number): void {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Todo with ID ${id} not found.`);

  const removed = todos.splice(index, 1)[0];
  console.log(`🗑️  Deleted: "${removed.title}"`);
}

/** List all todos */
function listTodos(): void {
  if (todos.length === 0) {
    console.log("📭 No todos yet.");
    return;
  }

  console.log("\n📋 Todo List:");
  todos.forEach((t) => {
    const status = t.completed ? "✔" : "○";
    console.log(`  [${status}] (${t.id}) ${t.title}`);
  });
  console.log("");
}

// ─── Demo Run ────────────────────────────────────────────────
addTodo("Set up TypeScript project");
addTodo("Build addTodo function");
addTodo("Build completeTodo function");
addTodo("Write unit tests");

listTodos();

completeTodo(1);
completeTodo(2);

listTodos();

deleteTodo(3);

listTodos();
