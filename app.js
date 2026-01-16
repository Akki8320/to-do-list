// State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let memos = JSON.parse(localStorage.getItem('memos')) || [];
let stats = JSON.parse(localStorage.getItem('stats')) || {
    streak: 0,
    level: 1,
    level: 1,
    xp: 0,
    lastCompletedDate: null,
    theme: 'default'
};

// Constants
const XP_PER_TASK = 20;
const XP_PER_MEMO = 50; // Bonus for learning!
const XP_TO_LEVEL_UP = 100;
const PET_STAGES = [
    { level: 1, avatar: '🥚', msg: 'A journey begins...' },
    { level: 2, avatar: '🐣', msg: 'Hello world!' },
    { level: 5, avatar: '🐢', msg: 'Slow and steady wins.' }, // Pacific/General
    { level: 8, avatar: '🎏', msg: 'Swimming upstream!' }, // Japan (Koi)
    { level: 12, avatar: '🦘', msg: 'Leaping forward!' }, // Australia
    { level: 16, avatar: '🐼', msg: 'Zen master in training.' }, // China
    { level: 20, avatar: '🦅', msg: 'Soaring high!' }, // Americas
    { level: 25, avatar: '🦁', msg: 'Leading with pride.' }, // Africa
    { level: 30, avatar: '🦊', msg: 'Nine tails of magic.' }, // Japan (Kitsune)
    { level: 35, avatar: '🐘', msg: 'Removing all obstacles.' }, // India (Ganesha)
    { level: 40, avatar: '🗿', msg: 'Standing strong eternal.' }, // Polynesia
    { level: 45, avatar: '🧞', msg: 'Your wish is granted!' }, // Arabia
    { level: 50, avatar: '🐲', msg: 'Sky and earth unite.' }, // Aztec (Quetzalcoatl)
    { level: 60, avatar: '🦄', msg: 'Pure productivity magic.' }, // Europe
    { level: 70, avatar: '🐉', msg: 'Legendary status!' }, // Asia
    { level: 80, avatar: '👽', msg: 'Productivity is universal.' }, // Cosmos
    { level: 90, avatar: '👩‍🚀', msg: 'To infinity and beyond!' }, // Future
    { level: 100, avatar: '👑', msg: 'Master of the To-Do List.' } // Ruler
];

// DOM Elements
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const streakCount = document.getElementById('streak-count');
const levelCount = document.getElementById('level-count');
const xpBar = document.getElementById('xp-bar');
const themeSelect = document.getElementById('theme-select');
const petAvatar = document.getElementById('pet-avatar');
const petMessage = document.getElementById('pet-message');
const historyBtn = document.getElementById('history-btn');
const resetBtn = document.getElementById('reset-btn');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history');
const historyList = document.getElementById('history-list');

// Memo Elements
const memoInput = document.getElementById('memo-input');
const addMemoBtn = document.getElementById('add-memo-btn');
const memoList = document.getElementById('memo-list');
const memoEmptyState = document.getElementById('memo-empty-state');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Initialization
function init() {
    applyTheme(stats.theme);
    applyTheme(stats.theme);
    renderTasks();
    renderMemos();
    updateStatsUI();
    updatePet();
    checkStreak();

    // Start clock
    updateTime();
    setInterval(updateTime, 1000);

    themeSelect.value = stats.theme;

    // Check for daily resets
    checkDailyReset();
}

function checkDailyReset() {
    const today = new Date().toDateString();

    // If we have no last visit recorded, just save today and return
    // (Or logic could be: if completedAt is NOT today, reset it)

    let hasChanges = false;
    let newTasks = [];

    tasks.forEach(task => {
        if (task.isDaily && task.completed) {
            const completedDate = new Date(task.completedAt).toDateString();
            if (completedDate !== today) {
                // Archive and Reset
                newTasks.push({ ...task, id: Date.now() + Math.random(), isDaily: false });
                newTasks.push({ ...task, completed: false, completedAt: null });
                hasChanges = true;
            } else {
                newTasks.push(task);
            }
        } else {
            newTasks.push(task);
        }
    });

    if (hasChanges) {
        tasks = newTasks;
        saveTasks();
    }
}

