import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { RoleNotFoundException, UserNotFoundException } from '../../common/exceptions';
import { AppLogger } from '../../common/logger/logger.service';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { RoleService } from '../role/role.service';

import { UserService } from './user.service';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
}));

describe('UserService', () => {
    let service: UserService;

    const mockRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        merge: jest.fn(),
        remove: jest.fn(),
    };

    const mockRoleService = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: getRepositoryToken(User), useValue: mockRepository },
                { provide: RoleService, useValue: mockRoleService },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('10') } },
                { provide: AppLogger, useValue: { log: jest.fn(), debug: jest.fn() } },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return all users with relations role', async () => {
        const mockRole: Role = {
            id: 1,
            name: 'admin',
            description: 'Administrator',
            users: [],
            rolePermissions: [],
        };

        const mockUsers = [
            {
                id: 1,
                username: 'user1',
                email: 'user1@gmail.com',
                bio: 'Bio text',
                role: mockRole,
                passwordHash: 'hashedpassword',
                createdAt: new Date(),
            },
        ];

        mockRepository.find.mockResolvedValue(mockUsers);

        expect(await service.findAll()).toEqual(mockUsers);
        expect(mockRepository.find).toHaveBeenCalledWith({
            relations: { role: true },
        });
    });

    it('should return one user by id', async () => {
        const mockRole: Role = {
            id: 1,
            name: 'admin',
            description: 'Administrator',
            users: [],
            rolePermissions: [],
        };

        const mockUser = {
            id: 1,
            username: 'user1',
            email: 'user1@gmail.com',
            bio: 'Bio text',
            role: mockRole,
            passwordHash: 'hashedpassword',
            createdAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(mockUser);

        expect(await service.findOne(1)).toEqual(mockUser);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: { role: false },
        });
    });

    it('should throw UserNotFoundException when user is not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne(999)).rejects.toThrow(UserNotFoundException);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
            where: { id: 999 },
            relations: { role: false },
        });
    });

    it('should create user when all data is correct', async () => {
        const createUserDto = {
            username: 'user1',
            email: 'user1@gmail.com',
            passwordHash: 'password123',
            roleId: 1,
        };

        const mockRole = {
            id: 1,
            name: 'admin',
        };

        const mockSavedUser = {
            id: 1,
            username: 'user1',
            email: 'user1@gmail.com',
            bio: '',
            role: mockRole,
            createdAt: new Date(),
        };

        mockRoleService.findOne.mockResolvedValue(mockRole);
        mockRepository.create.mockReturnValue(mockSavedUser);
        mockRepository.save.mockResolvedValue(mockSavedUser);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

        expect(await service.create(createUserDto)).toEqual(mockSavedUser);
        expect(mockRoleService.findOne).toHaveBeenCalledWith(1);
        expect(mockRepository.create).toHaveBeenCalledWith({
            username: 'user1',
            email: 'user1@gmail.com',
            passwordHash: 'hashedPassword',
            role: mockRole,
        });
        expect(mockRepository.save).toHaveBeenCalledWith(mockSavedUser);
    });

    it('should fail when role is not found', async () => {
        const createUserDto = {
            username: 'user1',
            email: 'user1@gmail.com',
            passwordHash: 'password123',
            roleId: 999,
        };

        mockRoleService.findOne.mockResolvedValue(null);

        await expect(service.create(createUserDto)).rejects.toThrow(RoleNotFoundException);
        expect(mockRoleService.findOne).toHaveBeenCalledWith(999);
    });

    it('should update user successfully without roleId', async () => {
        const updateUserDto = {
            username: 'updatedUser',
        };

        const existingUser = {
            id: 1,
            username: 'user1',
            email: 'user1@gmail.com',
            bio: '',
            role: { id: 1, name: 'admin' },
            passwordHash: 'password123',
            createdAt: new Date(),
        };

        const updatedUser = {
            ...existingUser,
            username: 'updatedUser',
        };

        mockRepository.findOne.mockResolvedValue(existingUser);
        mockRepository.merge.mockReturnValue(updatedUser);
        mockRepository.save.mockResolvedValue(updatedUser);

        const result = await service.update(1, updateUserDto);

        expect(mockRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: { role: false },
        });
        expect(mockRepository.merge).toHaveBeenCalledWith(existingUser, { username: 'updatedUser' });
        expect(mockRepository.save).toHaveBeenCalledWith(existingUser);
        expect(result).toEqual(updatedUser);
    });

    it('should update user successfully with a valid roleId', async () => {
        const updateUserDto = {
            roleId: 2,
        };

        const existingUser = {
            id: 1,
            username: 'user1',
            email: 'user1@gmail.com',
            bio: '',
            role: { id: 1, name: 'admin' },
            passwordHash: 'password123',
            createdAt: new Date(),
        };

        const newRole = { id: 2, name: 'editor' };

        mockRepository.findOne.mockResolvedValue(existingUser);
        mockRoleService.findOne.mockResolvedValue(newRole);
        mockRepository.save.mockResolvedValue({ ...existingUser, role: newRole });

        const result = await service.update(1, updateUserDto);

        expect(mockRoleService.findOne).toHaveBeenCalledWith(2);
        expect(result.role).toEqual(newRole);
    });

    it('should fail to update user when roleId does not exist', async () => {
        const updateUserDto = {
            roleId: 999,
        };

        const existingUser = {
            id: 1,
            username: 'user1',
            email: 'user1@gmail.com',
            bio: '',
            role: { id: 1, name: 'admin' },
            passwordHash: 'password123',
            createdAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingUser);
        mockRoleService.findOne.mockResolvedValue(null);

        await expect(service.update(1, updateUserDto)).rejects.toThrow(RoleNotFoundException);
        expect(mockRoleService.findOne).toHaveBeenCalledWith(999);
    });

    it('should remove user successfully', async () => {
        const existingUser = {
            id: 1,
            username: 'user1',
            email: 'user1@gmail.com',
            bio: '',
            role: { id: 1, name: 'admin' },
            passwordHash: 'password123',
            createdAt: new Date(),
        };

        mockRepository.findOne.mockResolvedValue(existingUser);
        mockRepository.remove.mockResolvedValue(existingUser);

        const result = await service.remove(1);

        expect(mockRepository.findOne).toHaveBeenCalledWith({
            where: { id: 1 },
            relations: { role: false },
        });
        expect(mockRepository.remove).toHaveBeenCalledWith(existingUser);
        expect(result).toEqual({ message: 'User with id #1 deleted successfully' });
    });
});
