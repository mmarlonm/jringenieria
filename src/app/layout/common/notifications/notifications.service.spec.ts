import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationsService],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('Las_notificaciones_Cotizacion1_a_5_de_ingenieria_siguen_igual', () => {
    const enlace = (tipo: string) => (service as any).enlaceDe({ tipo, referenciaId: 10 });

    expect(enlace('Cotizacion1')).toBe('/engineering/solicitud-cliente');
    expect(enlace('Cotizacion2')).toBe('/engineering/levantamiento-tecnico');
    expect(enlace('Cotizacion3')).toBe('/engineering/diseno-calculo');
    expect(enlace('Cotizacion4')).toBe('/engineering/presupuesto-tecnico');
    expect(enlace('Cotizacion5')).toBe('/engineering/propuesta-tecnico-comercial');
  });

  it('Una_notificacion_CotProducto_navega_al_detalle_de_la_cotizacion', () => {
    const enlace = (service as any).enlaceDe({ tipo: 'CotProducto', referenciaId: 42 });
    expect(enlace).toBe('/dashboards/quote-products/42');
  });
});