function updateTime() {
    const now = new Date();
    const options = { timeZone: 'Asia/Tokyo' };

    // Time
    const timeStr = now.toLocaleTimeString('en-US', {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    document.getElementById('current-time').textContent = timeStr;

    // Date
    const dateStr = now.toLocaleDateString('en-US', {
        ...options,
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('current-date').textContent = dateStr;
}

// Reset Logic
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset your Level and XP? This cannot be undone.')) {
        stats.level = 1;
        stats.xp = 0;
        // stats.streak = 0; // Optional: Decide if streak should also reset. Let's keep streak for now as user asked for "Level" reset.
        saveStats();
        updateStatsUI();
        updatePet();
    }
});

// Clear Completed Logic
clearCompletedBtn.addEventListener('click', () => {
    if (confirm('Remove all completed tasks? (Daily quests will not be removed)')) {
        // Keep active tasks OR daily tasks (even if completed)
        tasks = tasks.filter(t => !t.completed || t.isDaily);
        saveTasks();
    }
});

// History Logic
historyBtn.addEventListener('click', () => {
    renderHistory();
    historyModal.classList.add('open');
});

closeHistoryBtn.addEventListener('click', () => {
    historyModal.classList.remove('open');
});

window.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.classList.remove('open');
    }
});

function renderHistory() {
    // Show ALL completed tasks, sorted by date (newest first)
    const historyTasks = tasks.filter(t => t.completed && t.completedAt).sort((a, b) => {
        return new Date(b.completedAt) - new Date(a.completedAt);
    });

    historyList.innerHTML = '';

    if (historyTasks.length === 0) {
        historyList.innerHTML = '<p style="text-align:center; color:var(--text-secondary)">No memories yet. Start your journey! 🌟</p>';
        return;
    }

    const grouped = {};

    historyTasks.forEach(task => {
        const date = new Date(task.completedAt);
        // Format: "YYYY/MM/DD (Day)"
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
        const dateString = date.toLocaleDateString('ja-JP', options);

        if (!grouped[dateString]) grouped[dateString] = [];
        grouped[dateString].push(task);
    });

    // Iterate through keys (dates are already sorted because tasks were sorted?)
    // Actually, Object keys iteration order isn't guaranteed to match insertion order for strings perfectly in all contexts, 
    // but usually fine. To be safe, let's extract keys and sort them descending.
    // wait, we sorted tasks by time. So if we iterate tasks and build groups, the groups might be discovered in order.
    // Let's use `Object.keys()` and sort manually to be sure.

    // BUT, since we iterate `historyTasks` which is sorted, the first time we encouter a date, we create the group.
    // So `Object.keys(grouped)` might not be sorted, but if we use a Map or just a list of groups it would be.
    // Let's keep it simple: rebuild an array of group objects.

    const groups = [];
    let currentGroup = null;

    historyTasks.forEach(task => {
        const date = new Date(task.completedAt);
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
        const dateString = date.toLocaleDateString('ja-JP', options);

        if (!currentGroup || currentGroup.date !== dateString) {
            currentGroup = { date: dateString, tasks: [] };
            groups.push(currentGroup);
        }
        currentGroup.tasks.push(task);
    });


    groups.forEach(group => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'history-day';

        const h3 = document.createElement('h3');
        h3.textContent = group.date;
        h3.style.fontSize = '1.1rem'; // Make date a bit smaller/nicer
        h3.style.marginBottom = '8px';
        h3.style.color = 'var(--primary)';
        dayDiv.appendChild(h3);

        group.tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'history-item';

            // Optional: Show time too?
            const time = new Date(task.completedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

            div.innerHTML = `<span style="opacity:0.7; font-size:0.85em; margin-right:8px;">${time}</span> ✓ ${escapeHtml(task.text)}`;
            dayDiv.appendChild(div);
        });

        historyList.appendChild(dayDiv);
    });
}

// Theme Logic
function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    stats.theme = themeName;
    saveStats();
}

themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

// Pet Logic
function updatePet() {
    // Find the highest stage reached
    let currentStage = PET_STAGES[0];
    for (const stage of PET_STAGES) {
        if (stats.level >= stage.level) {
            currentStage = stage;
        }
    }
    petAvatar.textContent = currentStage.avatar;
    petMessage.textContent = currentStage.msg;
}

