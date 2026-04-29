import { Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @MinLength(3, { message: 'Room name must be between 3 and 32 characters' })
  @MaxLength(32, { message: 'Room name must be between 3 and 32 characters' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'room name may only contain letters, numbers, and hyphens',
  })
  name!: string;
}
