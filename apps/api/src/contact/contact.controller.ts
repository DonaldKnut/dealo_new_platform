import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { contactSchema, type ContactInput } from '@dealo/shared';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ContactService } from './contact.service';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  create(@Body(new ZodValidationPipe(contactSchema)) body: ContactInput) {
    return this.contactService.create(body);
  }
}
