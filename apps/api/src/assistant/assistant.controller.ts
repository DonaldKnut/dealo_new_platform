import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  assistantChatSchema,
  assistantHandoffSchema,
  type AssistantChatInput,
  type AssistantHandoffInput,
} from '@dealo/shared';

import { Public } from '../common/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Public()
  @Post('chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Help chat: AI answer when configured, otherwise the built-in guide' })
  chat(@Body(new ZodValidationPipe(assistantChatSchema)) body: AssistantChatInput) {
    return this.assistant.chat(body);
  }

  @Public()
  @Post('handoff')
  @HttpCode(200)
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  @ApiOperation({ summary: 'Help chat: a guest asks for a person (signed-in users open a support ticket)' })
  handoff(@Body(new ZodValidationPipe(assistantHandoffSchema)) body: AssistantHandoffInput) {
    return this.assistant.handoff(body);
  }
}
