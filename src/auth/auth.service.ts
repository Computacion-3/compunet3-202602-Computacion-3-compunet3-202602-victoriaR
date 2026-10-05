import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserService } from './user/user.service';
import { UserLoginDto } from './dto/user-login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async validateUser(email: string, pass: string) {
        // findByEmail debe cargar las relaciones de roles y permisos
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        const isMatch = await bcrypt.compare(pass, user.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }

    async login(userLoginDto: UserLoginDto) {
        const user = await this.validateUser(userLoginDto.email, userLoginDto.password);

        // Mapeamos los permisos asociados al rol del usuario
        const permissions = user.role?.rolePermissions?.map((rp) => rp.permission.name) ?? [];

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            permissions,
        };

        return {
            access_token: this.jwtService.sign(payload),
            token_type: 'Bearer',
            user: {
                id: user.id,
                email: user.email,
                role: user.role?.name,
            },
        };
    }
}
