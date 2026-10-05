import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Entity({ name: 'role_permissions' }) // This decorator marks the class as a database entity and specifies the table name as 'role_permissions'
export class RolePermission {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Role, (role) => role.rolePermissions, { onDelete: 'CASCADE', nullable: false }) // Many-to-one relationship with Role entity, with cascade delete, meaning that if a role is deleted, all associated role-permission relationships will also be deleted
    @JoinColumn({ name: 'role_id' }) // Specifies the foreign key column name for the relationship
    role: Role; // This property represents the role associated with this role-permission relationship, is of type Role and not an array because it's a many-to-one relationship

    @ManyToOne(() => Permission, (permission) => permission.rolePermissions, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;
}
