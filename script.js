// ==================== DATA MANAGEMENT ====================
class HabitFlowApp {
    constructor() {
        this.data = this.loadData();
        this.currentQuickAddType = 'task';
        this.pomodoroTimer = null;
        this.pomodoroSeconds = 0;
        this.isTimerRunning = false;
        this.todaySessions = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateAllDashboard();
        this.loadDates();
        this.setGreeting();
    }

    // ==================== DATA PERSISTENCE ====================
    loadData() {
        const stored = localStorage.getItem('habitflowData');
        return stored ? JSON.parse(stored) : {
            tasks: [],
            habits: [],
            goals: [],
            completedToday: [],
            lastActiveDate: new Date().toDateString()
        };
    }

    saveData() {
        localStorage.setItem('habitflowData', JSON.stringify(this.data));
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', e => this.switchTab(e.target.dataset.tab));
        });

        // Dark Mode
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());

        // Tasks
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', e => e.key === 'Enter' && this.addTask());

        // Habits
        document.getElementById('addHabitBtn').addEventListener('click', () => this.addHabit());
        document.getElementById('habitInput').addEventListener('keypress', e => e.key === 'Enter' && this.addHabit());

        // Goals
        document.getElementById('addGoalBtn').addEventListener('click', () => this.addGoal());
        document.getElementById('goalInput').addEventListener('keypress', e => e.key === 'Enter' && this.addGoal());

        // Quick Add
        document.querySelectorAll('.quick-tab-btn').forEach(btn => {
            btn.addEventListener('click', e => this.switchQuickAddType(e.target.dataset.type));
        });
        document.getElementById('quickAddBtn').addEventListener('click', () => this.quickAdd());
        document.getElementById('quickAddInput').addEventListener('keypress', e => e.key === 'Enter' && this.quickAdd());

        // Task Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', e => this.filterTasks(e.target.dataset.filter));
        });

        // Pomodoro
        document.getElementById('startTimerBtn').addEventListener('click', () => this.startPomodoro());
        document.getElementById('pauseTimerBtn').addEventListener('click', () => this.pausePomodoro());
        document.getElementById('resetTimerBtn').addEventListener('click', () => this.resetPomodoro());

        // Menu
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleMenu());
    }

    // ==================== TASK MANAGEMENT ====================
    addTask() {
        const input = document.getElementById('taskInput');
        const dateInput = document.getElementById('taskDate');
        const priority = document.getElementById('taskPriority').value;

        if (!input.value.trim()) return;

        const task = {
            id: Date.now(),
            text: input.value,
            date: dateInput.value || new Date().toISOString().split('T')[0],
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.data.tasks.push(task);
        this.saveData();
        input.value = '';
        dateInput.value = '';
        this.renderTasks('all');
        this.updateAllDashboard();
    }

    deleteTask(id) {
        this.data.tasks = this.data.tasks.filter(t => t.id !== id);
        this.saveData();
        this.renderTasks('all');
        this.updateAllDashboard();
    }

    toggleTask(id) {
        const task = this.data.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            const dateStr = task.date + task.id;
            if (task.completed) {
                if (!this.data.completedToday.includes(dateStr)) {
                    this.data.completedToday.push(dateStr);
                }
            } else {
                this.data.completedToday = this.data.completedToday.filter(d => d !== dateStr);
            }
            this.saveData();
            this.renderTasks('all');
            this.updateAllDashboard();
        }
    }

    renderTasks(filter = 'all') {
        let tasks = this.data.tasks;
        const today = new Date().toISOString().split('T')[0];

        switch(filter) {
            case 'today':
                tasks = tasks.filter(t => t.date === today);
                break;
            case 'completed':
                tasks = tasks.filter(t => t.completed);
                break;
            case 'pending':
                tasks = tasks.filter(t => !t.completed);
                break;
        }

        const container = document.getElementById('tasksContainer');
        if (tasks.length === 0) {
            container.innerHTML = '<p class="empty-state">No tasks found.</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="app.toggleTask(${task.id})">
                <div class="task-content">
                    <div class="task-text">${task.text}</div>
                    <div class="task-meta">
                        <span class="task-priority priority-${task.priority}">${task.priority}</span>
                        ${task.date ? `📅 ${task.date}` : 'Today'}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-small btn-delete" onclick="app.deleteTask(${task.id})">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    filterTasks(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        this.renderTasks(filter);
    }

    // ==================== HABIT MANAGEMENT ====================
    addHabit() {
        const input = document.getElementById('habitInput');
        const frequency = document.getElementById('habitFrequency').value;

        if (!input.value.trim()) return;

        const habit = {
            id: Date.now(),
            name: input.value,
            frequency: frequency,
            streak: 0,
            lastCompleted: null,
            completedDates: [],
            createdAt: new Date().toISOString()
        };

        this.data.habits.push(habit);
        this.saveData();
        input.value = '';
        this.renderHabits();
        this.updateAllDashboard();
    }

    deleteHabit(id) {
        this.data.habits = this.data.habits.filter(h => h.id !== id);
        this.saveData();
        this.renderHabits();
        this.updateAllDashboard();
    }

    completeHabit(id) {
        const habit = this.data.habits.find(h => h.id === id);
        if (habit) {
            const today = new Date().toISOString().split('T')[0];
            if (!habit.completedDates.includes(today)) {
                habit.completedDates.push(today);
                habit.lastCompleted = today;
                habit.streak = this.calculateStreak(habit);
            }
            this.saveData();
            this.renderHabits();
            this.updateAllDashboard();
        }
    }

    calculateStreak(habit) {
        if (habit.completedDates.length === 0) return 0;
        
        const sorted = habit.completedDates.sort();
        let streak = 1;
        
        for (let i = sorted.length - 1; i > 0; i--) {
            const curr = new Date(sorted[i]);
            const prev = new Date(sorted[i - 1]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            
            if (diffDays === 1) {
                streak++;
            } else if (diffDays > 1) {
                break;
            }
        }
        
        return streak;
    }

    renderHabits() {
        const container = document.getElementById('habitsContainer');
        if (this.data.habits.length === 0) {
            container.innerHTML = '<p class="empty-state">No habits yet. Create your first habit!</p>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        container.innerHTML = this.data.habits.map(habit => {
            const doneToday = habit.completedDates.includes(today);
            return `
                <div class="habit-item">
                    <div class="habit-header">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-streak">${habit.streak}🔥</div>
                    </div>
                    <div class="habit-frequency">${habit.frequency}</div>
                    <button class="habit-button ${doneToday ? 'done' : ''}" 
                        onclick="app.completeHabit(${habit.id})">
                        ${doneToday ? '✓ Done Today' : 'Mark Complete'}
                    </button>
                    <button class="habit-delete" onclick="app.deleteHabit(${habit.id})">🗑️ Delete</button>
                </div>
            `;
        }).join('');
    }

    // ==================== GOAL MANAGEMENT ====================
    addGoal() {
        const input = document.getElementById('goalInput');
        const category = document.getElementById('goalCategory').value;

        if (!input.value.trim()) return;

        const goal = {
            id: Date.now(),
            text: input.value,
            category: category,
            completed: false,
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        this.data.goals.push(goal);
        this.saveData();
        input.value = '';
        this.renderGoals();
        this.updateAllDashboard();
    }

    deleteGoal(id) {
        this.data.goals = this.data.goals.filter(g => g.id !== id);
        this.saveData();
        this.renderGoals();
        this.updateAllDashboard();
    }

    toggleGoal(id) {
        const goal = this.data.goals.find(g => g.id === id);
        if (goal) {
            goal.completed = !goal.completed;
            this.saveData();
            this.renderGoals();
            this.updateAllDashboard();
        }
    }

    renderGoals() {
        const container = document.getElementById('goalsContainer');
        const today = new Date().toISOString().split('T')[0];
        let todayGoals = this.data.goals.filter(g => g.date === today);

        if (todayGoals.length === 0) {
            container.innerHTML = '<p class="empty-state">No goals for today. Set one!</p>';
            return;
        }

        container.innerHTML = todayGoals.map(goal => `
            <div class="goal-item">
                <div class="goal-header">
                    <input type="checkbox" class="checkbox" ${goal.completed ? 'checked' : ''} 
                        onchange="app.toggleGoal(${goal.id})">
                    <div class="goal-name" style="${goal.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${goal.text}</div>
                    <span class="goal-category">${goal.category}</span>
                </div>
                <div class="goal-status">${goal.completed ? '✓ Completed' : '⏳ In Progress'}</div>
                <button class="goal-button goal-complete" onclick="app.deleteGoal(${goal.id})">🗑️ Delete</button>
            </div>
        `).join('');
    }

    // ==================== POMODORO TIMER ====================
    startPomodoro() {
        if (this.isTimerRunning) return;
        
        if (this.pomodoroSeconds === 0) {
            const workMinutes = parseInt(document.getElementById('workDuration').value) || 25;
            this.pomodoroSeconds = workMinutes * 60;
        }

        this.isTimerRunning = true;
        this.pomodoroTimer = setInterval(() => this.updatePomodoro(), 1000);
        this.updatePomodoroUI();
    }

    pausePomodoro() {
        this.isTimerRunning = false;
        clearInterval(this.pomodoroTimer);
        this.updatePomodoroUI();
    }

    resetPomodoro() {
        clearInterval(this.pomodoroTimer);
        this.isTimerRunning = false;
        this.pomodoroSeconds = 0;
        document.getElementById('timerDisplay').textContent = '25:00';
        document.getElementById('timerStatus').textContent = 'Ready to focus!';
        this.updateProgressRing();
    }

    updatePomodoro() {
        this.pomodoroSeconds--;

        if (this.pomodoroSeconds <= 0) {
            this.finishPomodoro();
        } else {
            this.updatePomodoroUI();
        }
    }

    finishPomodoro() {
        clearInterval(this.pomodoroTimer);
        this.isTimerRunning = false;
        this.todaySessions++;
        
        const session = {
            duration: parseInt(document.getElementById('workDuration').value),
            time: new Date().toLocaleTimeString(),
            date: new Date().toISOString().split('T')[0]
        };

        document.getElementById('timerStatus').textContent = '✓ Session Complete! 🎉';
        this.addPomodoroSession(session);
        this.resetPomodoro();
    }

    addPomodoroSession(session) {
        const container = document.getElementById('sessionsContainer');
        const item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML = `
            <div>
                <span class="session-time">${session.time}</span>
            </div>
            <div class="session-duration">${session.duration} min focus</div>
        `;
        container.insertBefore(item, container.firstChild);

        if (container.querySelector('.empty-state')) {
            container.querySelector('.empty-state').remove();
        }
    }

    updatePomodoroUI() {
        const mins = Math.floor(this.pomodoroSeconds / 60);
        const secs = this.pomodoroSeconds % 60;
        document.getElementById('timerDisplay').textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        const status = this.isTimerRunning ? '⏱️ Focus Time...' : '⏸️ Paused';
        document.getElementById('timerStatus').textContent = status;
        
        this.updateProgressRing();
    }

    updateProgressRing() {
        const totalSeconds = parseInt(document.getElementById('workDuration').value) * 60;
        const progress = (totalSeconds - this.pomodoroSeconds) / totalSeconds;
        const circumference = 2 * Math.PI * 90;
        const offset = circumference * (1 - progress);
        
        document.querySelector('.progress-ring-fill').style.strokeDashoffset = offset;
    }

    // ==================== DASHBOARD UPDATES ====================
    updateAllDashboard() {
        this.updateStats();
        this.updateComparison();
        this.updateTopStreaks();
        this.renderTasks('all');
        this.renderHabits();
        this.renderGoals();
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.data.tasks.filter(t => t.date === today || !t.date);
        const completedToday = todayTasks.filter(t => t.completed).length;
        const completionRate = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

        const bestStreak = Math.max(...this.data.habits.map(h => h.streak), 0);

        document.getElementById('todayTasks').textContent = todayTasks.length;
        document.getElementById('todayCompleted').textContent = completedToday;
        document.getElementById('bestStreak').textContent = bestStreak;
        document.getElementById('completionRate').textContent = completionRate + '%';
    }

    updateComparison() {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const todayTasks = this.data.tasks.filter(t => t.date === todayStr || !t.date);
        const yesterdayTasks = this.data.tasks.filter(t => t.date === yesterdayStr);

        const todayCompleted = todayTasks.filter(t => t.completed).length;
        const yesterdayCompleted = yesterdayTasks.filter(t => t.completed).length;

        const todayRate = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
        const yesterdayRate = yesterdayTasks.length > 0 ? Math.round((yesterdayCompleted / yesterdayTasks.length) * 100) : 0;

        document.getElementById('yesterdayTasks').textContent = `${yesterdayTasks.length} tasks`;
        document.getElementById('yesterdayCompletion').textContent = `${yesterdayRate}% done`;
        document.getElementById('todayComparisonTasks').textContent = `${todayTasks.length} tasks`;
        document.getElementById('todayComparisonCompletion').textContent = `${todayRate}% done`;
    }

    updateTopStreaks() {
        const sorted = [...this.data.habits].sort((a, b) => b.streak - a.streak).slice(0, 3);
        const container = document.getElementById('topStreaksContainer');

        if (sorted.length === 0) {
            container.innerHTML = '<p class="empty-state">No streaks yet. Start tracking!</p>';
            return;
        }

        container.innerHTML = sorted.map(habit => `
            <div class="streak-item">
                <span class="streak-name">${habit.name}</span>
                <span class="streak-count">${habit.streak}🔥</span>
            </div>
        `).join('');
    }

    // ==================== QUICK ADD ====================
    switchQuickAddType(type) {
        this.currentQuickAddType = type;
        document.querySelectorAll('.quick-tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        const input = document.getElementById('quickAddInput');
        input.placeholder = `Add a new ${type}...`;
    }

    quickAdd() {
        const type = this.currentQuickAddType;
        switch(type) {
            case 'task':
                document.getElementById('taskInput').value = document.getElementById('quickAddInput').value;
                this.addTask();
                break;
            case 'habit':
                document.getElementById('habitInput').value = document.getElementById('quickAddInput').value;
                this.addHabit();
                break;
            case 'goal':
                document.getElementById('goalInput').value = document.getElementById('quickAddInput').value;
                this.addGoal();
                break;
        }
        document.getElementById('quickAddInput').value = '';
    }

    // ==================== UI UTILITIES ====================
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');
    }

    toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('light-mode') ? 'false' : 'true');
    }

    toggleMenu() {
        const navTabs = document.querySelector('.nav-tabs');
        navTabs.style.display = navTabs.style.display === 'none' ? 'flex' : 'none';
    }

    loadDates() {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', options);

        document.getElementById('taskDate').valueAsDate = today;
    }

    setGreeting() {
        const hour = new Date().getHours();
        let greeting = 'Good Morning! 🌅';
        
        if (hour >= 12 && hour < 18) {
            greeting = 'Good Afternoon! ☀️';
        } else if (hour >= 18) {
            greeting = 'Good Evening! 🌙';
        }

        document.getElementById('greeting').textContent = greeting;
    }
}

// ==================== INITIALIZE APP ====================
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HabitFlowApp();
});
