import { IsEnum, IsNotEmpty } from 'class-validator';
import { Action } from '../enum/action.enum';
import { Resource } from '../enum/resource.enum';

export class PermissionDto {
  @IsNotEmpty()
  @IsEnum(Resource)
  resource: Resource;

  @IsNotEmpty()
  @IsEnum(Action)
  action: Action;
}
