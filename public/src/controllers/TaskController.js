class TaskController {
    constructor(taskRepository, userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.currentUser = null; // User yang sedang login
    }
    
    /**
     * Set current user (simulasi login)
     * @param {string} userId - User ID
     */
    setCurrentUser(userId) {
        this.currentUser = this.userRepository.findById(userId);
        if (!this.currentUser) {
            throw new Error('User tidak ditemukan');
        }
    }
    
    /**
     * Buat task baru
     * @param {Object} taskData - Data task dari form
     * @returns {Object} - Response dengan task yang dibuat atau error
     */
    createTask(taskData) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            if (!taskData.title || taskData.title.trim() === '') {
                return {
                    success: false,
                    error: 'Judul task wajib diisi'
                };
            }
            
            const taskToCreate = {
                ...taskData,
                ownerId: this.currentUser.id,
                assigneeId: taskData.assigneeId || this.currentUser.id
            };
            
            if (taskToCreate.assigneeId !== this.currentUser.id) {
                const assignee = this.userRepository.findById(taskToCreate.assigneeId);
                if (!assignee) {
                    return {
                        success: false,
                        error: 'User yang di-assign tidak ditemukan'
                    };
                }
            }
            
            const task = this.taskRepository.create(taskToCreate);
            
            return {
                success: true,
                data: task,
                message: `Task "${task.title}" berhasil dibuat`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Ambil semua task user
     * @param {Object} filters - Filter options
     * @returns {Object} - Response dengan array task
     */
    getTasks(filters = {}) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const userFilters = {
                ...filters,
                ownerId: this.currentUser.id
            };
            
            let tasks = this.taskRepository.filter(userFilters);
            
            const sortBy = filters.sortBy || 'createdAt';
            const sortOrder = filters.sortOrder || 'desc';
            tasks = this.taskRepository.sort(tasks, sortBy, sortOrder);
            
            return {
                success: true,
                data: tasks,
                count: tasks.length
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Ambil task berdasarkan ID
     * @param {string} taskId - Task ID
     * @returns {Object} - Response dengan task atau error
     */
    getTask(taskId) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const task = this.taskRepository.findById(taskId);
            
            if (!task) {
                return {
                    success: false,
                    error: 'Task tidak ditemukan'
                };
            }
            
            if (
                task.ownerId !== this.currentUser.id &&
                task.assigneeId !== this.currentUser.id
            ) {
                return {
                    success: false,
                    error: 'Anda tidak memiliki akses ke task ini'
                };
            }
            
            return {
                success: true,
                data: task
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Update task
     * @param {string} taskId - Task ID
     * @param {Object} updates - Data yang akan diupdate
     * @returns {Object} - Response dengan task yang diupdate atau error
     */
    updateTask(taskId, updates) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const task = this.taskRepository.findById(taskId);
            
            if (!task) {
                return {
                    success: false,
                    error: 'Task tidak ditemukan'
                };
            }
            
            if (task.ownerId !== this.currentUser.id) {
                return {
                    success: false,
                    error: 'Hanya owner yang bisa mengubah task'
                };
            }
            
            if (updates.assigneeId) {
                const assignee = this.userRepository.findById(updates.assigneeId);
                if (!assignee) {
                    return {
                        success: false,
                        error: 'User yang di-assign tidak ditemukan'
                    };
                }
            }
            
            const updatedTask = this.taskRepository.update(taskId, updates);
            
            return {
                success: true,
                data: updatedTask,
                message: 'Task berhasil diupdate'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Hapus task
     * @param {string} taskId - Task ID
     * @returns {Object} - Response success atau error
     */
    deleteTask(taskId) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const task = this.taskRepository.findById(taskId);
            
            if (!task) {
                return {
                    success: false,
                    error: 'Task tidak ditemukan'
                };
            }
            
            if (task.ownerId !== this.currentUser.id) {
                return {
                    success: false,
                    error: 'Hanya owner yang bisa menghapus task'
                };
            }
            
            const deleted = this.taskRepository.delete(taskId);
            
            if (deleted) {
                return {
                    success: true,
                    message: `Task "${task.title}" berhasil dihapus`
                };
            }
            
            return {
                success: false,
                error: 'Gagal menghapus task'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Toggle status task (complete/incomplete)
     * @param {string} taskId - Task ID
     * @returns {Object} - Response dengan task yang diupdate
     */
    toggleTaskStatus(taskId) {
        try {
            const task = this.taskRepository.findById(taskId);
            
            if (!task) {
                return {
                    success: false,
                    error: 'Task tidak ditemukan'
                };
            }
            
            if (
                task.ownerId !== this.currentUser.id &&
                task.assigneeId !== this.currentUser.id
            ) {
                return {
                    success: false,
                    error: 'Anda tidak memiliki akses ke task ini'
                };
            }
            
            // ✅ FIX TANPA MENGHAPUS APAPUN
            const newStatus = task.status === 'completed'
                ? 'pending'
                : 'completed';
            
            const updatedTask = this.taskRepository.update(taskId, {
                status: newStatus
            });
            
            return {
                success: true,
                data: updatedTask,
                message: `Task ${newStatus === 'completed' ? 'selesai' : 'belum selesai'}`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Search task
     * @param {string} query - Search query
     * @returns {Object} - Response dengan hasil search
     */
    searchTasks(query) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            if (!query || query.trim() === '') {
                return {
                    success: false,
                    error: 'Query pencarian tidak boleh kosong'
                };
            }
            
            const allResults = this.taskRepository.search(query);
            const userResults = allResults.filter(task =>
                task.ownerId === this.currentUser.id ||
                task.assigneeId === this.currentUser.id
            );
            
            return {
                success: true,
                data: userResults,
                count: userResults.length,
                query: query
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get task statistics
     * @returns {Object} - Response dengan statistik task
     */
    getTaskStats() {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const stats = this.taskRepository.getStats(this.currentUser.id);
            
            return {
                success: true,
                data: stats
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get overdue tasks
     * @returns {Object} - Response dengan task yang overdue
     */
    getOverdueTasks() {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const overdueTasks = this.taskRepository.findOverdue().filter(task =>
                task.ownerId === this.currentUser.id ||
                task.assigneeId === this.currentUser.id
            );
            
            return {
                success: true,
                data: overdueTasks,
                count: overdueTasks.length
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get tasks due soon
     * @param {number} days - Jumlah hari ke depan
     * @returns {Object} - Response dengan task yang akan due
     */
    getTasksDueSoon(days = 3) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    error: 'User harus login terlebih dahulu'
                };
            }
            
            const dueSoonTasks = this.taskRepository.findDueSoon(days).filter(task =>
                task.ownerId === this.currentUser.id ||
                task.assigneeId === this.currentUser.id
            );
            
            return {
                success: true,
                data: dueSoonTasks,
                count: dueSoonTasks.length
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskController;
} else {
    window.TaskController = TaskController;
}
