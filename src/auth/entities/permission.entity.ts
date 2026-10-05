import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { RolePermission } from './role-permission.entity';

@Entity('permissions') // This decorator marks the class as a database entity and specifies the table name as 'permissions'
export class Permission {
    // This class represents the 'permissions' table in the database
    @PrimaryGeneratedColumn() // Primary key, auto-incremented
    id: number;

    @Column({ unique: true, length: 50 }) // Unique permission name with a maximum length of 50 characters
    name: string;

    @Column({ length: 255 })
    description: string;

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission) // One-to-many relationship with RolePermission entity
    rolePermissions: RolePermission[];
}
