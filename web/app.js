const form = document.querySelector("#task-form");
const input = document.querySelector("#task-title");
const list = document.querySelector("#task-list");
const count = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");
const message = document.querySelector("#message");
const filters = [...document.querySelectorAll(".filter")];

let tasks = [];
let currentFilter = "all";

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

function showMessage(text = "") {
  message.textContent = text;
}

function render() {
  list.replaceChildren();
  const visibleTasks = tasks.filter((task) => {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  for (const task of visibleTasks) {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "check-button";
    toggle.setAttribute("aria-label", task.completed ? `Mark ${task.title} as to do` : `Complete ${task.title}`);
    toggle.setAttribute("aria-pressed", String(task.completed));
    const check = document.createElement("span");
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    toggle.append(check);
    toggle.addEventListener("click", () => updateTask(task.id, !task.completed));

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.setAttribute("aria-label", `Delete ${task.title}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => deleteTask(task.id));

    item.append(toggle, title, remove);
    list.append(item);
  }

  count.textContent = String(tasks.filter((task) => !task.completed).length);
  emptyState.hidden = visibleTasks.length > 0;
}

async function loadTasks() {
  try {
    tasks = await request("/api/tasks");
    showMessage();
    render();
  } catch (error) {
    showMessage(`${error.message}. Make sure the Compose services are running.`);
  }
}

async function updateTask(id, completed) {
  try {
    const updated = await request(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    tasks = tasks.map((task) => (task.id === updated.id ? updated : task));
    showMessage();
    render();
  } catch (error) {
    showMessage(error.message);
  }
}

async function deleteTask(id) {
  try {
    await request(`/api/tasks/${id}`, { method: "DELETE" });
    tasks = tasks.filter((task) => task.id !== id);
    showMessage();
    render();
  } catch (error) {
    showMessage(error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) {
    showMessage("Enter a task before adding it.");
    input.focus();
    return;
  }

  try {
    const task = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    tasks.unshift(task);
    input.value = "";
    currentFilter = "all";
    for (const filter of filters) {
      const active = filter.dataset.filter === currentFilter;
      filter.classList.toggle("active", active);
      filter.setAttribute("aria-pressed", String(active));
    }
    showMessage();
    render();
    input.focus();
  } catch (error) {
    showMessage(error.message);
  }
});

for (const filter of filters) {
  filter.addEventListener("click", () => {
    currentFilter = filter.dataset.filter;
    for (const button of filters) {
      const active = button === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    render();
  });
}

loadTasks();
