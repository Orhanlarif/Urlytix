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

import { AppConfigService } from '../config/app-config.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { CreateLinkDto } from './dto/create-link.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';

import { UpdateLinkDto } from './dto/update-link.dto';

import { UpdateLinkStatusDto } from './dto/update-link-status.dto';

import { LinksService } from './links.service';

import {
  LinkRedirectException,
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
    const userId = req.user.sub;

    return this.linksService.createLink(userId, createLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links')
  getUserLinks(@Req() req: Request, @Query() query: ListLinksQueryDto) {
    const userId = req.user.sub;

    return this.linksService.getUserLinks(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('links/:id')
  getUserLinkById(@Req() req: Request, @Param('id') linkId: string) {
    const userId = req.user.sub;

    return this.linksService.getUserLinkById(userId, linkId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('links/:id')
  updateLink(
    @Req() req: Request,

    @Param('id') linkId: string,

    @Body() updateLinkDto: UpdateLinkDto,
  ) {
    const userId = req.user.sub;

    return this.linksService.updateLink(userId, linkId, updateLinkDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('links/:id/status')
  updateLinkStatus(
    @Req() req: Request,

    @Param('id') linkId: string,

    @Body() updateLinkStatusDto: UpdateLinkStatusDto,
  ) {
    const userId = req.user.sub;

    return this.linksService.updateLinkStatus(
      userId,

      linkId,

      updateLinkStatusDto.status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('links/:id')
  deleteLink(@Req() req: Request, @Param('id') linkId: string) {
    const userId = req.user.sub;

    return this.linksService.deleteLink(userId, linkId);
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

      if (result.isNewVisitor) {
        res.cookie(
          this.linksService.getVisitorCookieName(),

          result.visitorId,

          this.linksService.getVisitorCookieOptions(
            this.appConfig.isProduction,
          ),
        );
      }

      return res.redirect(result.originalUrl);
    } catch (error) {
      if (error instanceof LinkRedirectException) {
        return res

          .status(error.statusCode)

          .type('html')

          .send(renderRedirectErrorPage(error.code, error.message));
      }

      throw error;
    }
  }
}
