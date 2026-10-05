import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { RolePermission } from './role-permission.entity';
import { User } from './user.entity';

@Entity('roles') // This decorator marks the class as a database entity and specifies the table name as 'roles'
export class Role {
    @PrimaryGeneratedColumn() // Primary key, auto-incremented
    id: number;

    @Column({ unique: true, length: 50 }) // Unique role name with a maximum length of 50 characters
    name: string;

    @Column({ length: 255 })
    description: string;

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role) // One-to-many relationship with RolePermission entity
    rolePermissions: RolePermission[];

    @OneToMany(() => User, (user) => user.role) // One-to-many relationship with User entity, meaning that a role can be assigned to many users, but each user can have only one role
    users: User[];
}
