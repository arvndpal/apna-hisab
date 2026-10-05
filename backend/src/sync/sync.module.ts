import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

/** Imports AuthModule so JwtStrategy ('jwt', used by JwtAuthGuard) is registered. */
@Module({
  imports: [AuthModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
