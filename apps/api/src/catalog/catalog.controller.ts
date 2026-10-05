import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('Catálogo')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products') @ApiOperation({ summary: 'Productos visibles, ordenados' })
  list() { return this.catalog.list(); }

  @Get('products/:slug') @ApiOperation({ summary: 'Un producto por slug' })
  one(@Param('slug') slug: string) { return this.catalog.bySlug(slug); }

  @Get('store') @ApiOperation({ summary: 'Envíos, WhatsApp y medios de pago activos' })
  store() { return this.catalog.storeInfo(); }

  @Get('content') @ApiOperation({ summary: 'Textos editables de la tienda (preguntas frecuentes, portada)' })
  content() { return this.catalog.content(); }
}
