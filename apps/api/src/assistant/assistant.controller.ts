import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  assistantChatSchema,
  assistantFeedbackSchema,
  assistantHandoffSchema,
  type AssistantChatInput,
  type AssistantFeedbackInput,
  type AssistantHandoffInput,
  type AssistantStreamEvent,
} from '@dealo/shared';
import type { Response } from 'express';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Public()
  @Get('welcome')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Dealo AI Assistant: personalised greeting and starter questions for a page' })
  welcome(@Query('page') page: string | undefined, @CurrentUser() user: AuthUser | undefined) {
    return this.assistant.welcome(page?.slice(0, 200), user);
  }

  @Public()
  @Post('chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Dealo AI Assistant: one complete answer as JSON' })
  chat(@Body(new ZodValidationPipe(assistantChatSchema)) body: AssistantChatInput, @CurrentUser() user: AuthUser | undefined) {
    return this.assistant.chat(body, user);
  }

  @Public()
  @Post('stream')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Dealo AI Assistant: answer streamed as server-sent events (start, delta, done, error)' })
  async stream(
    @Body(new ZodValidationPipe(assistantChatSchema)) body: AssistantChatInput,
    @CurrentUser() user: AuthUser | undefined,
    @Res() res: Response,
  ) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    // no-transform stops proxies from compressing (and so buffering) the stream.
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const controller = new AbortController();
    res.on('close', () => controller.abort());
    const send = (event: AssistantStreamEvent) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const heartbeat = setInterval(() => !res.writableEnded && res.write(': ping\n\n'), 15_000);

    try {
      await this.assistant.stream(body, user, send, controller.signal);
    } catch {
      if (!controller.signal.aborted) send({ type: 'error', message: 'Dealo AI could not answer just now. Please try again.' });
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  }

  @Public()
  @Post('feedback')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Dealo AI Assistant: thumbs up or down on an answer' })
  feedback(@Body(new ZodValidationPipe(assistantFeedbackSchema)) body: AssistantFeedbackInput, @CurrentUser() user: AuthUser | undefined) {
    return this.assistant.feedback(body, user);
  }

  @Public()
  @Post('handoff')
  @HttpCode(200)
  @Throttle({ default: { limit: 4, ttl: 60_000 } })
  @ApiOperation({ summary: 'Dealo AI Assistant: a guest asks for a person (signed-in users open a support ticket)' })
  handoff(@Body(new ZodValidationPipe(assistantHandoffSchema)) body: AssistantHandoffInput) {
    return this.assistant.handoff(body);
  }
}
