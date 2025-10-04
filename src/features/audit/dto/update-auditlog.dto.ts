import { PartialType } from '@nestjs/mapped-types';
import { CreateAuditLogDto } from './create-auditlog.dto';

export class UpdateAuditLogDto extends PartialType(CreateAuditLogDto) {}