// Pet Interaction
petAvatar.addEventListener('click', () => {
    // Animate
    petAvatar.style.animation = 'none';
    petAvatar.offsetHeight; /* trigger reflow */
    petAvatar.style.animation = 'bounce 0.4s ease';
    setTimeout(() => {
        petAvatar.style.animation = 'float 3s ease-in-out infinite';
    }, 400);

    // Random Message
    const messages = [
        "You got this!", "Keep going!", "On fire! 🔥",
        "So productive!", "Level up soon?", "I believe in you!",
        "One more task!", "You're amazing!", "Let's do this!"
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    petMessage.textContent = randomMsg;
});

// Gamification Logic
function addXP(amount) {
    stats.xp += amount;
    if (stats.xp >= XP_TO_LEVEL_UP) {
        stats.level++;
        stats.xp -= XP_TO_LEVEL_UP;
        celebrateLevelUp();
        updatePet(); // Check for evolution
    }
    saveStats();
    updateStatsUI();
}

function checkStreak() {
    const today = new Date().toDateString();
    if (stats.lastCompletedDate !== today) {
        // If last completed was yesterday, keep streak. If older, reset (unless it's 0).
        // Simple logic: if lastCompletedDate is not yesterday and not today, reset.
        // For now, let's just trust the user keeps it up.
        // Real streak logic requires comparing dates.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (stats.lastCompletedDate && stats.lastCompletedDate !== yesterday.toDateString() && stats.lastCompletedDate !== today) {
            // Logic to reset streak if missed a day could go here
            // For a "Fun" app, maybe we are lenient? Let's not reset for now to keep it positive.
        }
    }
}

function updateStreak() {
    const today = new Date().toDateString();
    if (stats.lastCompletedDate !== today) {
        stats.streak++;
        stats.lastCompletedDate = today;
        saveStats();
        updateStatsUI();
    }
}

function saveStats() {
    localStorage.setItem('stats', JSON.stringify(stats));
}

function updateStatsUI() {
    streakCount.textContent = stats.streak;
    levelCount.textContent = stats.level;
    const progress = (stats.xp / XP_TO_LEVEL_UP) * 100;
    xpBar.style.width = `${progress}%`;
}

function celebrate() {
    playSound('success');
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#22c55e']
    });
}

function playSound(type) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
        // Nice high ping
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'levelup') {
        // Fanfare-ish
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    }
}

function celebrateLevelUp() {
    playSound('levelup');
    confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        gravity: 0.8,
        scalar: 1.2
    });
    // Could add a toast or modal here
}

// Task Management
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
}

function addTask(text) {
    if (!text.trim()) return;
    const task = {
        id: Date.now(),
        text: text,
        text: text,
        completed: false,
        isDaily: false,
        createdAt: new Date()
    };
    tasks.unshift(task);
    saveTasks();
    taskInput.value = '';
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        // If already completed, do nothing (or maybe allow undo? For now, assume one-way since they disappear)
        if (task.completed) return;

        // Visual Feedback first
        const li = document.getElementById(`task-${id}`);
        if (li) {
            li.classList.add('completed');
            const checkbox = li.querySelector('.checkbox');
            if (checkbox) checkbox.classList.add('checked'); // Ensure visual check
        }

        // Gamification
        addXP(XP_PER_TASK);
        updateStreak();
        celebrate();

        // Pet reaction
        petAvatar.style.animation = 'none';
        petAvatar.offsetHeight; /* trigger reflow */
        petAvatar.style.animation = 'pop 0.5s ease';
        setTimeout(() => {
            petAvatar.style.animation = 'float 3s ease-in-out infinite';
        }, 500);

        // Delay for animation then remove/update
        setTimeout(() => {
            if (li) {
                // If Daily, don't remove, just update visual state
                if (task.isDaily) {
                    // Update visual state to uncheck after delay

                    // Create a history record for this completion
                    const historyTask = {
                        ...task,
                        id: Date.now() + Math.random(), // Unique ID for the history item
                        completed: true,
                        completedAt: new Date().toISOString(),
                        isDaily: false // Stored as a one-time completed task
                    };
                    tasks.push(historyTask);
                    saveTasks(); // Save the new history item

                    setTimeout(() => {
                        if (li) {
                            li.classList.remove('completed');
                            const checkbox = li.querySelector('.checkbox');
                            if (checkbox) checkbox.classList.remove('checked');
                            // No need to save as completed=true, it stays active
                        }
                    }, 3000); // Wait 3 seconds then reset visual
                } else {
                    li.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    li.style.opacity = '0';
                    li.style.transform = 'translateX(20px)';

                    setTimeout(() => {
                        task.completed = true;
                        task.completedAt = new Date().toISOString();
                        saveTasks(); // This re-renders
                    }, 500);
                }
            }
        }, 600); // Wait for checkmark visual
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
}

function toggleDaily(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.isDaily = !task.isDaily;
        saveTasks();
    }
}

