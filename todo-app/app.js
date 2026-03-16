const STORAGE_KEY = 'FOCUSFLOW_TODOS';

const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');
const emptyState = document.querySelector('#empty-state');
const clearDoneButton = document.querySelector('#clear-done');
const filterButtons = document.querySelectorAll('[data-filter]');
const template = document.querySelector('#todo-item-template');

let todos = loadTodos();
let currentFilter = 'all';

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  todos.unshift({
    id: crypto.randomUUID(),
    text,
    done: false,
  });

  input.value = '';
  saveTodos();
  render();
});

clearDoneButton.addEventListener('click', () => {
  todos = todos.filter((todo) => !todo.done);
  saveTodos();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((candidate) => {
      candidate.classList.toggle('is-active', candidate === button);
    });

    render();
  });
});

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function getFilteredTodos() {
  if (currentFilter === 'open') return todos.filter((todo) => !todo.done);
  if (currentFilter === 'done') return todos.filter((todo) => todo.done);
  return todos;
}

function render() {
  const visibleTodos = getFilteredTodos();

  list.innerHTML = '';

  visibleTodos.forEach((todo) => {
    const item = template.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector('.todo-item__toggle');
    const textNode = item.querySelector('.todo-item__text');
    const deleteButton = item.querySelector('.todo-item__delete');

    checkbox.checked = todo.done;
    textNode.textContent = todo.text;
    textNode.classList.toggle('is-done', todo.done);

    checkbox.addEventListener('change', () => {
      todo.done = checkbox.checked;
      saveTodos();
      render();
    });

    deleteButton.addEventListener('click', () => {
      todos = todos.filter((entry) => entry.id !== todo.id);
      saveTodos();
      render();
    });

    list.append(item);
  });

  emptyState.hidden = visibleTodos.length > 0;
}

render();
