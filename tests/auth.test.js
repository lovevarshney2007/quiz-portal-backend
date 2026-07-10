// Example Jest unit test for Authentication
const mongoose = require('mongoose');
const User = require('../models/User');
const authService = require('../services/auth.service');

describe('Auth Service', () => {
    beforeAll(async () => {
        // Connect to an in-memory database or test db
    });

    afterAll(async () => {
        // Disconnect and clean up
    });

    it('should throw an error if email already exists', async () => {
        // Mock the user repository
        const mockUserRepository = require('../repositories/user.repository');
        mockUserRepository.findByEmail = jest.fn().mockResolvedValue(true);

        await expect(authService.register({
            email: 'test@akgec.ac.in',
            studentNumber: '2500000000001'
        })).rejects.toThrow('Email already registered');
    });
});
