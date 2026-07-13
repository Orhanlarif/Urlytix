import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { resolveLocale } from '../common/i18n/locale';
import { AppConfigService } from '../config/app-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLinkDto } from './dto/create-link.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import { UnlockLinkDto } from './dto/unlock-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { UpdateLinkStatusDto } from './dto/update-link-status.dto';
import { LinksService } from './links.service';
import {
  LinkRedirectException,
  renderPasswordGatePage,
  renderRedirectErrorPage,
} from './redirect-error.page';

@Controller()
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly appConfig: AppConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('links')
  createLink(@Req() req: Request, @Body() createLinkDto: CreateLinkDto) {
    return this.linksService.createLink(req.user.sub, createLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links')
  getUserLinks(@Req() req: Request, @Query() query: ListLinksQueryDto) {
    return this.linksService.getUserLinks(req.user.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links/:id')
  getUserLinkById(@Req() req: Request, @Param('id') linkId: string) {
    return this.linksService.getUserLinkById(req.user.sub, linkId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('links/:id')
  updateLink(
    @Req() req: Request,
    @Param('id') linkId: string,
    @Body() updateLinkDto: UpdateLinkDto,
  ) {
    return this.linksService.updateLink(req.user.sub, linkId, updateLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('links/:id/status')
  updateLinkStatus(
    @Req() req: Request,
    @Param('id') linkId: string,
    @Body() updateLinkStatusDto: UpdateLinkStatusDto,
  ) {
    return this.linksService.updateLinkStatus(
      req.user.sub,
      linkId,
      updateLinkStatusDto.status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('links/:id')
  deleteLink(@Req() req: Request, @Param('id') linkId: string) {
    return this.linksService.deleteLink(req.user.sub, linkId);
  }

  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @Get('r/:shortCode')
  async redirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.linksService.handleRedirect(shortCode, req);
      this.applyVisitorCookie(res, result);
      return res.redirect(result.originalUrl);
    } catch (error) {
      return this.handleRedirectError(error, shortCode, req, res);
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('r/:shortCode')
  async unlockRedirect(
    @Param('shortCode') shortCode: string,
    @Body() body: UnlockLinkDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.linksService.unlockRedirect(
        shortCode,
        body.password,
        req,
      );
      this.applyVisitorCookie(res, result);
      if (result.passwordUnlockToken && result.passwordCookieName) {
        res.cookie(
          result.passwordCookieName,
          result.passwordUnlockToken,
          this.linksService.getPasswordCookieOptions(
            this.appConfig.isProduction,
          ),
        );
      }
      return res.redirect(result.originalUrl);
    } catch (error) {
      return this.handleRedirectError(error, shortCode, req, res);
    }
  }

  private applyVisitorCookie(
    res: Response,
    result: { isNewVisitor: boolean; visitorId: string },
  ) {
    if (result.isNewVisitor) {
      res.cookie(
        this.linksService.getVisitorCookieName(),
        result.visitorId,
        this.linksService.getVisitorCookieOptions(this.appConfig.isProduction),
      );
    }
  }

  private handleRedirectError(
    error: unknown,
    shortCode: string,
    req: Request,
    res: Response,
  ) {
    const locale = resolveLocale(
      typeof req.headers['accept-language'] === 'string'
        ? req.headers['accept-language']
        : undefined,
    );
    const pageOptions = {
      locale,
      homeUrl: this.appConfig.appWebUrl,
    };

    if (error instanceof LinkRedirectException) {
      if (
        error.code === 'password_required' ||
        error.code === 'password_invalid'
      ) {
        return res
          .status(error.statusCode)
          .type('html')
          .send(
            renderPasswordGatePage(
              shortCode,
              error.code === 'password_invalid' ? error.message : undefined,
              pageOptions,
            ),
          );
      }

      return res
        .status(error.statusCode)
        .type('html')
        .send(renderRedirectErrorPage(error.code, error.message, pageOptions));
    }

    throw error;
  }
}
