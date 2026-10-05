import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PositiveIntPipe } from '../../common/pipes/positive-int-pipe';
import { PermissionsGuard } from '../guards/permissions/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CryptoInterceptor } from '../../common/interceptors/crypto.interceptor';

import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@UseInterceptors(CryptoInterceptor)
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('sensitive-operation')
    createSensitive(@Body() data: Record<string, unknown>) {
        return { success: true, received: data };
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions('manage_users')
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    findOne(@Param('id', PositiveIntPipe) id: number) {
        return this.userService.findOne(id);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    async update(@Param('id', PositiveIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        try {
            return await this.userService.update(id, updateUserDto);
        } catch (error) {
            // Si la excepción es del negocio (como UserNotFoundException), se relanza directamente
            if (error instanceof Error && 'status' in error) {
                throw error;
            }
            throw new InternalServerErrorException('Fallo al actualizar el usuario', {
                cause: error,
                description: 'Error inesperado al persistir los cambios en la base de datos.',
            });
        }
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', PositiveIntPipe) id: number) {
        await this.userService.remove(id);
    }
}
