import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/** Marks a route as callable without a session token (e.g. POST /login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
