import { Controller, Get, Redirect, Req, Res, Post } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppService } from './app.service';
import { IncomingMessage, ServerResponse } from 'http';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('commands')
  async handleCommands(@Req() request: Request, @Res() response: Response) {
    const payload = request.body;
    const command = payload.command;
    /*
     * 時間は、次のような形式で指定できる
     * "hourly"（1時間ごと）
     * "daily"（毎日）
     * "weekly"（毎週）
     */
    switch (command) {
      case '/mention-reminder':
        // 時間の形式が正しいか確認
        const time = payload.text.trim().toLowerCase();
        if (['hourly', 'daily', 'weekly'].includes(time)) {
          this.handleMentionReminder(payload);
          response.status(200).send(`リマインダーが${time}で設定されました。`);
        } else {
          response
            .status(200)
            .send(
              `無効なリマインダー設定です。以下の形式でリマインダーを設定してください：\n` +
                `/mention-reminder hourly - 毎時リマインダー\n` +
                `/mention-reminder daily - 毎日リマインダー\n` +
                `/mention-reminder weekly - 毎週リマインダー`,
            );
        }
        break;
      case '/unread':
        this.handleUnread(payload);
        response.status(200).send('未読メッセージを取得しています...');
        break;
      default:
        return response.status(400).send('無効なコマンドです。');
    }
  }
  async handleMentionReminder(payload) {
    try {
      const time = payload.text.trim().toLowerCase();
      // ユーザーIDとリマインド時間を保存
      await this.appService.addUserReminder(payload.user_id, time);
    } catch (error) {
      console.error('Error saving user reminder:', error);
    }
  }

  async handleUnread(payload) {
    try {
      // 未返信のメッセージを取得
      const unrepliedMentions = await this.appService.fetchUnrepliedMentions(
        payload.user_id,
      );
      await this.appService.sendReminder(payload.user_id, unrepliedMentions);
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  // 認証関連
  @Get('auth')
  @Redirect()
  async startAuth() {
    return await this.appService.generateAuthUrl();
  }

  @Get('auth/callback')
  async handleAuthCallback(
    @Req() req: IncomingMessage,
    @Res() res: ServerResponse,
  ): Promise<void> {
    await this.appService.authenticateBot(req, res);
  }
}
