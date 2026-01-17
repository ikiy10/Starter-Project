// Import dependencies
const TestDataFactory = require('../helpers/TestDataFactory');
const TestAssertions = require('../helpers/TestAssertions');

// Import class yang akan di-test
// ⚠️ PATH DISESUAIKAN DENGAN STRUKTUR PROJECT
const UserRepository = require('../../public/src/repositories/UserRepository');
const User = require('../../public/src/models/User');

describe('UserRepository', () => {
    let userRepository;
    let mockStorage;
    
    beforeEach(() => {
        // Setup mock storage dan repository untuk setiap test
        mockStorage = TestDataFactory.createMockStorage();
        userRepository = new UserRepository(mockStorage);
    });
    
    describe('User Creation', () => {
        test('should create user successfully', () => {
            // Arrange
            const userData = TestDataFactory.createValidUserData();
            
            // Act
            const user = userRepository.create(userData);
            
            // Assert
            expect(user).toBeInstanceOf(User);
            expect(user.username).toBe(userData.username);
            expect(user.email).toBe(userData.email);
            TestAssertions.assertUserHasRequiredProperties(user);
            
            // Verify storage was called
            expect(mockStorage.save).toHaveBeenCalledWith(
                'users',
                expect.any(Array)
            );
        });
        
        test('should throw error for duplicate username', () => {
            // Arrange
            const userData = TestDataFactory.createValidUserData();
            userRepository.create(userData);
            
            // Act & Assert
            expect(() => {
                userRepository.create(userData);
            }).toThrow(`Username '${userData.username}' sudah digunakan`);
        });
        
        test('should throw error for duplicate email', () => {
            // Arrange
            const userData1 = TestDataFactory.createValidUserData();
            const userData2 = TestDataFactory.createValidUserData({
                username: 'different',
                email: userData1.email
            });
            
            userRepository.create(userData1);
            
            // Act & Assert
            expect(() => {
                userRepository.create(userData2);
            }).toThrow(`Email '${userData1.email}' sudah digunakan`);
        });
    });
    
    describe('User Retrieval', () => {
        let testUser;
        
        beforeEach(() => {
            const userData = TestDataFactory.createValidUserData();
            testUser = userRepository.create(userData);
        });
        
        test('should find user by ID', () => {
            const foundUser = userRepository.findById(testUser.id);
            
            expect(foundUser).toBeDefined();
            expect(foundUser.id).toBe(testUser.id);
            expect(foundUser.username).toBe(testUser.username);
        });
        
        test('should return null for non-existent ID', () => {
            const foundUser = userRepository.findById('non-existent-id');
            expect(foundUser).toBeNull();
        });
        
        test('should find user by username', () => {
            const foundUser = userRepository.findByUsername(testUser.username);
            
            expect(foundUser).toBeDefined();
            expect(foundUser.username).toBe(testUser.username);
        });
        
        test('should find user by email', () => {
            const foundUser = userRepository.findByEmail(testUser.email);
            
            expect(foundUser).toBeDefined();
            expect(foundUser.email).toBe(testUser.email);
        });
        
        test('should return all users', () => {
            const userData2 = TestDataFactory.createValidUserData({
                username: 'user2',
                email: 'user2@example.com'
            });
            userRepository.create(userData2);
            
            const allUsers = userRepository.findAll();
            
            expect(allUsers).toHaveLength(2);
            expect(allUsers.every(user => user instanceof User)).toBe(true);
        });
        
        test('should return only active users', () => {
            testUser.deactivate();
            userRepository.update(testUser.id, { isActive: false });
            
            const userData2 = TestDataFactory.createValidUserData({
                username: 'user2',
                email: 'user2@example.com'
            });
            userRepository.create(userData2);
            
            const activeUsers = userRepository.findActive();
            
            expect(activeUsers).toHaveLength(1);
            expect(activeUsers[0].isActive).toBe(true);
        });
    });
    
    describe('User Updates', () => {
        let testUser;
        
        beforeEach(() => {
            const userData = TestDataFactory.createValidUserData();
            testUser = userRepository.create(userData);
        });
        
        test('should update user profile', () => {
            const updates = {
                fullName: 'Updated Name',
                email: 'updated@example.com'
            };
            
            const updatedUser = userRepository.update(testUser.id, updates);
            
            expect(updatedUser).toBeDefined();
            expect(updatedUser.fullName).toBe(updates.fullName);
            expect(updatedUser.email).toBe(updates.email);
            expect(mockStorage.save).toHaveBeenCalled();
        });
        
        test('should record login', () => {
            const beforeLogin = new Date();
            
            const updatedUser = userRepository.recordLogin(testUser.id);
            
            expect(updatedUser).toBeDefined();
            expect(updatedUser.lastLoginAt).toBeDefined();
            expect(updatedUser.lastLoginAt.getTime())
                .toBeGreaterThanOrEqual(beforeLogin.getTime());
        });
        
        test('should return null when updating non-existent user', () => {
            const result = userRepository.update('non-existent-id', {
                fullName: 'Test'
            });
            
            expect(result).toBeNull();
        });
    });
    
    describe('User Search', () => {
        beforeEach(() => {
            const users = [
                { username: 'john_doe', email: 'john@example.com', fullName: 'John Doe' },
                { username: 'jane_smith', email: 'jane@example.com', fullName: 'Jane Smith' },
                { username: 'bob_wilson', email: 'bob@example.com', fullName: 'Bob Wilson' }
            ];
            
            users.forEach(userData => userRepository.create(userData));
        });
        
        test('should search users by username', () => {
            const results = userRepository.search('john');
            
            expect(results).toHaveLength(1);
            expect(results[0].username).toBe('john_doe');
        });
        
        test('should search users by email', () => {
            const results = userRepository.search('jane@');
            
            expect(results).toHaveLength(1);
            expect(results[0].email).toBe('jane@example.com');
        });
        
        test('should search users by full name', () => {
            const results = userRepository.search('wilson');
            
            expect(results).toHaveLength(1);
            expect(results[0].fullName).toBe('Bob Wilson');
        });
        
        test('should return empty array for no matches', () => {
            const results = userRepository.search('nonexistent');
            expect(results).toHaveLength(0);
        });
    });
});
