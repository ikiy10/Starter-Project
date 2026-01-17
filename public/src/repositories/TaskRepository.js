class TaskRepository {
    constructor(storageManager) {
        this.storage = storageManager;
        this.tasks = new Map(); // Cache in-memory
        this.storageKey = 'tasks';

        // Load existing tasks dari storage
        this._loadTasksFromStorage();
    }

    /**
     * Buat task baru
     * @param {Object} taskData - Data task
     * @returns {EnhancedTask}
     */
    create(taskData) {
        try {
            const task = new EnhancedTask(
                taskData.title,
                taskData.description || '',
                taskData.ownerId,
                taskData
            );

            // Simpan ke cache
            this.tasks.set(task.id, task);

            // Persist ke storage
            this._saveTasksToStorage();

            return task;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    /**
     * Cari task berdasarkan ID
     */
    findById(id) {
        return this.tasks.get(id) || null;
    }

    /**
     * Ambil semua task
     */
    findAll() {
        return Array.from(this.tasks.values());
    }

    /**
     * Cari task berdasarkan owner
     */
    findByOwner(ownerId) {
        return this.findAll().filter(task => task.ownerId === ownerId);
    }

    /**
     * Cari task berdasarkan assignee
     */
    findByAssignee(assigneeId) {
        return this.findAll().filter(task => task.assigneeId === assigneeId);
    }

    /**
     * Cari task berdasarkan kategori
     */
    findByCategory(category) {
        return this.findAll().filter(task => task.category === category);
    }

    /**
     * Cari task berdasarkan status
     */
    findByStatus(status) {
        return this.findAll().filter(task => task.status === status);
    }

    /**
     * Cari task berdasarkan prioritas
     */
    findByPriority(priority) {
        return this.findAll().filter(task => task.priority === priority);
    }

    /**
     * Cari task yang overdue
     */
    findOverdue() {
        return this.findAll().filter(task => task.isOverdue === true);
    }

    /**
     * Cari task yang due dalam X hari
     */
    findDueSoon(days = 3) {
        return this.findAll().filter(task => {
            const daysUntilDue = task.daysUntilDue;
            return daysUntilDue !== null && daysUntilDue <= days && daysUntilDue >= 0;
        });
    }

    /**
     * Cari task dengan tag tertentu
     */
    findByTag(tag) {
        return this.findAll().filter(task =>
            Array.isArray(task.tags) && task.tags.includes(tag)
        );
    }

    /**
     * Update task
     */
    update(id, updates) {
        const task = this.findById(id);
        if (!task) {
            return null;
        }

        try {
            if (updates.title !== undefined) task.updateTitle(updates.title);
            if (updates.description !== undefined) task.updateDescription(updates.description);
            if (updates.category !== undefined) task.updateCategory(updates.category);
            if (updates.priority !== undefined) task.updatePriority(updates.priority);
            if (updates.status !== undefined) task.updateStatus(updates.status);
            if (updates.dueDate !== undefined) task.setDueDate(updates.dueDate);
            if (updates.assigneeId !== undefined) task.assignTo(updates.assigneeId);
            if (updates.estimatedHours !== undefined) task.setEstimatedHours(updates.estimatedHours);
            if (updates.addTimeSpent !== undefined) task.addTimeSpent(updates.addTimeSpent);
            if (updates.addTag !== undefined) task.addTag(updates.addTag);
            if (updates.removeTag !== undefined) task.removeTag(updates.removeTag);
            if (updates.addNote !== undefined) task.addNote(updates.addNote);

            this._saveTasksToStorage();
            return task;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    /**
     * Hapus task
     */
    delete(id) {
        if (this.tasks.has(id)) {
            this.tasks.delete(id);
            this._saveTasksToStorage();
            return true;
        }
        return false;
    }

    /**
     * Search task
     */
    search(query) {
        const searchTerm = query.toLowerCase();
        return this.findAll().filter(task =>
            task.title.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm) ||
            (Array.isArray(task.tags) &&
                task.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }

    /**
     * Filter task
     */
    filter(filters) {
        let results = this.findAll();

        if (filters.ownerId) {
            results = results.filter(task => task.ownerId === filters.ownerId);
        }
        if (filters.assigneeId) {
            results = results.filter(task => task.assigneeId === filters.assigneeId);
        }
        if (filters.category) {
            results = results.filter(task => task.category === filters.category);
        }
        if (filters.status) {
            results = results.filter(task => task.status === filters.status);
        }
        if (filters.priority) {
            results = results.filter(task => task.priority === filters.priority);
        }
        if (filters.overdue) {
            results = results.filter(task => task.isOverdue === true);
        }
        if (filters.dueSoon) {
            results = results.filter(task => {
                const days = task.daysUntilDue;
                return days !== null && days <= 3 && days >= 0;
            });
        }
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(task =>
                filters.tags.some(tag => task.tags.includes(tag))
            );
        }

        return results;
    }

    /**
     * Sort task
     */
    sort(tasks, sortBy = 'createdAt', order = 'desc') {
        return tasks.sort((a, b) => {
            let valueA, valueB;

            switch (sortBy) {
                case 'title':
                    valueA = a.title.toLowerCase();
                    valueB = b.title.toLowerCase();
                    break;
                case 'priority':
                    const p = { low: 1, medium: 2, high: 3, urgent: 4 };
                    valueA = p[a.priority];
                    valueB = p[b.priority];
                    break;
                case 'dueDate':
                    valueA = a.dueDate || new Date('9999-12-31');
                    valueB = b.dueDate || new Date('9999-12-31');
                    break;
                default:
                    valueA = a.createdAt;
                    valueB = b.createdAt;
            }

            return order === 'asc'
                ? valueA > valueB ? 1 : -1
                : valueA < valueB ? 1 : -1;
        });
    }

    /**
     * Get task statistics
     */
    getStats(userId = null) {
        const tasks = userId ? this.findByOwner(userId) : this.findAll();

        const stats = {
            total: tasks.length,
            byStatus: {},
            byPriority: {},
            byCategory: {},
            overdue: tasks.filter(t => t.isOverdue).length,
            dueSoon: tasks.filter(t => t.daysUntilDue !== null && t.daysUntilDue <= 3).length,
            completed: tasks.filter(t => t.status === 'completed').length
        };

        ['pending', 'in-progress', 'blocked', 'completed', 'cancelled']
            .forEach(s => stats.byStatus[s] = tasks.filter(t => t.status === s).length);

        ['low', 'medium', 'high', 'urgent']
            .forEach(p => stats.byPriority[p] = tasks.filter(t => t.priority === p).length);

        ['work', 'personal', 'study', 'health', 'finance', 'other']
            .forEach(c => stats.byCategory[c] = tasks.filter(t => t.category === c).length);

        return stats;
    }

    _loadTasksFromStorage() {
        try {
            const tasksData = this.storage.load(this.storageKey, []);
            tasksData.forEach(data => {
                const task = EnhancedTask.fromJSON(data);
                this.tasks.set(task.id, task);
            });
        } catch (error) {
            console.error('Error loading tasks from storage:', error);
        }
    }

    _saveTasksToStorage() {
        try {
            const tasksData = Array.from(this.tasks.values()).map(t => t.toJSON());
            this.storage.save(this.storageKey, tasksData);
        } catch (error) {
            console.error('Error saving tasks to storage:', error);
        }
    }
}