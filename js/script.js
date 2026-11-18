/* =========================================================
   FOCUSFLOW JAVASCRIPT | Author: Mahmudul Haq Rupom
   1. Selectors/state 2. Storage 3. Task CRUD 4. Filters
   5. Search/sort 6. Statistics 7. Theme 8. Initialization
   ========================================================= */

/* 1. Cache frequently used page elements */
const $ = (selector) => document.querySelector(selector);
const taskForm = $('#taskForm'), taskInput = $('#taskInput'), taskDate = $('#taskDate');
const taskPriority = $('#taskPriority'), taskList = $('#taskList'), emptyState = $('#emptyState');
const searchInput = $('#searchInput'), sortSelect = $('#sortSelect');
const editDialog = $('#editDialog'), editForm = $('#editForm');
const STORAGE_KEY = 'focusflow_tasks_v1', THEME_KEY = 'focusflow_theme_v1';

/* 2. Application state and safe local-storage loading */
let tasks = loadTasks();
let activeFilter = 'all';
let editingId = null;
let toastTimer;

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (error) { console.warn('Saved tasks could not be loaded.', error); return []; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function makeId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function todayString() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function readableDate(value) {
  if (!value) return 'No due date';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* 3. Small toast notification helper */
function notify(message) {
  $('#toastText').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2200);
}

/* 4. Create task — validate and save the new task */
taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  tasks.unshift({ id: makeId(), title, dueDate: taskDate.value, priority: taskPriority.value, completed: false, createdAt: Date.now() });
  saveTasks();
  taskForm.reset();
  taskPriority.value = 'medium';
  taskInput.focus();
  refresh();
  notify('Your task has been added!');
});

/* 5. Apply selected filter, search text and sorting order */
function getVisibleTasks() {
  let result = [...tasks];
  if (activeFilter === 'today') result = result.filter(task => task.dueDate === todayString());
  if (activeFilter === 'pending') result = result.filter(task => !task.completed);
  if (activeFilter === 'completed') result = result.filter(task => task.completed);

  const term = searchInput.value.trim().toLowerCase();
  if (term) result = result.filter(task => task.title.toLowerCase().includes(term));

  const priorityOrder = { high: 1, medium: 2, low: 3 };
  if (sortSelect.value === 'oldest') result.sort((a, b) => a.createdAt - b.createdAt);
  else if (sortSelect.value === 'priority') result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  else if (sortSelect.value === 'date') result.sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'));
  else result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}

/* 6. Build a task card using DOM APIs (safe for user-entered text) */
function buildTaskCard(task) {
  const card = document.createElement('article');
  card.className = `task-card${task.completed ? ' completed' : ''}`;

  const check = document.createElement('button');
  check.className = 'check';
  check.type = 'button';
  check.setAttribute('aria-label', task.completed ? 'Mark as pending' : 'Mark as completed');
  check.innerHTML = task.completed ? '<i class="fa-solid fa-check"></i>' : '';
  check.addEventListener('click', () => toggleTask(task.id));

  const info = document.createElement('div');
  info.className = 'task-info';
  const name = document.createElement('span');
  name.className = 'task-name';
  name.textContent = task.title;
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const priority = document.createElement('span');
  priority.className = `priority ${task.priority}`;
  priority.textContent = `${task.priority} priority`;
  const due = document.createElement('span');
  due.innerHTML = '<i class="fa-regular fa-calendar"></i> ';
  due.append(document.createTextNode(readableDate(task.dueDate)));
  meta.append(priority, due);
  info.append(name, meta);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const edit = document.createElement('button');
  edit.className = 'action'; edit.type = 'button'; edit.title = 'Edit task';
  edit.setAttribute('aria-label', 'Edit task');
  edit.innerHTML = '<i class="fa-solid fa-pen"></i>';
  edit.addEventListener('click', () => openEditor(task.id));
  const remove = document.createElement('button');
  remove.className = 'action delete'; remove.type = 'button'; remove.title = 'Delete task';
  remove.setAttribute('aria-label', 'Delete task');
  remove.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
  remove.addEventListener('click', () => deleteTask(task.id));
  actions.append(edit, remove);
  card.append(check, info, actions);
  return card;
}

/* 7. Render current list and the empty state */
function renderTasks() {
  const visible = getVisibleTasks();
  taskList.replaceChildren();
  visible.forEach(task => taskList.append(buildTaskCard(task)));
  emptyState.classList.toggle('hidden', visible.length !== 0);
  $('#visibleCount').textContent = visible.length;
}

/* 8. Complete or reopen a task */
function toggleTask(id) {
  tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks(); refresh(); notify('Task status updated');
}

/* 9. Delete a task after user confirmation */
function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  tasks = tasks.filter(task => task.id !== id);
  saveTasks(); refresh(); notify('Task deleted');
}

/* 10. Edit existing task in the native dialog */
function openEditor(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  editingId = id;
  $('#editTitle').value = task.title;
  $('#editDate').value = task.dueDate || '';
  $('#editPriority').value = task.priority;
  editDialog.showModal();
  $('#editTitle').focus();
}
function closeEditor() { editDialog.close(); editingId = null; }
$('#closeDialog').addEventListener('click', closeEditor);
$('#cancelEdit').addEventListener('click', closeEditor);
editForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = $('#editTitle').value.trim();
  if (!editingId || !title) return;
  tasks = tasks.map(task => task.id === editingId ? {
    ...task, title, dueDate: $('#editDate').value, priority: $('#editPriority').value
  } : task);
  saveTasks(); closeEditor(); refresh(); notify('Changes saved successfully');
});

/* 11. Sidebar navigation controls */
document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const labels = { all: 'All tasks', today: 'Today', pending: 'Pending', completed: 'Completed' };
    $('#crumbLabel').textContent = labels[activeFilter];
    $('#listHeading').childNodes[0].textContent = activeFilter === 'all' ? 'Your tasks ' : `${labels[activeFilter]} `;
    renderTasks();
  });
});

/* 12. Search and sort events */
searchInput.addEventListener('input', renderTasks);
sortSelect.addEventListener('change', renderTasks);

/* 13. Update navigation counters and completion progress */
function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const today = tasks.filter(task => task.dueDate === todayString()).length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  $('#countAll').textContent = total;
  $('#countToday').textContent = today;
  $('#countPending').textContent = pending;
  $('#countCompleted').textContent = completed;
  $('#progressPercent').textContent = `${percent}%`;
  $('#progressBar').style.width = `${percent}%`;
  $('#doneText').textContent = `${completed} ${completed === 1 ? 'task' : 'tasks'} completed`;
  $('#totalText').textContent = ` out of ${total}`;
}

/* 14. Light/dark theme, remembered in localStorage */
function setTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  $('#themeToggle').innerHTML = theme === 'dark' ? '<i class="fa-regular fa-sun"></i>' : '<i class="fa-regular fa-moon"></i>';
}
$('#themeToggle').addEventListener('click', () => {
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  setTheme(next);
});

/* 15. Render the whole interface after any data change */
function refresh() { renderTasks(); renderStats(); }

/* 16. Initialize date labels, theme and saved tasks */
function initialize() {
  $('#todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  $('#year').textContent = new Date().getFullYear();
  taskDate.min = todayString();
  setTheme(localStorage.getItem(THEME_KEY) || 'light');
  refresh();
}
initialize();