function renderTasks() {
    taskList.innerHTML = '';

    // Filter: Show active tasks AND daily tasks (even if completed)
    // Non-daily completed tasks are hidden (or removed effectively)
    const visibleTasks = tasks.filter(t => !t.completed || t.isDaily);

    if (visibleTasks.length === 0) {
        emptyState.classList.add('visible');
    } else {
        emptyState.classList.remove('visible');
        visibleTasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.isDaily ? 'daily' : ''} ${task.completed ? 'completed' : ''}`;
            li.id = `task-${task.id}`;

            // Drag and Drop Attributes
            li.setAttribute('draggable', 'true');
            li.setAttribute('data-index', index); // Index within visibleTasks

            // Drag Events
            li.addEventListener('dragstart', dragStart);
            li.addEventListener('dragover', dragOver);
            li.addEventListener('drop', dragDrop);
            li.addEventListener('dragenter', dragEnter);
            li.addEventListener('dragleave', dragLeave);
            li.addEventListener('dragend', dragEnd);

            li.innerHTML = `
                <div class="checkbox" onclick="toggleTask(${task.id})"></div>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <div class="actions-group">
                    <button class="loop-btn ${task.isDaily ? 'active' : ''}" onclick="toggleDaily(${task.id})" title="Toggle Daily Recurring">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                    </button>
                    <button class="edit-btn" onclick="editTask(${task.id})" title="Edit Task">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            taskList.appendChild(li);
        });
    }
}

// Drag and Drop Logic
let dragStartIndex;

function dragStart() {
    dragStartIndex = +this.closest('li').getAttribute('data-index');
    this.classList.add('dragging');
}

function dragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
}

function dragDrop() {
    const dragEndIndex = +this.getAttribute('data-index');
    reorderTasks(dragStartIndex, dragEndIndex);
    this.classList.remove('over');
}

function dragEnter() {
    this.classList.add('over');
}

function dragLeave() {
    this.classList.remove('over');
}

function dragEnd() {
    this.classList.remove('dragging');
    // Clean up any remaining 'over' classes
    const items = document.querySelectorAll('.task-item');
    items.forEach(item => item.classList.remove('over'));
}

function reorderTasks(fromIndex, toIndex) {
    // 1. Separate visible and hidden (completed non-daily) tasks
    const visibleTasks = tasks.filter(t => !t.completed || t.isDaily);
    const hiddenTasks = tasks.filter(t => t.completed && !t.isDaily);

    // 2. Move item in visibleTasks array
    const itemToMove = visibleTasks[fromIndex];
    visibleTasks.splice(fromIndex, 1);
    visibleTasks.splice(toIndex, 0, itemToMove);

    // 3. Reconstruct tasks array
    tasks = [...visibleTasks, ...hiddenTasks];

    // 4. Save and re-render
    saveTasks();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
addBtn.addEventListener('click', () => addTask(taskInput.value));

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask(taskInput.value);
});

// Expose functions to window for inline onclick handlers
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.toggleDaily = toggleDaily;
window.editTask = editTask;

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const li = document.getElementById(`task-${id}`);
    const textSpan = li.querySelector('.task-text');

    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'edit-input';

    // Replace span with input
    li.replaceChild(input, textSpan);
    input.focus();

    const save = () => {
        const newText = input.value.trim();
        if (newText) {
            task.text = newText;
            saveTasks();
        } else {
            // Revert if empty? Or delete? Let's revert.
            renderTasks();
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
}


// Memo Management
function saveMemos() {
    localStorage.setItem('memos', JSON.stringify(memos));
    renderMemos();
}

function addMemo(text) {
    if (!text.trim()) return;

    const memo = {
        id: Date.now(),
        text: text,
        createdAt: new Date().toISOString()
    };

    memos.unshift(memo);
    saveMemos();
    memoInput.value = '';

    // Gamification: Reward for learning
    // Check if this is the first memo of the day to avoid spamming XP? 
    // For now, let's just give XP every time to encourage usage.
    addXP(XP_PER_MEMO);
    celebrate();

    // Pet reaction
    petAvatar.style.animation = 'none';
    petAvatar.offsetHeight;
    petAvatar.style.animation = 'bounce 0.5s ease';
    petMessage.textContent = "Knowledge is power! 🧠";
}

function deleteMemo(id) {
    if (confirm('Forget this memory?')) {
        memos = memos.filter(m => m.id !== id);
        saveMemos();
    }
}

function renderMemos() {
    memoList.innerHTML = '';

    if (memos.length === 0) {
        memoEmptyState.classList.add('visible');
        memoEmptyState.style.display = 'block'; // Ensure it shows
    } else {
        memoEmptyState.classList.remove('visible');
        memoEmptyState.style.display = 'none';

        memos.forEach(memo => {
            const date = new Date(memo.createdAt).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const div = document.createElement('div');
            div.className = 'memo-item';
            div.innerHTML = `
                <span class="memo-date">${date}</span>
                <div class="memo-text" id="memo-text-${memo.id}">${escapeHtml(memo.text)}</div>
                <div class="memo-actions">
                    <button class="memo-edit-btn" onclick="editMemo(${memo.id})">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="memo-edit-btn" onclick="deleteMemo(${memo.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            memoList.appendChild(div);
        });
    }
}

// Tab Logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active to clicked
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(`${tabId}-section`).classList.add('active');
    });
});

// Event Listeners for Memos
addMemoBtn.addEventListener('click', () => addMemo(memoInput.value));
memoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addMemo(memoInput.value);
    }
});

// Expose functions
window.deleteMemo = deleteMemo;
window.editMemo = editMemo;

function editMemo(id) {
    const memo = memos.find(m => m.id === id);
    if (!memo) return;

    const div = document.getElementById(`memo-text-${id}`);

    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.value = memo.text;
    textarea.className = 'edit-input'; // Reuse style
    textarea.style.width = '100%';
    textarea.style.resize = 'none';
    textarea.rows = 3;

    div.parentNode.replaceChild(textarea, div);
    textarea.focus();

    const save = () => {
        const newText = textarea.value.trim();
        if (newText) {
            memo.text = newText;
            saveMemos();
        } else {
            renderMemos();
        }
    };

    textarea.addEventListener('blur', save);
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            textarea.blur();
        }
    });
}

// Start
init();
initDinoInteraction();

// Dino Interaction Logic
function initDinoInteraction() {
    const titleEl = document.getElementById('app-title');
    if (!titleEl) return;

    // Preserve the dino container
    const dinoContainer = document.getElementById('dino-container');
    const dinoHtml = dinoContainer ? dinoContainer.outerHTML : '';

    // Get text content (assuming it's just "Daily Quest" + dino div)
    // We need to be careful not to lose the dino div if it's inside.
    // Let's clear the title and rebuild it.
    const text = "Daily Quests";
    titleEl.innerHTML = '';

    // Create fragments for letters
    [...text].forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.className = 'title-letter';
        if (char === ' ') {
            span.style.width = '0.3em'; // Preserve space width
            span.innerHTML = '&nbsp;'; // Actually render a space
        }
        titleEl.appendChild(span);
    });

    // Re-append dino (it should be absolute positioned anyway)
    // But we want it to be part of the header so it moves with it?
    // The CSS has #dino-container absolute top: -25px left:0.
    // If we append it at the end, it's fine.
    // Wait, the animation `dinoWalkOnText` moves it from left 0 to 100%.
    // That 100% is relative to the #app-title width.
    if (dinoContainer) {
        // If we removed it, we need to create it again or use the saved HTML
        titleEl.innerHTML += dinoHtml;
    }

    // Start animation loop
    requestAnimationFrame(checkDinoCollision);
}

function checkDinoCollision() {
    const dino = document.getElementById('dino-img');
    const letters = document.querySelectorAll('.title-letter');

    if (!dino || letters.length === 0) {
        requestAnimationFrame(checkDinoCollision);
        return;
    }

    // Get Dino absolute position (viewport)
    const dinoRect = dino.getBoundingClientRect();
    const dinoCenter = dinoRect.left + dinoRect.width / 2;
    // Actually, feet position matters. Let's say center-bottom.

    // Optimization: Only check if dino is visible (opacity > 0)
    // The parent #dino-container handles opacity and position.
    const container = document.getElementById('dino-container');
    const style = window.getComputedStyle(container);
    if (style.opacity < 0.1) {
        // If invisible, reset all
        letters.forEach(l => l.style.transform = 'translateY(0)');
        requestAnimationFrame(checkDinoCollision);
        return;
    }

    letters.forEach(letter => {
        const rect = letter.getBoundingClientRect();
        const letterCenter = rect.left + rect.width / 2;

        // Check distance
        const distance = Math.abs(dinoCenter - letterCenter);
        const threshold = 30; // Pixel range for "stepping on"

        if (distance < threshold) {
            // Calculate dip amount based on closeness (bell curve-ish)
            // Calculate dip amount based on closeness (bell curve-ish)
            const dip = Math.max(0, 8 - (distance / threshold) * 8); // Deepen dip to 8px for visibility
            letter.style.transform = `translateY(${dip}px)`;
            letter.style.transition = 'transform 0.1s';
        } else {
            letter.style.transform = 'translateY(0)';
        }
    });

    requestAnimationFrame(checkDinoCollision);
}
